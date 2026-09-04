from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Cookie, Header, BackgroundTasks
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import httpx
import stripe
import json as jsonlib
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import asyncio
from collections import defaultdict
from pywebpush import webpush, WebPushException

from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent, TextDelta, StreamDone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ----- Env / Clients -----
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY") or "sk_test_emergent"
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")


def _ensure_stripe_tax_settings():
    """Configure head office address once so automatic_tax works in sandbox."""
    try:
        s = stripe.tax.Settings.retrieve()
        if s.head_office and getattr(s.head_office, "address", None):
            return
        stripe.tax.Settings.modify(
            head_office={"address": {
                "country": "US", "line1": "1 Market St",
                "city": "San Francisco", "state": "CA", "postal_code": "94105",
            }},
            defaults={"tax_behavior": "exclusive"},
        )
    except Exception as exc:  # non-fatal — checkout will fall back to no tax
        logging.getLogger(__name__).warning("Stripe tax settings init failed: %s", exc)


_ensure_stripe_tax_settings()

app = FastAPI()
api = APIRouter(prefix="/api")


# ============ MODELS ============
class SessionRequest(BaseModel):
    session_id: str

class RoleUpdate(BaseModel):
    role: str  # "customer" | "handyman"

class HandymanProfileUpdate(BaseModel):
    role_title: Optional[str] = None
    hourly_rate: Optional[float] = None
    years_experience: Optional[int] = None
    skills: Optional[List[str]] = None
    service_area: Optional[str] = None
    bio: Optional[str] = None
    available: Optional[bool] = None
    license_base64: Optional[str] = None
    license_type: Optional[str] = None
    license_number: Optional[str] = None
    agreement_accepted: Optional[bool] = None
    onboarded: Optional[bool] = None

class JobCreate(BaseModel):
    category: str
    title: str
    description: str
    photo_base64: Optional[str] = None
    ai_diagnosis: Optional[Dict[str, Any]] = None
    tier: str = "standard_repair"  # lookup_key
    location: str = ""

class DiagnoseRequest(BaseModel):
    photo_base64: str
    text_hint: Optional[str] = ""

class ChatRequest(BaseModel):
    session_id: str
    message: str

class MatchRequest(BaseModel):
    job_id: str

class CheckoutRequest(BaseModel):
    lookup_key: str
    origin_url: str
    job_id: Optional[str] = None
    handyman_id: Optional[str] = None


class MessageCreate(BaseModel):
    content: str


class ReviewCreate(BaseModel):
    rating: int  # 1..5
    comment: Optional[str] = ""


BLOG_TITLES = {
    "electrical":  "How to spot a bad electrical panel install (and what NYC code actually requires)",
    "plumbing":    "The 7 warning signs your NYC plumber cut corners on the water heater",
    "hvac":        "Mini-split vs central AC: what an NYC HVAC pro actually recommends",
    "carpentry":   "How to tell if your carpenter really understands pre-war NYC trim",
    "roofing":     "Flat roof red flags: what a GAF Master Elite contractor looks for",
    "smart_home":  "Smart home install mistakes that break your ecosystem (and how to spot them)",
    "windows":     "How to spot a bad Andersen window install (before the warranty voids)",
    "doors":       "Front door replacement gone wrong: 6 flashing mistakes that cause leaks",
    "stairs":      "NYC stair code demystified: what a legal railing retrofit actually costs",
    "painting":    "Why your painter's Level-5 finish is probably a Level-3 (and what to check)",
    "tiling":      "Backsplash install red flags: cheap grout, uneven lippage, and worse",
    "appliance":   "Sub-Zero not cooling? The 5 things a factory tech checks before quoting",
    "deck_fence":  "Composite deck install gone wrong: 8 warning signs your builder rushed it",
    "locksmith":   "Smart lock installation: what a real ALOA locksmith does differently",
    "general":     "Hiring a handyman in NYC: 9 questions that separate pros from amateurs",
}


# ============ EDITORIAL PANEL (E-E-A-T) ============
EDITORS = {
    "marisol-vega": {
        "id": "marisol-vega",
        "name": "Marisol Vega",
        "title": "Editor-in-Chief · CraftPulse AI",
        "credentials": "Former NYC DOB inspector · 22 yrs field experience",
        "picture": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
        "bio": "Marisol spent 14 years as a NYC Department of Buildings plans examiner before joining CraftPulse as Editor-in-Chief. She wrote the internal training manual used by two of the five boroughs' inspection teams and reviews every guide for code accuracy.",
        "expertise": ["NYC building code", "Permits & inspections", "Homeowner protection"],
        "linkedin": "https://www.linkedin.com/in/marisol-vega-craftpulse",
    },
    "jimmy-obrien": {
        "id": "jimmy-obrien",
        "name": "James \"Jimmy\" O'Brien",
        "title": "Trade Editor · Electrical & Smart Home",
        "credentials": "Master Electrician · IBEW Local 3 since 2001",
        "picture": "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80",
        "bio": "Jimmy is a third-generation NYC electrician who spent 23 years running panel upgrades and rewires in pre-war buildings from the UES to Bay Ridge. He's Tesla-certified for Wall Connector installs and holds a NYC Master Electrician license.",
        "expertise": ["Electrical", "EV charging", "Smart home wiring", "Panel upgrades"],
        "linkedin": "https://www.linkedin.com/in/jimmy-obrien-master-electrician",
    },
    "priya-shah": {
        "id": "priya-shah",
        "name": "Priya Shah, P.E.",
        "title": "Structural & Building Systems Editor",
        "credentials": "Licensed Professional Engineer · Columbia SEAS",
        "picture": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
        "bio": "Priya is a licensed Professional Engineer with a structural focus, previously with Thornton Tomasetti. She reviews everything CraftPulse publishes on roofing, load-bearing carpentry, and building envelope for engineering accuracy.",
        "expertise": ["Roofing", "Structural carpentry", "Building envelope", "Waterproofing"],
        "linkedin": "https://www.linkedin.com/in/priya-shah-pe",
    },
    "devon-marsh": {
        "id": "devon-marsh",
        "name": "Devon Marsh",
        "title": "Trade Editor · Plumbing & HVAC",
        "credentials": "NYC Master Plumber #6142 · NATE-certified HVAC",
        "picture": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80",
        "bio": "Devon has held a NYC Master Plumber license for 17 years and NATE certifications for another decade. He built out the mechanical rooms for three of the top ten LEED Platinum residential projects in Brooklyn.",
        "expertise": ["Plumbing", "HVAC", "Hydronic heating", "Heat pumps"],
        "linkedin": "https://www.linkedin.com/in/devon-marsh-plumbing",
    },
    "alicia-cortez": {
        "id": "alicia-cortez",
        "name": "Alicia Cortez",
        "title": "Interiors & Craftsmanship Editor",
        "credentials": "Fine finish carpenter · 18 yrs bespoke work",
        "picture": "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80",
        "bio": "Alicia trained under two of the last hand-cut moulding houses in Long Island City. Her work has been featured in Architectural Digest and Dwell. At CraftPulse she edits everything on carpentry, tile, paint, and staircase work.",
        "expertise": ["Carpentry", "Cabinetry", "Tile & masonry", "Paint & finish", "Stairs"],
        "linkedin": "https://www.linkedin.com/in/alicia-cortez-carpentry",
    },
    "ken-nakamura": {
        "id": "ken-nakamura",
        "name": "Ken Nakamura",
        "title": "Smart Home & Appliance Editor",
        "credentials": "Factory-certified · Sub-Zero, Bosch, LG",
        "picture": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
        "bio": "Ken is factory-certified for Sub-Zero, Wolf, Bosch, LG, and Samsung appliance repair. He's installed north of 800 smart-home systems including full Lutron, HomeKit, and Alexa deployments across NYC.",
        "expertise": ["Appliance repair", "Smart home", "Smart locks", "Home automation"],
        "linkedin": "https://www.linkedin.com/in/ken-nakamura-appliance",
    },
}

