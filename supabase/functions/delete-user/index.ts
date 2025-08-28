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
    // Only allow POST method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ ok: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get request body
    const { userId } = await req.json();
    
    if (!userId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Get current user to verify admin permissions
    const authHeader = req.headers.get('Authorization')!;
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: user } = await supabaseAdmin.auth.getUser(token);

    if (!user.user) {
      return new Response(
        JSON.stringify({ ok: false, error: 'No authenticated user' }),
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
        JSON.stringify({ ok: false, error: 'Only admins can delete users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent self-deletion
    if (userId === user.user.id) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Cannot delete your own account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Admin ${user.user.email} attempting to delete user ${userId}`);

    // Delete user's files from storage first
    try {
      console.log('Deleting user files from storage...');
      const { data: files } = await supabaseAdmin.storage
        .from('arquivos-substitucions')
        .list();
      
      if (files && files.length > 0) {
        // Filter files owned by the user
        const userFiles = await supabaseAdmin
          .from('arquivos_calendario')
          .select('storage_path')
          .eq('owner_uid', userId);

        if (userFiles.data && userFiles.data.length > 0) {
          const filePaths = userFiles.data.map(file => file.storage_path);
          await supabaseAdmin.storage
            .from('arquivos-substitucions')
            .remove(filePaths);
          console.log(`Deleted ${filePaths.length} files from storage`);
        }
      }
    } catch (error) {
      console.error('Error deleting storage files:', error);
      // Continue with user deletion even if file deletion fails
    }

    // Delete data in reverse dependency order
    const deleteQueries = [
      // Delete audit logs
      `DELETE FROM arquivos_audit_log WHERE owner_uid = '${userId}' OR by_uid = '${userId}'`,
      
      // Delete user's files
      `DELETE FROM arquivos_calendario WHERE owner_uid = '${userId}'`,
      
      // Delete user's messages
      `DELETE FROM mensaxes WHERE remitente_id = '${userId}' OR destinatario_id = '${userId}'`,
      
      // Delete conversation participations
      `DELETE FROM conversacion_participantes WHERE user_id = '${userId}'`,
      
      // Delete conversations created by user (if no other participants)
      `DELETE FROM conversacions WHERE created_by = '${userId}' AND id NOT IN (
        SELECT DISTINCT conversacion_id FROM conversacion_participantes WHERE user_id != '${userId}'
      )`,
      
      // Delete substitutions
      `DELETE FROM substitucions WHERE profesor_ausente_id = '${userId}' OR profesor_asignado_id = '${userId}' OR created_by = '${userId}'`,
      
      // Delete telegram connection
      `DELETE FROM user_telegram WHERE user_id = '${userId}'`,
      
      // Delete user role
      `DELETE FROM user_roles WHERE user_id = '${userId}'`,
      
      // Delete profile
      `DELETE FROM profiles WHERE user_id = '${userId}'`,
    ];

    // Execute database deletions
    for (const query of deleteQueries) {
      try {
        console.log(`Executing: ${query}`);
        
        const { error } = await supabaseAdmin.rpc('execute_admin_sql', {
          sql_query: query
        });
        
        if (error) {
          console.error(`Error executing query "${query}":`, error);
        }
      } catch (error) {
        console.error(`Error processing query "${query}":`, error);
      }
    }

    // Delete from auth.users last
    try {
      console.log(`Deleting user ${userId} from auth...`);
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      
      if (authError) {
        console.error('Error deleting user from auth:', authError);
        return new Response(
          JSON.stringify({ ok: false, error: 'Failed to delete user from authentication' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (error) {
      console.error('Error during auth user deletion:', error);
      return new Response(
        JSON.stringify({ ok: false, error: 'Failed to delete user from authentication' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User ${userId} deleted successfully by ${user.user.email}`);

    return new Response(
      JSON.stringify({ 
        ok: true, 
        message: 'User deleted successfully',
        deletedUserId: userId
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error during user deletion:', error);
    return new Response(
      JSON.stringify({ ok: false, error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});