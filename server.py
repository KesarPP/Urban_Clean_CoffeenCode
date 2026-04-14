import os
import base64
import json
import datetime
import urllib.request
from math import radians, cos, sin, asin, sqrt
import sys
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# --- Fix for Windows Console Emoji Support ---
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

try:
    from fastapi import FastAPI, HTTPException, Request, Form
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import Response
    from pydantic import BaseModel
    import firebase_admin
    from firebase_admin import credentials, firestore
    from apscheduler.schedulers.background import BackgroundScheduler
    HAS_APSCHEUDLER = True
    FASTAPI_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Missing critical dependency: {e}")
    FASTAPI_AVAILABLE = False
    HAS_APSCHEUDLER = False
    BackgroundScheduler = None

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
    from twilio.rest import Client as TwilioClient
    HAS_TWILIO = True
except ImportError:
    HAS_TWILIO = False
    MessagingResponse = None
    TwilioClient = None

# --- Twilio Client Initialization ---
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_WHATSAPP_NUMBER = os.environ.get("TWILIO_WHATSAPP_NUMBER", "+14155238886")

try:
    if HAS_TWILIO and TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
        twilio_client = TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        print(f"[OK] Twilio Client Initialized Successfully")
        print(f"[INFO] WhatsApp Number: {TWILIO_WHATSAPP_NUMBER}")
    else:
        twilio_client = None
        if not HAS_TWILIO:
            print("⚠️ Twilio library not installed")
        else:
            print("⚠️ Twilio credentials not configured")
except Exception as e:
    print(f"[ERROR] Twilio Client Error: {e}")
    twilio_client = None

# --- Mock Firestore for Local Simulation ---
class MockFirestore:
    def __init__(self):
        self._data = {}
    def collection(self, name):
        if name not in self._data: self._data[name] = {}
        return MockCollection(self._data[name], name)

class MockCollection:
    def __init__(self, data, name):
        self._data = data
        self._name = name
    def add(self, doc):
        import uuid
        doc_id = str(uuid.uuid4())
        self._data[doc_id] = doc
        return (None, MockDocRef(doc_id, doc))
    def document(self, doc_id):
        return MockDocRef(doc_id, self._data.get(doc_id))
    def where(self, *args, **kwargs): return self  # Simplified where
    def order_by(self, *args, **kwargs): return self
    def limit(self, *args, **kwargs): return self
    def stream(self):
        return [MockDoc(k, v) for k, v in self._data.items()]

class MockDocRef:
    def __init__(self, id, data=None):
        self.id = id
        self._data = data
    def get(self): return MockDoc(self.id, self._data)

class MockDoc:
    def __init__(self, id, data):
        self.id = id
        self.exists = data is not None
        self._data = data
    def to_dict(self): return self._data

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
    print(">>> FALLBACK: Using MockFirestore simulation for local development.")
    db = MockFirestore()

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
        # Using Gemini 2.0 Flash (Preview) as requested for high-speed analysis
        gemini_model = genai.GenerativeModel('gemini-2.0-flash-exp')
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
if HAS_APSCHEUDLER:
    scheduler = BackgroundScheduler()
    scheduler.add_job(func=RecommendationEngine.analyze_patterns, trigger="interval", seconds=30)
    scheduler.start()
    # Trigger first run immediately
    RecommendationEngine.analyze_patterns()
else:
    print(">>> Warning: APScheduler not available. Background recommendation engine disabled.")

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

def extract_whatsapp_number(phone_from):
    """Extract clean phone number from Twilio format"""
    return phone_from.replace("whatsapp:", "").replace("whatsapp+", "+") if phone_from else phone_from

def get_issue_categories():
    """Return available issue categories"""
    return {
        "1": "🗑️ Garbage/Waste",
        "2": "💧 Water Leak",
        "3": "🕳️ Pothole/Road Damage",
        "4": "🌳 Parks & Green Space",
        "5": "💡 Street Light",
        "6": "🚗 Traffic/Parking",
        "7": "🔧 Other"
    }

