#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test script for audio preservation during watermarking
"""

import sys
import os
import subprocess

# Add python directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'python'))

from watermark_processor import WatermarkProcessor

def check_audio_streams(video_path, label):
    """Check if video has audio streams"""
    ffprobe = r"C:\Users\FE\MGhostingFrame\ffmpeg\bin\ffprobe.exe"
    cmd = [
        ffprobe, '-v', 'error',
        '-select_streams', 'a:0',
        '-show_entries', 'stream=codec_name',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        video_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    has_audio = bool(result.stdout.strip())
    print(f"{label}: {'✓ HAS AUDIO' if has_audio else '✗ NO AUDIO'} - {result.stdout.strip() if has_audio else 'no audio stream'}")
    return has_audio

def main():
    print("=" * 60)
    print("AUDIO PRESERVATION TEST")
    print("=" * 60)
    
    # Paths
    input_video = r"C:\Users\FE\MGhostingFrame\test_audio_video.mp4"
    output_video = r"C:\Users\FE\MGhostingFrame\test_watermarked_with_audio.mp4"
    
    # Test keys
    test_keys = [123, 456, 789, 321]
    test_sequence = [0, 1, 2, 3]
    
    print(f"\n1. Input video: {input_video}")
    check_audio_streams(input_video, "Original")
    
    print(f"\n2. Starting watermark process...")
    processor = WatermarkProcessor()
    
    try:
        result = processor.embed_key_based(
            video_path=input_video,
            keys=test_keys,
            sequence=test_sequence,
            output_path=output_video,
            frag_length=1
        )
        
        if result['success']:
            print(f"✓ Watermark embedding successful!")
            print(f"   Output: {output_video}")
            
            print(f"\n3. Checking watermarked video...")
            has_audio = check_audio_streams(output_video, "Watermarked")
            
            if has_audio:
                print("\n" + "=" * 60)
                print("✓✓✓ SUCCESS: Audio preserved after watermarking!")
                print("=" * 60)
            else:
                print("\n" + "=" * 60)
                print("✗✗✗ FAILED: Audio was lost during watermarking!")
                print("=" * 60)
        else:
            print(f"✗ Watermark embedding failed: {result.get('error', 'Unknown error')}")
            
    except Exception as e:
        print(f"✗ Exception occurred: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
