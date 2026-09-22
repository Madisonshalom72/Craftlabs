// Central mapping: category slug -> icon name (lucide) + accent color + human label
// Icons rendered via inline SVG so they can live inside Leaflet divIcons.
// Colors are used for both the pulse ring and job center dot.

export const CATEGORY_META = {
  electrical:  { label: "Electrical",   color: "#FBBF24", ring: "#F59E0B", icon: "zap",         skillMatch: ["electr", "wiring", "ev "] },
  plumbing:    { label: "Plumbing",     color: "#38BDF8", ring: "#0EA5E9", icon: "droplet",     skillMatch: ["plumb", "water heater", "hydronic"] },
  hvac:        { label: "HVAC",         color: "#A78BFA", ring: "#8B5CF6", icon: "wind",        skillMatch: ["hvac", "heat pump", "mini split"] },
  carpentry:   { label: "Carpentry",    color: "#F97316", ring: "#EA580C", icon: "hammer",      skillMatch: ["carpentr", "cabinet", "trim"] },
  roofing:     { label: "Roofing",      color: "#EC4899", ring: "#DB2777", icon: "home",        skillMatch: ["roof", "flat roof"] },
  smart_home:  { label: "Smart Home",   color: "#22D3EE", ring: "#06B6D4", icon: "radio",       skillMatch: ["smart", "lutron", "homekit"] },
  windows:     { label: "Windows",      color: "#94A3B8", ring: "#64748B", icon: "panel-top",   skillMatch: ["window"] },
  doors:       { label: "Doors",        color: "#FCA5A5", ring: "#EF4444", icon: "door-open",   skillMatch: ["door"] },
  painting:    { label: "Painting",     color: "#FDE68A", ring: "#F59E0B", icon: "paintbrush",  skillMatch: ["paint", "finish"] },
  tiling:      { label: "Tiling",       color: "#67E8F9", ring: "#22D3EE", icon: "grid",        skillMatch: ["tile", "mason"] },
  appliance:   { label: "Appliance",    color: "#A3E635", ring: "#65A30D", icon: "refrigerator",skillMatch: ["appliance", "sub-zero"] },
  deck_fence:  { label: "Deck & Fence", color: "#FDBA74", ring: "#F97316", icon: "fence",       skillMatch: ["deck", "fenc"] },
  locksmith:   { label: "Locksmith",    color: "#FEF08A", ring: "#EAB308", icon: "key",         skillMatch: ["lock", "aloa"] },
  stairs:      { label: "Stairs",       color: "#D8B4FE", ring: "#A855F7", icon: "trending-up", skillMatch: ["stair", "railing"] },
  general:     { label: "General",      color: "#F59E0B", ring: "#F59E0B", icon: "wrench",      skillMatch: ["general", "handyman"] },
};

// Inline SVG paths for icons — small, no dependency in divIcon HTML
export const ICON_SVG = {
  zap:         '<path stroke-linecap="round" stroke-linejoin="round" d="M13 3 5 14h6l-2 7 8-11h-6l2-7z"/>',
  droplet:     '<path stroke-linecap="round" stroke-linejoin="round" d="M12 3s5 6 5 11a5 5 0 0 1-10 0c0-5 5-11 5-11z"/>',
  wind:        '<path stroke-linecap="round" stroke-linejoin="round" d="M3 8h11a3 3 0 1 0-3-3M3 12h17a3 3 0 1 1-3 3M3 16h9a3 3 0 1 1-3 3"/>',
  hammer:      '<path stroke-linecap="round" stroke-linejoin="round" d="m15 3 6 6-3 3-6-6zM11 8 3 16v5h5l8-8"/>',
  home:        '<path stroke-linecap="round" stroke-linejoin="round" d="M3 12l9-9 9 9M5 10v10h14V10"/>',
  radio:       '<circle cx="12" cy="12" r="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M4 8a10 10 0 0 1 16 0M7 11a6 6 0 0 1 10 0"/>',
  "panel-top": '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/>',
  "door-open": '<path stroke-linecap="round" stroke-linejoin="round" d="M12 3v18M5 21V3h14M5 21h14"/>',
  paintbrush:  '<path stroke-linecap="round" stroke-linejoin="round" d="M14 4h6v6l-8 8-6-6zM6 12 3 21l9-3"/>',
  grid:        '<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>',
  refrigerator:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M5 10h14M9 6v2M9 14v3"/>',
  fence:       '<path stroke-linecap="round" stroke-linejoin="round" d="M4 22V6l3-3 3 3v16M10 6l3-3 3 3v16M16 6l3-3 3 3v19M4 12h20M4 18h20"/>',
  key:         '<circle cx="8" cy="12" r="4"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 12h10l-3 3M18 12v3"/>',
  "trending-up": '<path stroke-linecap="round" stroke-linejoin="round" d="M3 17l6-6 4 4 8-8M14 7h7v7"/>',
  wrench:      '<path stroke-linecap="round" stroke-linejoin="round" d="M14 7a4 4 0 1 1-5.7 5.7L3 18l3 3 5.3-5.3A4 4 0 1 1 17 10L21 6l-3-3z"/>',
};

export function metaFor(category) {
  return CATEGORY_META[category] || CATEGORY_META.general;
}

// Test if a handyman matches a given category filter (by skill string overlap)
export function handymanMatchesCategory(handyman, category) {
  if (!category) return true;
  const meta = CATEGORY_META[category];
  if (!meta) return false;
  const skills = (handyman.skills || []).map(s => s.toLowerCase()).join(" ");
  const roleTitle = (handyman.role_title || "").toLowerCase();
  return meta.skillMatch.some(k => skills.includes(k) || roleTitle.includes(k));
}

// Build an inline SVG string for a given category — used inside Leaflet divIcons
export function categoryIconSvg(category, size = 14, stroke = "#0f172a") {
  const meta = metaFor(category);
  const path = ICON_SVG[meta.icon] || ICON_SVG.wrench;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}