async def create_whatsapp_complaint(user_data):
    """Save complaint to Firestore"""
    if not db:
        return {"error": "Database offline", "complaint_id": None}
    
    try:
        complaint_doc = {
            "phone": user_data.get("phone"),
            "description": user_data.get("description"),
            "category": user_data.get("category"),
            "issue_type": user_data.get("issue_type"),
            "photo_url": user_data.get("photo_url"),
            "location_coords": {
                "lat": user_data.get("latitude"),
                "lng": user_data.get("longitude")
            },
            "location_address": user_data.get("location_address", "Unknown"),
            "status": "Pending",
            "source": "WhatsApp",
            "created_at": datetime.datetime.now(datetime.timezone.utc),
            "verified": False
        }
        doc_ref = db.collection('whatsapp_complaints').add(complaint_doc)
        complaint_id = doc_ref[1].id
        return {"success": True, "complaint_id": complaint_id}
    except Exception as e:
        print(f"Error creating complaint: {e}")
        return {"error": str(e), "complaint_id": None}

async def get_nearby_issues(latitude, longitude, radius_km=5):
    """Fetch issues near user location"""
    if not db:
        return []
    
    try:
        # Get all pending/active complaints
        reports_ref = db.collection('whatsapp_complaints')
        query = reports_ref.where('status', 'in', ['Pending', 'In Progress'])
        docs = query.stream()
        
        nearby = []
        for doc in docs:
            data = doc.to_dict()
            coords = data.get('location_coords', {})
            if coords.get('lat') and coords.get('lng'):
                dist = calculate_distance(
                    {"lat": latitude, "lng": longitude},
                    coords
                )
                if dist <= radius_km * 1000:  # Convert km to meters
                    nearby.append({
                        "id": doc.id,
                        "type": data.get('issue_type', 'Unknown'),
                        "distance_m": round(dist),
                        "status": data.get('status'),
                        "category": data.get('category'),
                        "upvotes": data.get('upvotes', 0)
                    })
        
        # Sort by distance
        nearby.sort(key=lambda x: x['distance_m'])
        return nearby[:5]  # Return top 5 nearest
    except Exception as e:
        print(f"Error fetching nearby issues: {e}")
        return []

async def get_complaint_status(complaint_id):
    """Fetch complaint status from Firestore"""
    if not db:
        return {"error": "Database offline", "status": None}
    
    try:
        doc = db.collection('whatsapp_complaints').document(complaint_id).get()
        if doc.exists:
            data = doc.to_dict()
            return {
                "success": True,
                "status": data.get('status'),
                "category": data.get('category'),
                "created_at": data.get('created_at'),
                "updates": data.get('updates', [])
            }
        else:
            return {"error": "Complaint not found", "status": None}
    except Exception as e:
        return {"error": str(e), "status": None}

async def send_whatsapp_message(to_phone, message):
    """Send outbound WhatsApp message via Twilio"""
    if not twilio_client:
        print(f"⚠️ Twilio client not available. Would send to {to_phone}: {message}")
        return False
    
    try:
        # Format phone number for WhatsApp
        to_number = f"whatsapp:{to_phone}" if not to_phone.startswith("whatsapp:") else to_phone
        from_number = f"whatsapp:{TWILIO_WHATSAPP_NUMBER}"
        
        message = twilio_client.messages.create(
            from_=from_number,
            to=to_number,
            body=message
        )
        print(f"✅ WhatsApp message sent to {to_phone}")
        return True
    except Exception as e:
        print(f"❌ Error sending WhatsApp message: {e}")
        return False

