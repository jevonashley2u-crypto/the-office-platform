// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openaiKey = Deno.env.get("OPENAI_API_KEY")!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Daily at 9:00 AM EST (14:00 UTC)
Deno.cron("Social Agent Execution", "0 14 * * *", async () => {
  console.log("Running Social Agent Execution for Silverfoxx2u");

  try {
    // 1. Fetch TikTok/Social trends (Placeholder)
    const mockSocialData = {
      tiktok_followers: 2340,
      instagram_followers: 1850,
      youtube_subs: 520,
      trending_keywords: ["soulful r&b", "midnight drive", "studio vibes"]
    };

    // 2. Call OpenAI
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
            content: `You are the Social Growth & Viral Agent for Silverfoxx2u.
Artist: Silverfoxx2u (R&B/Soul)
Your daily mission: Generate TikTok concepts, Instagram content, YouTube Short scripts, and influencer targets.
Return strict JSON format as specified in the blueprint.`
          },
          {
            role: "user",
            content: `Here is the current social data: ${JSON.stringify(mockSocialData)}`
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    const aiData = await response.json();
    const insights = JSON.parse(aiData.choices[0].message.content);
    console.log("Generated Social Insights:", insights);

    // 3. Log agent execution
    await supabase.from("agents").upsert({
      agent_name: "Social Agent",
      division: "Music Marketing",
      artist_name: "silverfoxx2u",
      role: "Social Media & Viral",
      last_run: new Date().toISOString()
    }, { onConflict: 'agent_name' });

    // 4. Store content calendar ideas
    if (insights.tiktok_opportunities) {
      for (const t of insights.tiktok_opportunities) {
        await supabase.from("content_calendar").insert({
          platform: "tiktok",
          content_type: "video_concept",
          description: t.video_concept || "TikTok Concept",
          status: "pending"
        });
      }
    }

    console.log("Social Agent Execution completed successfully.");
  } catch (error) {
    console.error("Error running Social Agent:", error);
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/social-agent' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
