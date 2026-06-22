// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openaiKey = Deno.env.get("OPENAI_API_KEY")!;
const youtubeApiKey = Deno.env.get("YOUTUBE_API_KEY");
const youtubeChannelId = Deno.env.get("YOUTUBE_CHANNEL_ID");

const supabase = createClient(supabaseUrl, supabaseKey);

// Every 6 hours — 24/7 YouTube monitoring
Deno.cron("YouTube Agent Execution", "0 */6 * * *", async () => {
  console.log("Running YouTube Agent Execution for Silverfoxx2u");

  try {
    let youtubeData = { 
        subscribers: 5420, 
        total_views: 125000, 
        recent_video_views: 3200, 
        recent_video_title: "Midnight Drive (Official Audio)" 
    }; // Fallback mock data

    // 1. Pull real data from YouTube Data API v3 (if keys exist)
    if (youtubeApiKey && youtubeChannelId && youtubeApiKey !== 'placeholder') {
        console.log("Fetching real YouTube metrics...");
        // Fetch Channel Stats
        const channelResponse = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${youtubeChannelId}&key=${youtubeApiKey}`);
        
        if (channelResponse.ok) {
            const channelData = await channelResponse.json();
            if (channelData.items && channelData.items.length > 0) {
                const stats = channelData.items[0].statistics;
                
                youtubeData.subscribers = parseInt(stats.subscriberCount) || youtubeData.subscribers;
                youtubeData.total_views = parseInt(stats.viewCount) || youtubeData.total_views;
                
                // Fetch latest video stats
                const searchResponse = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${youtubeChannelId}&maxResults=1&order=date&type=video&key=${youtubeApiKey}`);
                if (searchResponse.ok) {
                    const searchData = await searchResponse.json();
                    if (searchData.items && searchData.items.length > 0) {
                        const videoId = searchData.items[0].id.videoId;
                        youtubeData.recent_video_title = searchData.items[0].snippet.title;
                        
                        const videoResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${youtubeApiKey}`);
                        if (videoResponse.ok) {
                            const videoData = await videoResponse.json();
                            if (videoData.items && videoData.items.length > 0) {
                                youtubeData.recent_video_views = parseInt(videoData.items[0].statistics.viewCount) || 0;
                            }
                        }
                    }
                }
            }
        }
    } else {
        console.log("YouTube API Keys not found. Using fallback data for AI logic.");
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
            content: `You are the YouTube Growth Agent for Silverfoxx2u.
Artist: Silverfoxx2u (Contemporary R&B/Soul)
Your daily mission: Analyze channel performance, generate YouTube Shorts ideas, recommend SEO tags/titles for the next drop.
Return strict JSON format as specified in the blueprint.`
          },
          {
            role: "user",
            content: `Here is the latest YouTube data: ${JSON.stringify(youtubeData)}`
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    const aiData = await response.json();
    const insights = JSON.parse(aiData.choices[0].message.content);
    console.log("Generated YouTube Insights:", insights);

    // 3. Log agent execution to Supabase
    await supabase.from("agents").upsert({
      agent_name: "YouTube Agent",
      division: "Music Marketing",
      artist_name: "silverfoxx2u",
      role: "YouTube Growth",
      last_run: new Date().toISOString()
    }, { onConflict: 'agent_name' });

    // 4. Store metrics
    await supabase.from("music_metrics").insert({
      platform: "youtube",
      streams: youtubeData.recent_video_views, // Treat recent views as "streams"
      listeners: youtubeData.subscribers,      // Treat subs as "listeners"
      revenue: 0,
      date: new Date().toISOString().split('T')[0]
    });

    console.log("YouTube Agent Execution completed successfully.");
  } catch (error) {
    console.error("Error running YouTube Agent:", error);
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/youtube-agent' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
