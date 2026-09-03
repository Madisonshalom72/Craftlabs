from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Cookie, Header
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
@api.get("/handymen")
async def list_handymen(category: Optional[str] = None):
    profiles = await db.handyman_profiles.find({}, {"_id": 0}).to_list(200)
    result = []
    for p in profiles:
        u = await db.users.find_one({"user_id": p["user_id"]}, {"_id": 0})
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
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.handyman_profiles.update_one(
        {"user_id": user["user_id"]}, {"$set": update}, upsert=True
    )
    return await db.handyman_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})


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
        '{"issue": string, "category": one of ["Electrical","Plumbing","HVAC","Carpentry","Roofing","Smart Home","General"], '
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
        '"safety_notes": string} '
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
        }
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
    return doc


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
async def match_handymen(job_id: str):
    """Return top handymen ranked by match score for a specific job."""
    job = await db.jobs.find_one({"job_id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(404, "Job not found")
    profiles = await db.handyman_profiles.find({}, {"_id": 0}).to_list(200)
    ranked = []
    for p in profiles:
        u = await db.users.find_one({"user_id": p["user_id"]}, {"_id": 0})
        if not u:
            continue
        score = _match_score(job, p)
        ranked.append({**u, **p, "match_score": score})
    ranked.sort(key=lambda x: -x["match_score"])
    return ranked[:6]


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
@api.get("/categories")
async def categories():
    return [
        {"id": "electrical", "name": "Electrical", "icon": "Zap"},
        {"id": "plumbing", "name": "Plumbing", "icon": "Droplet"},
        {"id": "hvac", "name": "HVAC", "icon": "Wind"},
        {"id": "carpentry", "name": "Carpentry", "icon": "Hammer"},
        {"id": "roofing", "name": "Roofing", "icon": "Home"},
        {"id": "smart_home", "name": "Smart Home", "icon": "Radio"},
        {"id": "general", "name": "General Repair", "icon": "Wrench"},
    ]


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
