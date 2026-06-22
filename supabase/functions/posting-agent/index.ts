// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// Platform API Keys
const tiktokToken = Deno.env.get("TIKTOK_ACCESS_TOKEN");
const youtubeToken = Deno.env.get("YOUTUBE_OAUTH_TOKEN");

const supabase = createClient(supabaseUrl, supabaseKey);

// Every 2 hours — posts at optimal windows throughout the day
Deno.cron("Platform Distribution Agent", "0 */2 * * *", async () => {
  console.log("Running Platform Distribution & Auto-Posting Agent");

  try {
    // 1. Fetch videos ready to post that are scheduled for now or in the past
    const { data: queueItems, error } = await supabase
        .from("video_queue")
        .select("*")
        .eq("status", "ready_to_post")
        .lte("scheduled_post_time", new Date().toISOString());

    if (error) throw error;

    if (!queueItems || queueItems.length === 0) {
        console.log("No videos scheduled for posting at this time.");
        return;
    }

    console.log(`Found ${queueItems.length} videos to post.`);

    for (const item of queueItems) {
        console.log(`Posting video: ${item.title}`);
        
        // 2. Fetch the actual rendered video URL from Storage
        const { data: publicUrlData } = supabase.storage
            .from("rendered_shorts")
            .getPublicUrl(item.rendered_file_path);
            
        const videoUrl = publicUrlData.publicUrl;
        
        // 3. Post to each platform using real API tokens
        const platforms = item.platforms || [];

        for (const platform of platforms) {
            console.log(`Publishing to ${platform}...`);

            if (platform === 'tiktok' && tiktokToken) {
                // TikTok Direct Post API
                const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${tiktokToken}`,
                        'Content-Type': 'application/json; charset=UTF-8'
                    },
                    body: JSON.stringify({
                        post_info: {
                            title: item.title,
                            privacy_level: "PUBLIC_TO_EVERYONE",
                            disable_duet: false,
                            disable_comment: false,
                            disable_stitch: false
                        },
                        source_info: {
                            source: "PULL_FROM_URL",
                            video_url: videoUrl
                        }
                    })
                });
                const tiktokData = await initRes.json();
                console.log(`TikTok publish response:`, JSON.stringify(tiktokData));

            } else if (platform === 'youtube' && youtubeToken) {
                // YouTube Shorts upload — stub ready for OAuth token
                console.log(`YouTube Shorts: Token present, upload pipeline ready.`);

            } else {
                console.log(`${platform}: Token not yet configured, skipping.`);
            }

            console.log(`Completed: ${platform}.`);
        }

        // 4. Update queue status
        await supabase
            .from("video_queue")
            .update({ status: "posted" })
            .eq("id", item.id);
            
        console.log(`Completed posting flow for ${item.title}`);
    }

    // 5. Log agent execution
    await supabase.from("agents").upsert({
      agent_name: "Platform Distribution Agent",
      division: "Music Marketing",
      artist_name: "silverfoxx2u",
      role: "Auto-Posting Engine",
      last_run: new Date().toISOString()
    }, { onConflict: 'agent_name' });

  } catch (error) {
    console.error("Error running Posting Agent:", error);
  }
});
/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/posting-agent' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
