import os
import cv2
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
import base64
import threading

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

# --- POTHOLE MODEL AUTO-DOWNLOADER ---
import urllib.request
POTHOLE_WEIGHTS = "yolov8m_pothole.pt"
POTHOLE_URL = "https://huggingface.co/keremberke/yolov8m-pothole-segmentation/resolve/main/best.pt"

if not os.path.exists(POTHOLE_WEIGHTS):
    print("\n" + "="*50)
    print("🚨 [AI SETUP] DOWNLOADING CUSTOM POTHOLE AI MODEL")
    print("Fetching from HuggingFace API...")
    print("This requires ~100MB download and only happens once.")
    try:
        urllib.request.urlretrieve(POTHOLE_URL, POTHOLE_WEIGHTS)
        print("✅ [AI SETUP] Pothole model downloaded successfully!")
    except Exception as e:
        print(f"❌ [AI SETUP] Download failed: {e}. Reverting to standard AI.")
    print("="*50 + "\n")

print("Loading YOLOv8 AI Core...")
try:
    if os.path.exists(POTHOLE_WEIGHTS):
        print(">>> BOOTING SPECIALIZED POTHOLE DETECTOR <<<")
        model = YOLO(POTHOLE_WEIGHTS)
    else:
        print(">>> BOOTING FALLBACK COCO DETECTOR <<<")
        model = YOLO("yolov8n.pt")
    print("✅ Model loaded successfully!")
except Exception as e:
    print(f"Error loading YOLO model: {e}")
    model = None

# Custom mapping for civic issues based on COCO classes + Custom Models
civic_mapping = {
    # --- Custom Model Classes ---
    "pothole": "🚨 HIGH-PRIORITY POTHOLE 🚨",
    # --- Base COCO Classes ---
    "person": "Human Scanner AI",
    "car": "Vehicle",
    "truck": "Heavy Vehicle/Waste",
    "bicycle": "Micro-mobility Issue",
    "motorcycle": "Vehicle",
    "bottle": "Litter/Waste",
    "cup": "Litter/Waste",
    "stop sign": "Infrastructure"
}

def get_severity(detections):
    if len(detections) > 3:
        return "HIGH"
    elif len(detections) >= 2:
        return "MEDIUM"
    elif len(detections) == 1:
        return "LOW"
    else:
        return "NONE"

@app.route('/detect', methods=['POST'])
def detect():
    if model is None:
        return jsonify({"error": "Model not loaded"}), 500

    try:
        data = request.json
        if not data or 'image' not in data:
            return jsonify({"error": "No image data provided"}), 400
        
        # image should be a base64 string
        base64_str = data['image']
        if "base64," in base64_str:
            base64_str = base64_str.split("base64,")[1]
            
        img_data = base64.b64decode(base64_str)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            return jsonify({"error": "Invalid image format"}), 400

        # Run inference using ultralytics
        results = model(img)
        
        detections = []
        for r in results:
            boxes = r.boxes
            for box in boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                label = model.names[cls_id]
                
                # Bounding box coordinates
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                
                detections.append({
                    "class_id": cls_id,
                    "label": label,
                    "civic_category": civic_mapping.get(label, "Other / Check Required"),
                    "confidence": round(conf, 2),
                    "box": {
                        "x1": round(x1),
                        "y1": round(y1),
                        "x2": round(x2),
                        "y2": round(y2)
                    }
                })

        severity = get_severity(detections)

        # Process the image: Privacy Blurring AND Bounding Boxes
        img_processed = img.copy()
        for det in detections:
            bx1, by1 = int(det['box']['x1']), int(det['box']['y1'])
            bx2, by2 = int(det['box']['x2']), int(det['box']['y2'])
            
            # 1. Blur for privacy first (protecting identifiable info)
            if det['label'] in ['person', 'car', 'truck', 'motorcycle', 'bicycle']:
                roi = img_processed[by1:by2, bx1:bx2]
                if roi.size > 0:
                    roi = cv2.GaussianBlur(roi, (51, 51), 0)
                    img_processed[by1:by2, bx1:bx2] = roi

            # 2. Draw Bounding Box (Blue color in BGR is (255, 120, 0) or purely (255, 0, 0))
            box_color = (255, 100, 50)  # Distinct blue-ish tint for BGR format
            cv2.rectangle(img_processed, (bx1, by1), (bx2, by2), box_color, 3)

            # 3. Add Label text above the box with a solid background for readability
            label_text = f"{det['civic_category']}"
            font = cv2.FONT_HERSHEY_SIMPLEX
            (text_width, text_height), baseline = cv2.getTextSize(label_text, font, 0.7, 2)
            
            # Draw label background
            cv2.rectangle(img_processed, 
                          (bx1, max(0, by1 - text_height - 10)), 
                          (bx1 + text_width, max(0, by1)), 
                          box_color, cv2.FILLED)
                          
            # Draw label text
            cv2.putText(img_processed, label_text, (bx1, max(0, by1 - 5)), 
                        font, 0.7, (255, 255, 255), 2)

        # Encode processed image back to base64
        _, buffer = cv2.imencode('.jpg', img_processed)
        processed_base64 = base64.b64encode(buffer).decode('utf-8')

        return jsonify({
            "detections": detections,
            "severity": severity,
            "count": len(detections),
            "processed_image": f"data:image/jpeg;base64,{processed_base64}"
        })

    except Exception as e:
        print(f"Error in detection: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/', methods=['GET'])
def health_check():
    return jsonify({
        "status": "online",
        "service": "Urban Clean AI Detection Engine",
        "model_loaded": model is not None
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=False)
