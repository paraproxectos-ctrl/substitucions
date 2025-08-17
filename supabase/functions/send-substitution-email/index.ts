import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubstitutionData {
  id: string;
  profesor_asignado_id: string;
  profesor_ausente_id?: string;
  data: string;
  hora_inicio: string;
  hora_fin: string;
  grupo_id: string;
  motivo: string;
  motivo_outro?: string;
  observacions?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { record }: { record: SubstitutionData } = await req.json();
    
    console.log('Processing substitution email for:', record.id);

    // Fetch teacher and group information
    const [teacherResult, groupResult, absentTeacherResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('nome, apelidos, email')
        .eq('user_id', record.profesor_asignado_id)
        .single(),
      supabase
        .from('grupos_educativos')
        .select('nome, nivel')
        .eq('id', record.grupo_id)
        .single(),
      record.profesor_ausente_id ? 
        supabase
          .from('profiles')
          .select('nome, apelidos')
          .eq('user_id', record.profesor_ausente_id)
          .single() 
        : Promise.resolve({ data: null })
    ]);

    if (teacherResult.error) {
      console.error('Error fetching teacher:', teacherResult.error);
      throw new Error('No se pudo obtener la información del profesor');
    }

    if (groupResult.error) {
      console.error('Error fetching group:', groupResult.error);
      throw new Error('No se pudo obtener la información del grupo');
    }

    const teacher = teacherResult.data;
    const group = groupResult.data;
    const absentTeacher = absentTeacherResult.data;

    // Format the date
    const date = new Date(record.data).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Create email content
    const motivo = record.motivo_outro || record.motivo;
    const absentTeacherInfo = absentTeacher ? 
      `${absentTeacher.nome} ${absentTeacher.apelidos}` : 
      'No especificado';

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb; margin-bottom: 20px;">Nueva Sustitución Asignada</h2>
        
        <p>Estimado/a <strong>${teacher.nome} ${teacher.apelidos}</strong>,</p>
        
        <p>Se le ha asignado una nueva sustitución con los siguientes detalles:</p>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">Detalles de la Sustitución</h3>
          <p><strong>Fecha:</strong> ${date}</p>
          <p><strong>Horario:</strong> ${record.hora_inicio} - ${record.hora_fin}</p>
          <p><strong>Grupo:</strong> ${group.nome} (${group.nivel})</p>
          <p><strong>Motivo:</strong> ${motivo}</p>
          <p><strong>Profesor ausente:</strong> ${absentTeacherInfo}</p>
          ${record.observacions ? `<p><strong>Observaciones:</strong> ${record.observacions}</p>` : ''}
        </div>
        
        <p>Por favor, confirme su disponibilidad y consulte cualquier duda que pueda tener.</p>
        
        <p style="margin-top: 30px;">
          Saludos cordiales,<br>
          <strong>Sistema de Gestión de Sustituciones</strong>
        </p>
      </div>
    `;

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Sustituciones <onboarding@resend.dev>",
      to: [teacher.email],
      subject: `Nueva Sustitución - ${date}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-substitution-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);