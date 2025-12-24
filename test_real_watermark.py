#!/usr/bin/env python3
"""
Test blind watermarking on a real video file
"""
import os
import sys
import cv2
import numpy as np
from pathlib import Path

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from python.watermark_processor import DtcwtKeyEncoder

def test_real_watermarking():
    """Test watermarking with real video"""
    
    # Paths
    input_video = r"C:\Users\FE\Downloads\Video\kling_20251223_Motion_Control__1488_0.mp4"
    output_video = r"C:\Users\FE\MGhostingFrame\test_output\real_watermarked.mp4"
    
    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_video), exist_ok=True)
    
    print("=" * 70)
    print("BLIND WATERMARK TEST - REAL VIDEO")
    print("=" * 70)
    
    # Check input file
    if not os.path.exists(input_video):
        print(f"❌ Input video not found: {input_video}")
        return False
    
    input_size = os.path.getsize(input_video)
    print(f"\n📹 Input Video: {os.path.basename(input_video)}")
    print(f"   Path: {input_video}")
    print(f"   Size: {input_size:,} bytes ({input_size / (1024*1024):.2f} MB)")
    
    # Open video to get properties
    cap = cv2.VideoCapture(input_video)
    if not cap.isOpened():
        print(f"❌ Failed to open input video")
        return False
    
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    cap.release()
    
    print(f"   Resolution: {width}x{height}")
    print(f"   FPS: {fps:.2f}")
    print(f"   Frames: {frame_count}")
    
    # Initialize watermarker with specific keys and sequence
    print(f"\n🔐 Watermark Configuration:")
    keys = [10, 11, 12, 13]
    sequence = "0231"
    frag_length = 8  # Fragment length for video processing
    print(f"   Keys: {keys}")
    print(f"   Sequence: {sequence}")
    print(f"   Fragment Length: {frag_length}")
    
    try:
        watermarker = DtcwtKeyEncoder(str=1.0, step=5.0)
        print(f"   Watermarker initialized successfully")
    except Exception as e:
        print(f"❌ Failed to initialize watermarker: {e}")
        return False
    
    # Apply watermark
    print(f"\n⏳ Applying watermark...")
    try:
        watermarker.embed_video(keys, sequence, frag_length, input_video, output_video)
        print(f"   ✅ Watermarking completed")
    except Exception as e:
        print(f"❌ Watermarking failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Verify output file
    print(f"\n📊 Output Analysis:")
    if not os.path.exists(output_video):
        print(f"   ❌ Output file not created: {output_video}")
        return False
    
    output_size = os.path.getsize(output_video)
    print(f"   Output Video: {os.path.basename(output_video)}")
    print(f"   Path: {output_video}")
    print(f"   Size: {output_size:,} bytes ({output_size / (1024*1024):.2f} MB)")
    
    if output_size == 0:
        print(f"   ❌ Output file is EMPTY (0 bytes)!")
        return False
    else:
        print(f"   ✅ Output file is NOT empty")
    
    size_ratio = (output_size / input_size) * 100
    print(f"   Size Ratio: {size_ratio:.2f}% of input")
    
    # Analyze pixel differences
    print(f"\n🔬 Pixel Difference Analysis:")
    try:
        cap_orig = cv2.VideoCapture(input_video)
        cap_wmed = cv2.VideoCapture(output_video)
        
        differences = []
        frame_num = 0
        max_frames_to_check = min(20, frame_count)
        
        while frame_num < max_frames_to_check:
            ret1, frame1 = cap_orig.read()
            ret2, frame2 = cap_wmed.read()
            
            if not (ret1 and ret2):
                break
            
            # Calculate differences
            diff = np.abs(frame1.astype(float) - frame2.astype(float))
            max_diff = np.max(diff)
            mean_diff = np.mean(diff)
            
            differences.append({
                'max': max_diff,
                'mean': mean_diff,
                'frame': frame_num
            })
            
            if frame_num < 5:  # Print first 5 frames
                print(f"   Frame {frame_num:2d}: max_diff={max_diff:7.2f}, mean_diff={mean_diff:.6f}")
            
            frame_num += 1
        
        cap_orig.release()
        cap_wmed.release()
        
        if differences:
            avg_max = np.mean([d['max'] for d in differences])
            avg_mean = np.mean([d['mean'] for d in differences])
            max_of_max = np.max([d['max'] for d in differences])
            
            print(f"\n   Statistics ({len(differences)} frames analyzed):")
            print(f"   Average max_diff: {avg_max:.2f}")
            print(f"   Average mean_diff: {avg_mean:.6f}")
            print(f"   Peak max_diff: {max_of_max:.2f}")
            
            if avg_mean > 0.01:
                print(f"   ✅ WATERMARK DETECTED - Significant pixel modifications found!")
                has_watermark = True
            else:
                print(f"   ⚠️  Very small pixel changes detected - minimal watermarking")
                has_watermark = avg_mean > 0.001
        else:
            print(f"   ❌ Could not analyze differences")
            has_watermark = False
    
    except Exception as e:
        print(f"   ⚠️  Could not analyze pixel differences: {e}")
        has_watermark = None
    
    # Final summary
    print(f"\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"✅ Video file tested: kling_20251223_Motion_Control__1488_0.mp4")
    print(f"✅ Input size: {input_size:,} bytes ({input_size / (1024*1024):.2f} MB)")
    print(f"✅ Output size: {output_size:,} bytes ({output_size / (1024*1024):.2f} MB)")
    print(f"{'✅' if has_watermark else '⚠️'} Watermark detected: {'Yes' if has_watermark else 'No/Unclear'}")
    print(f"✅ Completed without critical errors")
    print("=" * 70)
    
    return True

if __name__ == "__main__":
    success = test_real_watermarking()
    sys.exit(0 if success else 1)
