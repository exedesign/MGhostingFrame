#!/usr/bin/env python3
"""Test extraction with improved error handling"""

import os
import sys
import json
import shutil
import codecs

# Force UTF-8 output on Windows
if sys.platform == 'win32':
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer)

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from watermark_processor import WatermarkProcessor

def test_extract_fixed():
    """Test both embed and extract with fallback handling"""
    
    processor = WatermarkProcessor(strength=0.5)
    
    # Test directories
    test_dir = "test_extraction_fixed"
    if os.path.exists(test_dir):
        shutil.rmtree(test_dir)
    os.makedirs(test_dir, exist_ok=True)
    
    # Use existing test video
    test_video = "test_video.mp4"
    if not os.path.exists(test_video):
        print(f"Creating test video...")
        import cv2
        import numpy as np
        
        # Create simple test video
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(test_video, fourcc, 30.0, (1920, 1080))
        
        for i in range(30):
            frame = np.ones((1080, 1920, 3), dtype=np.uint8) * (i * 8)
            out.write(frame)
        out.release()
        print(f"[OK] Created test video: {test_video}")
    
    # ========== TEST KEY-BASED WATERMARKING ==========
    print("\n" + "="*60)
    print("TEST 1: Key-based watermarking")
    print("="*60)
    
    key_embed_out = os.path.join(test_dir, "key_watermarked.mp4")
    key_embed_result = processor.embed_key_based(
        video_path=test_video,
        output_path=key_embed_out,
        sequence=[0, 2, 3, 1],
        keys=[0, 2, 3, 1],
        frag_length=100
    )
    
    print("\nEmbed Result:")
    print(json.dumps(key_embed_result, indent=2))
    
    if key_embed_result["success"] and os.path.exists(key_embed_out):
        file_size = os.path.getsize(key_embed_out)
        print(f"[OK] Key-based watermarked video created: {file_size} bytes")
        
        # Extract key-based watermark
        print("\n" + "-"*60)
        print("Extracting key-based watermark...")
        print("-"*60)
        
        extract_dir = os.path.join(test_dir, "key_extract")
        key_extract_result = processor.extract_key_based(
            video_path=key_embed_out,
            keys=[0, 2, 3, 1],
            frag_length=100
        )
        
        print("\nExtract Result:")
        print(json.dumps(key_extract_result, indent=2))
        
        if key_extract_result["success"]:
            detected_seq = key_extract_result.get("detected_sequence")
            print(f"[OK] Detected sequence: {detected_seq}")
            
            if detected_seq and "#" not in str(detected_seq) and len(str(detected_seq).strip()) > 0:
                print("[OK][OK] SEQUENCE VALID - Extraction successful!")
            else:
                print("[WARN] SEQUENCE INVALID - Extraction may have failed")
        else:
            print("[ERROR] Key-based extraction failed")
    else:
        print("[ERROR] Key-based watermarking failed")
    
    # ========== TEST IMAGE-BASED WATERMARKING ==========
    print("\n" + "="*60)
    print("TEST 2: Image-based watermarking")
    print("="*60)
    
    # Create a simple watermark image
    import cv2
    import numpy as np
    
    watermark_img = "test_watermark.png"
    if not os.path.exists(watermark_img):
        watermark = np.ones((100, 100, 3), dtype=np.uint8) * 200  # Light gray
        cv2.imwrite(watermark_img, watermark)
        print(f"[OK] Created test watermark: {watermark_img}")
    
    img_embed_out = os.path.join(test_dir, "image_watermarked.mp4")
    img_embed_result = processor.embed_image_based(
        video_path=test_video,
        output_path=img_embed_out,
        watermark_path=watermark_img,
        key=0,
        block_shape=(35, 30)
    )
    
    print("\nEmbed Result:")
    print(json.dumps(img_embed_result, indent=2))
    
    if img_embed_result["success"] and os.path.exists(img_embed_out):
        file_size = os.path.getsize(img_embed_out)
        print(f"[OK] Image-based watermarked video created: {file_size} bytes")
        
        # Extract image-based watermark
        print("\n" + "-"*60)
        print("Extracting image-based watermark...")
        print("-"*60)
        
        extract_dir = os.path.join(test_dir, "image_extract")
        img_extract_result = processor.extract_image_based(
            video_path=img_embed_out,
            output_folder=extract_dir,
            key=0
        )
        
        print("\nExtract Result:")
        print(json.dumps(img_extract_result, indent=2))
        
        if img_extract_result["success"]:
            watermark_path = img_extract_result.get("watermark_path")
            print(f"[OK] Watermark path: {watermark_path}")
            
            if watermark_path and os.path.exists(watermark_path):
                file_size = os.path.getsize(watermark_path)
                print(f"[OK][OK] WATERMARK FILE EXISTS - {file_size} bytes")
            else:
                print("[WARN] Watermark path not valid or file does not exist")
        else:
            print("[ERROR] Image-based extraction failed")
    else:
        print("[ERROR] Image-based watermarking failed")
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    print(f"Test directory: {test_dir}")
    print(f"Files created:")
    for root, dirs, files in os.walk(test_dir):
        for file in files:
            filepath = os.path.join(root, file)
            size = os.path.getsize(filepath)
            print(f"  - {filepath} ({size} bytes)")

if __name__ == "__main__":
    test_extract_fixed()
