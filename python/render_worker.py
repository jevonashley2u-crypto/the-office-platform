import os
import time
import json
import ffmpeg
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv('../.env')

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

print("🎬 Silverfoxx2u Content Engine - Render Worker Started")

def process_queue():
    # 1. Fetch pending renders
    response = supabase.table('video_queue').select('*').eq('status', 'pending_render').execute()
    queue = response.data

    if not queue:
        print("No pending videos to render.")
        return

    for item in queue:
        print(f"\nProcessing Video: {item['title']} (ID: {item['id']})")
        
        # 2. Download Raw Material
        raw_file = item['raw_file_path']
        local_raw = f"temp_raw_{item['id']}.mp4"
        
        print(f"Downloading {raw_file} from Supabase...")
        try:
            with open(local_raw, 'wb') as f:
                res = supabase.storage.from_('raw_footage').download(raw_file)
                f.write(res)
        except Exception as e:
            print(f"Failed to download {raw_file}: {e}")
            print("Assuming raw footage missing. Marking as failed.")
            supabase.table('video_queue').update({'status': 'failed'}).eq('id', item['id']).execute()
            continue

        # 3. Process Video with FFmpeg
        local_rendered = f"rendered_{item['id']}.mp4"
        print(f"Rendering video to {local_rendered}...")
        
        try:
            # We crop/scale to 9:16 (vertical format)
            # This is a very basic FFmpeg operation. More complex edits like captions
            # would use ImageMagick drawtext filters.
            stream = ffmpeg.input(local_raw)
            stream = ffmpeg.filter(stream, 'scale', 1080, 1920, force_original_aspect_ratio='increase')
            stream = ffmpeg.filter(stream, 'crop', 1080, 1920)
            stream = ffmpeg.output(stream, local_rendered, vcodec='libx264', acodec='aac', t=15) # 15 second short
            ffmpeg.run(stream, quiet=True, overwrite_output=True)
            print("Render complete!")
        except Exception as e:
            print(f"FFmpeg error: {e}")
            supabase.table('video_queue').update({'status': 'failed'}).eq('id', item['id']).execute()
            continue

        # 4. Upload Rendered Video
        remote_rendered_path = f"{item['concept']}_{item['id']}.mp4"
        print(f"Uploading to Supabase Storage: {remote_rendered_path}")
        
        with open(local_rendered, 'rb') as f:
            supabase.storage.from_('rendered_shorts').upload(remote_rendered_path, f)

        # 5. Update Queue Status to 'ready_to_post' so Agent 8 can pick it up
        supabase.table('video_queue').update({
            'status': 'ready_to_post',
            'rendered_file_path': remote_rendered_path
        }).eq('id', item['id']).execute()

        # Cleanup local files
        if os.path.exists(local_raw): os.remove(local_raw)
        if os.path.exists(local_rendered): os.remove(local_rendered)
        
        print(f"Successfully processed {item['title']}! Handed off to Agent 8.")

if __name__ == "__main__":
    while True:
        process_queue()
        print("Sleeping for 60 seconds...")
        time.sleep(60)
