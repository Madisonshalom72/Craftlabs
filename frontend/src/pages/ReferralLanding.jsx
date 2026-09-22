import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function ReferralLanding() {
  const { code } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (code) {
      try {
        localStorage.setItem("cp_ref_code", code.toUpperCase());
      } catch { /* ignore */ }
    }
    navigate("/", { replace: true });
  }, [code, navigate]);

  return null;
}
