import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Navbar from "@/components/Navbar";
import { API, http } from "@/lib/api";
import { Link } from "react-router-dom";
import { Radio, MapPin } from "lucide-react";
import {
  CATEGORY_META, metaFor, categoryIconSvg, handymanMatchesCategory,
} from "@/lib/categoryMeta";

// Fix default marker path (react-leaflet + webpack path issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const NYC_CENTER = [40.758, -73.9855];
const FILTER_ORDER = ["electrical", "plumbing", "hvac", "carpentry", "roofing", "smart_home", "painting", "tiling", "appliance", "locksmith"];

function HandymanPin({ h }) {
  const icon = L.divIcon({
    className: "cp-handyman-pin",
    html: `<div style="width:36px;height:36px;border-radius:50%;overflow:hidden;border:2px solid #F59E0B;box-shadow:0 0 0 3px rgba(245,158,11,0.25),0 4px 12px rgba(0,0,0,0.5);background:#0f172a">
      <img src="${h.picture || ""}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'" />
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
  return (
    <Marker position={[h.lat, h.lng]} icon={icon}>
      <Popup>
        <div style={{ minWidth: 200 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{h.name}</div>
          <div style={{ color: "#64748b", fontSize: 12, marginBottom: 6 }}>{h.role_title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
            <span style={{ color: "#F59E0B" }}>★</span> {(h.rating || 4.8).toFixed(1)}
          </div>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>
            {(h.skills || []).slice(0, 3).join(" · ")}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

function JobPulse({ job }) {
  // Pulse fades over 4s using stateful radius/opacity
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      i += 1;
      setTick(i);
      if (i > 40) clearInterval(iv); // 4s @ 100ms
    }, 100);
    return () => clearInterval(iv);
  }, [job.job_id]);
  const phase = (tick % 20) / 20; // 0..1 loop every 2s
  const radius = 20 + phase * 280;
  const meta = metaFor(job.category);
  const opacity = 0.5 * (1 - phase);

  // Center icon rendered as a Leaflet divIcon so it stays crisp at any zoom
  const icon = L.divIcon({
    className: "cp-job-pulse-icon",
    html: `<div style="
      width:28px;height:28px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      background:${meta.color};
      border:2px solid ${meta.ring};
      box-shadow:0 0 0 3px rgba(15,23,42,0.7),0 2px 8px rgba(0,0,0,0.5);
      ">${categoryIconSvg(job.category, 14, "#0f172a")}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
  return (
    <>
      <Circle
        center={[job.lat, job.lng]}
        radius={radius}
        pathOptions={{ color: meta.ring, weight: 2, opacity, fillOpacity: opacity * 0.15 }}
      />
      <Marker position={[job.lat, job.lng]} icon={icon}>
        <Popup>
          <div style={{ minWidth: 160 }}>
            <div style={{ fontWeight: 700, textTransform: "capitalize" }}>{meta.label}</div>
            <div style={{ color: "#64748b", fontSize: 12 }}>Just posted</div>
          </div>
        </Popup>
      </Marker>
    </>
  );
}

function FilterChip({ id, active, onClick, meta, count }) {
  return (
    <button
      data-testid={`filter-chip-${id}`}
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
        active
          ? "bg-white text-slate-900 border-white"
          : "bg-white/5 text-slate-300 border-white/10 hover:border-amber-500/40 hover:bg-white/10"
      }`}
    >
      {meta && (
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: meta.color }}
        />
      )}
      {meta ? meta.label : "All"}
      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${active ? "bg-slate-900/10 text-slate-700" : "bg-slate-900/60 text-slate-400"}`}>
        {count}
      </span>
    </button>
  );
}

export default function LiveMap() {
  const [handymen, setHandymen] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [connected, setConnected] = useState(false);
  const [activeFilter, setActiveFilter] = useState(null); // null == "All"
  const esRef = useRef(null);

  useEffect(() => {
    http.get("/map/handymen").then(r => setHandymen(r.data)).catch(() => {});
    http.get("/map/jobs").then(r => setJobs(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const url = `${API}/map/stream`;
    const es = new EventSource(url);
    esRef.current = es;
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (ev) => {
      try {
        const p = JSON.parse(ev.data);
        if (p.job_id && p.lat) {
          setJobs(prev => [p, ...prev.filter(j => j.job_id !== p.job_id)].slice(0, 30));
        }
      } catch (err) { console.debug("[LiveMap] SSE parse error:", err); }
    };
    return () => es.close();
  }, []);

  // Category → counts for filter chips
  const counts = useMemo(() => {
    const c = { __all_h: handymen.length, __all_j: jobs.length };
    FILTER_ORDER.forEach(k => {
      c[k] = {
        h: handymen.filter(h => handymanMatchesCategory(h, k)).length,
        j: jobs.filter(j => j.category === k).length,
      };
    });
    return c;
  }, [handymen, jobs]);

  const filteredHandymen = activeFilter
    ? handymen.filter(h => handymanMatchesCategory(h, activeFilter))
    : handymen;
  const filteredJobs = activeFilter
    ? jobs.filter(j => j.category === activeFilter)
    : jobs;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />
      <div className="relative">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-8 pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs uppercase tracking-widest font-mono mb-3">
                <Radio className={`w-3.5 h-3.5 ${connected ? "animate-pulse" : "opacity-40"}`} /> Live
              </div>
              <h1 className="font-heading font-bold text-3xl lg:text-4xl leading-tight">The pulse of NYC craftsmanship</h1>
              <p className="text-slate-400 text-sm mt-1" data-testid="live-map-counts">
                <MapPin className="inline w-4 h-4 mr-1 text-amber-400" />
                {filteredHandymen.length} available pros · {filteredJobs.length} jobs active in the last 15 min
                {activeFilter && (
                  <span className="text-amber-300"> · filtered by {metaFor(activeFilter).label}</span>
                )}
              </p>
            </div>
            <Link
              to="/login"
              data-testid="live-map-cta"
              className="px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold text-sm"
            >
              Post a job
            </Link>
          </div>

          {/* Filter chips */}
          <div data-testid="live-filter-row" className="mt-6 flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
            <FilterChip
              id="all"
              active={activeFilter === null}
              onClick={() => setActiveFilter(null)}
              meta={null}
              count={counts.__all_h}
            />
            {FILTER_ORDER.map(id => {
              const meta = CATEGORY_META[id];
              const total = counts[id].h + counts[id].j;
              if (total === 0 && activeFilter !== id) return null; // hide empty categories unless already active
              return (
                <FilterChip
                  key={id}
                  id={id}
                  active={activeFilter === id}
                  onClick={() => setActiveFilter(activeFilter === id ? null : id)}
                  meta={meta}
                  count={total}
                />
              );
            })}
          </div>
        </div>

        <div data-testid="live-map-container" className="max-w-7xl mx-auto px-5 lg:px-8 pb-14">
          <div className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl" style={{ height: "70vh" }}>
            <MapContainer
              center={NYC_CENTER}
              zoom={12}
              style={{ height: "100%", width: "100%", background: "#0b1220" }}
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {filteredHandymen.map(h => <HandymanPin key={h.user_id} h={h} />)}
              {filteredJobs.map(j => <JobPulse key={j.job_id} job={j} />)}
            </MapContainer>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Locations are fuzzed to a ~1 km radius for privacy — exact addresses are never exposed.
          </p>
        </div>
      </div>
    </div>
  );
}
