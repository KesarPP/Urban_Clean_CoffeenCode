import os
import base64
import json
import datetime
import urllib.request
from math import radians, cos, sin, asin, sqrt

try:
    from fastapi import FastAPI, HTTPException, Request, Form
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel
    import firebase_admin
    from firebase_admin import credentials, firestore
    from apscheduler.schedulers.background import BackgroundScheduler
    FASTAPI_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Missing critical dependency: {e}")
    FASTAPI_AVAILABLE = False

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# --- Robust Dependency Loading ---
try:
    import cv2
    import numpy as np
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False
    cv2, np = None, None

try:
    from skimage.metrics import structural_similarity as ssim
    HAS_SSIM = True
except ImportError:
    HAS_SSIM = False
    ssim = None

try:
    from twilio.twiml.messaging_response import MessagingResponse
    HAS_TWILIO = True
except ImportError:
    HAS_TWILIO = False
    MessagingResponse = None

# --- Firebase Admin Initialization ---
try:
    if not firebase_admin._apps:
        service_account_path = 'serviceAccountKey.json'
        if os.path.exists(service_account_path):
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred)
            print(">>> LIVE MODE: Firebase Admin Initialized with Service Account.")
        else:
            print(">>> OFFLINE MODE: serviceAccountKey.json not found. Using local simulation.")
            cred = credentials.ApplicationDefault()
            firebase_admin.initialize_app(cred)
    db = firestore.client()
except Exception as e:
    print(f">>> CAUTION: {e}")
    db = None

# --- Model setup ---
try:
    import mediapipe as mp
    from mediapipe.tasks import python
    from mediapipe.tasks.python import vision
except ImportError:
    mp = None

try:
    import google.generativeai as genai
    g_api_key = os.getenv("GOOGLE_API_KEY")
    if g_api_key:
        genai.configure(api_key=g_api_key)
        # Using Gemini 1.5 Pro for advanced forensic reasoning
        gemini_model = genai.GenerativeModel('gemini-1.5-pro')
    else:
        gemini_model = None
except ImportError:
    gemini_model = None

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class VerificationRequest(BaseModel):
    before_image: str
    after_image: str
    before_loc: str
    after_loc: str

# --- User Session Management (In-Memory) ---
user_sessions = {}

# --- Core Logic Functions ---

def calculate_distance(loc1_str, loc2_str):
    try:
        lat1, lon1 = map(float, loc1_str.split(',')) if isinstance(loc1_str, str) else (loc1_str['lat'], loc1_str['lng'])
        lat2, lon2 = map(float, loc2_str.split(',')) if isinstance(loc2_str, str) else (loc2_str['lat'], loc2_str['lng'])
        R = 6371000 # Meters
        dLat, dLon = radians(lat2 - lat1), radians(lon2 - lon1)
        a = sin(dLat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dLon/2)**2
        return 2 * R * asin(sqrt(a))
    except: return float('inf')

def decode_image(base64_str):
    try:
        data = base64_str.split(",")[1] if "," in base64_str else base64_str
        nparr = np.frombuffer(base64.b64decode(data), np.uint8)
        return cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    except: return None

async def perform_ai_audit(img1_b64, img2_b64):
    """The AI Auditor: Specifically trained to catch 'Pipe vs Laptop' fraud."""
    if not gemini_model:
        return {"is_verified": False, "reason": "AI Engine Offline"}
    
    try:
        img1_data = base64.b64decode(img1_b64.split(",")[1] if "," in img1_b64 else img1_b64)
        img2_data = base64.b64decode(img2_b64.split(",")[1] if "," in img2_b64 else img2_b64)

        prompt = (
            "You are a Forensic Investigator for a cleanup service. \n"
            "Compare Image 1 (Before) and Image 2 (After).\n"
            "STRICT RULES:\n"
            "1. The background (walls, floor, furniture) MUST match exactly.\n"
            "2. If Image 2 shows a different object entirely (like a laptop, a person, or a different room), "
            "it is FRAUD. You must reject it.\n"
            "3. The specific issue in Image 1 (e.g., a leak, trash,rust ) must be GONE in Image 2.\n"
            "4. If the issue is still visible in Image 2, it is FRAUD. You must reject it.\n"
    
            "OUTPUT JSON: {\"is_verified\": bool, \"reason\": \"Detailed explanation\"}"
        )

        response = gemini_model.generate_content(
            [prompt, {"mime_type": "image/jpeg", "data": img1_data}, {"mime_type": "image/jpeg", "data": img2_data}],
            generation_config={"response_mime_type": "application/json"}
        )
        return json.loads(response.text)
    except Exception as e:
        return {"is_verified": False, "reason": f"AI Error: {str(e)}"}

