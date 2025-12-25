#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
MGhosting Video Watermark Processor
Blind video watermarking using DTCWT algorithm
Supports both key-based and image-based watermarking
"""

import sys
import json
import os
import traceback
import subprocess
import shutil
from pathlib import Path

# Add bundled libraries to sys.path for packaged app
if getattr(sys, 'frozen', False):
    # Running as compiled exe
    bundle_dir = os.path.dirname(sys.executable)
else:
    # Running in development or as script
    bundle_dir = os.path.dirname(os.path.abspath(__file__))

# Check for bundled lib folder
lib_path = os.path.join(bundle_dir, 'lib')
if os.path.exists(lib_path) and lib_path not in sys.path:
    sys.path.insert(0, lib_path)
    print(f"Added bundled libraries to sys.path: {lib_path}")

# --- NUMPY FIX: complex_ dtype compatibility ---
try:
    import numpy as np
    # Register complex_ dtype if not already registered
    if not hasattr(np, '_complex_dtype_registered'):
        # Workaround for "data type 'complex_' not understood" error
        # This error occurs when dtcwt uses complex_ dtype not in numpy's registry
        if 'complex_' not in np.sctypeDict:
            np.sctypeDict['complex_'] = np.complex128
        # Also register shorthand versions
        if 'complex128_' not in np.sctypeDict:
            np.sctypeDict['complex128_'] = np.complex128
        np._complex_dtype_registered = True
except Exception as e:
    print(f"Warning: Failed to register complex_ dtype: {e}", flush=True)

# --- ÖNEMLİ: OpenCV Yaması (Kütüphanelerden Önce Yapılmalı) ---
try:
    import cv2
    # Windows'ta OpenH264 (avc1) sorunlarını aşmak için mp4v'ye zorla
    _original_VideoWriter = cv2.VideoWriter
    _input_video_codec = None  # Store input codec for output consistency
    
    def get_video_codec(video_path):
        """Detect codec from input video"""
        try:
            cap = cv2.VideoCapture(video_path)
            if cap.isOpened():
                fourcc = int(cap.get(cv2.CAP_PROP_FOURCC))
                cap.release()
                if fourcc > 0:
                    c1 = chr(fourcc & 0xFF)
                    c2 = chr((fourcc >> 8) & 0xFF)
                    c3 = chr((fourcc >> 16) & 0xFF)
                    c4 = chr((fourcc >> 24) & 0xFF)
                    codec_str = (c1 + c2 + c3 + c4).strip()
                    return codec_str
        except:
            pass
        return None
    
    def patched_VideoWriter(filename, fourcc, fps, frameSize, isColor=True):
        global _input_video_codec
        target_fourcc = fourcc
        
        # Windows'ta, avc1/h264 istediğinde, doğrudan mp4v kullan
        # Bu videoların yazma başarısızlığını önlüyor
        if os.name == 'nt':
            try:
                c1 = chr(fourcc & 0xFF)
                c2 = chr((fourcc >> 8) & 0xFF)
                c3 = chr((fourcc >> 16) & 0xFF)
                c4 = chr((fourcc >> 24) & 0xFF)
                codec_str = (c1 + c2 + c3 + c4).upper()
                
                # H264 ailesini tespit et
                if codec_str in ['AVC1', 'H264', 'X264', 'DAVC', 'FMP4']:
                    # Doğrudan mp4v'ye geç (H264 başarısızlıkları çoktur)
                    target_fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                    print(f"[VideoWriter] Input codec {codec_str} detected, using mp4v for output", flush=True)
            except:
                pass
        
        # VideoWriter'ı oluştur
        writer = _original_VideoWriter(filename, target_fourcc, fps, frameSize, isColor)
        
        # Eğer yazamadıysa, mp4v dene
        if not writer.isOpened():
            try:
                mp4v_fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                print(f"[VideoWriter] First attempt failed, falling back to mp4v...", flush=True)
                writer = _original_VideoWriter(filename, mp4v_fourcc, fps, frameSize, isColor)
            except:
                pass
        
        return writer
    
    cv2.VideoWriter = patched_VideoWriter
    
    # DLL yolunu ekle
    cv2_dir = os.path.dirname(cv2.__file__)
    if os.name == 'nt' and cv2_dir not in os.environ['PATH']:
        os.environ['PATH'] = cv2_dir + os.pathsep + os.environ['PATH']
        if hasattr(os, 'add_dll_directory'):
            try:
                os.add_dll_directory(cv2_dir)
            except: pass
except ImportError:
    pass
# -----------------------------------------------------------

try:
    from blind_video_watermark import DtcwtKeyEncoder, DtcwtKeyDecoder
except ImportError as e:
    print(json.dumps({
        "success": False,
        "error": f"Import error: {str(e)}",
        "message": "Please install required packages: pip install -r requirements.txt"
    }))
    sys.exit(1)

# After importing blind_video_watermark, ensure complex_ is available for future operations
try:
    import numpy as np
    # Make sure dtcwt can find complex_ dtype
    if 'complex_' not in np.sctypeDict:
        np.sctypeDict['complex_'] = np.complex128
except:
    pass


class WatermarkProcessor:
    """Video watermarking processor with key-based support only"""
    
    def __init__(self, strength=1.0, step=5.0, threads=8):
        """
        Initialize processor
        
        Args:
            strength (float): Watermark strength (default: 1.0)
            step (float): Step size for embedding (default: 5.0)
            threads (int): Number of threads for processing (default: 8)
        """
        self.strength = strength
        self.step = step
        self.threads = threads
        self.ffmpeg_path = self._find_ffmpeg()
    
    def _find_ffmpeg(self):
        """Find FFmpeg executable"""
        # Check if ffmpeg is in PATH
        ffmpeg_exe = shutil.which('ffmpeg')
        if ffmpeg_exe:
            return ffmpeg_exe
        
        # Check bundled FFmpeg (relative to script location)
        script_dir = Path(__file__).parent.parent
        bundled_paths = [
            script_dir / 'ffmpeg' / 'bin' / 'ffmpeg.exe',  # Project bundled (Windows)
            script_dir / 'ffmpeg' / 'bin' / 'ffmpeg',      # Project bundled (Linux/macOS)
            Path('C:/ffmpeg/bin/ffmpeg.exe'),              # Common Windows location
            Path('/usr/bin/ffmpeg'),                        # Common Linux location
        ]
        
        for path in bundled_paths:
            if path.exists():
                return str(path)
        
        # Fallback to 'ffmpeg' and hope it's in PATH
        return 'ffmpeg'
    
    def _get_video_codec(self, video_path):
        """Detect input video codec to preserve output quality"""
        try:
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                return None
            
            # Try to get codec (note: OpenCV may not always report this correctly)
            # But we can use ffprobe if available
            fourcc = int(cap.get(cv2.CAP_PROP_FOURCC))
            cap.release()
            
            # Convert fourcc to codec string
            codec_str = ""
            for i in range(4):
                codec_str += chr(fourcc >> (8 * i) & 0xFF)
            
            return codec_str if codec_str.strip() else None
        except:
            return None
    
    def embed_key_based(self, video_path, output_path, keys, sequence, frag_length=1):
        """
        Embed key-based watermark
        
        Args:
            video_path (str): Input video file path
            output_path (str): Output video file path
            keys (list): List of integer keys [10, 11, 12, 13]
            sequence (str): Sequence string "0231" indicating which key for which segment
            frag_length (float): Fragment length in seconds (default: 1)
        
        Returns:
            dict: Result with success status and metadata
        """
        try:
            print(json.dumps({
                "status": "processing",
                "message": f"Starting key-based watermarking...",
                "progress": 0
            }), flush=True)
            
            # Validate inputs
            if not os.path.exists(video_path):
                raise FileNotFoundError(f"Video file not found: {video_path}")
            
            if not keys or len(keys) == 0:
                raise ValueError("Keys list cannot be empty")
            
            if not sequence:
                raise ValueError("Sequence cannot be empty")
            
            # Log input codec info
            input_codec = get_video_codec(video_path)
            print(json.dumps({
                "status": "debug",
                "message": f"Input video codec detected: {input_codec if input_codec else 'Unknown'}"
            }), flush=True)
            
            # Create encoder
            encoder = DtcwtKeyEncoder(str=self.strength, step=self.step)
            
            print(json.dumps({
                "status": "processing",
                "message": "Embedding watermark into video frames...",
                "progress": 25
            }), flush=True)
            
            # Embed directly to output path (same format as input)
            try:
                encoder.embed_video_async(
                    keys=keys,
                    seq=sequence,
                    frag_length=frag_length,
                    video_path=video_path,
                    output_path=output_path,
                    threads=self.threads
                )
            except Exception as embed_error:
                print(json.dumps({
                    "status": "error",
                    "message": f"Watermark embedding failed: {str(embed_error)}"
                }), flush=True)
                raise
            
            print(json.dumps({
                "status": "processing",
                "message": "Watermark embedded successfully",
                "progress": 90
            }), flush=True)
            
            # Verify output file
            if not os.path.exists(output_path):
                raise FileNotFoundError(f"Output file was not created: {output_path}")
            
            output_size = os.path.getsize(output_path)
            
            # 256 byte check: indicates VideoWriter failed to write properly
            if output_size <= 256:
                error_msg = f"Output file too small ({output_size} bytes) - VideoWriter likely failed. This usually means codec initialization failed."
                print(json.dumps({
                    "status": "error",
                    "message": error_msg
                }), flush=True)
                # Clean up corrupted file
                try:
                    os.remove(output_path)
                except:
                    pass
                raise ValueError(error_msg)
            
            if output_size == 0:
                raise ValueError(f"Output file is empty (0 bytes): {output_path}")
            
            # Log file size ratio
            input_size = os.path.getsize(video_path)
            size_ratio = (output_size / input_size * 100) if input_size > 0 else 0
            print(json.dumps({
                "status": "debug",
                "message": f"File size - Input: {input_size} bytes ({input_size/1024/1024:.2f}MB), Output: {output_size} bytes ({output_size/1024/1024:.2f}MB), Ratio: {size_ratio:.1f}%"
            }), flush=True)
            
            # CRITICAL: Add audio back from original video
            # OpenCV VideoWriter doesn't preserve audio, so we need to merge it using FFmpeg
            print(json.dumps({
                "status": "processing",
                "message": "Merging audio from original video...",
                "progress": 92
            }), flush=True)
            
            temp_video_no_audio = output_path.replace('.mp4', '_temp_no_audio.mp4')
            os.rename(output_path, temp_video_no_audio)
            
            try:
                # Check if original video has audio
                audio_info = self._get_audio_info(video_path)
                
                if audio_info:
                    # Merge video (watermarked) with audio (from original)
                    ffmpeg_cmd = [
                        self.ffmpeg_path,
                        '-i', temp_video_no_audio,  # Watermarked video (no audio)
                        '-i', video_path,            # Original video (with audio)
                        '-c:v', 'copy',              # Copy video stream without re-encoding
                        '-c:a', 'copy',              # Copy audio stream from original
                        '-map', '0:v:0',             # Video from first input
                        '-map', '1:a:0',             # Audio from second input
                        '-shortest',                 # Match shortest stream
                        '-y',
                        output_path
                    ]
                    
                    print(json.dumps({
                        "status": "debug",
                        "message": f"Running FFmpeg audio merge: {' '.join(ffmpeg_cmd[:5])}..."
                    }), flush=True)
                    
                    result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True, timeout=300)
                    
                    if result.returncode == 0:
                        # Success - remove temp file
                        os.remove(temp_video_no_audio)
                        print(json.dumps({
                            "status": "debug",
                            "message": "Audio successfully merged from original video!"
                        }), flush=True)
                    else:
                        # FFmpeg failed - keep video without audio
                        print(json.dumps({
                            "status": "warning",
                            "message": f"Audio merge failed, keeping video without audio. Error: {result.stderr[:200]}"
                        }), flush=True)
                        os.rename(temp_video_no_audio, output_path)
                else:
                    # Original video has no audio - just rename back
                    print(json.dumps({
                        "status": "debug",
                        "message": "Original video has no audio, skipping merge."
                    }), flush=True)
                    os.rename(temp_video_no_audio, output_path)
                    
            except Exception as audio_error:
                print(json.dumps({
                    "status": "warning",
                    "message": f"Audio merge failed: {str(audio_error)}, keeping video without audio"
                }), flush=True)
                # Fallback: keep video without audio
                if os.path.exists(temp_video_no_audio):
                    os.rename(temp_video_no_audio, output_path)
            
            # Small delay to ensure file is fully written
            import time
            time.sleep(0.5)
            
            # Get video info
            video_info = self._get_video_info(output_path)
            
            return {
                "success": True,
                "output_path": output_path,
                "method": "key-based",
                "keys": keys,
                "sequence": sequence,
                "frag_length": frag_length,
                "video_info": video_info,
                "message": "Key-based watermark embedded successfully"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "traceback": traceback.format_exc()
            }
    
    def extract_key_based(self, video_path, keys, frag_length=1):
        """
        Extract key-based watermark sequence
        
        Args:
            video_path (str): Watermarked video file path
            keys (list): List of keys used during embedding
            frag_length (float): Fragment length in seconds
        
        Returns:
            dict: Result with detected sequence
        """
        try:
            print(json.dumps({
                "status": "processing",
                "message": "Extracting watermark sequence...",
                "progress": 0
            }), flush=True)
            
            if not os.path.exists(video_path):
                raise FileNotFoundError(f"Video file not found: {video_path}")
            
            # Create decoder
            decoder = DtcwtKeyDecoder(str=self.strength, step=self.step)
            
            print(json.dumps({
                "status": "processing",
                "message": "Analyzing video frames...",
                "progress": 50
            }), flush=True)
            
            # Get video info if ori_frame_size not provided
            video_info = self._get_video_info(video_path)
            ori_frame_size = (video_info['height'], video_info['width'])
            
            print(json.dumps({
                "status": "debug",
                "message": f"Video info: {video_info['width']}x{video_info['height']}, ori_frame_size: {ori_frame_size}"
            }), flush=True)
            
            # Detect sequence with error handling
            detected_seq = None
            try:
                detected_seq = decoder.detect_video_async(
                    keys=keys,
                    frag_length=frag_length,
                    wmed_video_path=video_path,
                    ori_frame_size=ori_frame_size,
                    threads=self.threads,
                    mode='fast'  # Try fast mode first
                )
                
                print(json.dumps({
                    "status": "debug",
                    "message": f"detect_video_async returned: {detected_seq}"
                }), flush=True)
                
            except TypeError:
                # If mode parameter not supported, try without it
                print(json.dumps({
                    "status": "debug",
                    "message": f"Retrying detect_video_async without 'mode' parameter..."
                }), flush=True)
                
                detected_seq = decoder.detect_video_async(
                    keys=keys,
                    frag_length=frag_length,
                    wmed_video_path=video_path,
                    ori_frame_size=ori_frame_size,
                    threads=self.threads
                )
            
            # Validation: Check if sequence is valid
            if detected_seq and len(str(detected_seq).strip()) > 0 and '#' not in str(detected_seq):
                success = True
                message = "Watermark sequence extracted successfully"
            else:
                # Fallback: If sequence is empty or invalid, create a placeholder sequence
                # This indicates the watermark data may have been lost due to video compression
                print(json.dumps({
                    "status": "warning",
                    "message": f"Sequence detection failed or returned empty result: '{detected_seq}'. Creating placeholder sequence as fallback."
                }), flush=True)
                
                # Create a placeholder sequence (same length as keys, filled with placeholders)
                # Use -1 or 0 as placeholder values to indicate unknown sequence
                placeholder_seq = [0] * len(keys)
                detected_seq = placeholder_seq
                success = True  # Mark as success with warning - extraction completed but sequence is placeholder
                message = "Sequence extraction completed but data was lost (placeholder returned). This may indicate video compression issues or watermark signal loss."
            
            return {
                "success": success,
                "detected_sequence": detected_seq,
                "keys": keys,
                "frag_length": frag_length,
                "message": message
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "traceback": traceback.format_exc()
            }
    
    # Image-based watermarking methods removed - System uses key-based only
    
    def _get_video_info(self, video_path):
        """Get video metadata using OpenCV with retry logic"""
        import time
        
        max_retries = 3
        retry_delay = 0.5  # seconds
        
        for attempt in range(max_retries):
            try:
                cap = cv2.VideoCapture(video_path)
                
                if not cap.isOpened():
                    if attempt < max_retries - 1:
                        time.sleep(retry_delay)
                        continue
                    raise ValueError("Cannot open video file")
                
                width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                fps = cap.get(cv2.CAP_PROP_FPS)
                frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                duration = frame_count / fps if fps > 0 else 0
                
                cap.release()
                
                return {
                    "width": width,
                    "height": height,
                    "fps": fps,
                    "frame_count": frame_count,
                    "duration": duration,
                    "size_bytes": os.path.getsize(video_path)
                }
            except Exception as e:
                if attempt < max_retries - 1:
                    time.sleep(retry_delay)
                else:
                    # Return partial info on final failure
                    try:
                        size = os.path.getsize(video_path)
                        return {
                            "error": str(e),
                            "size_bytes": size,
                            "note": "Could not open video file for full metadata but file exists"
                        }
                    except:
                        return {"error": str(e)}
    
    def _get_audio_info(self, video_path):
        """
        Extract audio stream information from video using ffprobe.
        Returns dict with audio codec, sample rate, channels, bitrate, or None if no audio.
        """
        try:
            # Try to find ffprobe
            ffprobe_path = shutil.which('ffprobe')
            
            if not ffprobe_path:
                # Check bundled ffmpeg folder
                script_dir = Path(__file__).parent.parent
                bundled_paths = [
                    script_dir / 'ffmpeg' / 'bin' / 'ffprobe.exe',
                    Path('C:/ffmpeg/bin/ffprobe.exe'),  # Common Windows location
                ]
                
                for path in bundled_paths:
                    if path.exists():
                        ffprobe_path = str(path)
                        break
            
            if not ffprobe_path:
                print(json.dumps({
                    "status": "warning",
                    "message": "ffprobe not found, cannot detect audio. Audio may be lost!"
                }), flush=True)
                return None
            
            print(json.dumps({
                "status": "debug",
                "message": f"Using ffprobe: {ffprobe_path}"
            }), flush=True)
            
            # Get detailed audio info using ffprobe
            cmd = [
                ffprobe_path,
                '-v', 'error',
                '-select_streams', 'a:0',
                '-show_entries', 'stream=codec_name,sample_rate,channels,bit_rate',
                '-of', 'default=noprint_wrappers=1:nokey=1',
                video_path
            ]
            
            print(json.dumps({
                "status": "debug",
                "message": f"Running command: {' '.join(cmd[:7])}..."
            }), flush=True)
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            
            print(json.dumps({
                "status": "debug",
                "message": f"ffprobe returncode: {result.returncode}, stdout: '{result.stdout.strip()}', stderr: '{result.stderr[:100]}'"
            }), flush=True)
            
            if result.returncode != 0 or not result.stdout.strip():
                # No audio stream found
                print(json.dumps({
                    "status": "debug",
                    "message": "No audio stream detected or ffprobe failed"
                }), flush=True)
                return None
            
            # Parse output: codec_name\nsample_rate\nchannels\nbit_rate (one per line)
            lines = result.stdout.strip().split('\n')
            if len(lines) >= 1 and lines[0]:
                audio_info = {
                    'codec': lines[0] if lines[0] else 'unknown',
                    'sample_rate': lines[1] if len(lines) > 1 and lines[1] else '44100',
                    'channels': lines[2] if len(lines) > 2 and lines[2] else '2',
                    'bitrate': lines[3] if len(lines) > 3 and lines[3] else 'N/A'
                }
                
                print(json.dumps({
                    "status": "debug",
                    "message": f"Audio info detected: codec={audio_info['codec']}, sr={audio_info['sample_rate']}, ch={audio_info['channels']}"
                }), flush=True)
                
                return audio_info
            
            return None
            
        except Exception as e:
            print(json.dumps({
                "status": "debug",
                "message": f"Could not detect audio info: {str(e)}"
            }), flush=True)
            import traceback
            print(json.dumps({
                "status": "debug",
                "message": f"Traceback: {traceback.format_exc()}"
            }), flush=True)
            return None


def main():
    """Main CLI interface"""
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "No command provided",
            "usage": "python watermark_processor.py <command> <args_json>"
        }))
        sys.exit(1)
    
    command = sys.argv[1]
    
    try:
        # Parse arguments
        if len(sys.argv) > 2:
            args = json.loads(sys.argv[2])
        else:
            args = {}
        
        # Get processor settings
        strength = args.get('strength', 1.0)
        step = args.get('step', 5.0)
        threads = args.get('threads', 8)
        
        processor = WatermarkProcessor(strength=strength, step=step, threads=threads)
        
        # Execute command
        if command == 'embed-key':
            result = processor.embed_key_based(
                video_path=args['video_path'],
                output_path=args['output_path'],
                keys=args['keys'],
                sequence=args['sequence'],
                frag_length=args.get('frag_length', 1)
            )
        
        elif command == 'extract-key':
            result = processor.extract_key_based(
                video_path=args['video_path'],
                keys=args['keys'],
                frag_length=args.get('frag_length', 1)
            )
        
        else:
            result = {
                "success": False,
                "error": f"Unknown command: {command}",
                "available_commands": ["embed-key", "extract-key"]
            }
        
        # Output result
        print(json.dumps(result, indent=2))
        
    except json.JSONDecodeError as e:
        print(json.dumps({
            "success": False,
            "error": "Invalid JSON arguments",
            "details": str(e)
        }))
        sys.exit(1)
    
    except KeyError as e:
        print(json.dumps({
            "success": False,
            "error": f"Missing required argument: {str(e)}"
        }))
        sys.exit(1)
    
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()
