import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import LoginModal from "./LoginModal";

export default function VincularPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  const token = useMemo(() => {
    const sp = new URLSearchParams(location.search || "");
    return (sp.get("token") || "").trim();
  }, [location.search]);

  useEffect(() => {
    if (!token) return;
    localStorage.setItem("prefill_vincular_token", token);
  }, [token]);

  useEffect(() => {
    if (open) return;
    navigate("/", { replace: true });
  }, [open, navigate]);

  return (
    <>
      {open && (
        <LoginModal
          onClose={() => setOpen(false)}
          initialStep="token"
          initialToken={token}
          autoValidateToken={true}
        />
      )}
    </>
  );
}