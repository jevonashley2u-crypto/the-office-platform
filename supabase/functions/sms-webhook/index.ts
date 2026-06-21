// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const myPhone = Deno.env.get("MY_PHONE_NUMBER");
const twilioFrom = Deno.env.get("TWILIO_FROM_NUMBER");
const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
const twilioAuth = Deno.env.get("TWILIO_AUTH_TOKEN");

const supabase = createClient(supabaseUrl, supabaseKey);

async function sendSMS(body: string) {
    if (!twilioSid || !twilioAuth || !twilioFrom || !myPhone) return;
    const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
    const formData = new URLSearchParams();
    formData.append("To", myPhone);
    formData.append("From", twilioFrom);
    formData.append("Body", body);
    await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": "Basic " + btoa(`${twilioSid}:${twilioAuth}`),
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: formData.toString()
    });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const textData = await req.text();
    const params = new URLSearchParams(textData);
    const body = params.get("Body")?.trim().toUpperCase() || "";
    const from = params.get("From") || "";

    // Security check: Only accept commands from your phone
    if (from !== myPhone && from !== `+1${myPhone.replace(/\D/g, '')}`) {
        return new Response("Unauthorized", { status: 401 });
    }

    // Command: YES <uuid>
    if (body.startsWith("YES")) {
        const parts = body.split(" ");
        if (parts.length < 2) {
            await sendSMS("Error: Please reply with YES followed by the video ID.");
            return new Response("Missing ID", { status: 200 });
        }
        
        const videoId = parts[1];
        
        // Update the queue status to trigger the render worker
        const { error } = await supabase
            .from("video_queue")
            .update({ status: "pending_render" })
            .eq("id", videoId)
            .eq("status", "pending_approval");
            
        if (error) {
            await sendSMS(`Error approving video: ${error.message}`);
        } else {
            await sendSMS(`✅ Video ${videoId} approved! The render farm has been engaged.`);
        }
    } 
    // Command: NO <uuid>
    else if (body.startsWith("NO")) {
        const parts = body.split(" ");
        if (parts.length > 1) {
             await supabase
                .from("video_queue")
                .update({ status: "rejected" })
                .eq("id", parts[1]);
        }
        await sendSMS("❌ Video generation cancelled.");
    }

    return new Response("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>", {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (err) {
    console.error("SMS Webhook error:", err);
    return new Response("Internal error", { status: 500 });
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/sms-webhook' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
