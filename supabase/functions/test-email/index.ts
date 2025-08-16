import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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

    // Check if SMTP credentials are available
    const smtpPassword = Deno.env.get('SMTP_PASSWORD');
    console.log(`SMTP_PASSWORD is ${smtpPassword ? 'available' : 'NOT available'}`);

    if (!smtpPassword) {
      console.error("SMTP_PASSWORD not configured");
      return new Response(JSON.stringify({ 
        error: "SMTP not configured",
        success: false 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Test real SMTP sending using the same config as send-substitution-email
    const smtpConfig = {
      hostname: 'ceipvalleinclan-org.correoseguro.dinaserver.com',
      port: 587,
      username: 'sustitucions@ceipvalleinclan.org',
      password: smtpPassword,
    };

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
            <p>Si recibes este correo, significa que la configuración SMTP está funcionando correctamente.</p>
            <p><strong>Fecha del test:</strong> ${new Date().toLocaleString('es-ES')}</p>
            <p><strong>Equipo Técnico<br>CEIP Valle-Inclán</strong></p>
        </div>
    </div>
</body>
</html>
    `;

      // Test SMTP connection and send email using direct TLS
    try {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      
      // Conectar con socket normal y usar STARTTLS
      const conn = await Deno.connect({
        hostname: smtpConfig.hostname,
        port: smtpConfig.port,
      });

      // Función helper para enviar comando y leer respuesta
      const sendCommand = async (command: string) => {
        await conn.write(encoder.encode(command));
        const buffer = new Uint8Array(1024);
        const bytesRead = await conn.read(buffer);
        if (bytesRead) {
          const response = decoder.decode(buffer.subarray(0, bytesRead));
          console.log('SMTP:', command.trim(), '→', response.trim());
          if (response.startsWith('4') || response.startsWith('5')) {
            throw new Error(`SMTP Error: ${response}`);
          }
          return response;
        }
        return '';
      };

      // Secuencia SMTP con STARTTLS
      await sendCommand(`EHLO ${smtpConfig.hostname}\r\n`);
      await sendCommand(`STARTTLS\r\n`);
      
      // Actualizar conexión a TLS
      const tlsConn = await Deno.startTls(conn, { hostname: smtpConfig.hostname });
      
      // Continuar con comandos sobre conexión TLS
      const sendTlsCommand = async (command: string) => {
        await tlsConn.write(encoder.encode(command));
        const buffer = new Uint8Array(1024);
        const bytesRead = await tlsConn.read(buffer);
        if (bytesRead) {
          const response = decoder.decode(buffer.subarray(0, bytesRead));
          console.log('TLS SMTP:', command.trim(), '→', response.trim());
          if (response.startsWith('4') || response.startsWith('5')) {
            throw new Error(`SMTP Error: ${response}`);
          }
          return response;
        }
        return '';
      };

      await sendTlsCommand(`EHLO ${smtpConfig.hostname}\r\n`);
      await sendTlsCommand(`AUTH LOGIN\r\n`);
      await sendTlsCommand(`${btoa(smtpConfig.username)}\r\n`);
      await sendTlsCommand(`${btoa(smtpConfig.password!)}\r\n`);
      await sendTlsCommand(`MAIL FROM:<${smtpConfig.username}>\r\n`);
      await sendTlsCommand(`RCPT TO:<${teacherEmail}>\r\n`);
      await sendTlsCommand(`DATA\r\n`);
      
      // Enviar contenido del email
      const emailData = `From: Sistema de Sustituciones <${smtpConfig.username}>\r\nTo: ${teacherEmail}\r\nSubject: ${subject}\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${htmlContent}\r\n.\r\n`;
      await tlsConn.write(encoder.encode(emailData));
      
      const finalBuffer = new Uint8Array(1024);
      const finalBytesRead = await tlsConn.read(finalBuffer);
      if (finalBytesRead) {
        const finalResponse = decoder.decode(finalBuffer.subarray(0, finalBytesRead));
        console.log('Email data response:', finalResponse.trim());
      }
      
      await sendTlsCommand(`QUIT\r\n`);
      tlsConn.close();
      console.log("Test email sent successfully to:", teacherEmail);

      return new Response(JSON.stringify({ 
        success: true,
        message: "Test email sent successfully",
        emailTo: teacherEmail,
        teacherName: teacherName
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });

    } catch (smtpError: any) {
      console.error("SMTP error:", smtpError);
      return new Response(JSON.stringify({ 
        error: "SMTP error",
        details: smtpError.message,
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