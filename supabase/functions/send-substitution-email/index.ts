import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  teacherEmail: string;
  teacherName: string;
  substitutionDetails: {
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
    materia?: string;
    grupo?: string;
    observaciones?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Send substitution email function called");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { teacherEmail, teacherName, substitutionDetails }: EmailRequest = await req.json();
    console.log(`Enviando notificación por correo a: ${teacherEmail}`);

    // Check if Resend API key is available
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ 
        error: "Resend API key not configured",
        success: false 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const resend = new Resend(resendApiKey);

    // Formatear la fecha
    const fechaFormateada = new Date(substitutionDetails.fecha).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Crear el contenido del email
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #0066cc; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
        .label { font-weight: bold; color: #0066cc; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏫 CEIP Valle-Inclán</h1>
            <h2>Nueva Sustitución Asignada</h2>
        </div>
        <div class="content">
            <p>Estimado/a <strong>${teacherName}</strong>,</p>
            
            <p>Se te ha asignado una nueva sustitución. A continuación, los detalles:</p>
            
            <div class="details">
                <div class="detail-row">
                    <span class="label">📅 Fecha:</span> ${fechaFormateada}
                </div>
                <div class="detail-row">
                    <span class="label">🕐 Hora de inicio:</span> ${substitutionDetails.hora_inicio}
                </div>
                <div class="detail-row">
                    <span class="label">🕐 Hora de fin:</span> ${substitutionDetails.hora_fin}
                </div>
                ${substitutionDetails.materia ? `
                <div class="detail-row">
                    <span class="label">📚 Materia:</span> ${substitutionDetails.materia}
                </div>
                ` : ''}
                ${substitutionDetails.grupo ? `
                <div class="detail-row">
                    <span class="label">👥 Grupo:</span> ${substitutionDetails.grupo}
                </div>
                ` : ''}
                ${substitutionDetails.observaciones ? `
                <div class="detail-row">
                    <span class="label">📝 Observaciones:</span> ${substitutionDetails.observaciones}
                </div>
                ` : ''}
            </div>
            
            <p>Por favor, confirma tu disponibilidad lo antes posible.</p>
            
            <p>Gracias por tu colaboración.</p>
            
            <p><strong>Equipo Directivo<br>CEIP Valle-Inclán</strong></p>
        </div>
        <div class="footer">
            <p>Este es un mensaje automático del sistema de gestión de sustituciones del CEIP Valle-Inclán</p>
        </div>
    </div>
</body>
</html>
    `;

    const subject = `📋 Nueva Sustitución Asignada - ${fechaFormateada}`;

    try {
    const emailResponse = await resend.emails.send({
      from: 'Sistema de Sustituciones <onboarding@resend.dev>',
      to: [teacherEmail],
        subject: subject,
        html: htmlContent,
      });

      console.log("Correo enviado exitosamente a:", teacherEmail);

      return new Response(JSON.stringify({ 
        success: true,
        message: "Notificación enviada correctamente",
        recipient: teacherEmail,
        emailId: emailResponse.data?.id
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });

    } catch (emailError: any) {
      console.error("Resend email error:", emailError);
      return new Response(JSON.stringify({ 
        error: "Email sending failed",
        details: emailError.message,
        success: false 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

  } catch (error: any) {
    console.error("Error in send substitution email function:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

serve(handler);