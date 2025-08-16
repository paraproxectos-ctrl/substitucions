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

    // First, delete any orphaned user from auth.users with this email
    try {
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingAuthUser = existingUsers?.users?.find(user => user.email === email);
      
      if (existingAuthUser) {
        console.log('Deleting existing auth user:', existingAuthUser.id);
        await supabaseAdmin.auth.admin.deleteUser(existingAuthUser.id);
      }
    } catch (error) {
      console.log('Error or no existing user to delete:', error);
    }

    // Create new user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
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
      return new Response(
        JSON.stringify({ success: false, error: 'No se creó el usuario' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log('User created successfully:', authData.user.id);

    // Wait for trigger to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // Update profile with complete data
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        nome,
        apelidos,
        telefono: telefono || null,
        horas_libres_semanais: 3
      })
      .eq('user_id', authData.user.id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      return new Response(
        JSON.stringify({ success: false, error: `Error actualizando perfil: ${profileError.message}` }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

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

    console.log('Teacher created successfully');

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