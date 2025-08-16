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

    // Check if profile already exists
    const { data: existingProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('email', email)
      .maybeSingle();

    if (existingProfile) {
      console.log('Profile exists, updating...');
      
      // Update existing profile
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          nome,
          apelidos,
          telefono: telefono || null,
          horas_libres_semanais: 3
        })
        .eq('user_id', existingProfile.user_id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: updateError.message }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // Ensure profesor role
      await supabaseAdmin
        .from('user_roles')
        .upsert({
          user_id: existingProfile.user_id,
          role: 'profesor'
        }, { onConflict: 'user_id,role' });

      return new Response(
        JSON.stringify({ success: true, user_id: existingProfile.user_id, email }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Try to create new user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome, apelidos }
    });

    if (authError) {
      console.error('Auth error:', authError);
      
      if (authError.message.includes('already been registered')) {
        // User exists in auth but no profile - create profile only
        console.log('User exists in auth, creating profile...');
        
        // Get user ID by trying to sign in (safer than listUsers)
        const { data: signInData } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: email
        });

        if (signInData?.user?.id) {
          const userId = signInData.user.id;
          
          // Create profile
          const { error: insertError } = await supabaseAdmin
            .from('profiles')
            .insert({
              user_id: userId,
              nome,
              apelidos,
              email,
              telefono: telefono || null,
              horas_libres_semanais: 3
            });

          if (insertError) {
            console.error('Error creating profile:', insertError);
            return new Response(
              JSON.stringify({ success: false, error: insertError.message }),
              { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
            );
          }

          // Add role
          await supabaseAdmin
            .from('user_roles')
            .insert({ user_id: userId, role: 'profesor' });

          return new Response(
            JSON.stringify({ success: true, user_id: userId, email }),
            { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }
      }
      
      return new Response(
        JSON.stringify({ success: false, error: authError.message }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'No user created' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('New user created:', authData.user.id);

    // Wait for trigger
    await new Promise(resolve => setTimeout(resolve, 500));

    // Update profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        nome,
        apelidos,
        telefono: telefono || null,
        horas_libres_semanais: 3
      })
      .eq('user_id', authData.user.id);

    if (updateError) {
      console.error('Error updating new profile:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: updateError.message }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Add role
    await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: authData.user.id, role: 'profesor' });

    return new Response(
      JSON.stringify({ success: true, user_id: authData.user.id, email }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);