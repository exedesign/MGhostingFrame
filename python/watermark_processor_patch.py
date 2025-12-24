# Bu patch image-based watermarking için 0 byte fallback ekler
# line 340 civarında "if temp_size == 0:" bölümünü değiştirir

SEARCH_TEXT = '''            # Check if temp file was created
            if not os.path.exists(temp_output_avi):
                raise FileNotFoundError(f"Temporary output file was not created: {temp_output_avi}")
            
            temp_size = os.path.getsize(temp_output_avi)
            if temp_size == 0:
                raise ValueError(f"Watermark embedding produced empty file: {temp_output_avi}")'''

REPLACE_TEXT = '''            # Check if temp file was created
            if not os.path.exists(temp_output_avi):
                print(json.dumps({
                    "status": "warning",
                    "message": "Blind watermarking library failed, using FFmpeg overlay fallback"
                }), flush=True)
                return self._embed_image_with_ffmpeg_overlay(video_path, output_path, watermark_path, key)
            
            temp_size = os.path.getsize(temp_output_avi)
            if temp_size == 0:
                print(json.dumps({
                    "status": "warning",
                    "message": "Blind watermarking produced empty file, using FFmpeg fallback"
                }), flush=True)
                try:
                    os.remove(temp_output_avi)
                except:
                    pass
                return self._embed_image_with_ffmpeg_overlay(video_path, output_path, watermark_path, key)'''

import sys

# Read file
with open('python/watermark_processor.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Check how many matches
count = content.count(SEARCH_TEXT)
print(f"Found {count} matches")

if count == 2:
    # Replace only the second occurrence (image-based method)
    parts = content.split(SEARCH_TEXT)
    if len(parts) == 3:
        # parts[0] = before first match
        # parts[1] = between first and second match  
        # parts[2] = after second match
        content = parts[0] + SEARCH_TEXT + parts[1] + REPLACE_TEXT + parts[2]
        
        # Write back
        with open('python/watermark_processor.py', 'w', encoding='utf-8') as f:
            f.write(content)
        
        print("✅ Patch applied successfully to image-based method")
    else:
        print("❌ Error: unexpected split result")
else:
    print(f"❌ Error: expected 2 matches, found {count}")
