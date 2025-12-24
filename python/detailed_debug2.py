import cv2
import numpy as np
from blind_video_watermark import DtcwtKeyEncoder, DtcwtKeyDecoder
from blind_video_watermark.utils import generate_wm, rebin
import dtcwt

print("="*70)
print("TEST WITH ACTUAL VIDEO FRAME (Real Texture)")
print("="*70)

# Create a more realistic test frame with text and variation
test_frame_bgr = np.zeros((240, 320, 3), dtype=np.uint8)
test_frame_bgr[:, :] = [200, 128, 128]  # More realistic YUV values

# Add some text for texture
cv2.putText(test_frame_bgr, "TEST", (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 2.0, (255, 255, 255), 2)
cv2.putText(test_frame_bgr, "VIDEO", (50, 180), cv2.FONT_HERSHEY_SIMPLEX, 2.0, (255, 255, 255), 2)

# Display created test frame
test_frame_f32 = test_frame_bgr.astype(np.float32)
test_frame_yuv = cv2.cvtColor(test_frame_f32, cv2.COLOR_BGR2YUV)

print("\nTEST FRAME WITH TEXTURE")
print(f"  Y channel - min: {test_frame_yuv[:,:,0].min():.1f}, max: {test_frame_yuv[:,:,0].max():.1f}, mean: {test_frame_yuv[:,:,0].mean():.1f}, std: {test_frame_yuv[:,:,0].std():.1f}")
print(f"  U channel - min: {test_frame_yuv[:,:,1].min():.1f}, max: {test_frame_yuv[:,:,1].max():.1f}, mean: {test_frame_yuv[:,:,1].mean():.1f}, std: {test_frame_yuv[:,:,1].std():.1f}")
print(f"  V channel - min: {test_frame_yuv[:,:,2].min():.1f}, max: {test_frame_yuv[:,:,2].max():.1f}, mean: {test_frame_yuv[:,:,2].mean():.1f}, std: {test_frame_yuv[:,:,2].std():.1f}")

# Create encoder and watermark
encoder = DtcwtKeyEncoder(str=1.0, step=5.0)
key_to_embed = 10
wm_shape = encoder.infer_wm_shape(test_frame_yuv.shape)
wm = generate_wm(key_to_embed, wm_shape)
encoder.wm = wm

print(f"\nWATERMARK - shape: {wm.shape}, min: {wm.min()}, max: {wm.max()}, mean: {wm.mean():.6f}, std: {wm.std():.6f}")

# Embed watermark
wmed_frame = encoder.encode(test_frame_yuv.copy())

print(f"\nEMBEDDING RESULT")
print(f"  Original U channel - mean: {test_frame_yuv[:,:,1].mean():.1f}, std: {test_frame_yuv[:,:,1].std():.1f}")
print(f"  Watermarked U channel - mean: {wmed_frame[:,:,1].mean():.1f}, std: {wmed_frame[:,:,1].std():.1f}")
print(f"  Difference in U channel - max abs: {np.abs(wmed_frame[:,:,1] - test_frame_yuv[:,:,1]).max():.1f}, mean abs: {np.abs(wmed_frame[:,:,1] - test_frame_yuv[:,:,1]).mean():.6f}")

# Decode and check
decoder = DtcwtKeyDecoder(str=1.0, step=5.0)

wm_decoded_orig = decoder.decode(test_frame_yuv)
wm_decoded_wmed = decoder.decode(wmed_frame)

print(f"\nDECODED FROM ORIGINAL")
print(f"  Shape: {wm_decoded_orig.shape}, min: {wm_decoded_orig.min():.6f}, max: {wm_decoded_orig.max():.6f}, mean: {wm_decoded_orig.mean():.6f}, std: {wm_decoded_orig.std():.6f}")

print(f"\nDECODED FROM WATERMARKED")
print(f"  Shape: {wm_decoded_wmed.shape}, min: {wm_decoded_wmed.min():.6f}, max: {wm_decoded_wmed.max():.6f}, mean: {wm_decoded_wmed.mean():.6f}, std: {wm_decoded_wmed.std():.6f}")

# Correlation test
print(f"\nCORRELATION TEST")
keys = [10, 11, 12, 13]
wms_to_test = [generate_wm(key, wm_shape) for key in keys]
shape = wm_shape[0] * wm_shape[1]

print(f"  Against decoded watermarked frame:")
nwm_wmed = (wm_decoded_wmed - np.mean(wm_decoded_wmed)) / (np.std(wm_decoded_wmed) + 1e-10)
for i, (key, wm_test) in enumerate(zip(keys, wms_to_test)):
    nwm_test = (wm_test - np.mean(wm_test)) / (np.std(wm_test) + 1e-10)
    corr = np.sum(nwm_wmed * nwm_test) / shape
    print(f"    Key {key} (idx {i}): {corr:.6f}")
