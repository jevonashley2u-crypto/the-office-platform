// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openaiKey = Deno.env.get("OPENAI_API_KEY")!;

// Telegram Bot
const telegramToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
const telegramChatId = Deno.env.get("TELEGRAM_CHAT_ID");

const supabase = createClient(supabaseUrl, supabaseKey);

async function sendTelegram(text: string) {
    if (!telegramToken || !telegramChatId) return;
    await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: telegramChatId, text, parse_mode: "HTML" })
    });
}

async function sendTelegramWithButtons(text: string, videoId: string) {
    if (!telegramToken || !telegramChatId) return;
    await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: telegramChatId,
            text,
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [[
                    { text: "✅ YES — Approve & Render", callback_data: `YES:${videoId}` },
                    { text: "❌ NO — Cancel", callback_data: `NO:${videoId}` }
                ]]
            }
        })
    });
}

// Daily at 8:45 PM Local (01:45 UTC)
Deno.cron("Content Clipping Agent", "45 1 * * *", async () => {
  console.log("Running Content Clipping & Editing Agent for Silverfoxx2u");

  try {
    // 1. Fetch unedited raw footage metadata from Supabase Storage
    const { data: files, error: storageError } = await supabase.storage.from("raw_footage").list();
    
    let rawMaterialContext = "No specific raw footage found. Use general Silverfoxx2u B-roll and existing music library to generate concepts.";
    let rawFilePath = "fallback_broll.mp4";

    if (files && files.length > 0) {
        // Pick the first unprocessed file (in reality you'd track processed ones)
        const file = files.find(f => f.name.endsWith('.mp4'));
        if (file) {
            rawMaterialContext = `Found new raw footage: ${file.name}. It is unedited studio/lifestyle footage.`;
            rawFilePath = file.name;
        }
    }

    // 2. Call OpenAI to generate the JSON editing instructions
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are the Content Clipping & Editing Orchestrator for the Silverfoxx2u Empire.
Dual-Entity Brand: Silverfoxx2u (R&B/Soul Music) & Build Catalyst (AI Automation Consulting).
Your role: Transform raw footage into optimized short-form content. 
There are TWO types of raw footage you will process:
- Type A (Music): Studio footage, vocals, lifestyle.
- Type B (Tech): Screen recordings of code, AI workflows, business consulting advice.
Determine the brand based on the raw footage provided, and generate editing instructions, captions, and concepts that match.
Output strictly JSON matching the blueprint. Include a "brand" property ("Music" or "Tech").
Generate 1 video concept for today based on the input.`
          },
          {
            role: "user",
            content: `Raw Material Input: ${rawMaterialContext}. Generate editing instructions, captions, and metadata.`
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    const aiData = await response.json();
    const insights = JSON.parse(aiData.choices[0].message.content);
    console.log("Generated Clipping Instructions:", insights);

    const videoConfig = insights.videos_generated ? insights.videos_generated[0] : insights;

    // 3. Push to Video Queue
    const { data: queueData, error: queueError } = await supabase.from("video_queue").insert({
        concept: videoConfig.concept || "music_moment",
        title: videoConfig.title || "Silverfoxx2u Raw Moment",
        description: videoConfig.description || "New music out now.",
        raw_file_path: rawFilePath,
        status: "pending_approval", // Wait for SMS reply
        ai_metadata: videoConfig,
        platforms: ["tiktok", "youtube"],
        scheduled_post_time: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() // Schedule for 8 hours from now
    }).select();

    const queueId = queueData ? queueData[0].id : "unknown";

    // 4. Log agent execution
    await supabase.from("agents").upsert({
      agent_name: "Content Clipping Agent",
      division: "Music Marketing",
      artist_name: "silverfoxx2u",
      role: "Video Editing Orchestrator",
      last_run: new Date().toISOString()
    }, { onConflict: 'agent_name' });

    // 5. Send Telegram alert with full details + tap buttons
    const brand = videoConfig.brand || "Silverfoxx2u Empire";
    const platforms = ["tiktok", "youtube"].join(", ").toUpperCase();
    const scheduledTime = new Date(Date.now() + 8 * 60 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const approvalMessage = `🤖 <b>Agent 7 — Video Approval Needed</b>

━━━━━━━━━━━━━━━━━━
📹 <b>Title:</b> ${videoConfig.title || "Untitled"}
🎯 <b>Brand:</b> ${brand}
📝 <b>Concept:</b> ${videoConfig.concept || "N/A"}
💬 <b>Caption:</b> ${videoConfig.description || videoConfig.caption || "Auto-generated"}
🕐 <b>Scheduled:</b> ${scheduledTime}
📲 <b>Platforms:</b> ${platforms}
━━━━━━━━━━━━━━━━━━

Tap ✅ to approve and start rendering, or ❌ to cancel.`;

    await sendTelegramWithButtons(approvalMessage, queueId);

    console.log("Content Clipping Agent successfully queued the render instructions.");
  } catch (error) {
    console.error("Error running Clipping Agent:", error);
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/clipping-agent' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
