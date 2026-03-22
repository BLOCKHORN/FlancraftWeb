import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthModal } from "../../context/AuthModalContext";
import Seo from "../SEO/Seo";

export default function VincularPage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Usamos el modal global en lugar de renderizar uno duplicado localmente
  const { openAuthModal } = useAuthModal();

  const token = useMemo(() => {
    const sp = new URLSearchParams(location.search || "");
    return (sp.get("token") || "").trim();
  }, [location.search]);

  useEffect(() => {
    if (token) {
      localStorage.setItem("prefill_vincular_token", token);
    }
    
    // Abre el modal centralizado y saca al usuario de esta ruta fantasma
    openAuthModal();
    navigate("/", { replace: true });
  }, [token, navigate, openAuthModal]);

  return <Seo title="Vincular cuenta | FlanCraft" noindex />;
}