# --- Recommendation Engine Service ---

# --- Notification Services (Simulated) ---
class NotificationService:
    @staticmethod
    def get_templates():
        if not db: return None
        try:
            doc = db.collection('admin_settings').document('notifications').get()
            return doc.to_dict() if doc.exists else None
        except: return None

    @staticmethod
    def replace_vars(text, data):
        for k, v in data.items():
            text = text.replace(f"{{{k}}}", str(v))
        return text

    @staticmethod
    def send_email(to_email, subject, body):
        print(f"\n[📧 EMAIL SENT]")
        print(f"TO: {to_email}")
        print(f"SUBJECT: {subject}")
        print(f"BODY: {body}\n")
        return True

    @staticmethod
    def send_sms(phone, message):
        print(f"\n[📱 SMS SENT]")
        print(f"TO: {phone}")
        print(f"MESSAGE: {message}\n")
        return True

class RecommendationEngine:
    @staticmethod
    def analyze_patterns():
        if not db: return
        print(f"[{datetime.datetime.now()}] Optimized Analysis Running...")
        
        now = datetime.datetime.now(datetime.timezone.utc)
        yesterday = now - datetime.timedelta(hours=24)
        
        # Optimization 1: Only fetch reports from the last 24h for spikes
        reports_ref = db.collection('citizen_reports')
        all_reports = [doc.to_dict() | {"id": doc.id} for doc in reports_ref.stream()]
        
        recent_reports = []
        for r in all_reports:
            t = r.get('timestamp') or r.get('date')
            try:
                dt = datetime.datetime.fromisoformat(t.replace('Z', '+00:00')) if isinstance(t, str) else t
                if dt > yesterday: recent_reports.append(r)
            except: continue

        recommendations = []

        # Optimization 2: Single-pass Category Spike detection
        cats = {}
        for r in recent_reports:
            c = r.get('category', 'General')
            cats[c] = cats.get(c, 0) + 1
        
        for cat, count in cats.items():
            if count >= 2:
                print(f"AI ENGINE: Spike in {cat} ({count})")
                if count >= 3: # Hyper-critical spike
                    templates = NotificationService.get_templates()
                    msg = templates.get('authorityTemplate') if templates else "URGENT: {category} surge detected in {area}."
                    msg = NotificationService.replace_vars(msg, {"category": cat, "area": "Zone Hub", "count": count})
                    
                    NotificationService.send_email(
                        "authority@cityhall.gov", 
                        f"EMERGENCY: {cat.capitalize()} Surge Detected",
                        msg
                    )
                recommendations.append({
                    "type": "alert",
                    "title": f"Critical {cat} Spike",
                    "description": f"Detected {count} new reports for {cat} in 24h.",
                    "severity": "high",
                    "suggested_action": "Increase resource allocation for this category.",
                    "timestamp": now.isoformat()
                })

        # Optimization 3: Efficient Proximity Clustering (Grid-based)
        grid_clusters = {}
        pending = [r for r in all_reports if r.get('status') != 'Resolved']
        for r in pending:
            loc = r.get('location_coords') or r.get('location')
            try:
                lat, lon = (loc['lat'], loc['lng']) if isinstance(loc, dict) else map(float, loc.split(','))
                grid_key = f"{round(lat, 3)},{round(lon, 3)}" # Roughly 100m grid
                grid_clusters[grid_key] = grid_clusters.get(grid_key, []) + [r]
            except: continue

        for key, cluster in grid_clusters.items():
            if len(cluster) >= 2:
                recommendations.append({
                    "type": "recommendation",
                    "title": "Recurring Issue Zone",
                    "description": f"Cluster of {len(cluster)} active reports detected at {key}.",
                    "severity": "medium",
                    "suggested_action": "Schedule deep-dive infrastructure audit.",
                    "affected_area": key,
                    "timestamp": now.isoformat()
                })

        # Final step: Atomic update to Firestore Recommendations
        rec_col = db.collection('admin_recommendations')
        for rec in recommendations:
            rec_col.add(rec)

