// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openaiKey = Deno.env.get("OPENAI_API_KEY")!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Daily at 10:00 AM EST (15:00 UTC)
Deno.cron("Insight Agent Execution", "0 15 * * *", async () => {
  console.log("Running Insight Agent Execution for Build Catalyst");

  try {
    // 1. Fetch data from previous agents (Placeholder)
    const mockInsightData = {
      music_insights_extracted: 8,
      key_trends: ["Personalized emails had 8x open rate", "Best posting time is Tuesday 9AM"]
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
            content: `You are the Cross-Division Intelligence Agent for Silverfoxx2u + Build Catalyst.
Your role: Extract music insights and translate them into consulting improvements.
Return strict JSON format as specified in the blueprint.`
          },
          {
            role: "user",
            content: `Here are the latest music insights: ${JSON.stringify(mockInsightData)}`
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    const aiData = await response.json();
    const insights = JSON.parse(aiData.choices[0].message.content);
    console.log("Generated Cross-Division Insights:", insights);

    // 3. Log agent execution
    await supabase.from("agents").upsert({
      agent_name: "Insight Agent",
      division: "Cross-Division Intelligence",
      artist_name: "silverfoxx2u",
      role: "Insight Extraction",
      last_run: new Date().toISOString()
    }, { onConflict: 'agent_name' });

    // 4. Store insight impacts for Build Catalyst
    if (insights.build_catalyst_recommendations) {
      for (const rec of insights.build_catalyst_recommendations) {
        await supabase.from("insight_impacts").insert({
          source_agent: "Insight Agent",
          insight_extracted: rec.insight,
          build_catalyst_application: rec.application,
          implementation_status: "pending",
          expected_impact: parseFloat(rec.estimated_impact?.replace(/[^0-9.]/g, '') || '0')
        });
      }
    }

    console.log("Insight Agent Execution completed successfully.");
  } catch (error) {
    console.error("Error running Insight Agent:", error);
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
