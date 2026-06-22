// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openaiKey = Deno.env.get("OPENAI_API_KEY")!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Every 8 hours — morning, afternoon, evening lead scoring
Deno.cron("CRM Agent Execution", "0 */8 * * *", async () => {
  console.log("Running CRM Agent Execution for Silverfoxx2u");

  try {
    // 1. Fetch Email/Fan data (Placeholder)
    const mockFanData = {
      list_size: 3420,
      new_subscribers_24h: 12,
      avg_open_rate: "38%",
      recent_engagement: 45
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
            content: `You are the Fan Relationship & Growth Agent for Silverfoxx2u.
Your daily mission: Manage email list segmentation, generate personalized fan communications, and create re-engagement campaigns.
Return strict JSON format as specified in the blueprint.`
          },
          {
            role: "user",
            content: `Here is the current fan engagement data: ${JSON.stringify(mockFanData)}`
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    const aiData = await response.json();
    const insights = JSON.parse(aiData.choices[0].message.content);
    console.log("Generated CRM Insights:", insights);

    // 3. Log agent execution
    await supabase.from("agents").upsert({
      agent_name: "CRM Agent",
      division: "Music Marketing",
      artist_name: "silverfoxx2u",
      role: "Fan Relationship",
      last_run: new Date().toISOString()
    }, { onConflict: 'agent_name' });

    console.log("CRM Agent Execution completed successfully.");
  } catch (error) {
    console.error("Error running CRM Agent:", error);
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/crm-agent' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
