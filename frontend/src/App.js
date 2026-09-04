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
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentCancel from "@/pages/PaymentCancel";

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
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<CustomerDashboard />} />
      <Route path="/handyman" element={<HandymanDashboard />} />
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
