import { useEffect, useState } from "react";
import { X, Download, Share } from "lucide-react";

/**
 * PWA install button:
 * - On Chromium/Edge/Android: catches beforeinstallprompt and offers a slick "Install" chip.
 * - On iOS Safari (which has no beforeinstallprompt): shows a one-time helper about "Share → Add to Home Screen".
 * - Dismissed state persists in localStorage.
 */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [showIos, setShowIos] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("cp-install-dismissed")) { setDismissed(true); return; }
    // Standalone check — hide if already installed
    if (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone) {
      setDismissed(true);
      return;
    }
    const onPrompt = (e) => { e.preventDefault(); setDeferred(e); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    // iOS Safari fallback
    const ua = window.navigator.userAgent || "";
    const isIos = /iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS/.test(ua);
    if (isIos) setShowIos(true);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    const { outcome } = await deferred.userChoice.catch(() => ({ outcome: "dismissed" }));
    if (outcome === "accepted") localStorage.setItem("cp-install-dismissed", "1");
    setDeferred(null);
  };

  const dismiss = () => {
    localStorage.setItem("cp-install-dismissed", "1");
    setDismissed(true);
    setDeferred(null);
    setShowIos(false);
  };

  if (dismissed) return null;
  if (!deferred && !showIos) return null;

  return (
    <div
      data-testid="pwa-install-banner"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 glass rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-5"
      style={{ animation: "slideUp .35s ease-out" }}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0">
          <Download className="w-5 h-5 text-slate-900" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-heading font-semibold text-sm text-slate-100">Install Craft Master Labs</div>
          {deferred ? (
            <p className="text-xs text-slate-400 mt-1">One tap to add to your home screen. Works offline.</p>
          ) : (
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              Tap <Share className="w-3 h-3 inline text-amber-400" /> Share → <span className="text-amber-400">Add to Home Screen</span>
            </p>
          )}
          {deferred && (
            <button
              data-testid="pwa-install-btn"
              onClick={install}
              className="mt-3 px-4 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-semibold transition"
            >
              Install app
            </button>
          )}
        </div>
        <button
          data-testid="pwa-dismiss-btn"
          onClick={dismiss}
          className="p-1.5 rounded-full hover:bg-white/5 transition flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>
    </div>
  );
}
