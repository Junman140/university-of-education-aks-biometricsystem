"""
Futronic Capture Bridge (Python)
"""

import base64
import time
import ctypes
import sys
import threading
from flask import Flask, request, jsonify
from flask_cors import CORS
import io
try:
    from PIL import Image
except ImportError:
    Image = None

app = Flask(__name__)
CORS(app)

# Global lock to prevent concurrent USB access
scanner_lock = threading.Lock()

class FTRSCAN_IMAGE_SIZE(ctypes.Structure):
    _fields_ = [
        ("nWidth", ctypes.c_int),
        ("nHeight", ctypes.c_int)
    ]

try:
    if sys.platform == "win32":
        ftr_dll = ctypes.windll.LoadLibrary("ftrScanAPI.dll")
    else:
        ftr_dll = ctypes.cdll.LoadLibrary("libftrScanAPI.so")
        
    # Initialize all argtypes ONCE globally
    ftr_dll.ftrScanOpenDevice.restype = ctypes.c_void_p
    ftr_dll.ftrScanOpenDevice.argtypes = []
    
    ftr_dll.ftrScanCloseDevice.restype = None
    ftr_dll.ftrScanCloseDevice.argtypes = [ctypes.c_void_p]
    
    ftr_dll.ftrScanGetImageSize.restype = ctypes.c_int
    ftr_dll.ftrScanGetImageSize.argtypes = [ctypes.c_void_p, ctypes.POINTER(FTRSCAN_IMAGE_SIZE)]
    
    ftr_dll.ftrScanGetFrame.restype = ctypes.c_int
    ftr_dll.ftrScanGetFrame.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p]
    
    ftr_dll.ftrScanGetImage.restype = ctypes.c_int
    ftr_dll.ftrScanGetImage.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_void_p]
    
    ftr_dll.ftrScanGetLastError.restype = ctypes.c_int
    ftr_dll.ftrScanGetLastError.argtypes = []
    
except Exception as e:
    ftr_dll = None
    print(f"Warning: Could not load Futronic DLL: {e}. Is ftrScanAPI.dll installed?")

def capture_futronic_image_bytes():
    if ftr_dll is None:
        raise RuntimeError("ftrScanAPI.dll is not loaded. Please install the Futronic SDK.")

    with scanner_lock:
        device_handle = ftr_dll.ftrScanOpenDevice()
        if not device_handle:
            raise RuntimeError("Failed to open Futronic device. Is it plugged in?")

        try:
            # Get Image Size
            c_size = FTRSCAN_IMAGE_SIZE()
            res = ftr_dll.ftrScanGetImageSize(device_handle, ctypes.byref(c_size))
            if not res or c_size.nWidth <= 0 or c_size.nHeight <= 0:
                width = 320
                height = 480
            else:
                width = c_size.nWidth
                height = c_size.nHeight
                
            buffer_size = width * height
            image_buffer = (ctypes.c_ubyte * buffer_size)()
            
            print("Waiting for finger...")
            
            finger_touched = False
            for _ in range(300): # 30 seconds of polling
                ftr_dll.ftrScanGetFrame(device_handle, 0, ctypes.byref(image_buffer))
                
                center_idx = (height // 2) * width + (width // 2)
                dark_pixels = 0
                for i in range(-10, 10):
                    for j in range(-10, 10):
                        idx = center_idx + (i * width) + j
                        if 0 <= idx < buffer_size:
                            if image_buffer[idx] < 200:
                                dark_pixels += 1
                                
                if dark_pixels > 20:
                    finger_touched = True
                    break
                    
                time.sleep(0.1)
                
            if not finger_touched:
                raise RuntimeError("Capture timed out. No finger detected.")
                
            print("Finger detected. Waiting for firm press...")
            time.sleep(0.8)
            
            result = ftr_dll.ftrScanGetImage(device_handle, 4, ctypes.byref(image_buffer))
            
            if not result:
                err_code = ftr_dll.ftrScanGetLastError()
                raise RuntimeError(f"Capture failed. ftrScanGetImage returned False. Error code: {err_code}")

            print("Fingerprint captured successfully!")
            
            # Make a safe Python copy of the bytes before the C buffer is destroyed
            final_bytes = bytes(image_buffer)
            return final_bytes, width, height

        finally:
            # Ensure the device is cleanly closed
            ftr_dll.ftrScanCloseDevice(device_handle)
            # Give the USB bus a tiny moment to reset before any future requests
            time.sleep(0.2)

@app.route('/health', methods=['GET'])
def health():
    if ftr_dll is None:
        return jsonify({
            "status": "error",
            "message": "ftrScanAPI.dll not found on the system."
        }), 500
        
    return jsonify({
        "status": "ok",
        "vendor": "futronic",
        "scanner": "Futronic FS80H (or compatible)"
    })

@app.route('/capture', methods=['POST'])
def capture():
    try:
        image_bytes, width, height = capture_futronic_image_bytes()
        
        # Default to raw if PIL not available
        final_b64 = base64.b64encode(image_bytes).decode('utf-8')
        final_format = "raw_gray8"
        
        if Image:
            try:
                # Convert raw_gray8 to PNG
                img = Image.frombytes('L', (width, height), image_bytes)
                buf = io.BytesIO()
                img.save(buf, format='PNG')
                final_b64 = base64.b64encode(buf.getvalue()).decode('utf-8')
                final_format = "png"
                print("Converted raw fingerprint to PNG successfully.")
            except Exception as pe:
                print(f"Pillow conversion failed, falling back to raw: {pe}")
        
        return jsonify({
            "vendor": "futronic",
            "capturedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "width": width,
            "height": height,
            "dpi": 500,
            "format": final_format, 
            "imageBase64": final_b64
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("Starting Futronic Capture Bridge on http://127.0.0.1:5055")
    app.run(host='127.0.0.1', port=5055)