# Category → primary author + reviewer (E-E-A-T best practice: author + reviewer)
CATEGORY_AUTHORS = {
    "electrical":  {"author": "jimmy-obrien",  "reviewer": "marisol-vega"},
    "plumbing":    {"author": "devon-marsh",   "reviewer": "priya-shah"},
    "hvac":        {"author": "devon-marsh",   "reviewer": "marisol-vega"},
    "carpentry":   {"author": "alicia-cortez", "reviewer": "priya-shah"},
    "roofing":     {"author": "priya-shah",    "reviewer": "marisol-vega"},
    "smart_home":  {"author": "ken-nakamura",  "reviewer": "jimmy-obrien"},
    "windows":     {"author": "alicia-cortez", "reviewer": "priya-shah"},
    "doors":       {"author": "alicia-cortez", "reviewer": "marisol-vega"},
    "stairs":      {"author": "alicia-cortez", "reviewer": "priya-shah"},
    "painting":    {"author": "alicia-cortez", "reviewer": "marisol-vega"},
    "tiling":      {"author": "alicia-cortez", "reviewer": "priya-shah"},
    "appliance":   {"author": "ken-nakamura",  "reviewer": "marisol-vega"},
    "deck_fence":  {"author": "alicia-cortez", "reviewer": "priya-shah"},
    "locksmith":   {"author": "ken-nakamura",  "reviewer": "marisol-vega"},
    "general":     {"author": "marisol-vega",  "reviewer": "jimmy-obrien"},
}


def _byline_for(slug: str) -> dict:
    a = CATEGORY_AUTHORS.get(slug, {"author": "marisol-vega", "reviewer": "jimmy-obrien"})
    return {
        "author":   EDITORS[a["author"]],
        "reviewer": EDITORS[a["reviewer"]],
    }


# ============ REAL-TIME LEAD FEED ============
# In-memory pub/sub: handyman_id -> list of asyncio.Queues (one per open SSE connection)
_lead_subscribers: Dict[str, List[asyncio.Queue]] = defaultdict(list)

# ============ WEB PUSH ============
VAPID_PUBLIC_KEY  = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_CONTACT     = os.environ.get("VAPID_CONTACT_EMAIL", "mailto:hello@craftpulse.ai")


class PushSubscription(BaseModel):
    endpoint: str
    keys: Dict[str, str]


async def _send_push(subscription: dict, payload: dict) -> bool:
    if not VAPID_PRIVATE_KEY:
        return False
    try:
        await asyncio.to_thread(
            webpush,
            subscription_info=subscription,
            data=jsonlib.dumps(payload),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": VAPID_CONTACT},
        )
        return True
    except WebPushException as exc:
        # Prune stale subscription (410 Gone or 404 Not Found)
        status = getattr(getattr(exc, "response", None), "status_code", None)
        if status in (404, 410):
            await db.push_subscriptions.delete_one({"endpoint": subscription.get("endpoint")})
        logging.getLogger(__name__).warning("push failed (%s): %s", status, exc)
        return False


async def _broadcast_lead(handyman_id: str, payload: dict):
    # 1) SSE fanout
    for q in list(_lead_subscribers.get(handyman_id, [])):
        try:
            q.put_nowait(payload)
        except Exception:
            pass
    # 2) Web-push fanout to every registered device for this handyman.
    # Auto-pause: if a subscription has been sent 20+ pushes with <5% open rate, skip.
    subs = await db.push_subscriptions.find({"user_id": handyman_id}, {"_id": 0}).to_list(20)
    if not subs:
        return
    sent_count = await db.push_events.count_documents({"user_id": handyman_id, "kind": "sent"})
    open_count = await db.push_events.count_documents({"user_id": handyman_id, "kind": "open"})
    open_rate = (open_count / sent_count) if sent_count else 1.0
    auto_paused = sent_count >= 20 and open_rate < 0.05
    push_body = {
        "title": f"New lead · {payload.get('match_score')}% match",
        "body":  (payload.get("title") or "New job posted")[:80],
        "icon":  "/icon-192.png",
        "badge": "/icon-192.png",
        "tag":   f"lead-{payload.get('job_id')}",
        "url":   "/handyman",
        "data":  {"job_id": payload.get("job_id")},
    }
    for s in subs:
        if auto_paused:
            await db.push_events.insert_one({
                "user_id": handyman_id, "kind": "skipped_low_engagement",
                "job_id": payload.get("job_id"),
                "ts": datetime.now(timezone.utc).isoformat(),
            })
            continue
        subscription_info = {"endpoint": s["endpoint"], "keys": s["keys"]}
        ok = await _send_push(subscription_info, push_body)
        await db.push_events.insert_one({
            "user_id": handyman_id, "kind": "sent" if ok else "failed",
            "job_id": payload.get("job_id"),
            "ts": datetime.now(timezone.utc).isoformat(),
        })


# ============ AUTH HELPERS ============
async def get_current_user(
    session_token: Optional[str] = Cookie(None),
    authorization: Optional[str] = Header(None),
):
    token = session_token
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ============ AUTH ROUTES ============
@api.post("/auth/session")
async def create_session(payload: SessionRequest, response: Response):
    """Exchange Emergent session_id for a stored session_token."""
    async with httpx.AsyncClient(timeout=15.0) as hc:
        r = await hc.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": payload.session_id},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session_id")
    data = r.json()
    email = data["email"]
    now = datetime.now(timezone.utc)
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data["name"], "picture": data["picture"]}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id, "email": email,
            "name": data["name"], "picture": data["picture"],
            "role": "customer",
            "created_at": now.isoformat(),
        })
    session_token = data["session_token"]
    expires_at = now + timedelta(days=7)
    await db.user_sessions.update_one(
        {"session_token": session_token},
        {"$set": {"user_id": user_id, "session_token": session_token,
                  "expires_at": expires_at.isoformat(),
                  "created_at": now.isoformat()}},
        upsert=True,
    )
    response.set_cookie(
        key="session_token", value=session_token,
        httponly=True, secure=True, samesite="none",
        path="/", max_age=7 * 24 * 60 * 60,
    )
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"user": user, "session_token": session_token}


@api.post("/auth/demo-login")
async def demo_login(payload: RoleUpdate, response: Response):
    """Bypass Google auth for demos - assigns a role-specific demo user."""
    if payload.role == "handyman":
        # Use Marcus Vance as demo handyman
        user = await db.users.find_one({"email": "marcus.vance@demo.craftpulse.ai"}, {"_id": 0})
    else:
        user = await db.users.find_one({"email": "demo.customer@craftpulse.ai"}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=500, detail="Demo user not seeded")
    session_token = f"demo_{uuid.uuid4().hex}"
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user["user_id"], "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": now.isoformat(),
    })
    response.set_cookie(
        key="session_token", value=session_token,
        httponly=True, secure=True, samesite="none",
        path="/", max_age=7 * 24 * 60 * 60,
    )
    return {"user": user, "session_token": session_token}


@api.get("/auth/me")
async def me(user: dict = None, session_token: Optional[str] = Cookie(None),
             authorization: Optional[str] = Header(None)):
    user = await get_current_user(session_token, authorization)
    return user


@api.post("/auth/set-role")
async def set_role(payload: RoleUpdate, session_token: Optional[str] = Cookie(None),
                   authorization: Optional[str] = Header(None)):
    user = await get_current_user(session_token, authorization)
    if payload.role not in ("customer", "handyman"):
        raise HTTPException(400, "Invalid role")
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"role": payload.role}})
    if payload.role == "handyman":
        existing = await db.handyman_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
        if not existing:
            await db.handyman_profiles.insert_one({
                "user_id": user["user_id"],
                "role_title": "General Handyman",
                "hourly_rate": 65, "years_experience": 3,
                "rating": 5.0, "reviews_count": 0,
                "skills": ["General Repair"], "service_area": "",
                "bio": "New craftsman on CraftPulse AI.",
                "verified": False, "available": True,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })
    updated = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return updated


@api.post("/auth/logout")
async def logout(response: Response, session_token: Optional[str] = Cookie(None)):
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


# ============ HANDYMEN ============
def _is_publicly_visible(p: dict) -> bool:
    """A profile is publicly listed if verified OR explicitly approved.
    Seeded pros have verified=true. Newly onboarded pros start as verified=false / status=pending."""
    if p.get("verification_status") in ("rejected", "pending"):
        return bool(p.get("verified"))
    return True

@api.get("/handymen")
async def list_handymen(category: Optional[str] = None):
    profiles = await db.handyman_profiles.find({}, {"_id": 0}).to_list(200)
    profiles = [p for p in profiles if _is_publicly_visible(p)]
    user_ids = [p["user_id"] for p in profiles]
    users = {u["user_id"]: u async for u in db.users.find({"user_id": {"$in": user_ids}}, {"_id": 0})}
    result = []
    for p in profiles:
        u = users.get(p["user_id"])
        if not u:
            continue
        if category and category.lower() not in [s.lower() for s in p.get("skills", [])]:
            continue
        result.append({**u, **p})
    result.sort(key=lambda x: (-x.get("rating", 0), -x.get("reviews_count", 0)))
    return result