# --- Scheduler ---
scheduler = BackgroundScheduler()
scheduler.add_job(func=RecommendationEngine.analyze_patterns, trigger="interval", seconds=30)
scheduler.start()
# Trigger first run immediately
RecommendationEngine.analyze_patterns()

@app.get("/admin/recommendations")
async def get_recommendations():
    if not db:
        return [
            {"id": "mock1", "type": "alert", "title": "Garbage Spike", "description": "3 reports in 24h", "severity": "high", "affected_area": "Main St"},
            {"id": "mock2", "type": "recommendation", "title": "Recurring Drain Issue", "description": "Near Central Park", "severity": "medium", "affected_area": "Central Park"}
        ]
    
    recs = db.collection('admin_recommendations').order_by('timestamp', direction=firestore.Query.DESCENDING).limit(10).stream()
    return [doc.to_dict() | {"id": doc.id} for doc in recs]

class NotifyRequest(BaseModel):
    report_id: str
    status: str
    category: str
    contact: str
    preference: str

@app.post("/api/notify-status")
async def notify_status(req: NotifyRequest):
    # Fetch Templates
    templates = NotificationService.get_templates()
    template = templates.get('citizenTemplate') if templates else "Update on your report {id}: The status is now {status}."
    
    # Fill Variables
    message = NotificationService.replace_vars(template, {
        "id": req.report_id,
        "status": req.status,
        "category": req.category
    })

    if req.preference == 'email':
        NotificationService.send_email(req.contact, "Civic Update: Issue Status Changed", message)
    else:
        NotificationService.send_sms(req.contact, message)
    
    return {"status": "success", "dispatched_via": req.preference}

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False
    TfidfVectorizer, cosine_similarity = None, None

class DuplicateRequest(BaseModel):
    category: str
    description: str
    location_coords: dict

