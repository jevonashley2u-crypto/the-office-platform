// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const telegramToken = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const telegramChatId = Deno.env.get("TELEGRAM_CHAT_ID")!; // Jevon's Chat ID: 7363602970

const supabase = createClient(supabaseUrl, supabaseKey);

async function sendTelegram(text: string) {
    if (!telegramToken || !telegramChatId) return;

    await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: telegramChatId, text, parse_mode: "HTML" })
    });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const update = await req.json();
    const message = update?.message;

    if (!message) {
      return new Response("No message", { status: 200 });
    }

    const fromId = message?.from?.id;
    const rawText: string = message?.text?.trim() || "";
    const body = rawText.toUpperCase();

    // Security check: Only accept commands from Jevon's Telegram account
    if (String(fromId) !== String(telegramChatId)) {
      console.warn(`Unauthorized Telegram message from chat ID: ${fromId}`);
      return new Response("Unauthorized", { status: 200 }); // Return 200 to Telegram regardless
    }

    // Command: YES <uuid>
    if (body.startsWith("YES")) {
      const parts = rawText.split(" ");
      if (parts.length < 2) {
        await sendTelegram("⚠️ Error: Please reply with <b>YES</b> followed by the video ID.");
        return new Response("Missing ID", { status: 200 });
      }

      const videoId = parts[1];

      const { error } = await supabase
        .from("video_queue")
        .update({ status: "pending_render" })
        .eq("id", videoId)
        .eq("status", "pending_approval");

      if (error) {
        await sendTelegram(`❌ Error approving video: ${error.message}`);
      } else {
        await sendTelegram(`✅ Video <code>${videoId}</code> approved! The render farm has been engaged.`);
      }
    }
    // Command: NO <uuid>
    else if (body.startsWith("NO")) {
      const parts = rawText.split(" ");
      if (parts.length > 1) {
        const videoId = parts[1];
        await supabase
          .from("video_queue")
          .update({ status: "rejected" })
          .eq("id", videoId);
        await sendTelegram(`❌ Video <code>${videoId}</code> rejected and cancelled.`);
      } else {
        await sendTelegram("❌ Video generation cancelled.");
      }
    } else {
      await sendTelegram("🤖 Unknown command. Reply <b>YES &lt;uuid&gt;</b> to approve or <b>NO &lt;uuid&gt;</b> to reject.");
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Telegram Webhook error:", err);
    return new Response("Internal error", { status: 500 });
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/sms-webhook' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"message":{"text":"YES abc-uuid","from":{"id":7363602970}}}'

*/
