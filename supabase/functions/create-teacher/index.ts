import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateTeacherRequest {
  email: string;
  password: string;
  nome: string;
  apelidos: string;
  telefono?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, nome, apelidos, telefono }: CreateTeacherRequest = await req.json();

    console.log('Creating teacher with email:', email);

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser?.users?.find(user => user.email === email);

    if (userExists) {
      console.log('User already exists, ensuring profile and role:', email);
      
      // Ensure profile exists for existing user
      const { error: profileUpsertError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          user_id: userExists.id,
          nome,
          apelidos,
          email,
          telefono: telefono || null
        }, {
          onConflict: 'user_id'
        });

      if (profileUpsertError) {
        console.error('Error upserting profile for existing user:', profileUpsertError);
        return new Response(
          JSON.stringify({ success: false, error: `Error actualizando perfil: ${profileUpsertError.message}` }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      // Ensure profesor role exists
      const { error: roleUpsertError } = await supabaseAdmin
        .from('user_roles')
        .upsert({
          user_id: userExists.id,
          role: 'profesor'
        }, {
          onConflict: 'user_id,role'
        });

      if (roleUpsertError) {
        console.error('Error upserting role for existing user:', roleUpsertError);
        return new Response(
          JSON.stringify({ success: false, error: `Error asignando rol: ${roleUpsertError.message}` }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          user_id: userExists.id,
          email: userExists.email 
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Create the user with admin client
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email confirmation
      user_metadata: {
        nome,
        apelidos
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return new Response(
        JSON.stringify({ success: false, error: `Error creando usuario: ${authError.message}` }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    if (!authData.user) {
      console.error('No user returned from creation');
      return new Response(
        JSON.stringify({ success: false, error: 'No se creó el usuario' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log('User created successfully:', authData.user.id);

    // Wait a bit to ensure trigger completes
    await new Promise(resolve => setTimeout(resolve, 200));

    // Update profile with complete data (the trigger creates a basic one)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        nome,
        apelidos,
        telefono: telefono || null
      })
      .eq('user_id', authData.user.id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      // Clean up auth user if profile update fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ success: false, error: `Error actualizando perfil: ${profileError.message}` }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log('Profile created successfully');

    // Assign profesor role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: 'profesor'
      });

    if (roleError) {
      console.error('Error assigning role:', roleError);
      return new Response(
        JSON.stringify({ success: false, error: `Error asignando rol: ${roleError.message}` }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log('Role assigned successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: authData.user.id,
        email: authData.user.email 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error) {
    console.error('Error in create-teacher function:', error);
    return new Response(
      JSON.stringify({ success: false, error: `Error interno: ${error.message}` }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);