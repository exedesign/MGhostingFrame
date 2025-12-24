import cv2
import numpy as np
from blind_video_watermark import DtcwtKeyDecoder
from blind_video_watermark.utils import generate_wm
import dtcwt

# Manual decode to inspect values
decoder = DtcwtKeyDecoder()
cap = cv2.VideoCapture('test_watermark/test_watermarked.mp4')

# Get frame size and shape
ori_frame_size = (320, 240)
wm_shape = decoder.infer_wm_shape(ori_frame_size)
print(f"Video frame size: {ori_frame_size}")
print(f"Watermark shape: {wm_shape}")

# Read first frame
ret, frame = cap.read()
if ret:
    frame = cv2.resize(frame.astype(np.float32), (ori_frame_size[1], ori_frame_size[0]))
    frame = cv2.cvtColor(frame, cv2.COLOR_BGR2YUV)
    
    # Decode watermark from first frame
    wm = decoder.decode(frame)
    print(f"Decoded watermark shape: {wm.shape}")
    print(f"Watermark stats - min: {np.min(wm):.6f}, max: {np.max(wm):.6f}, mean: {np.mean(wm):.6f}, std: {np.std(wm):.6f}")
    
    # Check correlation with keys
    keys = [10, 11, 12, 13]
    wmks = [generate_wm(key, wm_shape) for key in keys]
    shape = wm_shape[0] * wm_shape[1]
    
    nwm = (wm - np.mean(wm)) / np.std(wm)
    
    for i, (key, wmk) in enumerate(zip(keys, wmks)):
        nwmk = (wmk - np.mean(wmk)) / np.std(wmk)
        corr = np.sum(nwm * nwmk) / shape
        print(f"Key {key} (idx {i}): correlation = {corr:.6f}")

cap.release()