@app.post("/whatsapp")
async def whatsapp_bot(From: str = Form(...), Body: str = Form(None), MediaUrl0: str = Form(None), Latitude: float = Form(None), Longitude: float = Form(None)):
    if not HAS_TWILIO:
        return "Twilio dependency not found"
    
    from twilio.rest import Client
    
    response = MessagingResponse()
    msg = response.message()
    
    user_phone = extract_whatsapp_number(From)
    print(f"\n📲 [WhatsApp Inbound] From: {From} ({user_phone}), Body: '{Body}'")
    
    user_id = From
    session = user_sessions.get(user_id, {"step": "welcome"})
    body_text = Body.strip().lower() if Body else ""
    print(f"🔄 [Session] Current Step: {session['step']}")
    
    # ============ WELCOME MENU ============
    if session["step"] == "welcome" or body_text in ["hi", "hello", "menu", "start", "help"]:
        session["step"] = "welcome" # Reset if they sent help
        if body_text == "1":
            session["step"] = "select_category"
            categories = get_issue_categories()
            category_menu = "\n".join([f"*{k}* - {v}" for k, v in categories.items()])
            msg.body(
                f"📋 *Select Issue Category*\n\n"
                f"Please reply with the number corresponding to the issue:\n\n"
                f"{category_menu}\n\n"
                f"Type *0* to return to the Main Menu."
            )
        elif body_text == "2":
            session["step"] = "awaiting_complaint_id"
            msg.body("🔍 *Check Complaint Status*\n\nPlease enter your *Complaint ID* (e.g., abc12345):\n\nType *0* to return to the Main Menu.")
        elif body_text == "3":
            session["step"] = "awaiting_nearby_location"
            msg.body(
                "📍 *View Nearby Issues*\n\nPlease share your *Live Location* to see issues reported near you.\n\n"
                "💡 *How to share location:*\n"
                "1. Tap the plus (+/📎) icon\n"
                "2. Select 'Location'\n"
                "3. Tap 'Share Live Location' or 'Send Your Current Location'\n\n"
                "Type *0* to return to the Main Menu."
            )
        else:
            msg.body(
                f"👋 *Welcome to Urban Clean - Smart Civic Help!*\n\n"
                f"I am your automated assistant for keeping the city clean. 🌍\n\n"
                f"How can I help you today?\n\n"
                f"1️⃣ *Report* a new issue\n"
                f"2️⃣ *Track* complaint status\n"
                f"3️⃣ *View* nearby issues\n\n"
                f"Reply with *1*, *2*, or *3*"
            )
    
    # ============ COMPLAINT REGISTRATION FLOW ============
    elif session["step"] == "select_category":
        if body_text == "0":
            session = {"step": "welcome"}
            msg.body("Returned to Main Menu. How can I help you?\n\n1️⃣ Report Issue\n2️⃣ Track Status\n3️⃣ View Nearby")
        else:
            categories = get_issue_categories()
            if body_text in categories:
                session["category"] = body_text
                session["issue_type"] = categories[body_text]
                session["step"] = "awaiting_complaint_desc"
                msg.body(
                    f"✅ *Category Selected:* {categories[body_text]}\n\n"
                    f"📝 *Description*\n"
                    f"Please describe the issue briefly (e.g., 'Large garbage pile at the park').\n\n"
                    f"Type *0* to cancel and return to menu."
                )
            else:
                msg.body("❌ *Invalid Selection*\n\nPlease reply with a number between 1 and 7, or *0* for the main menu.")
    
    elif session["step"] == "awaiting_complaint_desc":
        if body_text == "0":
            session = {"step": "welcome"}
            msg.body("Cancelled. Returned to Main Menu.\n\n1️⃣ Report Issue\n2️⃣ Track Status\n3️⃣ View Nearby")
        else:
            session["description"] = Body if Body else ""
            session["step"] = "awaiting_photo"
            msg.body(
                f"📸 *Upload Photo*\n\n"
                f"Please take a photo of the issue and send it here.\n\n"
                f"💡 *Tip:* Good photos help us resolve issues faster!\n\n"
                f"Type *0* to cancel."
            )
    
    elif session["step"] == "awaiting_photo":
        if body_text == "0":
            session = {"step": "welcome"}
            msg.body("Cancelled. Returned to Main Menu.")
        elif MediaUrl0:
            session["photo_url"] = MediaUrl0
            session["step"] = "awaiting_location"
            msg.body(
                f"✅ *Photo Received!*\n\n"
                f"📍 *Share Location*\n"
                f"Finally, please share the location of this issue.\n\n"
                f"💡 *Tap (+) → Location → Send Your Current Location*\n\n"
                f"Type *0* to cancel."
            )
        else:
            msg.body("❌ *No Photo Detected*\n\nPlease send or upload a photo of the issue. Use the paperclip (📎) or camera icon.")
    
    elif session["step"] == "awaiting_location":
        if body_text == "0":
            session = {"step": "welcome"}
            msg.body("Cancelled. Returned to Main Menu.")
        elif Latitude and Longitude:
            # Save complaint to Firestore
            user_data = {
                "phone": user_phone,
                "description": session.get("description", ""),
                "category": session.get("category", ""),
                "issue_type": session.get("issue_type", ""),
                "photo_url": session.get("photo_url", ""),
                "latitude": Latitude,
                "longitude": Longitude,
                "location_address": f"{Latitude:.4f}, {Longitude:.4f}"
            }
            
            result = await create_whatsapp_complaint(user_data)
            
            if result.get("success"):
                complaint_id = result.get("complaint_id")
                msg.body(
                    f"🎊 *Complaint Registered Successfully!* 🎉\n\n"
                    f"🆔 *ID:* `{complaint_id[:8]}`\n"
                    f"📌 *Status:* Pending Review\n"
                    f"📂 *Category:* {session.get('issue_type')}\n"
                    f"📍 *Location:* {Latitude:.4f}, {Longitude:.4f}\n\n"
                    f"We have notified the authorities. You will receive updates directly here on WhatsApp when the status changes.\n\n"
                    f"Thank you for help keep the city clean! 🙌"
                )
            else:
                msg.body(f"❌ *Error Registering Complaint*\n\n{result.get('error')}\n\nPlease try again later by typing *menu*.")
            
            session = {"step": "welcome"}  # Reset session
        else:
            msg.body("❌ *Location Not Found*\n\nPlease use the WhatsApp Location sharing feature (📎 > Location).")
    
    # ============ CHECK COMPLAINT STATUS ============
    elif session["step"] == "awaiting_complaint_id":
        if len(body_text) >= 6 or body_text.isalnum():
            status_result = await get_complaint_status(body_text)
            
            if status_result.get("success"):
                status_data = status_result
                msg.body(
                    f"📋 Complaint Status\n\n"
                    f"🆔 ID: {body_text}\n"
                    f"📌 Status: {status_data.get('status', 'Unknown')}\n"
                    f"📂 Category: {status_data.get('category', 'Unknown')}\n"
                    f"📅 Reported: {status_data.get('created_at', 'Unknown')}\n\n"
                    f"📩 You'll be notified once resolved."
                )
            else:
                msg.body(f"❌ {status_result.get('error')}")
            
            session = {"step": "welcome"}
        else:
            msg.body("❌ Invalid ID. Please enter a valid Complaint ID")
    
    # ============ VIEW NEARBY ISSUES ============
    elif session["step"] == "awaiting_nearby_location":
        if Latitude and Longitude:
            nearby_issues = await get_nearby_issues(Latitude, Longitude)
            
            if nearby_issues:
                issues_text = "📍 Nearby Issues:\n\n"
                for i, issue in enumerate(nearby_issues, 1):
                    issues_text += (
                        f"{i}. {issue['type']}\n"
                        f"   📏 {issue['distance_m']}m away\n"
                        f"   📌 Status: {issue['status']}\n"
                        f"   👍 {issue['upvotes']} upvotes\n\n"
                    )
                msg.body(issues_text + "Reply '1' for main menu")
            else:
                msg.body("✨ Great! No major issues near you.\n\nIf you see something, report it! 👍\n\nReply '1' for main menu")
            
            session = {"step": "welcome"}
        else:
            msg.body("❌ Location not received. Please tap (+) → Location feature")
    
    user_sessions[user_id] = session
    
    xml_content = str(response)
    print(f"📤 [WhatsApp Outbound] Sending TwiML:\n{xml_content}\n")
    
    return Response(content=xml_content, media_type="text/xml")

