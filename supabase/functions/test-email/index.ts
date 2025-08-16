import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestEmailRequest {
  teacherEmail: string;
  teacherName: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Test email function called");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { teacherEmail, teacherName }: TestEmailRequest = await req.json();
    console.log(`Testing email to: ${teacherEmail}, name: ${teacherName}`);

    // Check if Resend API key is available
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    console.log(`RESEND_API_KEY is ${resendApiKey ? 'available' : 'NOT available'}`);

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

    const subject = `✅ Test de Correo - Sistema de Sustituciones`;
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Test de Correo Exitoso</h1>
        </div>
        <div class="content">
            <p>Estimado/a <strong>${teacherName}</strong>,</p>
            <p>Este es un correo de prueba del sistema de gestión de sustituciones del CEIP Valle-Inclán.</p>
            <p>Si recibes este correo, significa que la configuración de email está funcionando correctamente.</p>
            <p><strong>Fecha del test:</strong> ${new Date().toLocaleString('es-ES')}</p>
            <p><strong>Equipo Técnico<br>CEIP Valle-Inclán</strong></p>
        </div>
    </div>
</body>
</html>
    `;

    try {
      const emailResponse = await resend.emails.send({
        from: 'Sistema de Sustituciones <onboarding@resend.dev>',
        to: [teacherEmail],
        subject: subject,
        html: htmlContent,
      });

      console.log("Test email sent successfully via Resend:", emailResponse);

      return new Response(JSON.stringify({ 
        success: true,
        message: "Test email sent successfully",
        emailTo: teacherEmail,
        teacherName: teacherName,
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
    console.error("Error in test email function:", error);
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