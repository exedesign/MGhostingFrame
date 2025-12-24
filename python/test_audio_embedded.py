#!/usr/bin/env python3
"""Test audio preservation during watermark embedding"""

import json
from watermark_processor import WatermarkProcessor
import os
import subprocess

# Test directories
test_dir = "test_audio_real"
os.makedirs(test_dir, exist_ok=True)

input_video = os.path.join(test_dir, "input_with_sound.mp4")
output_video = os.path.join(test_dir, "output_with_watermark.mp4")
watermark_img = os.path.join(test_dir, "watermark.png")

# Create watermark if needed
if not os.path.exists(watermark_img):
    import cv2
    import numpy as np
    img = np.ones((100, 100, 3), dtype=np.uint8) * 255
    cv2.imwrite(watermark_img, img)
    print(f"Created watermark: {watermark_img}")

# Check input audio
def get_audio_info(video_path):
    """Get audio info from video using ffprobe"""
    cmd = [
        "C:\\ffmpeg\\bin\\ffprobe.exe",
        "-v", "error",
        "-select_streams", "a:0",
        "-show_entries", "stream=codec_name,sample_rate,channels,bit_rate",
        "-of", "default=noprint_wrappers=1:nokey=1:sep=|",
        video_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode == 0 and result.stdout.strip():
        parts = result.stdout.strip().split("|")
        if parts and parts[0]:
            return {
                "codec": parts[0],
                "sample_rate": parts[1] if len(parts) > 1 else "N/A",
                "channels": parts[2] if len(parts) > 2 else "N/A",
                "bitrate": parts[3] if len(parts) > 3 else "N/A"
            }
    return None

print("=" * 60)
print("AUDIO PRESERVATION TEST")
print("=" * 60)

# Check input audio
input_audio = get_audio_info(input_video)
print(f"\n1. INPUT VIDEO AUDIO:")
print(f"   Path: {input_video}")
if input_audio:
    print(f"   Codec: {input_audio['codec']}")
    print(f"   Sample Rate: {input_audio['sample_rate']}")
    print(f"   Channels: {input_audio['channels']}")
    print(f"   Bitrate: {input_audio['bitrate']}")
else:
    print(f"   No audio found")

# Embed watermark
print(f"\n2. EMBEDDING WATERMARK...")
processor = WatermarkProcessor()
result = processor.embed_image_based(
    video_path=input_video,
    output_path=output_video,
    watermark_path=watermark_img,
    key=0
)

if result['success']:
    print(f"   ✓ Embedding successful")
    print(f"   Output size: {os.path.getsize(output_video)} bytes")
else:
    print(f"   ✗ Embedding failed: {result.get('error', 'Unknown error')}")
    exit(1)

# Check output audio
output_audio = get_audio_info(output_video)
print(f"\n3. OUTPUT VIDEO AUDIO:")
print(f"   Path: {output_video}")
if output_audio:
    print(f"   Codec: {output_audio['codec']}")
    print(f"   Sample Rate: {output_audio['sample_rate']}")
    print(f"   Channels: {output_audio['channels']}")
    print(f"   Bitrate: {output_audio['bitrate']}")
else:
    print(f"   No audio found")

# Compare
print(f"\n4. COMPARISON:")
if input_audio and output_audio:
    codec_match = input_audio['codec'] == output_audio['codec']
    print(f"   Audio codec preserved: {'✓ YES' if codec_match else '✗ NO'}")
    if not codec_match:
        print(f"     Input: {input_audio['codec']} → Output: {output_audio['codec']}")
    
    sr_match = input_audio['sample_rate'] == output_audio['sample_rate']
    print(f"   Sample rate preserved: {'✓ YES' if sr_match else '✗ NO'}")
    if not sr_match:
        print(f"     Input: {input_audio['sample_rate']} → Output: {output_audio['sample_rate']}")
    
    ch_match = input_audio['channels'] == output_audio['channels']
    print(f"   Channels preserved: {'✓ YES' if ch_match else '✗ NO'}")
    if not ch_match:
        print(f"     Input: {input_audio['channels']} → Output: {output_audio['channels']}")
    
    if codec_match and sr_match and ch_match:
        print(f"\n✓ AUDIO PRESERVATION: SUCCESS")
    else:
        print(f"\n✗ AUDIO PRESERVATION: FAILED")
elif input_audio and not output_audio:
    print(f"   ✗ Audio lost during watermarking")
elif not input_audio and not output_audio:
    print(f"   Both input and output have no audio (OK)")
else:
    print(f"   ✗ Audio added when not present in input")

print("=" * 60)
