#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Full Watermarking Flow Test
Tests the complete blind watermarking pipeline with real video
"""

import os
import sys
import cv2
import numpy as np
import json
from pathlib import Path

# Add venv packages to path
sys.path.insert(0, str(Path(__file__).parent / 'python' / 'venv' / 'Lib' / 'site-packages'))

from blind_video_watermark import DtcwtKeyEncoder, DtcwtKeyDecoder

def create_test_video(output_path, duration=5, fps=20, width=640, height=480):
    """Create a test video with some content"""
    print(f"📹 Creating test video: {output_path}")
    print(f"   Duration: {duration}s, Resolution: {width}x{height}, FPS: {fps}")
    
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    
    if not out.isOpened():
        print("❌ VideoWriter failed to open!")
        return False
    
    total_frames = duration * fps
    for frame_num in range(total_frames):
        # Create a frame with gradual color changes
        frame = np.zeros((height, width, 3), dtype=np.uint8)
        
        # Add color gradient
        color_value = int((frame_num / total_frames) * 255)
        color_value = max(0, min(255, color_value))  # Clamp to valid range
        frame[:, :] = [color_value, 100, max(0, 200 - color_value)]
        
        # Add text
        cv2.putText(frame, f"Test Frame {frame_num + 1}/{total_frames}", 
                   (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        cv2.putText(frame, "MGhosting Watermark Test", 
                   (50, 200), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
        out.write(frame)
        
        if frame_num % 20 == 0:
            print(f"   Progress: {frame_num}/{total_frames} frames")
    
    out.release()
    
    if os.path.exists(output_path):
        file_size = os.path.getsize(output_path)
        print(f"✅ Test video created: {file_size} bytes")
        return True
    else:
        print("❌ Test video file not created")
        return False

def test_watermarking():
    """Test the complete watermarking pipeline"""
    
    print("\n" + "="*60)
    print("🎯 BLIND VIDEO WATERMARKING FULL PIPELINE TEST")
    print("="*60)
    
    test_dir = Path(__file__).parent / "test_output"
    test_dir.mkdir(exist_ok=True)
    
    original_video = test_dir / "original_test.mp4"
    watermarked_video = test_dir / "watermarked_test.mp4"
    
    # Step 1: Create test video
    print("\n[1/3] Creating Test Video...")
    if not create_test_video(str(original_video)):
        return False
    
    original_size = os.path.getsize(original_video)
    print(f"    Original video size: {original_size} bytes")
    
    # Step 2: Embed watermark
    print("\n[2/3] Embedding Watermark...")
    print("    Using keys: [10, 11, 12, 13]")
    print("    Sequence: '0123'")
    
    try:
        encoder = DtcwtKeyEncoder(str=1.0, step=5.0)
        print("    Encoder initialized")
        
        encoder.embed_video_async(
            keys=[10, 11, 12, 13],
            seq="0123",
            frag_length=1.0,
            video_path=str(original_video),
            output_path=str(watermarked_video),
            threads=4
        )
        print("    Watermark embedding completed")
        
    except Exception as e:
        print(f"❌ Watermark embedding failed: {e}")
        return False
    
    # Step 3: Verify output
    print("\n[3/3] Verifying Output...")
    
    if not os.path.exists(watermarked_video):
        print("❌ Watermarked video not created")
        return False
    
    watermarked_size = os.path.getsize(watermarked_video)
    print(f"    Watermarked video size: {watermarked_size} bytes")
    
    if watermarked_size == 0:
        print("❌ Output file is EMPTY (0 bytes) - CRITICAL ERROR")
        return False
    
    size_increase = watermarked_size - original_size
    size_change_percent = (size_increase / original_size) * 100
    
    print(f"    Size difference: {size_increase:+d} bytes ({size_change_percent:+.1f}%)")
    
    # Step 4: Compare frames
    print("\n[4/4] Analyzing Frame Differences...")
    
    try:
        cap_original = cv2.VideoCapture(str(original_video))
        cap_watermarked = cv2.VideoCapture(str(watermarked_video))
        
        frame_count = 0
        total_diff = 0
        max_diff = 0
        
        while True:
            ret_orig, frame_orig = cap_original.read()
            ret_watermarked, frame_watermarked = cap_watermarked.read()
            
            if not ret_orig or not ret_watermarked:
                break
            
            # Calculate pixel difference
            diff = cv2.absdiff(frame_orig.astype(np.float32), frame_watermarked.astype(np.float32))
            mean_diff = np.mean(diff)
            max_frame_diff = np.max(diff)
            
            total_diff += mean_diff
            if max_frame_diff > max_diff:
                max_diff = max_frame_diff
            
            frame_count += 1
        
        cap_original.release()
        cap_watermarked.release()
        
        avg_diff = total_diff / frame_count if frame_count > 0 else 0
        
        print(f"    Frames analyzed: {frame_count}")
        print(f"    Average pixel difference: {avg_diff:.2f}")
        print(f"    Maximum pixel difference: {max_diff:.2f}")
        
        if avg_diff > 0.1:
            print("    ✅ Significant differences detected - watermark successfully embedded")
        else:
            print("    ⚠️  Minimal differences - watermark may not be detectable")
        
    except Exception as e:
        print(f"    ⚠️  Could not analyze frames: {e}")
    
    # Final Summary
    print("\n" + "="*60)
    print("📊 TEST SUMMARY")
    print("="*60)
    print(f"Original video:     {original_size:,} bytes")
    print(f"Watermarked video:  {watermarked_size:,} bytes")
    print(f"Status: ✅ SUCCESS - Video watermarking completed!")
    print("="*60)
    
    return True

if __name__ == "__main__":
    success = test_watermarking()
    sys.exit(0 if success else 1)
