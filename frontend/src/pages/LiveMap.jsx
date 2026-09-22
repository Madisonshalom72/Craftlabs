import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Navbar from "@/components/Navbar";
import { API, http } from "@/lib/api";
import { Link } from "react-router-dom";
import { Radio, MapPin, Star } from "lucide-react";

// Fix default marker path (react-leaflet + webpack path issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const NYC_CENTER = [40.758, -73.9855];

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
  const opacity = 0.5 * (1 - phase);
  return (
    <>
      <Circle
        center={[job.lat, job.lng]}
        radius={radius}
        pathOptions={{ color: "#F59E0B", weight: 2, opacity, fillOpacity: opacity * 0.15 }}
      />
      <CircleMarker
        center={[job.lat, job.lng]}
        radius={8}
        pathOptions={{ color: "#F59E0B", fillColor: "#FBBF24", fillOpacity: 0.9, weight: 2 }}
      >
        <Popup>
          <div style={{ minWidth: 160 }}>
            <div style={{ fontWeight: 700, textTransform: "capitalize" }}>{job.category?.replace(/_/g, " ")}</div>
            <div style={{ color: "#64748b", fontSize: 12 }}>Just posted</div>
          </div>
        </Popup>
      </CircleMarker>
    </>
  );
}

export default function LiveMap() {
  const [handymen, setHandymen] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [connected, setConnected] = useState(false);
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
      } catch { /* ignore */ }
    };
    return () => es.close();
  }, []);

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
              <p className="text-slate-400 text-sm mt-1">
                <MapPin className="inline w-4 h-4 mr-1 text-amber-400" />
                {handymen.length} available pros · {jobs.length} jobs active in the last 15 min
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
              {handymen.map(h => <HandymanPin key={h.user_id} h={h} />)}
              {jobs.map(j => <JobPulse key={j.job_id} job={j} />)}
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
