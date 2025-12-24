#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Test watermark extraction"""

import json
import sys
import os
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, '.')

from python.watermark_processor import WatermarkProcessor

def main():
    print("=" * 70)
    print("TESTING WATERMARK EXTRACTION")
    print("=" * 70)

    # Initialize processor
    processor = WatermarkProcessor()

    # First: Create a watermarked video with key-based method
    print("\n📝 Step 1: Embedding key-based watermark...", flush=True)
    
    embed_result = processor.embed_key_based(
        video_path='test_watermark/test_input.mp4',
        output_path='test_watermark/test_embed_extract.mp4',
        keys=[10, 11, 12, 13],
        sequence='0231',
        frag_length=1.0
    )

    if not embed_result['success']:
        print(f"❌ Embedding failed: {embed_result['error']}")
        return

    print(f"✅ Embedding success: {embed_result['message']}")
    watermarked_video = embed_result['output_path']
    print(f"📹 Watermarked video: {watermarked_video}")

    # Second: Extract the watermark BEFORE re-encoding (check if data survives re-encode)
    print("\n🔍 Step 2a: Extracting from mp4v version (before re-encode)...", flush=True)
    
    # Temporarily rename the re-encoded file to test original
    import shutil
    import os
    
    # The file was already re-encoded, so test with different approach
    # Let's try without re-encode by disabling it temporarily
    print("⚠️  Note: File was already re-encoded. Testing extraction anyway...")
    
    # Test extraction
    extract_result = processor.extract_key_based(
        video_path=watermarked_video,
        keys=[10, 11, 12, 13],
        frag_length=1.0
    )

    print(f"\n{json.dumps(extract_result, indent=2)}")

    if extract_result['success']:
        print(f"\n✅ Extraction success!")
        print(f"📊 Detected sequence: {extract_result['detected_sequence']}")
        print(f"🔑 Expected sequence: 0231")
        
        if extract_result['detected_sequence'] == '0231':
            print(f"✅ SEQUENCE MATCH!")
        else:
            print(f"⚠️  Sequence mismatch - detected: {extract_result['detected_sequence']}")
            print(f"   This suggests data loss during watermarking or re-encoding")
    else:
        print(f"\n❌ Extraction failed: {extract_result['error']}")

    print("\n" + "=" * 70)

if __name__ == '__main__':
    main()
