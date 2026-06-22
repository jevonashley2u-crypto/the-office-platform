import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openaiKey = Deno.env.get("OPENAI_API_KEY")!;
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

// 3x daily — 8 AM, 12 PM, 6 PM CDT (13:00, 17:00, 23:00 UTC)
Deno.cron("The Wet Spot Growth Agent", "0 13,17,23 * * *", async () => {
  console.log("Running The Wet Spot Growth Agent (Agent 9)");

  try {
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
            content: `You are Agent 9 — The Wet Spot Growth Agent.
The Wet Spot (thewetspot.space) is a premium creator monetization platform — a subscription-based platform where creators (artists, musicians, performers) offer exclusive content to paying fans.

TWO MISSION TRACKS you run simultaneously every day:

TRACK A — CREATOR ACQUISITION:
Generate 3 highly personalized DM outreach scripts targeting independent artists and content creators on TikTok and YouTube. The pitch: "Stop leaving money on the table. Your fans want to pay you for exclusive access — The Wet Spot makes it simple." Each script should feel human, not spammy.

TRACK B — FAN FUNNEL CONTENT:
Generate 3 short-form video hook concepts (15-30 seconds) designed to create FOMO in fans. Example hook: "Your favorite artist has exclusive content that only their subscribers on The Wet Spot can see... and it drops tonight." These should drive fans directly to thewetspot.space.

FLAGSHIP STORY — Cross-Brand:
Silverfoxx2u (R&B artist) is the first creator on The Wet Spot. Build content showing how his AI automation company (Build Catalyst) runs his entire marketing empire, and how his fans can get exclusive studio recordings on The Wet Spot.

Return strict JSON with:
{
  "creator_outreach": [{ "target_profile": "", "platform": "", "dm_script": "", "hook": "" }],
  "fan_content": [{ "concept": "", "hook": "", "cta": "", "platform": "" }],
  "flagship_story": { "concept": "", "cross_brand_angle": "" },
  "growth_insight": ""
}`
          },
          {
            role: "user",
            content: "Generate today's Wet Spot growth strategy. Focus on creator onboarding and fan subscription acquisition."
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    const aiData = await response.json();
    const strategy = JSON.parse(aiData.choices[0].message.content);
    console.log("Wet Spot Growth Strategy Generated:", strategy);

    // Store strategy in Supabase
    await supabase.from("content_calendar").insert(
      strategy.fan_content?.map((item: Record<string, string>) => ({
        platform: item.platform || "tiktok",
        content_type: "platform_promo",
        description: item.hook,
        status: "scheduled",
        brand: "Platform"
      })) || []
    );

    // Log creator outreach as agent insight
    await supabase.from("insight_impacts").insert(
      strategy.creator_outreach?.map((item: Record<string, string>) => ({
        source_agent: "wetspot-agent",
        insight_extracted: `Creator DM ready for ${item.target_profile} on ${item.platform}`,
        build_catalyst_application: item.dm_script?.substring(0, 200),
        expected_impact: 15
      })) || []
    );

    // Log agent execution
    await supabase.from("agents").upsert({
      agent_name: "The Wet Spot Growth Agent",
      division: "Platform Marketing",
      artist_name: "thewetspot",
      role: "Creator Acquisition & Fan Funnel Engine",
      last_run: new Date().toISOString()
    }, { onConflict: 'agent_name' });

    // Send Telegram report
    const creatorCount = strategy.creator_outreach?.length || 0;
    const fanCount = strategy.fan_content?.length || 0;
    await sendTelegram(
      `🌊 <b>The Wet Spot — Agent 9 Report</b>\n\n` +
      `✍️ <b>${creatorCount} Creator DMs</b> generated for outreach\n` +
      `🎬 <b>${fanCount} Fan Content</b> concepts queued\n` +
      `💡 <b>Insight:</b> ${strategy.growth_insight || "Growth pipeline active."}\n\n` +
      `🔗 thewetspot.space`
    );

    console.log("Wet Spot Growth Agent completed successfully.");
  } catch (error) {
    console.error("Error running Wet Spot Growth Agent:", error);
  }
});