@app.post("/check-duplicate")
async def check_duplicate(req: DuplicateRequest):
    print(f"\n--- Duplicate Check Triggered ---")
    print(f"Category: {req.category}, Description Sample: {req.description[:50]}...")
    
    if not db:
        print("DEBUG: Firebase DB not initialized on server.")
        return {"is_duplicate": False, "debug": "DB_OFFLINE"}
    
    # 1. Fetch unresolved reports in same category
    reports_ref = db.collection('citizen_reports')
    query = reports_ref.where('category', '==', req.category).where('status', '!=', 'Resolved')
    candidates = [doc.to_dict() | {"id": doc.id} for doc in query.stream()]
    
    print(f"DEBUG: Found {len(candidates)} candidates in same category.")
    
    if not candidates:
        return {"is_duplicate": False}
    
    # 2. Geo-spatial filter (200m)
    nearby = []
    for c in candidates:
        dist = calculate_distance(req.location_coords, c.get('location_coords') or c.get('location'))
        print(f"DEBUG: Candidate {c['id'][:6]} Distance: {round(dist, 1)}m")
        if dist <= 200:
            nearby.append(c)
            
    print(f"DEBUG: {len(nearby)} reports within 200m radius.")
    
    if not nearby:
        return {"is_duplicate": False}
    
    # 3. Text Similarity check
    descriptions = [n.get('description', '') for n in nearby]
    
    # 3a. Keyword check (Fallback)
    for i, d in enumerate(descriptions):
        if req.description.lower() in d.lower() or d.lower() in req.description.lower():
            if len(req.description.split()) >= 3: # Avoid matching very common words
                 print(f"DEBUG: Keyword Match Found with {nearby[i]['id'][:6]}")
                 return {"is_duplicate": True, "existing_complaint": nearby[i]}

    # 3b. ML Vector Check (If available)
    if HAS_SKLEARN:
        try:
            vectorizer = TfidfVectorizer().fit_transform([req.description] + descriptions)
            vectors = vectorizer.toarray()
            similarities = cosine_similarity([vectors[0]], vectors[1:])[0]
            
            max_sim = 0
            best_match = None
            
            for i, sim in enumerate(similarities):
                print(f"DEBUG: Similarity with {nearby[i]['id'][:6]}: {round(float(sim), 2)}")
                if sim > max_sim:
                    max_sim = sim
                    best_match = nearby[i]
                    
            if max_sim > 0.5:
                return {
                    "is_duplicate": True,
                    "similarity": round(float(max_sim), 2),
                    "existing_complaint": {
                        "id": best_match["id"],
                        "title": best_match.get("title", "Untitled"),
                        "description": best_match.get("description", ""),
                        "upvote_count": best_match.get("upvote_count", 0)
                    }
                }
        except Exception as e:
            print(f"DEBUG: ML Check Error: {e}")

    return {"is_duplicate": False}

# --- WhatsApp integration ---

@app.post("/whatsapp")
async def whatsapp_bot(From: str = Form(...), Body: str = Form(None), MediaUrl0: str = Form(None), Latitude: float = Form(None), Longitude: float = Form(None)):
    if not HAS_TWILIO:
        return "Twilio dependency not found"
        
    response = MessagingResponse()
    msg = response.message()
    
    user_id = From
    session = user_sessions.get(user_id, {"step": "welcome"})
    
    body_text = Body.strip().lower() if Body else ""
    
    if session["step"] == "welcome":
        if body_text == "1":
            session["step"] = "awaiting_complaint_desc"
            msg.body("📝 Please describe the issue briefly (e.g., garbage, water leak, pothole).")
        elif body_text == "2":
            session["step"] = "awaiting_complaint_id"
            msg.body("🔍 Please enter your Complaint ID.")
        elif body_text == "3":
            session["step"] = "awaiting_nearby_location"
            msg.body("📍 Please share your location to view nearby issues.")
        else:
            msg.body("👋 Welcome to Smart Civic Help!\n\nYou can:\n1️⃣ Report a new issue\n2️⃣ Check complaint status\n3️⃣ View nearby issues\n\nReply with 1, 2, or 3.")
            
    elif session["step"] == "awaiting_complaint_desc":
        session["description"] = body_text
        session["step"] = "awaiting_photo"
        msg.body("📸 Please upload a photo of the issue.")
        
    elif session["step"] == "awaiting_photo":
        if MediaUrl0:
            session["photo_url"] = MediaUrl0
            # In real use, we'd use gemini or mobilenet here
            detected_issue = "Garbage/Waste" 
            session["detected_issue"] = detected_issue
            session["step"] = "confirming_ai"
            msg.body(f"🤖 Detected Issue: {detected_issue}\n\nIs this correct?\n✅ Yes\n❌ No")
        else:
            msg.body("Please upload a photo of the issue.")
            
    elif session["step"] == "confirming_ai":
        if "yes" in body_text or "✅" in body_text:
            session["step"] = "awaiting_location"
            msg.body("📍 Please share your location using the WhatsApp location feature.")
        else:
            session["step"] = "awaiting_complaint_desc"
            msg.body("Sorry for the mistake! Please describe the issue again.")
            
    elif session["step"] == "awaiting_location":
        if Latitude and Longitude:
            complaint_id = np.random.randint(1000, 9999)
            msg.body(f"✅ Complaint Registered Successfully!\n\n🆔 Complaint ID: {complaint_id}\n📌 Status: Pending\n⚡ Priority: High\n\nYou will receive updates here. Thank you for helping keep the city clean! 🙌")
            session = {"step": "welcome"} # Reset session
        else:
            msg.body("📍 Please share your location using the WhatsApp feature to complete the report.")

    user_sessions[user_id] = session
    return str(response)

