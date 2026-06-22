// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
// import "jsr:@supabase/functions-js/edge-runtime.setup.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openaiKey = Deno.env.get("OPENAI_API_KEY")!;
const spotifyClientId = Deno.env.get("SPOTIFY_CLIENT_ID");
const spotifyClientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET");

const supabase = createClient(supabaseUrl, supabaseKey);

// Every 6 hours — 24/7 stream monitoring
Deno.cron("Spotify Agent Execution", "0 */6 * * *", async () => {
  console.log("Running Spotify Agent Execution for Silverfoxx2u");

  try {
    let spotifyData = { streams: 2400, listeners: 650, saves: 28, playlist_adds: 5 }; // Fallback mock data
    
    // 1. Pull real data from Spotify API (if keys exist)
    if (spotifyClientId && spotifyClientSecret && spotifyClientId !== 'placeholder') {
        console.log("Fetching real Spotify metrics...");
        // Get Spotify Access Token
        const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": "Basic " + btoa(`${spotifyClientId}:${spotifyClientSecret}`)
            },
            body: "grant_type=client_credentials"
        });
        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        // Fetch Silverfoxx2u Spotify Artist Data (Example Artist ID: replace with actual)
        // For now, doing a generic search to find the artist stats
        const searchResponse = await fetch(`https://api.spotify.com/v1/search?q=Silverfoxx2u&type=artist&limit=1`, {
            headers: { "Authorization": `Bearer ${accessToken}` }
        });
        const searchData = await searchResponse.json();
        
        if (searchData.artists && searchData.artists.items.length > 0) {
            const artist = searchData.artists.items[0];
            spotifyData = {
                followers: artist.followers.total,
                popularity: artist.popularity,
                genres: artist.genres,
                ...spotifyData // Keep mock stream stats since Web API doesn't provide stream counts directly without partner API
            };
        }
    } else {
        console.log("Spotify keys not found. Using fallback data for AI logic.");
    }

    // 2. Call OpenAI to analyze metrics and generate pitches
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
            content: `You are the Spotify Growth Agent for Silverfoxx2u.
Artist: Silverfoxx2u (Contemporary R&B / Soul)
Your daily mission: Analyze 24h Spotify data, generate playlist pitches, recommend metadata tweaks.
Return strict JSON format as specified in the blueprint.`
          },
          {
            role: "user",
            content: `Here is the last 24h Spotify data for Silverfoxx2u: ${JSON.stringify(spotifyData)}`
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    const aiData = await response.json();
    const insights = JSON.parse(aiData.choices[0].message.content);
    console.log("Generated Insights:", insights);

    // 3. Log agent execution to Supabase
    await supabase.from("agents").upsert({
      agent_name: "Spotify Agent",
      division: "Music Marketing",
      artist_name: "silverfoxx2u",
      role: "Spotify Growth",
      last_run: new Date().toISOString()
    }, { onConflict: 'agent_name' });

    // 4. Store metrics in Supabase
    await supabase.from("music_metrics").insert({
      platform: "spotify",
      streams: insights["24h_metrics"]?.streams || spotifyData.streams || 0,
      listeners: insights["24h_metrics"]?.listeners || spotifyData.listeners || 0,
      saves: insights["24h_metrics"]?.saves || spotifyData.saves || 0,
      playlist_adds: insights["24h_metrics"]?.playlist_adds || spotifyData.playlist_adds || 0,
      date: new Date().toISOString().split('T')[0]
    });

    console.log("Spotify Agent Execution completed successfully.");
  } catch (error) {
    console.error("Error running Spotify Agent:", error);
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/spotify-agent' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
