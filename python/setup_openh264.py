#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Setup OpenH264 codec for OpenCV
Downloads and configures OpenH264 DLL for video encoding
"""

import os
import sys
import urllib.request
import bz2
import shutil
from pathlib import Path

import os
import sys
import urllib.request
import bz2
import shutil
from pathlib import Path

# OpenCV versions on Windows are very picky about OpenH264 versions.
# We will try 2.1.1 first (for OpenCV 4.10+), then 1.8.0 (for older 4.x).
VERSIONS_TO_TRY = [
    {"ver": "2.1.1", "name": "openh264-1.8.0-win64.dll"}, # 2.1.1 is often expected as 1.8.0 filename
    {"ver": "1.8.0", "name": "openh264-1.8.0-win64.dll"},
]

def download_and_test(version_info, cv2_path):
    version = version_info["ver"]
    target_name = version_info["name"]
    url = f"http://ciscobinary.openh264.org/openh264-{version}-win64.dll.bz2"
    dll_path = cv2_path / target_name
    bz2_path = cv2_path / f"{target_name}.bz2"

    print(f"\n🔄 Trying OpenH264 v{version}...")
    
    # Remove existing
    if dll_path.exists():
        try:
            dll_path.unlink()
        except:
            # If locked, try to rename
            try:
                temp = dll_path.with_suffix('.old')
                if temp.exists(): temp.unlink()
                dll_path.rename(temp)
            except:
                print(f"❌ File {target_name} is LOCKED. Close the app first!")
                return False

    try:
        print(f"📥 Downloading {version}...")
        urllib.request.urlretrieve(url, bz2_path)
        
        with bz2.open(bz2_path, 'rb') as src:
            with open(dll_path, 'wb') as dst:
                shutil.copyfileobj(src, dst)
        bz2_path.unlink()
        
        # Test
        import cv2
        test_file = "codec_test.mp4"
        fourcc = cv2.VideoWriter_fourcc(*'avc1')
        out = cv2.VideoWriter(test_file, fourcc, 20.0, (640, 480))
        success = out.isOpened()
        if success:
            out.release()
            if os.path.exists(test_file): os.remove(test_file)
            print(f"✅ Success! v{version} works.")
            return True
        else:
            print(f"⚠️ v{version} did not work (VideoWriter failed to open).")
            return False
    except Exception as e:
        print(f"❌ Error with v{version}: {e}")
        return False

def download_openh264():
    print("🎥 MGhosting Codec Setup")
    
    try:
        import cv2
        cv2_path = Path(cv2.__file__).parent
        print(f"✅ OpenCV found at: {cv2_path}")
    except ImportError:
        print("❌ OpenCV not installed")
        return False

    for info in VERSIONS_TO_TRY:
        if download_and_test(info, cv2_path):
            return True
    
    print("\n❌ All OpenH264 versions failed.")
    print("💡 Don't worry, the app will use 'mp4v' fallback automatically.")
    return True # Return true so the script doesn't block

if __name__ == "__main__":
    download_openh264()
    sys.exit(0)
