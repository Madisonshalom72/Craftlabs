import { Link } from "react-router-dom";
import React from "react";

// Ordered by length DESC so multi-word brands ("Sub-Zero", "Benjamin Moore") match before short ones
const BRAND_MAP = {
  // Windows
  "Andersen": "windows", "Pella": "windows", "Marvin": "windows", "Larson": "windows",
  // Doors
  "Therma-Tru": "doors", "Masonite": "doors", "JELD-WEN": "doors",
  // Appliance
  "Sub-Zero": "appliance", "Wolf": "appliance", "Bosch": "appliance",
  "Miele": "appliance", "Samsung": "appliance", "Whirlpool": "appliance", "Frigidaire": "appliance",
  "Viking": "appliance", "Thermador": "appliance", "KitchenAid": "appliance",
  // Deck / Fence
  "Trex": "deck_fence", "TimberTech": "deck_fence", "Ipe": "deck_fence", "Azek": "deck_fence",
  // Roofing
  "GAF": "roofing", "CertainTeed": "roofing", "Owens Corning": "roofing", "EPDM": "roofing",
  // Smart Home
  "Nest": "smart_home", "Ecobee": "smart_home", "HomeKit": "smart_home",
  "Alexa": "smart_home", "SmartThings": "smart_home", "Lutron": "smart_home",
  // Locksmith
  "Medeco": "locksmith", "Mul-T-Lock": "locksmith",
  "August": "locksmith", "Schlage": "locksmith", "Kwikset": "locksmith",
  // Painting
  "Benjamin Moore": "painting", "Sherwin-Williams": "painting", "Farrow & Ball": "painting",
  // Plumbing
  "Rinnai": "plumbing", "Navien": "plumbing", "Rheem": "plumbing",
  "Kohler": "plumbing", "Moen": "plumbing", "Delta": "plumbing",
  // HVAC
  "Mitsubishi": "hvac", "Fujitsu": "hvac", "Daikin": "hvac", "Carrier": "hvac", "Trane": "hvac",
  // Electrical
  "IBEW": "electrical", "Tesla": "electrical", "ChargePoint": "electrical",
  "Leviton": "electrical", "Lutron": "electrical",
  // Tile / Masonry
  "Schluter": "tiling", "Ditra": "tiling", "Mapei": "tiling",
  // Yale / Level are ambiguous — keep only in locksmith context; use "Level lock" trigger
  "Yale lock": "locksmith", "Level lock": "locksmith",
};

// Precompile brands sorted longest-first
const SORTED_BRANDS = Object.entries(BRAND_MAP).sort((a, b) => b[0].length - a[0].length);

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

/**
 * Turn plain text into an array of React nodes, replacing FIRST occurrence
 * of each not-yet-seen brand with a <Link> to its category booking page.
 * `seenBrands` is a Set shared across the whole article render pass so each
 * brand only links once (avoids link soup). Self-category links are allowed
 * on purpose — they route reader intent straight to the matching /services page.
 */
export function autoLinkBrands(text, currentSlug, seenBrands) {
  if (!text) return [text];
  const nodes = [];
  let remaining = text;
  let key = 0;
  while (remaining.length > 0) {
    let bestIdx = -1;
    let bestBrand = null;
    let bestSlug = null;
    for (const [brand, slug] of SORTED_BRANDS) {
      if (seenBrands.has(brand)) continue;
      const re = new RegExp(`\\b${escapeRegex(brand)}\\b`);
      const m = remaining.match(re);
      if (m && m.index !== undefined && (bestIdx === -1 || m.index < bestIdx)) {
        bestIdx = m.index;
        bestBrand = brand;
        bestSlug = slug;
      }
    }
    if (bestIdx === -1) {
      nodes.push(remaining);
      break;
    }
    if (bestIdx > 0) nodes.push(remaining.slice(0, bestIdx));
    seenBrands.add(bestBrand);
    nodes.push(
      <Link
        key={`b-${bestBrand}-${key++}`}
        to={`/services/${bestSlug}`}
        data-testid={`brand-link-${bestBrand.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}`}
        className="text-amber-400 underline decoration-amber-400/40 underline-offset-4 hover:decoration-amber-400 hover:text-amber-300 transition font-medium"
      >
        {bestBrand}
      </Link>
    );
    remaining = remaining.slice(bestIdx + bestBrand.length);
  }
  return nodes;
}
