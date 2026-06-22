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

        # 3. Parse Editing Metadata
        ai_metadata = item.get('ai_metadata', {})
        editing = ai_metadata.get('editing_metadata', {})
        
        duration = editing.get('duration', 15)
        color = editing.get('color_grade', {'contrast': 1.0, 'brightness': 0.0, 'saturation': 1.0})
        texts = editing.get('text_overlays', [])

        local_rendered = f"rendered_{item['id']}.mp4"
        print(f"Rendering video ({duration}s) to {local_rendered}...")
        
        try:
            # Base stream: Scale to 9:16 and crop
            stream = ffmpeg.input(local_raw)
            stream = ffmpeg.filter(stream, 'scale', 1080, 1920, force_original_aspect_ratio='increase')
            stream = ffmpeg.filter(stream, 'crop', 1080, 1920)

            # Apply Color Grading
            stream = ffmpeg.filter(stream, 'eq', contrast=color.get('contrast', 1.0), brightness=color.get('brightness', 0.0), saturation=color.get('saturation', 1.0))

            # Apply Text Overlays
            # Using standard Mac fonts (Arial Black or Helvetica). If not found, ffmpeg will throw, so we keep it simple or use a fallback.
            font_path = "/System/Library/Fonts/Helvetica.ttc"
            if not os.path.exists(font_path):
                 font_path = "/Library/Fonts/Arial.ttf" # Fallback

            for text_data in texts:
                start_t = text_data.get('start_time', 0)
                end_t = text_data.get('end_time', 5)
                text_content = text_data.get('text', '').replace("'", "")
                font_size = text_data.get('font_size', 72)
                y_pos = text_data.get('y_position', '(h-text_h)/2')

                if text_content and os.path.exists(font_path):
                    stream = ffmpeg.filter(
                        stream, 'drawtext',
                        fontfile=font_path,
                        text=text_content,
                        fontsize=font_size,
                        fontcolor='white',
                        box=1, boxcolor='black@0.5', boxborderw=10,
                        x='(w-text_w)/2', y=y_pos,
                        enable=f'between(t,{start_t},{end_t})'
                    )

            stream = ffmpeg.output(stream, local_rendered, vcodec='libx264', acodec='aac', t=duration)
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
