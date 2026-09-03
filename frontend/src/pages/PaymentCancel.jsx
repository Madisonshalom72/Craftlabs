import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { XCircle, ArrowLeft } from "lucide-react";

export default function PaymentCancel() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-5 py-16">
        <div className="glass rounded-3xl p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-5">
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight">Booking Cancelled</h1>
          <p className="text-slate-400 mt-2">No charge was made. You can try again anytime.</p>
          <Link to="/dashboard" className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/8 hover:bg-white/12 font-medium transition">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
        </div>
      </div>
    </div>
  );
}
