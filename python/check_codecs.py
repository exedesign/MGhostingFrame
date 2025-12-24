
import cv2
import os

def check_codecs():
    codecs = ['avc1', 'mp4v', 'xvid', 'h264']
    for c in codecs:
        fourcc = cv2.VideoWriter_fourcc(*c)
        test_file = f"test_{c}.mp4"
        out = cv2.VideoWriter(test_file, fourcc, 20.0, (640, 480))
        opened = out.isOpened()
        print(f"Codec {c}: {'SUCCESS' if opened else 'FAILED'}")
        if opened:
            out.release()
            if os.path.exists(test_file):
                os.remove(test_file)

if __name__ == "__main__":
    check_codecs()
