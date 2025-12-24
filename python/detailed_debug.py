import cv2
import numpy as np
from blind_video_watermark import DtcwtKeyEncoder, DtcwtKeyDecoder
from blind_video_watermark.utils import generate_wm, rebin
import dtcwt

print("="*70)
print("DETAILED WATERMARK EMBEDDING AND DETECTION DEBUG")
print("="*70)

# Create simple test frame
test_frame = np.zeros((240, 320, 3), dtype=np.float32)
test_frame[:, :, 0] = 128  # Y channel
test_frame[:, :, 1] = 128  # U channel  
test_frame[:, :, 2] = 128  # V channel

print("\n1. TEST FRAME CREATED")
print(f"   Frame shape: {test_frame.shape}")
print(f"   Frame dtype: {test_frame.dtype}")
print(f"   Frame stats - min: {test_frame.min()}, max: {test_frame.max()}")

# Create encoder
encoder = DtcwtKeyEncoder(str=1.0, step=5.0)
print("\n2. ENCODER CREATED")
print(f"   alpha (strength): {encoder.alpha}")
print(f"   step: {encoder.step}")

# Create watermark
keys = [10, 11, 12, 13]
key_to_embed = keys[0]  # Use first key
wm_shape = encoder.infer_wm_shape(test_frame.shape)
wm = generate_wm(key_to_embed, wm_shape)
encoder.wm = wm

print("\n3. WATERMARK CREATED")
print(f"   Watermark shape: {wm.shape}")
print(f"   Watermark dtype: {wm.dtype}")
print(f"   Watermark stats - min: {wm.min():.6f}, max: {wm.max():.6f}, mean: {wm.mean():.6f}, std: {wm.std():.6f}")

# Embed watermark
test_frame_yuv = cv2.cvtColor(test_frame, cv2.COLOR_BGR2YUV)
print("\n4. FRAME CONVERTED TO YUV")
print(f"   YUV frame stats - Y: [{test_frame_yuv[:,:,0].min()}, {test_frame_yuv[:,:,0].max()}]")

wmed_frame = encoder.encode(test_frame_yuv)
print("\n5. WATERMARK EMBEDDED")
print(f"   Watermarked frame stats - Y: [{wmed_frame[:,:,0].min():.2f}, {wmed_frame[:,:,0].max():.2f}]")
print(f"   Difference in Y channel: {(wmed_frame[:,:,0] - test_frame_yuv[:,:,0]).std():.6f}")

# Decode watermark
decoder = DtcwtKeyDecoder(str=1.0, step=5.0)
print("\n6. DECODER CREATED")

# Decode from original
wm_decoded_from_original = decoder.decode(test_frame_yuv)
print("\n7a. DECODE FROM ORIGINAL FRAME")
print(f"    Decoded shape: {wm_decoded_from_original.shape}")
print(f"    Decoded stats - min: {wm_decoded_from_original.min():.6f}, max: {wm_decoded_from_original.max():.6f}, mean: {wm_decoded_from_original.mean():.6f}, std: {wm_decoded_from_original.std():.6f}")

# Decode from watermarked
wm_decoded_from_watermarked = decoder.decode(wmed_frame)
print("\n7b. DECODE FROM WATERMARKED FRAME")
print(f"    Decoded shape: {wm_decoded_from_watermarked.shape}")
print(f"    Decoded stats - min: {wm_decoded_from_watermarked.min():.6f}, max: {wm_decoded_from_watermarked.max():.6f}, mean: {wm_decoded_from_watermarked.mean():.6f}, std: {wm_decoded_from_watermarked.std():.6f}")

# Calculate correlation
print("\n8. CORRELATION ANALYSIS")
shape = wm_shape[0] * wm_shape[1]

# Normalize original WM
nwm = (wm - np.mean(wm)) / (np.std(wm) + 1e-10)
print(f"   Original WM normalized - std: {nwm.std():.6f}")

# Test all keys against decoded watermark
wms_to_test = [generate_wm(key, wm_shape) for key in keys]
nwms_to_test = [(w - np.mean(w)) / (np.std(w) + 1e-10) for w in wms_to_test]

# Correlate with original (should not have correlation)
print("\n   Against ORIGINAL frame:")
nwm_orig = (wm_decoded_from_original - np.mean(wm_decoded_from_original)) / (np.std(wm_decoded_from_original) + 1e-10)
for i, (key, nwm_test) in enumerate(zip(keys, nwms_to_test)):
    corr = np.sum(nwm_orig * nwm_test) / shape
    print(f"     Key {key} (idx {i}): {corr:.6f}")

# Correlate with watermarked (should have high correlation with key 0)
print("\n   Against WATERMARKED frame:")
nwm_wmed = (wm_decoded_from_watermarked - np.mean(wm_decoded_from_watermarked)) / (np.std(wm_decoded_from_watermarked) + 1e-10)
for i, (key, nwm_test) in enumerate(zip(keys, nwms_to_test)):
    corr = np.sum(nwm_wmed * nwm_test) / shape
    print(f"     Key {key} (idx {i}): {corr:.6f}")
