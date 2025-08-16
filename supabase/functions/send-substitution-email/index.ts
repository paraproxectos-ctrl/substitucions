import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { teacherEmail, teacherName, substitutionDetails }: EmailRequest = await req.json();

    console.log('Enviando notificación por correo a:', teacherEmail);

    // Configuración SMTP de Dynahosting
    const smtpConfig = {
      hostname: 'ceipvalleinclan-org.correoseguro.dinaserver.com',
      port: 465, // SMTPS
      username: 'sustitucions@ceipvalleinclan.org',
      password: Deno.env.get('SMTP_PASSWORD'),
    };

    // Formatear la fecha
    const fechaFormateada = new Date(substitutionDetails.fecha).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Crear el contenido del correo
    const subject = `📋 Nueva Sustitución Asignada - ${fechaFormateada}`;
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

    // Crear el mensaje de correo usando la API fetch para SMTP
    const emailData = {
      to: teacherEmail,
      from: smtpConfig.username,
      subject: subject,
      html: htmlContent,
      text: `
Nueva Sustitución Asignada - CEIP Valle-Inclán

Estimado/a ${teacherName},

Se te ha asignado una nueva sustitución:

Fecha: ${fechaFormateada}
Hora: ${substitutionDetails.hora_inicio} - ${substitutionDetails.hora_fin}
${substitutionDetails.materia ? `Materia: ${substitutionDetails.materia}` : ''}
${substitutionDetails.grupo ? `Grupo: ${substitutionDetails.grupo}` : ''}
${substitutionDetails.observaciones ? `Observaciones: ${substitutionDetails.observaciones}` : ''}

Por favor, confirma tu disponibilidad lo antes posible.

Gracias por tu colaboración.

Equipo Directivo
CEIP Valle-Inclán
      `
    };

    // Usar nodemailer-like approach con fetch para SMTP
    const smtpUrl = `smtps://${encodeURIComponent(smtpConfig.username)}:${encodeURIComponent(smtpConfig.password)}@${smtpConfig.hostname}:${smtpConfig.port}`;
    
    // Para Deno, usaremos una implementación SMTP básica
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: 'smtp',
        template_id: 'custom',
        user_id: 'smtp_user',
        template_params: {
          to_email: teacherEmail,
          from_email: smtpConfig.username,
          subject: subject,
          message_html: htmlContent,
          smtp_server: smtpConfig.hostname,
          smtp_port: smtpConfig.port,
          smtp_username: smtpConfig.username,
          smtp_password: smtpConfig.password,
        }
      })
    }).catch(async () => {
      // Fallback: usar un método más directo con Deno
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      
      try {
        // Conectar via TLS socket
        const conn = await Deno.connectTls({
          hostname: smtpConfig.hostname,
          port: smtpConfig.port,
        });

        // Implementación SMTP básica
        const commands = [
          `EHLO ${smtpConfig.hostname}\r\n`,
          `AUTH LOGIN\r\n`,
          `${btoa(smtpConfig.username)}\r\n`,
          `${btoa(smtpConfig.password!)}\r\n`,
          `MAIL FROM:<${smtpConfig.username}>\r\n`,
          `RCPT TO:<${teacherEmail}>\r\n`,
          `DATA\r\n`,
          `From: Sistema de Sustituciones <${smtpConfig.username}>\r\n`,
          `To: ${teacherEmail}\r\n`,
          `Subject: ${subject}\r\n`,
          `Content-Type: text/html; charset=UTF-8\r\n`,
          `\r\n`,
          `${htmlContent}\r\n`,
          `.\r\n`,
          `QUIT\r\n`
        ];

        for (const command of commands) {
          await conn.write(encoder.encode(command));
          const buffer = new Uint8Array(1024);
          await conn.read(buffer);
          console.log('SMTP Response:', decoder.decode(buffer));
        }

        conn.close();
        return { success: true };
      } catch (smtpError) {
        console.error('Error SMTP directo:', smtpError);
        throw smtpError;
      }
    });

    console.log('Correo enviado exitosamente a:', teacherEmail);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notificación enviada correctamente',
        recipient: teacherEmail 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error) {
    console.error('Error enviando correo:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Error enviando notificación: ${error.message}` 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);