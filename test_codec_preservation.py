#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Test codec preservation during watermarking"""

import json
import sys
import cv2
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, '.')

from python.watermark_processor import WatermarkProcessor

def check_codec(video_path):
    """Check video codec"""
    cap = cv2.VideoCapture(video_path)
    if cap.isOpened():
        fourcc = int(cap.get(cv2.CAP_PROP_FOURCC))
        c1 = chr(fourcc & 0xFF)
        c2 = chr((fourcc >> 8) & 0xFF)
        c3 = chr((fourcc >> 16) & 0xFF)
        c4 = chr((fourcc >> 24) & 0xFF)
        codec = (c1+c2+c3+c4).strip()
        size = cap.get(cv2.CAP_PROP_FRAME_COUNT)
        cap.release()
        return codec
    return None

def main():
    print("=" * 60)
    print("TESTING CODEC PRESERVATION - KEY-BASED WATERMARKING")
    print("=" * 60)

    # Initialize processor
    processor = WatermarkProcessor()

    # Check input codec
    input_codec = check_codec('test_watermark/test_input.mp4')
    print(f"\n📹 Input video codec: {input_codec}")

    # Test KEY-BASED watermark instead (simpler, no image size issues)
    print("\n🔄 Starting key-based watermarking...", flush=True)

    result = processor.embed_key_based(
        video_path='test_watermark/test_input.mp4',
        output_path='test_watermark/test_h264_watermarked_key.mp4',
        keys=[10, 11, 12, 13],
        sequence='0231',
        frag_length=1.0
    )

    print("\n" + json.dumps(result, indent=2))

    # Check output codec
    if result['success']:
        output_codec = check_codec(result['output_path'])
        print(f"\n✓ Output video codec: {output_codec}")
        
        if output_codec == input_codec:
            print(f"✅ CODEC PRESERVED: Input {input_codec} == Output {output_codec}")
        else:
            print(f"⚠️  CODEC MISMATCH: Input {input_codec} != Output {output_codec}")
    else:
        print(f"\n❌ Watermarking failed: {result.get('error', 'Unknown error')}")

    print("\n" + "=" * 60)

if __name__ == '__main__':
    main()
