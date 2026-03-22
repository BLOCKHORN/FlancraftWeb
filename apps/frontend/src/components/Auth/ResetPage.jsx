import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthModal } from "../../context/AuthModalContext";
import Seo from "../SEO/Seo";

export default function ResetPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { openAuthModal } = useAuthModal();

  const token = useMemo(() => {
    const sp = new URLSearchParams(location.search || "");
    return (sp.get("token") || "").trim();
  }, [location.search]);

  const codigo = useMemo(() => {
    const sp = new URLSearchParams(location.search || "");
    return (sp.get("codigo") || "").trim();
  }, [location.search]);

  useEffect(() => {
    if (token) localStorage.setItem("prefill_reset_token", token);
    if (codigo) localStorage.setItem("prefill_reset_codigo", codigo);

    openAuthModal();
    navigate("/", { replace: true });
  }, [token, codigo, navigate, openAuthModal]);

  return <Seo title="Recuperar acceso | FlanCraft" noindex />;
}