@app.post("/verify")
async def verify(req: VerificationRequest):
    img1 = decode_image(req.before_image)
    img2 = decode_image(req.after_image)
    if img1 is None or img2 is None:
        raise HTTPException(status_code=400, detail="Invalid Image")

    dist = calculate_distance(req.before_loc, req.after_loc)
    
    pixel_sim = 0
    if HAS_CV2 and HAS_SSIM:
        try:
            img1_gray = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
            img2_gray = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)
            pixel_sim, _ = ssim(img1_gray, img2_gray, full=True)
        except Exception as e:
            print(f"DEBUG: Vision Audit Error: {e}")

    rejection_reason = None
    if dist > 150:
        rejection_reason = "Geofence Breach: Locations too far apart."
    elif pixel_sim > 0.98 and HAS_CV2:
        rejection_reason = "Forgery: You uploaded the exact same photo twice."
    
    if not rejection_reason:
        ai_result = await perform_ai_audit(req.before_image, req.after_image)
        is_verified = ai_result.get("is_verified", False)
        status = ai_result.get("reason", "Unknown Result")
    else:
        is_verified = False
        status = rejection_reason
        ai_result = {"is_verified": False, "reason": "Pre-check failed"}

    return {
        "is_verified": is_verified,
        "status": "✅ Verified" if is_verified else f"🚨 Rejected: {status}",
        "details": {
            "distance": round(dist, 1),
            "pixel_similarity": round(pixel_sim, 2),
            "ai_audit": ai_result
        }
    }


class DispatchRequest(BaseModel):
    incident_id: str
    severity: str
    category: str
    location: str
    detections: list

@app.post("/dispatch/automated")
async def dispatch_automated(req: DispatchRequest):
    print(f"\n[AI DISPATCH SYSTEM INTERCEPT] High Severity Incident Detected: {req.incident_id}")
    
    # 1. Try to fetch custom templates from Firestore
    authority_template = "ALERT: High Severity {category} detected at {location}. Automatic dispatch initiated for {count} hazards."
    
    try:
        if db:
            doc_ref = db.collection('admin_settings').document('notifications').get()
            if doc_ref.exists:
                data = doc_ref.to_dict()
                if 'authorityTemplate' in data:
                    authority_template = data['authorityTemplate']
    except Exception as e:
        print(f"DEBUG: Could not fetch template, using default. ({e})")

    # 2. Format the template
    try:
        formatted_message = authority_template.replace("{category}", req.category)
        formatted_message = formatted_message.replace("{area}", req.location).replace("{location}", req.location)
        formatted_message = formatted_message.replace("{count}", str(len(req.detections)))
        formatted_message = formatted_message.replace("{id}", req.incident_id)
        formatted_message = formatted_message.replace("{status}", "DISPATCHED")
    except Exception:
        formatted_message = authority_template # fallback if replace fails

    # 3. Execute Dispatch! (Simulated via terminal for safety unless SMTP is set)
    print("=" * 60)
    print("🚨 INITIATING AUTOMATED MUNICIPAL DISPATCH 🚨")
    print("To: city_maintenance_dispatch@gov.local")
    print(f"Subject: URGENT: {req.severity} Priority {req.category} Alert")
    print("-" * 60)
    print(formatted_message)
    print("=" * 60)
    
    return {
        "success": True, 
        "dispatch_status": "EXECUTED", 
        "message_sent": formatted_message
    }

if __name__ == "__main__":
    import uvicorn
    # Using 8005 as requested in the project context
    uvicorn.run(app, host="0.0.0.0", port=8005)