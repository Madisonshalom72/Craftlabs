"""Seed handymen data for CraftPulse AI marketplace."""
import asyncio
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent / ".env")

HANDYMEN = [
    {
        "name": "Marcus Vance", "email": "marcus.vance@demo.craftpulse.ai",
        "role_title": "Master Electrician & EV Charging Specialist",
        "picture": "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80",
        "hourly_rate": 85, "years_experience": 14, "rating": 4.98, "reviews_count": 342,
        "skills": ["Electrical", "EV Charging", "Smart Home", "Lighting"],
        "service_area": "Brooklyn, Queens, Manhattan",
        "bio": "IBEW Local 3 certified. Specialized in Tesla wall connectors, smart panel upgrades, and legacy rewiring in pre-war buildings.",
        "verified": True,
    },
    {
        "name": "Elena Rostova", "email": "elena.rostova@demo.craftpulse.ai",
        "role_title": "Certified Plumber & Hydronics Expert",
        "picture": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
        "hourly_rate": 90, "years_experience": 11, "rating": 4.95, "reviews_count": 287,
        "skills": ["Plumbing", "Water Heaters", "Hydronic Heating", "Leak Detection"],
        "service_area": "Manhattan, Bronx",
        "bio": "Master Plumber License #4471. Radiant floor systems, tankless water heaters, and emergency leak stabilization.",
        "verified": True,
    },
    {
        "name": "David Chen", "email": "david.chen@demo.craftpulse.ai",
        "role_title": "Master Carpenter & Cabinetry Restorer",
        "picture": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
        "hourly_rate": 78, "years_experience": 18, "rating": 4.99, "reviews_count": 512,
        "skills": ["Carpentry", "Cabinetry", "Trim & Molding", "Flooring"],
        "service_area": "Brooklyn, Queens",
        "bio": "Third-generation woodworker. Bespoke cabinetry, hardwood floor refinishing, and historic trim restoration.",
        "verified": True,
    },
    {
        "name": "Sarah Miller", "email": "sarah.miller@demo.craftpulse.ai",
        "role_title": "HVAC Technician & Heat Pump Specialist",
        "picture": "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80",
        "hourly_rate": 82, "years_experience": 9, "rating": 4.92, "reviews_count": 198,
        "skills": ["HVAC", "Heat Pumps", "Ductwork", "Refrigeration"],
        "service_area": "Queens, Staten Island",
        "bio": "NATE-certified. Mini-split installs, high-efficiency heat pump conversions, and rooftop unit servicing.",
        "verified": True,
    },
    {
        "name": "Raj Patel", "email": "raj.patel@demo.craftpulse.ai",
        "role_title": "General Handyman & Smart Home Installer",
        "picture": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
        "hourly_rate": 65, "years_experience": 7, "rating": 4.87, "reviews_count": 156,
        "skills": ["General Repair", "Smart Home", "Drywall", "TV Mounting"],
        "service_area": "Manhattan, Brooklyn",
        "bio": "Fast, friendly, one-stop shop for smart home upgrades, furniture assembly, and small home repairs.",
        "verified": True,
    },
    {
        "name": "Aisha Bennett", "email": "aisha.bennett@demo.craftpulse.ai",
        "role_title": "Licensed Roofer & Waterproofing Contractor",
        "picture": "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=200&q=80",
        "hourly_rate": 95, "years_experience": 12, "rating": 4.94, "reviews_count": 231,
        "skills": ["Roofing", "Waterproofing", "Gutters", "Chimney Repair"],
        "service_area": "Bronx, Manhattan",
        "bio": "GAF Master Elite contractor. EPDM flat roofs, slate repair, and chimney flashing specialist.",
        "verified": True,
    },
    {
        "name": "Diego Ramirez", "email": "diego.ramirez@demo.craftpulse.ai",
        "role_title": "Window & Door Installation Specialist",
        "picture": "https://images.unsplash.com/photo-1571945153237-4929e783af4a?auto=format&fit=crop&w=200&q=80",
        "hourly_rate": 88, "years_experience": 13, "rating": 4.96, "reviews_count": 264,
        "skills": ["Windows", "Doors", "Weatherproofing", "Glass Repair"],
        "service_area": "Queens, Brooklyn",
        "bio": "Andersen and Pella certified installer. Storm windows, sliding patio doors, and full front-door replacements with proper flashing.",
        "verified": True,
    },
    {
        "name": "Nora Kavanagh", "email": "nora.kavanagh@demo.craftpulse.ai",
        "role_title": "Staircase Builder & Railing Fabricator",
        "picture": "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?auto=format&fit=crop&w=200&q=80",
        "hourly_rate": 92, "years_experience": 16, "rating": 4.97, "reviews_count": 189,
        "skills": ["Stairs & Railings", "Carpentry", "Metalwork", "Balusters"],
        "service_area": "Manhattan, Brooklyn",
        "bio": "Custom interior stairs, iron railings, and code-compliant retrofits. Featured in Dwell magazine, 2024.",
        "verified": True,
    },
    {
        "name": "Malik Johnson", "email": "malik.johnson@demo.craftpulse.ai",
        "role_title": "Interior Painter & Fine Finish Specialist",
        "picture": "https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&w=200&q=80",
        "hourly_rate": 62, "years_experience": 8, "rating": 4.91, "reviews_count": 312,
        "skills": ["Painting", "Wallpaper", "Drywall", "Plaster Repair"],
        "service_area": "Brooklyn, Manhattan",
        "bio": "Benjamin Moore Preferred contractor. Zero-VOC paints, cabinet refinishing, and Level-5 smooth-wall work.",
        "verified": True,
    },
    {
        "name": "Sofia Marchetti", "email": "sofia.marchetti@demo.craftpulse.ai",
        "role_title": "Tile Setter & Stone Mason",
        "picture": "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80",
        "hourly_rate": 84, "years_experience": 15, "rating": 4.93, "reviews_count": 221,
        "skills": ["Tile & Masonry", "Grout Restoration", "Natural Stone", "Backsplash"],
        "service_area": "Brooklyn, Queens",
        "bio": "Third-gen mason from Verona. Hand-cut mosaic, herringbone floors, and heated bathroom tile.",
        "verified": True,
    },
    {
        "name": "Tomás Herrera", "email": "tomas.herrera@demo.craftpulse.ai",
        "role_title": "Appliance Repair Technician (All Brands)",
        "picture": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80",
        "hourly_rate": 75, "years_experience": 10, "rating": 4.9, "reviews_count": 402,
        "skills": ["Appliance Repair", "Refrigeration", "Washer/Dryer", "Dishwasher"],
        "service_area": "Manhattan, Queens, Bronx",
        "bio": "Factory-certified for Sub-Zero, Bosch, and LG. Ice-maker rescues, compressor swaps, and same-day dryer belt fixes.",
        "verified": True,
    },
    {
        "name": "Kiera Walsh", "email": "kiera.walsh@demo.craftpulse.ai",
        "role_title": "Deck Builder & Fencing Contractor",
        "picture": "https://images.unsplash.com/photo-1580894732444-8ecded7900cd?auto=format&fit=crop&w=200&q=80",
        "hourly_rate": 80, "years_experience": 12, "rating": 4.89, "reviews_count": 178,
        "skills": ["Deck & Fencing", "Carpentry", "Composite Decking", "Pergolas"],
        "service_area": "Staten Island, Brooklyn",
        "bio": "Trex Pro Platinum installer. Ipe hardwood decks, cedar privacy fences, and pergolas with integrated lighting.",
        "verified": True,
    },
    {
        "name": "Idris Ahmed", "email": "idris.ahmed@demo.craftpulse.ai",
        "role_title": "24/7 Locksmith & Smart Lock Installer",
        "picture": "https://images.unsplash.com/photo-1622432088523-3d4ed4dc5f26?auto=format&fit=crop&w=200&q=80",
        "hourly_rate": 70, "years_experience": 9, "rating": 4.94, "reviews_count": 356,
        "skills": ["Locksmith", "Smart Home", "Doors", "Security"],
        "service_area": "Manhattan, Brooklyn, Bronx",
        "bio": "ALOA member. Lockouts under 20 min, Medeco high-security rekeys, and August/Yale smart-lock retrofits.",
        "verified": True,
    },
]

