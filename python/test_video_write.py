#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Test script to verify video reading and writing capability
"""

import sys
import cv2
import os

def test_video_copy(input_path, output_path):
    """Test if OpenCV can read and write video files"""
    
    print(f"Testing video copy...")
    print(f"Input: {input_path}")
    print(f"Output: {output_path}")
    
    # Check input
    if not os.path.exists(input_path):
        print(f"ERROR: Input file not found!")
        return False
    
    print(f"Input file size: {os.path.getsize(input_path)} bytes")
    
    # Open video
    cap = cv2.VideoCapture(input_path)
    
    if not cap.isOpened():
        print(f"ERROR: Cannot open video file!")
        return False
    
    # Get properties
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    print(f"Video properties:")
    print(f"  Resolution: {width}x{height}")
    print(f"  FPS: {fps}")
    print(f"  Frame count: {frame_count}")
    
    # Try different codecs
    codecs = [
        ('mp4v', cv2.VideoWriter_fourcc(*'mp4v')),
        ('avc1', cv2.VideoWriter_fourcc(*'avc1')),
        ('H264', cv2.VideoWriter_fourcc(*'H264')),
        ('X264', cv2.VideoWriter_fourcc(*'X264')),
        ('MJPG', cv2.VideoWriter_fourcc(*'MJPG')),
    ]
    
    success = False
    for codec_name, fourcc in codecs:
        print(f"\nTrying codec: {codec_name}")
        test_output = output_path.replace('.mp4', f'_{codec_name}.mp4')
        
        # Create writer
        out = cv2.VideoWriter(test_output, fourcc, fps, (width, height))
        
        if not out.isOpened():
            print(f"  Failed to create writer with {codec_name}")
            continue
        
        # Reset video
        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
        
        # Copy frames (max 30 frames for test)
        frames_written = 0
        max_frames = min(30, frame_count)
        
        for i in range(max_frames):
            ret, frame = cap.read()
            if not ret:
                break
            out.write(frame)
            frames_written += 1
        
        out.release()
        
        # Check output
        if os.path.exists(test_output):
            output_size = os.path.getsize(test_output)
            print(f"  Output created: {output_size} bytes ({frames_written} frames)")
            
            if output_size > 0:
                success = True
                print(f"  ✅ SUCCESS with {codec_name}!")
                
                # Verify with OpenCV
                test_cap = cv2.VideoCapture(test_output)
                if test_cap.isOpened():
                    test_frames = int(test_cap.get(cv2.CAP_PROP_FRAME_COUNT))
                    print(f"  Verification: {test_frames} frames readable")
                    test_cap.release()
            else:
                print(f"  ❌ Output file is EMPTY (0 bytes)")
        else:
            print(f"  Output file not created")
    
    cap.release()
    return success

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python test_video_write.py <input_video> <output_video>")
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    
    result = test_video_copy(input_path, output_path)
    sys.exit(0 if result else 1)