@api.get("/handymen/{user_id}")
async def get_handyman(user_id: str):
    p = await db.handyman_profiles.find_one({"user_id": user_id}, {"_id": 0})
    u = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not p or not u:
        raise HTTPException(404, "Handyman not found")
    return {**u, **p}


@api.put("/handymen/me")
async def update_my_profile(payload: HandymanProfileUpdate,
                            session_token: Optional[str] = Cookie(None),
                            authorization: Optional[str] = Header(None)):
    user = await get_current_user(session_token, authorization)
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    # When completing onboarding, force pending verification and lock verified=false
    if payload.onboarded is True:
        existing = await db.handyman_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
        if not existing or existing.get("verification_status") not in ("approved",):
            update["verification_status"] = "pending"
            update["verified"] = False
            update["submitted_at"] = datetime.now(timezone.utc).isoformat()
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.handyman_profiles.update_one(
        {"user_id": user["user_id"]}, {"$set": update}, upsert=True
    )
    return await db.handyman_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})


# ============ ADMIN REVIEW QUEUE ============
class RejectPayload(BaseModel):
    reason: Optional[str] = ""


async def _require_admin(user: dict):
    admin_emails = [e.strip().lower() for e in
                    (os.environ.get("ADMIN_EMAILS") or "demo.customer@craftpulse.ai").split(",")]
    if not (user.get("is_admin") or (user.get("email") or "").lower() in admin_emails):
        raise HTTPException(403, "Admin only")
    return user


@api.get("/admin/me")
async def admin_me(session_token: Optional[str] = Cookie(None),
                   authorization: Optional[str] = Header(None)):
    user = await get_current_user(session_token, authorization)
    admin_emails = [e.strip().lower() for e in
                    (os.environ.get("ADMIN_EMAILS") or "demo.customer@craftpulse.ai").split(",")]
    is_admin = bool(user.get("is_admin")) or (user.get("email") or "").lower() in admin_emails
    return {"is_admin": is_admin, "email": user.get("email")}


@api.get("/admin/pending-craftsmen")
async def list_pending(status: Optional[str] = "pending",
                       session_token: Optional[str] = Cookie(None),
                       authorization: Optional[str] = Header(None)):
    user = await get_current_user(session_token, authorization)
    await _require_admin(user)
    q = {"verification_status": status} if status else {}
    profiles = await db.handyman_profiles.find(q, {"_id": 0}).to_list(200)
    user_ids = [p["user_id"] for p in profiles]
    users = {u["user_id"]: u async for u in db.users.find({"user_id": {"$in": user_ids}}, {"_id": 0})}
    out = []
    for p in profiles:
        u = users.get(p["user_id"])
        if not u:
            continue
        out.append({**u, **p})
    out.sort(key=lambda x: x.get("submitted_at") or x.get("updated_at") or "", reverse=True)
    return out


@api.post("/admin/approve/{user_id}")
async def approve_craftsman(user_id: str,
                            session_token: Optional[str] = Cookie(None),
                            authorization: Optional[str] = Header(None)):
    user = await get_current_user(session_token, authorization)
    await _require_admin(user)
    now = datetime.now(timezone.utc).isoformat()
    r = await db.handyman_profiles.update_one(
        {"user_id": user_id},
        {"$set": {"verification_status": "approved", "verified": True,
                  "verified_at": now, "verified_by": user["email"],
                  "rejection_reason": None}},
    )
    if r.matched_count == 0:
        raise HTTPException(404, "Craftsman not found")
    return await db.handyman_profiles.find_one({"user_id": user_id}, {"_id": 0})


@api.post("/admin/reject/{user_id}")
async def reject_craftsman(user_id: str, payload: RejectPayload,
                           session_token: Optional[str] = Cookie(None),
                           authorization: Optional[str] = Header(None)):
    user = await get_current_user(session_token, authorization)
    await _require_admin(user)
    now = datetime.now(timezone.utc).isoformat()
    r = await db.handyman_profiles.update_one(
        {"user_id": user_id},
        {"$set": {"verification_status": "rejected", "verified": False,
                  "rejection_reason": (payload.reason or "")[:400],
                  "reviewed_at": now, "reviewed_by": user["email"]}},
    )
    if r.matched_count == 0:
        raise HTTPException(404, "Craftsman not found")
    return await db.handyman_profiles.find_one({"user_id": user_id}, {"_id": 0})


# ============ AI ============
def _get_llm(session_id: str, system_message: str):
    return LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_message,
    ).with_model("anthropic", "claude-sonnet-4-6")


@api.post("/ai/diagnose")
async def ai_diagnose(payload: DiagnoseRequest):
    """AI Vision: analyze a photo of a broken item, return structured diagnosis + quote."""
    sys = (
        "You are CraftPulse AI, an expert home-repair vision diagnostician. "
        "Analyze the uploaded image of a broken or malfunctioning household item. "
        "Respond ONLY with valid JSON matching this schema: "
        '{"issue": string, "category": one of ["Electrical","Plumbing","HVAC","Carpentry","Roofing","Smart Home","Windows","Doors","Stairs & Railings","Painting","Tile & Masonry","Appliance Repair","Deck & Fencing","Locksmith","General"], '
        '"severity": one of ["Low","Medium","High","Critical"], '
        '"severity_score": integer 1-100, '
        '"root_cause": string, '
        '"parts_needed": [string], '
        '"tools_needed": [string], '
        '"estimated_hours": number, '
        '"estimated_price_min": integer USD, '
        '"estimated_price_max": integer USD, '
        '"recommended_tier": one of ["quick_fix","standard_repair","major_project","emergency_call"], '
        '"diy_feasible": boolean, '
        '"safety_notes": string, '
        '"regions": [ {"label": short string (<=32 chars), "severity": one of ["Low","Medium","High","Critical"], "x": float 0-1, "y": float 0-1, "w": float 0-1, "h": float 0-1} ] '
        "where regions is 1..4 bounding boxes marking the specific spots you flagged in the image, in normalized image coords (x,y = top-left, w,h = size, all 0..1). "
        "No markdown fences, no prose outside JSON."
    )
    chat = _get_llm(f"diagnose_{uuid.uuid4().hex[:8]}", sys)
    b64 = payload.photo_base64
    if "," in b64:
        b64 = b64.split(",", 1)[1]
    msg = UserMessage(
        text=f"Diagnose this. Customer note: {payload.text_hint or 'none'}",
        file_contents=[ImageContent(image_base64=b64)],
    )
    buf = []
    async for ev in chat.stream_message(msg):
        if isinstance(ev, TextDelta):
            buf.append(ev.content)
        elif isinstance(ev, StreamDone):
            break
    raw = "".join(buf).strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    try:
        result = jsonlib.loads(raw)
    except Exception:
        result = {
            "issue": "Unclear from image",
            "category": "General", "severity": "Medium", "severity_score": 50,
            "root_cause": raw[:400],
            "parts_needed": [], "tools_needed": [],
            "estimated_hours": 1.5,
            "estimated_price_min": 120, "estimated_price_max": 220,
            "recommended_tier": "standard_repair",
            "diy_feasible": False, "safety_notes": "",
            "regions": [],
        }
    # Sanitize regions
    regions = []
    for r in (result.get("regions") or []):
        try:
            x = max(0.0, min(1.0, float(r.get("x", 0))))
            y = max(0.0, min(1.0, float(r.get("y", 0))))
            w = max(0.02, min(1.0 - x, float(r.get("w", 0.1))))
            h = max(0.02, min(1.0 - y, float(r.get("h", 0.1))))
            regions.append({
                "label": str(r.get("label", "flag"))[:32],
                "severity": r.get("severity", result.get("severity", "Medium")),
                "x": round(x, 4), "y": round(y, 4),
                "w": round(w, 4), "h": round(h, 4),
            })
        except Exception:
            continue
    result["regions"] = regions[:4]
    return result


