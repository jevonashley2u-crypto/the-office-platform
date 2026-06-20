// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openaiKey = Deno.env.get("OPENAI_API_KEY")!;
const appleMusicToken = Deno.env.get("APPLE_MUSIC_CREDENTIALS");

const supabase = createClient(supabaseUrl, supabaseKey);

// Daily at 7:00 AM EST (12:00 UTC)
Deno.cron("Apple Agent Execution", "0 12 * * *", async () => {
  console.log("Running Apple Agent Execution for Silverfoxx2u");

  try {
    let appleData = { streams_24h: 1800, chart_position: "#247 in R&B", new_listeners: 120, units_sold: 8 };

    // 1. Pull real data from Apple Music API (if keys exist)
    if (appleMusicToken && appleMusicToken !== 'placeholder') {
        console.log("Fetching real Apple Music metrics...");
        // Example Apple Music API Request to fetch catalog data
        // For real stream counts, Apple Music for Artists partner API is required. 
        // Here we demonstrate querying the public catalog using the developer token.
        const searchResponse = await fetch(`https://api.music.apple.com/v1/catalog/us/search?term=Silverfoxx2u&types=artists&limit=1`, {
            headers: { "Authorization": `Bearer ${appleMusicToken}` }
        });
        
        if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            if (searchData.results && searchData.results.artists && searchData.results.artists.data.length > 0) {
                const artist = searchData.results.artists.data[0];
                appleData = {
                    ...appleData,
                    artist_url: artist.attributes.url,
                    genre: artist.attributes.genreNames
                };
            }
        }
    } else {
        console.log("Apple Music Developer Token not found. Using fallback data for AI logic.");
    }

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
            content: `You are the Apple Music & iTunes Specialist for Silverfoxx2u.
Artist: Silverfoxx2u (Contemporary R&B/Soul)
Your daily mission: Pull Apple Music performance, generate playlist pitches, recommend pricing strategy, optimize metadata.
Return strict JSON format as specified in the blueprint.`
          },
          {
            role: "user",
            content: `Here is the last 24h Apple Music/iTunes data: ${JSON.stringify(appleData)}`
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    const aiData = await response.json();
    const insights = JSON.parse(aiData.choices[0].message.content);
    console.log("Generated Apple Insights:", insights);

    // 3. Log agent execution to Supabase
    await supabase.from("agents").upsert({
      agent_name: "Apple Agent",
      division: "Music Marketing",
      artist_name: "silverfoxx2u",
      role: "Apple Music & iTunes",
      last_run: new Date().toISOString()
    }, { onConflict: 'agent_name' });

    // 4. Store metrics
    await supabase.from("music_metrics").insert({
      platform: "apple",
      streams: insights["apple_music_metrics"]?.streams_24h || appleData.streams_24h || 0,
      listeners: insights["apple_music_metrics"]?.new_listeners || appleData.new_listeners || 0,
      revenue: parseFloat((insights["itunes_sales"]?.revenue_24h || "$0").replace('$', '')),
      date: new Date().toISOString().split('T')[0]
    });

    console.log("Apple Agent Execution completed successfully.");
  } catch (error) {
    console.error("Error running Apple Agent:", error);
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/apple-agent' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
