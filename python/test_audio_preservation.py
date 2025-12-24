#!/usr/bin/env python3
"""Test audio preservation in watermarking"""

import os
import sys
import json
import subprocess
import shutil

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from watermark_processor import WatermarkProcessor

def get_audio_info(video_path):
    """Extract audio info using ffprobe"""
    try:
        ffprobe = shutil.which('ffprobe')
        if not ffprobe:
            return None
        
        cmd = [
            ffprobe,
            '-v', 'error',
            '-select_streams', 'a:0',
            '-show_entries', 'stream=codec_name,sample_rate,channels,bit_rate',
            '-of', 'default=noprint_wrappers=1:nokey=1:sep=|',
            video_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        if result.returncode == 0 and result.stdout.strip():
            parts = result.stdout.strip().split('|')
            return {
                'codec': parts[0] if parts[0] else 'NONE',
                'sample_rate': parts[1] if parts[1] else 'N/A',
                'channels': parts[2] if parts[2] else 'N/A',
                'bitrate': parts[3] if len(parts) > 3 and parts[3] else 'N/A'
            }
        return {'codec': 'NONE'}
    except:
        return None

def create_test_video_with_audio(filename, with_audio=True):
    """Create a test video with or without audio"""
    try:
        import cv2
        import numpy as np
        
        # Create video using OpenCV
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(filename, fourcc, 30.0, (640, 480))
        
        for i in range(30):
            frame = np.ones((480, 640, 3), dtype=np.uint8) * (i * 8)
            out.write(frame)
        out.release()
        
        if with_audio:
            # Add audio track using FFmpeg
            temp_file = filename.replace('.mp4', '_with_audio.mp4')
            ffmpeg = shutil.which('ffmpeg')
            
            if ffmpeg:
                # Generate silence audio (aac codec)
                cmd = [
                    ffmpeg,
                    '-f', 'lavfi',
                    '-i', 'anullsrc=r=44100:cl=stereo',
                    '-i', filename,
                    '-c:v', 'copy',
                    '-c:a', 'aac',
                    '-t', '1',  # 1 second duration
                    '-y',
                    temp_file
                ]
                
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
                if result.returncode == 0:
                    os.remove(filename)
                    os.rename(temp_file, filename)
                    return True
        
        return True
        
    except Exception as e:
        print(f"Error creating test video: {e}")
        return False

def test_audio_preservation():
    """Test that audio is preserved during watermarking"""
    
    processor = WatermarkProcessor(strength=0.5)
    test_dir = "test_audio_preservation"
    
    if os.path.exists(test_dir):
        shutil.rmtree(test_dir)
    os.makedirs(test_dir, exist_ok=True)
    
    # Test 1: Video with audio
    print("[TEST 1] Video with audio")
    print("=" * 60)
    
    input_video = os.path.join(test_dir, "input_with_audio.mp4")
    output_video = os.path.join(test_dir, "output_with_audio.mp4")
    
    # Create test video with audio
    print("Creating test video with audio...")
    create_test_video_with_audio(input_video, with_audio=True)
    
    # Check input audio
    input_audio = get_audio_info(input_video)
    print(f"\nInput audio info: {input_audio}")
    
    # Embed watermark
    print("\nEmbedding watermark...")
    watermark_img = os.path.join(test_dir, "watermark.png")
    import cv2
    import numpy as np
    cv2.imwrite(watermark_img, np.ones((100, 100, 3), dtype=np.uint8) * 200)
    
    result = processor.embed_image_based(
        video_path=input_video,
        output_path=output_video,
        watermark_path=watermark_img,
        key=0,
        block_shape=(35, 30)
    )
    
    print(f"Embed result: {json.dumps(result, indent=2)}")
    
    # Check output audio
    if os.path.exists(output_video):
        output_audio = get_audio_info(output_video)
        print(f"\nOutput audio info: {output_audio}")
        
        if input_audio and output_audio:
            if input_audio.get('codec') == output_audio.get('codec'):
                print("[OK] Audio codec preserved!")
            else:
                print(f"[WARN] Audio codec changed: {input_audio.get('codec')} -> {output_audio.get('codec')}")
        elif not input_audio and not output_audio:
            print("[OK] Both have no audio")
    
    # Test 2: Video without audio
    print("\n" + "=" * 60)
    print("[TEST 2] Video without audio")
    print("=" * 60)
    
    input_video2 = os.path.join(test_dir, "input_no_audio.mp4")
    output_video2 = os.path.join(test_dir, "output_no_audio.mp4")
    
    # Create test video without audio
    print("Creating test video without audio...")
    create_test_video_with_audio(input_video2, with_audio=False)
    
    # Check input audio
    input_audio2 = get_audio_info(input_video2)
    print(f"\nInput audio info: {input_audio2}")
    
    # Embed watermark
    print("\nEmbedding watermark...")
    result2 = processor.embed_image_based(
        video_path=input_video2,
        output_path=output_video2,
        watermark_path=watermark_img,
        key=0,
        block_shape=(35, 30)
    )
    
    print(f"Embed result: {json.dumps(result2, indent=2)}")
    
    # Check output audio
    if os.path.exists(output_video2):
        output_audio2 = get_audio_info(output_video2)
        print(f"\nOutput audio info: {output_audio2}")
        
        if not input_audio2 and not output_audio2:
            print("[OK] Both have no audio - correct!")
        else:
            print("[WARN] Audio added when not expected")
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Test directory: {test_dir}")
    print("Check audio preservation in output files")

if __name__ == "__main__":
    test_audio_preservation()
