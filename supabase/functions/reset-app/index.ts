import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('Starting app reset process...');

    // Get current user to verify admin permissions
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: user } = await supabaseAdmin.auth.getUser(token);

    if (!user.user) {
      return new Response(
        JSON.stringify({ error: 'No authenticated user' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is admin
    const { data: userRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.user.id)
      .single();

    if (!userRole || userRole.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only admins can reset the app' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Admin verification passed, proceeding with reset...');

    // Delete all data in reverse dependency order
    const deleteOperations = [
      // Delete files from storage
      { table: 'storage.objects', condition: `bucket_id = 'arquivos-substitucions'` },
      
      // Delete application data
      { table: 'arquivos_audit_log', condition: 'true' },
      { table: 'arquivos_calendario', condition: 'true' },
      { table: 'mensaxes', condition: 'true' },
      { table: 'conversacion_participantes', condition: 'true' },
      { table: 'conversacions', condition: 'true' },
      { table: 'substitucions', condition: 'true' },
      { table: 'user_telegram', condition: 'true' },
      
      // Keep current admin, delete all other user roles and profiles
      { table: 'user_roles', condition: `user_id != '${user.user.id}'` },
      { table: 'profiles', condition: `user_id != '${user.user.id}'` },
    ];

    // Execute deletions
    for (const operation of deleteOperations) {
      try {
        console.log(`Deleting from ${operation.table}...`);
        
        if (operation.table === 'storage.objects') {
          // Delete storage objects
          const { data: files } = await supabaseAdmin.storage
            .from('arquivos-substitucions')
            .list();
          
          if (files && files.length > 0) {
            const filePaths = files.map(file => file.name);
            await supabaseAdmin.storage
              .from('arquivos-substitucions')
              .remove(filePaths);
          }
        } else {
          // For regular tables, use SQL delete
          const { error } = await supabaseAdmin.rpc('execute_sql', {
            query: `DELETE FROM ${operation.table} WHERE ${operation.condition}`
          });
          
          if (error) {
            console.error(`Error deleting from ${operation.table}:`, error);
          }
        }
      } catch (error) {
        console.error(`Error processing ${operation.table}:`, error);
      }
    }

    // Delete all non-admin users from auth
    try {
      console.log('Deleting non-admin auth users...');
      const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
      
      if (allUsers?.users) {
        const usersToDelete = allUsers.users.filter(u => u.id !== user.user.id);
        
        for (const userToDelete of usersToDelete) {
          try {
            await supabaseAdmin.auth.admin.deleteUser(userToDelete.id);
          } catch (error) {
            console.error(`Error deleting user ${userToDelete.id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error during auth users cleanup:', error);
    }

    // Reset weekly counters
    try {
      await supabaseAdmin.rpc('reset_weekly_counters');
    } catch (error) {
      console.error('Error resetting weekly counters:', error);
    }

    console.log('App reset completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'App reset completed successfully',
        preserved_admin: user.user.email
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error during app reset:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
