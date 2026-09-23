import "@/App.css";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import InstallPrompt from "@/components/InstallPrompt";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import AuthCallback from "@/pages/AuthCallback";
import CustomerDashboard from "@/pages/CustomerDashboard";
import HandymanDashboard from "@/pages/HandymanDashboard";
import CategoryPage from "@/pages/CategoryPage";
import BlogIndex from "@/pages/BlogIndex";
import BlogArticle from "@/pages/BlogArticle";
import AuthorPage from "@/pages/AuthorPage";
import AdminLicenses from "@/pages/AdminLicenses";
import AdminLogin from "@/pages/AdminLogin";
import AdminForgot from "@/pages/AdminForgot";
import AdminDashboard from "@/pages/AdminDashboard";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentCancel from "@/pages/PaymentCancel";
import HandymanPro from "@/pages/HandymanPro";
import ProSuccess from "@/pages/ProSuccess";
import LiveMap from "@/pages/LiveMap";
import ReferralLanding from "@/pages/ReferralLanding";
import TermsOfService from "@/pages/TermsOfService";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import AccountRecover from "@/pages/AccountRecover";
import VerifyEmail from "@/pages/VerifyEmail";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/services/:slug" element={<CategoryPage />} />
      <Route path="/blog" element={<BlogIndex />} />
      <Route path="/blog/:slug" element={<BlogArticle />} />
      <Route path="/authors/:editorId" element={<AuthorPage />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/licenses" element={<AdminLicenses />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/forgot" element={<AdminForgot />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<CustomerDashboard />} />
      <Route path="/handyman" element={<HandymanDashboard />} />
      <Route path="/pro" element={<HandymanPro />} />
      <Route path="/pro/success" element={<ProSuccess />} />
      <Route path="/live" element={<LiveMap />} />
      <Route path="/r/:code" element={<ReferralLanding />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/account/recover" element={<AccountRecover />} />
      <Route path="/verify" element={<VerifyEmail />} />
      <Route path="/forgot" element={<ForgotPassword />} />
      <Route path="/reset" element={<ResetPassword />} />
      <Route path="/payment/success" element={<PaymentSuccess />} />
      <Route path="/payment/cancel" element={<PaymentCancel />} />
    </Routes>
  );
}

function App() {
  useEffect(() => {
    if ("serviceWorker" in navigator && window.location.protocol === "https:") {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/service-worker.js", { scope: "/" })
          .catch((err) => console.warn("SW registration failed:", err));
      });
    }
  }, []);

  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
          <InstallPrompt />
          <Toaster
            position="top-right"
            theme="dark"
            toastOptions={{
              style: {
                background: "rgba(19, 22, 28, 0.95)",
                border: "1px solid rgba(245, 158, 11, 0.2)",
                color: "#F8FAFC",
              },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