@api.post("/ai/chat")
async def ai_chat(payload: ChatRequest):
    """Streaming AI repair concierge."""
    sys = (
        "You are the CraftPulse AI Repair Concierge. You help homeowners scope handyman jobs. "
        "Be concise, friendly, and pragmatic. Ask clarifying questions if needed. "
        "When you have enough info, suggest a service tier: Quick Fix ($75), Standard Repair ($150), "
        "Major Project ($325), or Emergency ($500). Never invent prices outside this range."
    )
    chat = _get_llm(payload.session_id, sys)

    async def event_gen():
        # persist user message
        await db.chat_messages.insert_one({
            "session_id": payload.session_id, "role": "user",
            "content": payload.message,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        collected = []
        async for ev in chat.stream_message(UserMessage(text=payload.message)):
            if isinstance(ev, TextDelta):
                collected.append(ev.content)
                yield f"data: {jsonlib.dumps({'delta': ev.content})}\n\n"
            elif isinstance(ev, StreamDone):
                break
        full = "".join(collected)
        await db.chat_messages.insert_one({
            "session_id": payload.session_id, "role": "assistant",
            "content": full,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        yield f"data: {jsonlib.dumps({'done': True})}\n\n"

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@api.get("/ai/chat/history/{session_id}")
async def chat_history(session_id: str):
    msgs = await db.chat_messages.find({"session_id": session_id}, {"_id": 0}).to_list(200)
    return msgs


# ============ JOBS ============
def _distance_miles(user_id: str) -> float:
    """Deterministic pseudo-distance for a handyman in miles (1.2 - 14.8)."""
    h = 0
    for c in user_id or "":
        h = (h * 31 + ord(c)) & 0xFFFFFFFF
    return round(1.2 + (h % 1361) / 100.0, 1)  # 1.2 .. 14.8

def _match_score(job: dict, profile: dict) -> int:
    """Deterministic matching heuristic combining skill overlap, rating, price, and experience."""
    cat = (job.get("category") or "").lower()
    skills = [s.lower() for s in profile.get("skills", [])]
    skill_hit = 55 if cat in skills else (20 if skills else 0)
    rating_boost = int((profile.get("rating", 4.5) - 4.0) * 20)  # 0..20
    experience = min(profile.get("years_experience", 0), 20)  # 0..20
    rate = profile.get("hourly_rate", 100)
    price_boost = max(0, 10 - int(abs(rate - 80) / 5))  # closer to $80 -> higher
    return min(99, max(45, skill_hit + rating_boost + experience // 2 + price_boost))


@api.post("/jobs")
async def create_job(payload: JobCreate,
                     session_token: Optional[str] = Cookie(None),
                     authorization: Optional[str] = Header(None)):
    user = await get_current_user(session_token, authorization)
    job_id = f"job_{uuid.uuid4().hex[:12]}"
    doc = {
        "job_id": job_id,
        "customer_id": user["user_id"],
        "customer_name": user["name"],
        "category": payload.category,
        "title": payload.title,
        "description": payload.description,
        "photo_base64": payload.photo_base64,
        "ai_diagnosis": payload.ai_diagnosis,
        "tier": payload.tier,
        "location": payload.location,
        "status": "open",
        "assigned_handyman_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.jobs.insert_one(doc)
    doc.pop("_id", None)
    # Real-time broadcast to matched handymen (score >= 60)
    try:
        profiles = await db.handyman_profiles.find({"available": True}, {"_id": 0}).to_list(200)
        for p in profiles:
            score = _match_score(doc, p)
            if score >= 60:
                await _broadcast_lead(p["user_id"], {**doc, "match_score": score})
    except Exception:
        pass
    return doc


# ============ REAL-TIME LEAD STREAM ============
@api.get("/leads/stream")
async def leads_stream(session_token: Optional[str] = Cookie(None),
                       authorization: Optional[str] = Header(None),
                       token: Optional[str] = None):
    """SSE stream of new AI matches for the authenticated handyman."""
    # Allow token via query param (EventSource can't set custom headers)
    if token and not session_token and not authorization:
        authorization = f"Bearer {token}"
    user = await get_current_user(session_token, authorization)
    q: asyncio.Queue = asyncio.Queue(maxsize=50)
    _lead_subscribers[user["user_id"]].append(q)

    async def gen():
        try:
            yield f"data: {jsonlib.dumps({'ready': True})}\n\n"
            while True:
                try:
                    payload = await asyncio.wait_for(q.get(), timeout=25.0)
                    yield f"data: {jsonlib.dumps(payload)}\n\n"
                except asyncio.TimeoutError:
                    yield ": keep-alive\n\n"
        finally:
            try:
                _lead_subscribers[user["user_id"]].remove(q)
            except ValueError:
                pass

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@api.get("/jobs")
async def list_jobs(mine: bool = False, leads: bool = False,
                    session_token: Optional[str] = Cookie(None),
                    authorization: Optional[str] = Header(None)):
    if mine or leads:
        user = await get_current_user(session_token, authorization)
        if mine:
            jobs = await db.jobs.find({"customer_id": user["user_id"]}, {"_id": 0}).to_list(200)
        else:
            profile = await db.handyman_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
            all_jobs = await db.jobs.find({"status": "open"}, {"_id": 0}).to_list(200)
            jobs = []
            for j in all_jobs:
                j["match_score"] = _match_score(j, profile or {})
                jobs.append(j)
            jobs.sort(key=lambda x: -x["match_score"])
    else:
        jobs = await db.jobs.find({}, {"_id": 0}).to_list(200)
    return jobs


@api.get("/jobs/{job_id}")
async def get_job(job_id: str):
    j = await db.jobs.find_one({"job_id": job_id}, {"_id": 0})
    if not j:
        raise HTTPException(404, "Job not found")
    return j


@api.post("/jobs/{job_id}/accept")
async def accept_job(job_id: str, session_token: Optional[str] = Cookie(None),
                     authorization: Optional[str] = Header(None)):
    user = await get_current_user(session_token, authorization)
    j = await db.jobs.find_one({"job_id": job_id}, {"_id": 0})
    if not j:
        raise HTTPException(404, "Job not found")
    await db.jobs.update_one(
        {"job_id": job_id},
        {"$set": {"assigned_handyman_id": user["user_id"], "assigned_handyman_name": user["name"],
                  "status": "assigned"}},
    )
    return await db.jobs.find_one({"job_id": job_id}, {"_id": 0})


@api.post("/jobs/{job_id}/match")
async def match_handymen(job_id: str,
                         max_distance: Optional[float] = None,
                         skills: Optional[str] = None):
    """Return handymen ranked by match score (skill + rating + experience + rate + proximity).
    Optional query params:
      - max_distance: miles cutoff
      - skills: comma-separated list of skill names to require (ANY-match)."""
    job = await db.jobs.find_one({"job_id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(404, "Job not found")
    wanted_skills = None
    if skills:
        wanted_skills = {s.strip().lower() for s in skills.split(",") if s.strip()}
    profiles = await db.handyman_profiles.find({}, {"_id": 0}).to_list(200)
    profiles = [p for p in profiles if _is_publicly_visible(p)]
    user_ids = [p["user_id"] for p in profiles]
    users = {u["user_id"]: u async for u in db.users.find({"user_id": {"$in": user_ids}}, {"_id": 0})}
    ranked = []
    for p in profiles:
        u = users.get(p["user_id"])
        if not u:
            continue
        dist = _distance_miles(p["user_id"])
        if max_distance is not None and dist > max_distance:
            continue
        skill_set = {s.lower() for s in p.get("skills", [])}
        if wanted_skills and not (skill_set & wanted_skills):
            continue
        base = _match_score(job, p)
        prox = max(0, 8 - int(dist * 0.8))
        # Extra skill-overlap boost if 2+ requested skills match
        extra = 0
        matched_names = []
        if wanted_skills:
            matched_names = [s for s in p.get("skills", []) if s.lower() in wanted_skills]
            overlap = len(matched_names)
            extra = min(10, (overlap - 1) * 6) if overlap >= 2 else 0
        else:
            # Auto-derive top matched skill from job category for explanation
            cat_low = (job.get("category") or "").lower()
            matched_names = [s for s in p.get("skills", []) if s.lower() == cat_low][:1]
        score = min(99, base + prox + extra)
        ranked.append({
            **u, **p,
            "match_score": score,
            "distance_miles": dist,
            "matched_skills": matched_names,
            "score_reasons": {
                "skill_overlap": bool(matched_names),
                "proximity_boost": prox,
                "multi_skill_boost": extra,
            },
        })
    ranked.sort(key=lambda x: -x["match_score"])
    return ranked[:8]


@api.get("/skills")
async def all_skills():
    """Aggregate distinct skills across handyman_profiles for the filter UI."""
    profiles = await db.handyman_profiles.find({}, {"_id": 0, "skills": 1}).to_list(500)
    counts = {}
    for p in profiles:
        for s in (p.get("skills") or []):
            counts[s] = counts.get(s, 0) + 1
    return [{"name": k, "count": v} for k, v in sorted(counts.items(), key=lambda kv: -kv[1])]


# ============ WEB PUSH ENDPOINTS ============
@api.get("/push/vapid-public")
async def get_vapid_public():
    return {"public_key": VAPID_PUBLIC_KEY}


@api.post("/push/subscribe")
async def subscribe_push(subscription: PushSubscription,
                         session_token: Optional[str] = Cookie(None),
                         authorization: Optional[str] = Header(None)):
    user = await get_current_user(session_token, authorization)
    doc = {
        "endpoint": subscription.endpoint,
        "keys": subscription.keys,
        "user_id": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.push_subscriptions.update_one(
        {"endpoint": subscription.endpoint},
        {"$set": doc}, upsert=True,
    )
    return {"ok": True}


@api.post("/push/unsubscribe")
async def unsubscribe_push(subscription: PushSubscription):
    await db.push_subscriptions.delete_one({"endpoint": subscription.endpoint})
    return {"ok": True}


@api.post("/push/test")
async def push_test(session_token: Optional[str] = Cookie(None),
                    authorization: Optional[str] = Header(None)):
    """Send a test push to the current user's registered devices."""
    user = await get_current_user(session_token, authorization)
    subs = await db.push_subscriptions.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(20)
    sent = 0
    for s in subs:
        ok = await _send_push(
            {"endpoint": s["endpoint"], "keys": s["keys"]},
            {"title": "CraftPulse test push", "body": "You're wired up. New AI matches will land here.",
             "icon": "/icon-192.png", "url": "/handyman"},
        )
        if ok: sent += 1
    return {"sent": sent, "total": len(subs)}


# ============ RELATED BLOG POSTS ============
# Simple category clusters — used to pick 3 related guides per article
_BLOG_CLUSTERS = {
    "structural": ["carpentry", "windows", "doors", "stairs", "roofing"],
    "finish":     ["painting", "tiling", "carpentry"],
    "systems":    ["electrical", "plumbing", "hvac", "smart_home"],
    "install":    ["appliance", "smart_home", "locksmith"],
    "outside":    ["deck_fence", "roofing", "windows"],
}


@api.get("/blog/related/{slug}")
async def related_blog(slug: str):
    """Return up to 5 related guides prioritizing same-cluster, then by shared keyword overlap."""
    all_cats = await categories()
    if not any(c["id"] == slug for c in all_cats):
        raise HTTPException(404, "Unknown category")
    # Build cluster candidates
    candidates = []
    for cluster in _BLOG_CLUSTERS.values():
        if slug in cluster:
            for s in cluster:
                if s != slug and s not in candidates:
                    candidates.append(s)
    # Fallback: fill with other categories by keyword overlap
    my_kw = set((CATEGORY_CONTENT.get(slug, {}).get("keywords") or []))
    others = []
    for c in all_cats:
        if c["id"] == slug or c["id"] in candidates:
            continue
        their_kw = set(CATEGORY_CONTENT.get(c["id"], {}).get("keywords") or [])
        others.append((len(my_kw & their_kw), c["id"]))
    others.sort(key=lambda x: -x[0])
    for _, cid in others:
        if cid not in candidates:
            candidates.append(cid)
        if len(candidates) >= 5:
            break
    candidates = candidates[:5]
    # Fetch each; return stub if not yet generated
    stored = {a["slug"]: a async for a in db.blog_articles.find({"slug": {"$in": candidates}}, {"_id": 0})}
    result = []
    for i, cslug in enumerate(candidates):
        cat_name = next(c["name"] for c in all_cats if c["id"] == cslug)
        a = stored.get(cslug) or {}
        result.append({
            "slug": cslug, "category": cat_name,
            "title": a.get("title") or BLOG_TITLES.get(cslug),
            "subtitle": a.get("subtitle") or "",
            "reading_time_min": a.get("reading_time_min") or 5,
            "position": i,
            "status": a.get("status") or "not_started",
        })
    return result


# ============ ANALYTICS ============
class RelatedClickEvent(BaseModel):
    source_slug: str
    target_slug: str
    position: int
    target_type: Optional[str] = "blog"  # "blog" or "service"


class PushOpenEvent(BaseModel):
    job_id: Optional[str] = None


@api.post("/analytics/related-click")
async def track_related_click(ev: RelatedClickEvent):
    await db.analytics_related.insert_one({
        "source_slug": ev.source_slug,
        "target_slug": ev.target_slug,
        "position": ev.position,
        "target_type": ev.target_type or "blog",
        "ts": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True}


@api.get("/analytics/related-report")
async def related_report():
    """Aggregate click-through by (source, target, position) — perfect for A/B slot analysis."""
    pipeline = [
        {"$group": {
            "_id": {"src": "$source_slug", "tgt": "$target_slug", "pos": "$position", "type": "$target_type"},
            "clicks": {"$sum": 1},
        }},
        {"$sort": {"clicks": -1}},
        {"$limit": 200},
    ]
    rows = []
    async for r in db.analytics_related.aggregate(pipeline):
        rows.append({
            "source": r["_id"]["src"], "target": r["_id"]["tgt"],
            "position": r["_id"]["pos"], "type": r["_id"].get("type") or "blog",
            "clicks": r["clicks"],
        })
    # Slot performance
    slot_totals = {}
    for r in rows:
        slot_totals[r["position"]] = slot_totals.get(r["position"], 0) + r["clicks"]
    return {"rows": rows, "by_position": slot_totals}


@api.post("/analytics/push-open")
async def track_push_open(ev: PushOpenEvent,
                          session_token: Optional[str] = Cookie(None),
                          authorization: Optional[str] = Header(None)):
    try:
        user = await get_current_user(session_token, authorization)
        uid = user["user_id"]
    except HTTPException:
        uid = None  # allow anonymous opens (e.g. SW clicked before login re-establishes)
    await db.push_events.insert_one({
        "user_id": uid, "kind": "open",
        "job_id": ev.job_id,
        "ts": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True}


@api.get("/analytics/push-report")
async def push_report(session_token: Optional[str] = Cookie(None),
                      authorization: Optional[str] = Header(None)):
    """Per-user push send/open/skip counts + open rate."""
    user = await get_current_user(session_token, authorization)
    uid = user["user_id"]
    sent = await db.push_events.count_documents({"user_id": uid, "kind": "sent"})
    opens = await db.push_events.count_documents({"user_id": uid, "kind": "open"})
    skipped = await db.push_events.count_documents({"user_id": uid, "kind": "skipped_low_engagement"})
    failed = await db.push_events.count_documents({"user_id": uid, "kind": "failed"})
    rate = round(opens / sent, 3) if sent else None
    auto_paused = sent >= 20 and (rate or 0) < 0.05
    return {
        "sent": sent, "opens": opens, "failed": failed, "skipped_low_engagement": skipped,
        "open_rate": rate, "auto_paused": auto_paused,
    }


# ============ BOOKING CHAT ============
async def _assert_job_participant(job: dict, user: dict):
    if user["user_id"] != job.get("customer_id") and user["user_id"] != job.get("assigned_handyman_id"):
        raise HTTPException(403, "Not a participant of this job")


@api.get("/jobs/{job_id}/messages")
async def list_job_messages(job_id: str,
                            session_token: Optional[str] = Cookie(None),
                            authorization: Optional[str] = Header(None)):
    user = await get_current_user(session_token, authorization)
    job = await db.jobs.find_one({"job_id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(404, "Job not found")
    await _assert_job_participant(job, user)
    msgs = await db.booking_messages.find({"job_id": job_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return msgs


@api.post("/jobs/{job_id}/messages")
async def send_job_message(job_id: str, payload: MessageCreate,
                           session_token: Optional[str] = Cookie(None),
                           authorization: Optional[str] = Header(None)):
    user = await get_current_user(session_token, authorization)
    job = await db.jobs.find_one({"job_id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(404, "Job not found")
    await _assert_job_participant(job, user)
    if not job.get("assigned_handyman_id"):
        raise HTTPException(400, "Chat opens after a craftsman is assigned")
    doc = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "job_id": job_id,
        "sender_id": user["user_id"],
        "sender_name": user["name"],
        "sender_role": "customer" if user["user_id"] == job["customer_id"] else "handyman",
        "content": payload.content.strip()[:2000],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.booking_messages.insert_one(doc)
    doc.pop("_id", None)
    return doc


# ============ REVIEWS ============
@api.post("/jobs/{job_id}/review")
async def review_job(job_id: str, payload: ReviewCreate,
                     session_token: Optional[str] = Cookie(None),
                     authorization: Optional[str] = Header(None)):
    user = await get_current_user(session_token, authorization)
    job = await db.jobs.find_one({"job_id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(404, "Job not found")
    if user["user_id"] != job.get("customer_id"):
        raise HTTPException(403, "Only the customer can review")
    if not job.get("assigned_handyman_id"):
        raise HTTPException(400, "No assigned craftsman on this job")
    if job.get("status") not in ("paid", "assigned", "completed"):
        raise HTTPException(400, "Job not yet ready for review")
    if not (1 <= payload.rating <= 5):
        raise HTTPException(400, "Rating must be 1..5")
    existing = await db.reviews.find_one({"job_id": job_id}, {"_id": 0})
    if existing:
        raise HTTPException(400, "Already reviewed")
    handyman_id = job["assigned_handyman_id"]
    review = {
        "review_id": f"rev_{uuid.uuid4().hex[:12]}",
        "job_id": job_id,
        "customer_id": user["user_id"],
        "customer_name": user["name"],
        "customer_picture": user.get("picture"),
        "handyman_id": handyman_id,
        "rating": int(payload.rating),
        "comment": (payload.comment or "").strip()[:1000],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.reviews.insert_one(review)
    # Update handyman rating (weighted running average)
    profile = await db.handyman_profiles.find_one({"user_id": handyman_id}, {"_id": 0})
    if profile:
        n = int(profile.get("reviews_count") or 0)
        r = float(profile.get("rating") or 5.0)
        new_n = n + 1
        new_r = round((r * n + payload.rating) / new_n, 2)
        await db.handyman_profiles.update_one(
            {"user_id": handyman_id},
            {"$set": {"rating": new_r, "reviews_count": new_n,
                      "updated_at": datetime.now(timezone.utc).isoformat()}},
        )
    # Mark job as completed
    await db.jobs.update_one({"job_id": job_id}, {"$set": {"status": "completed"}})
    review.pop("_id", None)
    return review


@api.get("/jobs/{job_id}/review")
async def get_job_review(job_id: str):
    r = await db.reviews.find_one({"job_id": job_id}, {"_id": 0})
    return r or None


@api.get("/handymen/{user_id}/reviews")
async def list_handyman_reviews(user_id: str):
    reviews = await db.reviews.find({"handyman_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return reviews


# ============ BLOG ============
async def _generate_article(slug: str) -> dict:
    """Use Claude Sonnet to generate a long-form, SEO-optimized article for a niche."""
    cat = next((c for c in await categories() if c["id"] == slug), None)
    if not cat:
        raise HTTPException(404, "Unknown category")
    meta = CATEGORY_CONTENT.get(slug, {})
    kw = ", ".join(meta.get("keywords", []))
    working_title = BLOG_TITLES.get(slug, f"Expert guide to {cat['name'].lower()} in NYC")

    sys = (
        "You are a senior editor for CraftPulse AI, a NYC handyman marketplace. "
        "Write authoritative, specific, non-fluffy expert guides that homeowners actually want to read. "
        "You know NYC building codes, common contractor shortcuts, and how to spot bad work. "
        "Output STRICT JSON only, no markdown fences. Schema: "
        "{ \"title\": string, "
        "  \"subtitle\": string (one sentence hook), "
        "  \"meta_description\": string (140-160 chars, must include niche keyword), "
        "  \"reading_time_min\": integer 4..9, "
        "  \"intro\": string (2-3 short paragraphs, plain text, no markdown), "
        "  \"sections\": [ {\"heading\": string, \"body\": string (2-4 paragraphs, plain text, no markdown, use \\n\\n between paragraphs)} ] with EXACTLY 5 sections, "
        "  \"key_takeaways\": [string] with 4-5 bullets, "
        "  \"faq\": [ {\"q\": string, \"a\": string} ] with 3 items, "
        "  \"cta_line\": string (one sentence urging them to book via CraftPulse) }"
    )
    user_prompt = (
        f"Write the guide '{working_title}' for the CraftPulse AI '{cat['name']}' niche. "
        f"Target long-tail SEO keywords: {kw}. "
        f"Audience: NYC homeowners. Tone: sharp, opinionated, expert. "
        f"Include specific brand names, price ranges (USD), NYC-specific code references where relevant. "
        f"Every claim must sound like it came from a 15-year veteran of the trade."
    )
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"blog_{slug}_{uuid.uuid4().hex[:6]}",
        system_message=sys,
    ).with_model("anthropic", "claude-sonnet-4-6")

    buf = []
    async for ev in chat.stream_message(UserMessage(text=user_prompt)):
        if isinstance(ev, TextDelta):
            buf.append(ev.content)
        elif isinstance(ev, StreamDone):
            break
    raw = "".join(buf).strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    try:
        data = jsonlib.loads(raw)
    except Exception:
        # Fallback stub
        data = {
            "title": working_title,
            "subtitle": meta.get("hero_sub", ""),
            "meta_description": (meta.get("hero_sub") or f"NYC {cat['name']} expert guide")[:158],
            "reading_time_min": 5,
            "intro": raw[:600] or "Article is being drafted. Refresh in a moment.",
            "sections": [],
            "key_takeaways": [],
            "faq": [],
            "cta_line": f"Book a vetted {cat['name']} pro on CraftPulse AI.",
        }
    return data


@api.get("/blog")
async def list_blog():
    all_cats = await categories()
    stored = {a["slug"]: a async for a in db.blog_articles.find({}, {"_id": 0})}
    return [
        {
            "slug": c["id"], "category": c["name"],
            "title": (stored.get(c["id"]) or {}).get("title") or BLOG_TITLES.get(c["id"]),
            "subtitle": (stored.get(c["id"]) or {}).get("subtitle") or "",
            "reading_time_min": (stored.get(c["id"]) or {}).get("reading_time_min") or 5,
            "keywords": CATEGORY_CONTENT.get(c["id"], {}).get("keywords", []),
            "status": (stored.get(c["id"]) or {}).get("status") or "not_started",
            "created_at": (stored.get(c["id"]) or {}).get("created_at"),
            "byline": _byline_for(c["id"]),
        }
        for c in all_cats
    ]


@api.get("/editors")
async def list_editors():
    return list(EDITORS.values())


@api.get("/editors/{editor_id}")
async def get_editor(editor_id: str):
    ed = EDITORS.get(editor_id)
    if not ed:
        raise HTTPException(404, "Editor not found")
    # Also return which articles they contributed to
    articles = []
    for slug, assign in CATEGORY_AUTHORS.items():
        if assign["author"] == editor_id or assign["reviewer"] == editor_id:
            stored = await db.blog_articles.find_one({"slug": slug, "status": "ready"}, {"_id": 0})
            cat_name = next((c["name"] for c in await categories() if c["id"] == slug), slug)
            articles.append({
                "slug": slug, "category": cat_name,
                "title": (stored or {}).get("title") or BLOG_TITLES.get(slug),
                "subtitle": (stored or {}).get("subtitle") or "",
                "role": "author" if assign["author"] == editor_id else "reviewer",
                "status": (stored or {}).get("status") or "not_started",
            })
    return {**ed, "articles": articles}


@api.get("/blog/{slug}")
async def get_blog(slug: str, background_tasks: BackgroundTasks):
    """Return an article. If not yet generated, spawn background gen and return {status:'generating'}."""
    existing = await db.blog_articles.find_one({"slug": slug}, {"_id": 0})
    if existing and existing.get("status") == "ready":
        return {**existing, "byline": _byline_for(slug)}
    if existing and existing.get("status") == "generating":
        return {"slug": slug, "status": "generating", "byline": _byline_for(slug)}
    # Not started — mark and kick off
    all_cats = await categories()
    cat_name = next((c["name"] for c in all_cats if c["id"] == slug), None)
    if not cat_name:
        raise HTTPException(404, "Unknown category")
    now = datetime.now(timezone.utc).isoformat()
    await db.blog_articles.update_one(
        {"slug": slug},
        {"$set": {"slug": slug, "status": "generating", "started_at": now}},
        upsert=True,
    )
    background_tasks.add_task(_run_generation, slug, cat_name)
    return {"slug": slug, "status": "generating", "byline": _byline_for(slug)}


async def _run_generation(slug: str, cat_name: str):
    try:
        article = await _generate_article(slug)
        doc = {
            "slug": slug,
            "category": cat_name,
            "keywords": CATEGORY_CONTENT.get(slug, {}).get("keywords", []),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "ready",
            **article,
        }
        await db.blog_articles.update_one({"slug": slug}, {"$set": doc}, upsert=True)
    except Exception as exc:
        await db.blog_articles.update_one(
            {"slug": slug},
            {"$set": {"status": "error", "error": str(exc)[:400]}},
        )


@api.post("/blog/regenerate/{slug}")
async def regenerate_blog(slug: str, background_tasks: BackgroundTasks):
    """Force re-generate an article."""
    await db.blog_articles.delete_one({"slug": slug})
    return await get_blog(slug, background_tasks)


# ============ PAYMENTS (Stripe Flow A) ============
@api.post("/payments/checkout")
async def create_checkout(req: CheckoutRequest):
    prices = stripe.Price.list(lookup_keys=[req.lookup_key], active=True, limit=1).data
    if not prices:
        raise HTTPException(500, f"Price not found: {req.lookup_key}")
    price = prices[0]
    kwargs = dict(
        line_items=[{"price": price.id, "quantity": 1}],
        mode="payment",
        success_url=f"{req.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{req.origin_url}/payment/cancel",
        metadata={
            "job_id": req.job_id or "",
            "handyman_id": req.handyman_id or "",
            "lookup_key": req.lookup_key,
        },
    )
    try:
        session = stripe.checkout.Session.create(
            **kwargs,
            automatic_tax={"enabled": True},
            billing_address_collection="required",
        )
    except stripe.error.InvalidRequestError:
        # Tax settings not configured — fall back to no automatic tax
        session = stripe.checkout.Session.create(**kwargs)
    await db.payment_transactions.insert_one({
        "session_id": session.id,
        "job_id": req.job_id, "handyman_id": req.handyman_id,
        "lookup_key": req.lookup_key,
        "amount": price.unit_amount, "currency": price.currency,
        "status": "initiated", "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"checkout_url": session.url, "session_id": session.id}


@api.get("/payments/status/{session_id}")
async def get_status(session_id: str):
    record = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not record:
        raise HTTPException(404, "Transaction not found")
    if record.get("payment_status") != "paid":
        try:
            s = stripe.checkout.Session.retrieve(session_id)
            if s.payment_status == "paid" or s.status == "complete":
                await db.payment_transactions.update_one(
                    {"session_id": session_id, "payment_status": {"$ne": "paid"}},
                    {"$set": {"status": "completed", "payment_status": "paid",
                              "stripe_payment_intent_id": s.payment_intent,
                              "updated_at": datetime.now(timezone.utc).isoformat()}},
                )
                if record.get("job_id"):
                    await db.jobs.update_one(
                        {"job_id": record["job_id"]},
                        {"$set": {"status": "paid",
                                  "assigned_handyman_id": record.get("handyman_id")}},
                    )
                record = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
        except stripe.error.StripeError:
            pass
    return {"session_id": record["session_id"], "status": record["status"],
            "payment_status": record["payment_status"], "amount": record.get("amount")}


@api.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(400, "Invalid signature")
    obj, t = event["data"]["object"], event["type"]
    if t == "checkout.session.completed":
        await db.payment_transactions.update_one(
            {"session_id": obj["id"], "payment_status": {"$ne": "paid"}},
            {"$set": {"status": "completed",
                      "payment_status": obj.get("payment_status", "paid"),
                      "stripe_payment_intent_id": obj.get("payment_intent"),
                      "updated_at": datetime.now(timezone.utc).isoformat()}},
        )
        md = obj.get("metadata") or {}
        if md.get("job_id"):
            await db.jobs.update_one(
                {"job_id": md["job_id"]},
                {"$set": {"status": "paid",
                          "assigned_handyman_id": md.get("handyman_id") or None}},
            )
    return {"status": "ok"}


# ============ CATEGORIES / STATS ============
CATEGORY_CONTENT = {
    "electrical": {
        "hero_kicker": "NYC Electrical Contractors",
        "hero_title": "Licensed Electricians on demand",
        "hero_sub": "IBEW-certified pros for outlets, panels, EV chargers, and smart-home rewiring across all five boroughs.",
        "keywords": ["electrical repair NYC", "electrician near me", "outlet installation", "EV charger installer"],
        "faq": [
            {"q": "Are all your electricians licensed?", "a": "Every electrician on CraftPulse holds an NYC master or journeyman license and current liability insurance, verified before onboarding."},
            {"q": "How fast can I get someone for a sparking outlet?", "a": "Emergency electrical work usually gets a same-day dispatch. The AI flags critical severity and pushes it to available pros within minutes."},
            {"q": "Do you install Tesla Wall Connectors?", "a": "Yes — several of our master electricians are Tesla-certified for Wall Connector and Universal installs."},
        ],
    },
    "plumbing": {
        "hero_kicker": "NYC Plumbing Services",
        "hero_title": "Master plumbers, 24/7",
        "hero_sub": "Licensed plumbers for leaks, water heaters, radiant heat, and pipe repairs — with real-time price estimates.",
        "keywords": ["emergency plumber NYC", "leak repair", "water heater install", "tankless heater NYC"],
        "faq": [
            {"q": "Can you handle a burst pipe right now?", "a": "Yes. Snap a photo, and CraftPulse AI dispatches the nearest available licensed plumber with an ETA under an hour in most boroughs."},
            {"q": "Do you replace tankless water heaters?", "a": "We have specialists for Rinnai, Navien, and Rheem tankless installs, including gas line upgrades where needed."},
        ],
    },
    "hvac": {
        "hero_kicker": "NYC HVAC Technicians",
        "hero_title": "NATE-certified heating & cooling",
        "hero_sub": "Mini-splits, heat pumps, and central air — installed, serviced, and tuned by seasoned techs.",
        "keywords": ["HVAC repair NYC", "mini split installer", "heat pump NYC"],
        "faq": [
            {"q": "How much for a mini-split install?", "a": "Single-zone Mitsubishi or Fujitsu installs typically run $3,800-$5,200 including electrical. Get a firm quote after uploading a photo of the install area."},
        ],
    },
    "carpentry": {
        "hero_kicker": "Master Carpenters NYC",
        "hero_title": "Bespoke carpentry & cabinetry",
        "hero_sub": "Trim, cabinets, flooring, and structural repairs from woodworkers with 15+ years on the tools.",
        "keywords": ["carpenter NYC", "cabinet install", "trim carpentry", "hardwood floor repair"],
        "faq": [],
    },
    "roofing": {
        "hero_kicker": "NYC Roofers",
        "hero_title": "Roof repair & waterproofing",
        "hero_sub": "GAF Master Elite contractors for flat roofs, slate, gutters, and chimney flashing.",
        "keywords": ["roof repair NYC", "flat roof contractor", "chimney flashing"],
        "faq": [],
    },
    "smart_home": {
        "hero_kicker": "Smart Home Installers",
        "hero_title": "Nest, HomeKit & Alexa setup",
        "hero_sub": "From smart locks to whole-home mesh Wi-Fi, our techs configure the ecosystem, not just the device.",
        "keywords": ["smart home installer NYC", "Nest thermostat install", "smart lock installer"],
        "faq": [],
    },
    "windows": {
        "hero_kicker": "Window Installation NYC",
        "hero_title": "Window replacement & repair",
        "hero_sub": "Andersen and Pella certified installers for double-hung, casement, and picture windows with proper flashing and weatherproofing.",
        "keywords": ["window installation NYC", "window replacement", "storm window installer", "Andersen installer"],
        "faq": [
            {"q": "How long does a window replacement take?", "a": "A standard double-hung window swap is typically 45-90 minutes per opening once the installer has access to both sides."},
            {"q": "Do you install storm windows?", "a": "Yes — we install Pella, Larson, and Andersen storm windows over existing sashes, ideal for pre-war NYC brownstones."},
        ],
    },
    "doors": {
        "hero_kicker": "Door Installation NYC",
        "hero_title": "Front, patio & interior door installs",
        "hero_sub": "Steel entry doors, French doors, sliding patio, and hollow-core interiors — hung plumb, flashed dry, and gasket-sealed.",
        "keywords": ["door installation NYC", "front door replacement", "sliding door installer", "interior door hanging"],
        "faq": [
            {"q": "Can you replace a warped front door?", "a": "Yes. Most steel or fiberglass entry-door replacements take a half day including new threshold, weather-stripping, and lockset transfer."},
        ],
    },
    "stairs": {
        "hero_kicker": "Staircase Builders NYC",
        "hero_title": "Custom stairs & code-compliant railings",
        "hero_sub": "Interior staircases, iron and cable railings, tread replacements, and squeak silencing — from a fabricator featured in Dwell.",
        "keywords": ["staircase builder NYC", "stair repair", "railing installation", "baluster replacement"],
        "faq": [
            {"q": "Can you retrofit an old railing to code?", "a": "Absolutely. NYC requires 42-inch handrails on stairs with 4+ risers — we retrofit with iron, cable, or wood balusters that pass inspection."},
        ],
    },
    "painting": {
        "hero_kicker": "House Painters NYC",
        "hero_title": "Interior painting & wallpaper",
        "hero_sub": "Benjamin Moore Preferred contractors — zero-VOC paints, Level-5 smooth walls, cabinet refinishing, and same-week bookings.",
        "keywords": ["house painter NYC", "interior painter", "cabinet painting", "wallpaper installer"],
        "faq": [],
    },
    "tiling": {
        "hero_kicker": "Tile & Masonry NYC",
        "hero_title": "Tile setters & stone masons",
        "hero_sub": "Backsplashes, heated bathroom floors, herringbone hardwood-look tile, and natural-stone restoration.",
        "keywords": ["tile installer NYC", "backsplash installer", "grout restoration", "stone mason"],
        "faq": [],
    },
    "appliance": {
        "hero_kicker": "Appliance Repair NYC",
        "hero_title": "All-brand appliance repair",
        "hero_sub": "Sub-Zero, Bosch, LG, Samsung — factory-certified techs for refrigeration, washer/dryer, dishwashers, and ovens.",
        "keywords": ["appliance repair NYC", "Sub-Zero repair", "washer dryer fix", "dishwasher repair"],
        "faq": [
            {"q": "Same-day repair possible?", "a": "For refrigeration failures, yes — we prioritize dispatch. Most fridge and dishwasher fixes are same-day."},
        ],
    },
    "deck_fence": {
        "hero_kicker": "Deck & Fence NYC",
        "hero_title": "Decks, pergolas, and privacy fencing",
        "hero_sub": "Trex Pro Platinum installers, Ipe hardwood decks, cedar privacy fences, and pergolas with integrated lighting.",
        "keywords": ["deck builder NYC", "fence installer", "Trex deck", "pergola installer"],
        "faq": [],
    },
    "locksmith": {
        "hero_kicker": "24/7 Locksmith NYC",
        "hero_title": "Locksmith & smart-lock retrofits",
        "hero_sub": "Under-20-minute lockouts, Medeco high-security rekeys, and August/Yale/Level smart-lock installs.",
        "keywords": ["locksmith NYC", "smart lock installer", "rekey service", "emergency lockout"],
        "faq": [
            {"q": "How fast for a lockout?", "a": "Most Manhattan and Brooklyn lockouts get an ALOA-member locksmith on-site in 15-20 minutes, 24/7."},
        ],
    },
    "general": {
        "hero_kicker": "General Handyman NYC",
        "hero_title": "One call, every small fix",
        "hero_sub": "TV mounting, drywall patches, furniture assembly, and the little things you keep putting off.",
        "keywords": ["handyman NYC", "TV mounting", "furniture assembly", "drywall repair"],
        "faq": [],
    },
}


@api.get("/categories")
async def categories():
    return [
        {"id": "electrical",   "name": "Electrical",         "icon": "Zap"},
        {"id": "plumbing",     "name": "Plumbing",           "icon": "Droplet"},
        {"id": "hvac",         "name": "HVAC",               "icon": "Wind"},
        {"id": "carpentry",    "name": "Carpentry",          "icon": "Hammer"},
        {"id": "roofing",      "name": "Roofing",            "icon": "Home"},
        {"id": "smart_home",   "name": "Smart Home",         "icon": "Radio"},
        {"id": "windows",      "name": "Windows",            "icon": "PanelTop"},
        {"id": "doors",        "name": "Doors",              "icon": "DoorOpen"},
        {"id": "stairs",       "name": "Stairs & Railings",  "icon": "TrendingUp"},
        {"id": "painting",     "name": "Painting",           "icon": "Paintbrush"},
        {"id": "tiling",       "name": "Tile & Masonry",     "icon": "Grid3x3"},
        {"id": "appliance",    "name": "Appliance Repair",   "icon": "Refrigerator"},
        {"id": "deck_fence",   "name": "Deck & Fencing",     "icon": "Fence"},
        {"id": "locksmith",    "name": "Locksmith",          "icon": "KeyRound"},
        {"id": "general",      "name": "General Repair",     "icon": "Wrench"},
    ]


_SKILL_MATCH_BY_SLUG = {
    "electrical": ["electrical", "ev charging", "lighting"],
    "plumbing":   ["plumbing", "water heaters", "leak detection", "hydronic heating"],
    "hvac":       ["hvac", "heat pumps", "ductwork", "refrigeration"],
    "carpentry":  ["carpentry", "cabinetry", "trim & molding", "flooring"],
    "roofing":    ["roofing", "waterproofing", "gutters", "chimney repair"],
    "smart_home": ["smart home"],
    "windows":    ["windows", "glass repair", "weatherproofing"],
    "doors":      ["doors", "weatherproofing"],
    "stairs":     ["stairs & railings", "balusters", "metalwork"],
    "painting":   ["painting", "wallpaper", "plaster repair"],
    "tiling":     ["tile & masonry", "grout restoration", "natural stone", "backsplash"],
    "appliance":  ["appliance repair", "washer/dryer", "dishwasher"],
    "deck_fence": ["deck & fencing", "composite decking", "pergolas"],
    "locksmith":  ["locksmith", "security"],
    "general":    ["general repair", "drywall", "tv mounting"],
}


@api.get("/categories/{slug}")
async def category_detail(slug: str):
    all_cats = await categories()
    cat = next((c for c in all_cats if c["id"] == slug), None)
    if not cat:
        raise HTTPException(404, "Unknown category")
    content = CATEGORY_CONTENT.get(slug, {})
    match_skills = _SKILL_MATCH_BY_SLUG.get(slug, [slug.replace("_", " ")])
    profiles = await db.handyman_profiles.find({}, {"_id": 0}).to_list(200)
    # Filter first, then batch-fetch matching users
    filtered = [
        p for p in profiles
        if _is_publicly_visible(p)
        and any(m in [s.lower() for s in p.get("skills", [])] for m in match_skills)
    ]
    user_ids = [p["user_id"] for p in filtered]
    users = {u["user_id"]: u async for u in db.users.find({"user_id": {"$in": user_ids}}, {"_id": 0})}
    matched = []
    for p in filtered:
        u = users.get(p["user_id"])
        if u:
            matched.append({**u, **p, "distance_miles": _distance_miles(p["user_id"])})
    matched.sort(key=lambda x: (-x.get("rating", 0), -x.get("reviews_count", 0)))
    top = matched[:3]
    avg_rate = round(sum(p.get("hourly_rate", 0) for p in matched) / max(len(matched), 1))
    avg_rating = round(sum(p.get("rating", 0) for p in matched) / max(len(matched), 1), 2) if matched else 5.0
    return {
        "category": cat,
        **content,
        "top_pros": top,
        "total_pros": len(matched),
        "avg_hourly_rate": avg_rate,
        "avg_rating": avg_rating,
    }


@api.get("/tiers")
async def tiers():
    return [
        {"lookup_key": "quick_fix",       "name": "Quick Fix",       "price": 75,  "desc": "30-60 min small jobs"},
        {"lookup_key": "standard_repair", "name": "Standard Repair", "price": 150, "desc": "1-3 hour service calls"},
        {"lookup_key": "major_project",   "name": "Major Project",   "price": 325, "desc": "Half day or more"},
        {"lookup_key": "emergency_call",  "name": "Emergency",       "price": 500, "desc": "Same-day critical fix"},
    ]


@api.get("/")
async def root():
    return {"service": "CraftPulse AI API", "status": "ok"}


@api.get("/sitemap.xml")
async def sitemap_xml(request: Request):
    """Live-generated sitemap covering every category landing page."""
    from datetime import date
    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or ""
    proto = request.headers.get("x-forwarded-proto") or "https"
    site = (f"{proto}://{host}" if host else str(request.base_url).rstrip("/")).rstrip("/")
    if site.endswith("/api"):
        site = site[:-4]
    today = date.today().isoformat()
    all_cats = await categories()
    entries = [
        (f"{site}/",       "daily",   "1.0"),
        (f"{site}/login",  "monthly", "0.6"),
        (f"{site}/blog",   "weekly",  "0.8"),
    ] + [(f"{site}/services/{c['id']}", "weekly", "0.9") for c in all_cats] \
      + [(f"{site}/blog/{c['id']}",     "monthly","0.7") for c in all_cats] \
      + [(f"{site}/authors/{eid}",      "monthly","0.6") for eid in EDITORS.keys()]
    body = ['<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, cf, pr in entries:
        body.append(
            f"  <url><loc>{loc}</loc><lastmod>{today}</lastmod>"
            f"<changefreq>{cf}</changefreq><priority>{pr}</priority></url>"
        )
    body.append("</urlset>")
    from fastapi.responses import Response as FR
    return FR(content="\n".join(body), media_type="application/xml")


# ============ MOUNT ============
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
