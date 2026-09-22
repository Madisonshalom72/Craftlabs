import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { API, http } from "@/lib/api";
import { Radio, ArrowRight, Users, Zap } from "lucide-react";
import { metaFor, categoryIconSvg } from "@/lib/categoryMeta";

const NYC_CENTER = [40.758, -73.9855];

function tinyPin(h) {
  return L.divIcon({
    className: "cp-landing-pin",
    html: `<div style="width:26px;height:26px;border-radius:50%;overflow:hidden;border:2px solid #F59E0B;box-shadow:0 0 0 2px rgba(245,158,11,0.3),0 2px 6px rgba(0,0,0,0.6);background:#0f172a">
      <img src="${h.picture || ""}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'" />
    </div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function JobPulse({ job }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => { i += 1; setTick(i); if (i > 40) clearInterval(iv); }, 100);
    return () => clearInterval(iv);
  }, [job.job_id]);
  const phase = (tick % 20) / 20;
  const radius = 15 + phase * 220;
  const opacity = 0.55 * (1 - phase);
  const meta = metaFor(job.category);
  const icon = L.divIcon({
    className: "cp-landing-pulse-icon",
    html: `<div style="width:22px;height:22px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      background:${meta.color};
      border:2px solid ${meta.ring};
      box-shadow:0 0 0 2px rgba(15,23,42,0.7),0 2px 6px rgba(0,0,0,0.5);
      ">${categoryIconSvg(job.category, 11, "#0f172a")}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
  return (
    <>
      <Circle center={[job.lat, job.lng]} radius={radius}
        pathOptions={{ color: meta.ring, weight: 2, opacity, fillOpacity: opacity * 0.15 }} />
      <Marker position={[job.lat, job.lng]} icon={icon} interactive={false} />
    </>
  );
}

export default function LiveMapPreview() {
  const [handymen, setHandymen] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef(null);

  useEffect(() => {
    http.get("/map/handymen").then(r => setHandymen(r.data)).catch(() => {});
    http.get("/map/jobs").then(r => setJobs(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const es = new EventSource(`${API}/map/stream`);
    esRef.current = es;
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (ev) => {
      try {
        const p = JSON.parse(ev.data);
        if (p.job_id && p.lat) {
          setJobs(prev => [p, ...prev.filter(j => j.job_id !== p.job_id)].slice(0, 20));
        }
      } catch { /* ignore */ }
    };
    return () => es.close();
  }, []);

  return (
    <section data-testid="landing-live-preview" className="max-w-7xl mx-auto px-5 lg:px-8 pt-6 pb-16">
      <div className="rounded-3xl overflow-hidden border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.06] via-slate-900/60 to-transparent">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-5 p-7 lg:p-10 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] uppercase tracking-widest font-mono mb-5">
                <Radio className={`w-3 h-3 ${connected ? "animate-pulse" : "opacity-40"}`} /> Live network
              </div>
              <h2 className="font-heading text-3xl lg:text-4xl font-bold leading-tight tracking-tight">
                Real craftsmen. Real jobs. <span className="text-amber-400">Right now.</span>
              </h2>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed max-w-md">
                Every pulse on the map is a homeowner posting a job in NYC. Every avatar is a vetted pro available in the next hour.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3 max-w-sm">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-white/8">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-mono text-slate-500 mb-1">
                    <Users className="w-3 h-3" /> Available
                  </div>
                  <div data-testid="landing-preview-pro-count" className="font-heading text-2xl font-bold text-emerald-400">
                    {handymen.length}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-white/8">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-mono text-slate-500 mb-1">
                    <Zap className="w-3 h-3" /> Live jobs
                  </div>
                  <div data-testid="landing-preview-job-count" className="font-heading text-2xl font-bold text-amber-400">
                    {jobs.length}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-8">
              <Link
                to="/live"
                data-testid="landing-live-cta"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold text-sm transition"
              >
                Open full map <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="lg:col-span-7 relative" style={{ minHeight: 320 }}>
            <div style={{ height: 340 }}>
              <MapContainer
                center={NYC_CENTER}
                zoom={11}
                style={{ height: "100%", width: "100%", background: "#0b1220" }}
                scrollWheelZoom={false}
                dragging={false}
                zoomControl={false}
                doubleClickZoom={false}
                attributionControl={false}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {handymen.slice(0, 30).map(h => (
                  <Marker key={h.user_id} position={[h.lat, h.lng]} icon={tinyPin(h)} />
                ))}
                {jobs.map(j => <JobPulse key={j.job_id} job={j} />)}
              </MapContainer>
            </div>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-950/40 via-transparent to-transparent lg:from-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}
