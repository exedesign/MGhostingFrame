#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test extraction from audio-preserved watermarked video
"""

import sys
import os

# Add python directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'python'))

from watermark_processor import WatermarkProcessor

def main():
    print("=" * 60)
    print("WATERMARK EXTRACTION TEST (Audio Preserved Video)")
    print("=" * 60)
    
    # Paths
    watermarked_video = r"C:\Users\FE\MGhostingFrame\test_watermarked_with_audio.mp4"
    
    # Test keys used during embedding
    test_keys = [123, 456, 789, 321]
    
    print(f"\nWatermarked video: {watermarked_video}")
    print(f"Expected keys: {test_keys}")
    print(f"\nStarting extraction...")
    
    processor = WatermarkProcessor()
    
    try:
        result = processor.extract_key_based(
            video_path=watermarked_video,
            keys=test_keys,
            frag_length=1
        )
        
        if result['success']:
            print(f"\n✓ Extraction successful!")
            print(f"   Detected sequence: {result.get('sequence', 'N/A')}")
            print(f"   Expected sequence: [0, 1, 2, 3]")
            
            detected_seq = result.get('sequence', [])
            expected_seq = [0, 1, 2, 3]
            
            if detected_seq == expected_seq:
                print("\n" + "=" * 60)
                print("✓✓✓ PERFECT MATCH: Sequence correctly extracted!")
                print("Audio preservation did NOT affect watermark!")
                print("=" * 60)
            else:
                print("\n" + "=" * 60)
                print("⚠ SEQUENCE MISMATCH")
                print(f"Expected: {expected_seq}")
                print(f"Got: {detected_seq}")
                print("=" * 60)
        else:
            print(f"\n✗ Extraction failed: {result.get('error', 'Unknown error')}")
            
    except Exception as e:
        print(f"\n✗ Exception occurred: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