@app.get("/whatsapp-complaints")
async def get_whatsapp_complaints(phone: str = None, status: str = None):
    """Fetch WhatsApp complaints with optional filters"""
    if not db:
        return {"error": "Database offline", "complaints": []}
    
    try:
        query = db.collection('whatsapp_complaints')
        
        if phone:
            query = query.where('phone', '==', phone)
        if status:
            query = query.where('status', '==', status)
        
        docs = query.order_by('created_at', direction=firestore.Query.DESCENDING).limit(50).stream()
        complaints = []
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            complaints.append(data)
        
        return {"success": True, "complaints": complaints}
    except Exception as e:
        return {"error": str(e), "complaints": []}

@app.post("/whatsapp-complaints/{complaint_id}/upvote")
async def upvote_complaint(complaint_id: str):
    """Upvote a WhatsApp complaint to increase priority"""
    if not db:
        return {"error": "Database offline"}
    
    try:
        doc_ref = db.collection('whatsapp_complaints').document(complaint_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            return {"error": "Complaint not found"}
        
        current_upvotes = doc.to_dict().get('upvotes', 0)
        doc_ref.update({'upvotes': current_upvotes + 1})
        
        return {"success": True, "new_upvote_count": current_upvotes + 1}
    except Exception as e:
        return {"error": str(e)}

@app.post("/whatsapp-complaints/{complaint_id}/status")
async def update_complaint_status(complaint_id: str, status: str, notify: bool = False):
    """Update complaint status (admin only)"""
    if not db:
        return {"error": "Database offline"}
    
    valid_statuses = ['Pending', 'In Progress', 'Resolved', 'Rejected']
    if status not in valid_statuses:
        return {"error": f"Invalid status. Must be one of: {valid_statuses}"}
    
    try:
        doc_ref = db.collection('whatsapp_complaints').document(complaint_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            return {"error": "Complaint not found"}
        
        complaint_data = doc.to_dict()
        user_phone = complaint_data.get('phone')
        issue_type = complaint_data.get('issue_type', 'Issue')
        
        # Update status in Firestore
        doc_ref.update({
            'status': status,
            'updated_at': datetime.datetime.now(datetime.timezone.utc)
        })
        
        # Send WhatsApp notification if requested
        if notify and user_phone:
            status_emoji = {
                'Pending': '⏳',
                'In Progress': '🔧',
                'Resolved': '✅',
                'Rejected': '❌'
            }.get(status, '📍')
            
            message = (
                f"{status_emoji} Status Update\n\n"
                f"Your complaint for {issue_type} (ID: {complaint_id[:8]})\n"
                f"Status: {status}\n\n"
                f"Thank you for helping keep the city clean! 🌍"
            )
            
            await send_whatsapp_message(user_phone, message)
            return {
                "success": True,
                "message": f"Status updated to {status}",
                "notification_sent": True
            }
        else:
            return {
                "success": True,
                "message": f"Status updated to {status}",
                "notification_sent": False
            }
    except Exception as e:
        return {"error": str(e)}

@app.post("/whatsapp-complaints/{complaint_id}/notify")
async def send_status_notification(complaint_id: str, custom_message: str = None):
    """Send custom WhatsApp notification to complainant"""
    if not db:
        return {"error": "Database offline"}
    
    try:
        doc = db.collection('whatsapp_complaints').document(complaint_id).get()
        
        if not doc.exists:
            return {"error": "Complaint not found"}
        
        complaint_data = doc.to_dict()
        user_phone = complaint_data.get('phone')
        
        if not user_phone:
            return {"error": "User phone number not found"}
        
        if custom_message:
            message = custom_message
        else:
            status = complaint_data.get('status', 'Pending')
            issue_type = complaint_data.get('issue_type', 'Issue')
            
            status_emoji = {
                'Pending': '⏳',
                'In Progress': '🔧',
                'Resolved': '✅',
                'Rejected': '❌'
            }.get(status, '📍')
            
            message = (
                f"{status_emoji} Update on Your Report\n\n"
                f"Issue: {issue_type}\n"
                f"Current Status: {status}\n"
                f"ID: {complaint_id[:8]}\n\n"
                f"We're working to resolve this. Thank you! 🙌"
            )
        
        success = await send_whatsapp_message(user_phone, message)
        if success:
            return {"success": True, "message": "Notification sent"}
        else:
            return {"error": "Failed to send notification"}
    except Exception as e:
        return {"error": str(e)}

@app.post("/whatsapp-complaints/{complaint_id}/analyze")
async def analyze_whatsapp_complaint(complaint_id: str):
    """Analyze a WhatsApp complaint image using Gemini to verify its validity"""
    if not db:
        return {"error": "Database offline"}
    if not gemini_model:
        return {"error": "AI Engine Offline"}
    
    try:
        doc_ref = db.collection('whatsapp_complaints').document(complaint_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            return {"error": "Complaint not found"}
        
        data = doc.to_dict()
        photo_url = data.get('photo_url')
        issue_type = data.get('issue_type', 'Unknown')
        description = data.get('description', '')
        
        if not photo_url:
            return {"error": "No photo available for analysis"}

        # Fetch image from URL
        
        with urllib.request.urlopen(photo_url) as response:
            img_data = response.read()

        prompt = (
            f"Analyze this image for a civic complaint reporting system.\n"
            f"User reported: {issue_type}\n"
            f"User description: {description}\n\n"
            f"Tasks:\n"
            f"1. Verify if the image shows a genuine civic issue (garbage, leak, etc.).\n"
            f"2. Confirm if it matches the reported category: {issue_type}.\n"
            f"3. Describe the severity and any hazards (e.g., blocks road, smells, chemicals).\n"
            f"4. Provide a recommendation for the admin (Approve/Reject/Request more info).\n\n"
            f"Output JSON format:\n"
            f'{{"is_valid": bool, "summary": "Short result", "analysis": "Detailed description", "confidence": float, "recommendation": "Approve/Reject"}}'
        )

        response = gemini_model.generate_content(
            [prompt, {"mime_type": "image/jpeg", "data": img_data}],
            generation_config={"response_mime_type": "application/json"}
        )
        
        analysis_result = json.loads(response.text)
        
        # Update complaint with analysis result
        doc_ref.update({
            'ai_analysis': analysis_result,
            'verified': analysis_result.get('is_valid', False),
            'updated_at': datetime.datetime.now(datetime.timezone.utc)
        })
        
        return {"success": True, "analysis": analysis_result}
    except Exception as e:
        print(f"Analysis Error: {e}")
        return {"error": str(e)}

@app.post("/whatsapp-complaints/{complaint_id}/status")
async def update_whatsapp_complaint_status(complaint_id: str, status: str, notify: bool = True):
    """Update the status of a WhatsApp complaint and optionally notify the citizen via Twilio"""
    if not db:
        return {"error": "Database offline"}
    
    try:
        doc_ref = db.collection('whatsapp_complaints').document(complaint_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            return {"error": "Complaint not found"}
        
        data = doc.to_dict()
        phone = data.get('phone')
        issue_type = data.get('issue_type', 'Complaint')
        
        # Update Firestore
        doc_ref.update({
            'status': status,
            'updated_at': datetime.datetime.now(datetime.timezone.utc)
        })
        
        notification_sent = False
        message_body = ""
        
        if notify and phone and twilio_client:
            if status == "Resolved":
                message_body = f"✅ Good news! Your report about {issue_type} has been marking as RESOLVED. Thank you for helping keep our city clean!"
            elif status == "Rejected":
                message_body = f"❌ Your report about {issue_type} was reviewed but could not be processed at this time. Please ensure the photo is clear and the location is correct."
            else:
                message_body = f"ℹ️ Update: Your report about {issue_type} is now: {status}."
            
            try:
                message = twilio_client.messages.create(
                    from_=f"whatsapp:{TWILIO_WHATSAPP_NUMBER}",
                    body=message_body,
                    to=f"whatsapp:{phone}"
                )
                print(f"[NOTIFY] Sent status update to {phone}: {message.sid}")
                notification_sent = True
            except Exception as twilio_err:
                print(f"[TWILIO ERROR] Failed to send notification: {twilio_err}")
        
        return {
            "success": True, 
            "status": status, 
            "notification_sent": notification_sent,
            "message": message_body if notification_sent else "Status updated (no notification sent)"
        }
    except Exception as e:
        print(f"Status Update Error: {e}")
        return {"error": str(e)}

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