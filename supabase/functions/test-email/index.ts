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

    // Test SMTP connection
    try {
      const conn = await Deno.connectTls({
        hostname: "smtp.gmail.com",
        port: 465,
      });

      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      // Read initial response
      const buffer = new Uint8Array(1024);
      await conn.read(buffer);
      console.log("SMTP initial response:", decoder.decode(buffer));

      // Send HELO
      await conn.write(encoder.encode("HELO vallinclan.edu.es\r\n"));
      await conn.read(buffer);
      console.log("HELO response:", decoder.decode(buffer));

      conn.close();
      console.log("SMTP connection test successful");

      return new Response(JSON.stringify({ 
        success: true,
        message: "SMTP connection successful",
        emailTo: teacherEmail,
        teacherName: teacherName
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });

    } catch (smtpError: any) {
      console.error("SMTP connection error:", smtpError);
      return new Response(JSON.stringify({ 
        error: "SMTP connection failed",
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