async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    for h in HANDYMEN:
        existing = await db.users.find_one({"email": h["email"]}, {"_id": 0})
        user_id = existing["user_id"] if existing else f"user_{uuid.uuid4().hex[:12]}"
        doc = {
            "user_id": user_id,
            "email": h["email"],
            "name": h["name"],
            "picture": h["picture"],
            "role": "handyman",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.update_one({"email": h["email"]}, {"$set": doc}, upsert=True)
        profile = {
            "user_id": user_id,
            "role_title": h["role_title"],
            "hourly_rate": h["hourly_rate"],
            "years_experience": h["years_experience"],
            "rating": h["rating"],
            "reviews_count": h["reviews_count"],
            "skills": h["skills"],
            "service_area": h["service_area"],
            "bio": h["bio"],
            "verified": h["verified"],
            "available": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.handyman_profiles.update_one({"user_id": user_id}, {"$set": profile}, upsert=True)
        print(f"OK: {h['name']} -> {user_id}")

    # Demo customer
    demo_email = "demo.customer@craftpulse.ai"
    existing = await db.users.find_one({"email": demo_email}, {"_id": 0})
    if not existing:
        cust_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": cust_id, "email": demo_email, "name": "Jamie Rivera",
            "picture": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
            "role": "customer",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        print(f"OK: demo customer -> {cust_id}")

    print("Seeded.")

asyncio.run(main())
