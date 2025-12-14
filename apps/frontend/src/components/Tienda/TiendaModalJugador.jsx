import React, { useEffect, useMemo, useRef, useState } from "react";
import "../../styles/components/Tienda/tienda-modal-jugador.scss";

const API_BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:10000";

export default function TiendaModalJugador({ onConfirmar, onCerrar }) {
  const [nombre, setNombre] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  // preview
  const [previewUuid, setPreviewUuid] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const nombreLimpio = useMemo(() => String(nombre || "").trim(), [nombre]);
  const nombreValido = useMemo(() => {
    // usernames MC: 3-16 chars, letras/números/_ (clásico)
    return /^[A-Za-z0-9_]{3,16}$/.test(nombreLimpio);
  }, [nombreLimpio]);

  // Misma lógica visual que el carrito: si hay uuid -> crafatar, si no -> minotar por nombre, si no -> Steve
  const previewUrl = useMemo(() => {
    if (!nombreLimpio) return "https://minotar.net/helm/Steve/64.png";
    if (previewUuid && String(previewUuid).trim().length > 10) {
      return `https://crafatar.com/avatars/${previewUuid}?size=64&overlay`;
    }
    return `https://minotar.net/helm/${encodeURIComponent(nombreLimpio)}/64.png`;
  }, [nombreLimpio, previewUuid]);

  // 🔎 Preview suave (debounce) para enseñar la skin mientras escribes
  useEffect(() => {
    setError("");

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!nombreValido) {
      setPreviewUuid("");
      setPreviewLoading(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      setPreviewLoading(true);

      try {
        const res = await fetch(
          `${API_BASE}/api/minecraft/uuid/${encodeURIComponent(nombreLimpio)}`,
          { signal: controller.signal }
        );

        if (!res.ok) {
          setPreviewUuid("");
          return;
        }

        const data = await res.json();
        const uuid = String(data?.uuid || "").trim();
        setPreviewUuid(uuid);
      } catch {
        // silencio: si falla preview, seguimos con minotar por nombre
        setPreviewUuid("");
      } finally {
        setPreviewLoading(false);
      }

      return () => controller.abort();
    }, 260);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [nombreLimpio, nombreValido]);

  const resolverUuid = async (username) => {
    const res = await fetch(
      `${API_BASE}/api/minecraft/uuid/${encodeURIComponent(username)}`
    );
    if (!res.ok) return "";
    const data = await res.json();
    return String(data?.uuid || "").trim();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!nombreValido) {
      setError("Introduce un nombre válido (3-16, letras/números/_).");
      return;
    }

    setCargando(true);
    try {
      // Intentamos resolver UUID “real”
      const uuid = await resolverUuid(nombreLimpio);

      // Si no hay uuid, no bloqueamos: minotar seguirá mostrando skin por nombre
      onConfirmar?.(nombreLimpio, uuid || "");

      setNombre("");
      setError("");
    } catch {
      setError("No se pudo validar el usuario. Inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="tc-modal-overlay" onMouseDown={onCerrar}>
      <div className="tc-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="tc-modal-head">
          <div className="tc-modal-title">
            <span className="tc-modal-ico">🎫</span>
            Elegir cuenta
          </div>
          <div className="tc-modal-desc">
            Escribe tu nombre de Minecraft para comprar en la tienda.
          </div>
        </div>

        <form className="tc-modal-body" onSubmit={handleSubmit}>
          <div className="tc-row">
            <div className={"tc-field " + (error ? "is-error" : "")}>
              <div className="tc-label">Nombre de Minecraft</div>

              <div className="tc-inputwrap">
                <img
                  className="tc-headimg"
                  src={previewUrl}
                  alt="skin"
                  draggable={false}
                  style={{ opacity: previewLoading ? 0.75 : 1 }}
                />
                <input
                  ref={inputRef}
                  className="tc-input"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Steve"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              <div className="tc-hint">
                Tip: usa exactamente el mismo nombre que en Minecraft.
              </div>

              {error ? <div className="tc-error">{error}</div> : null}
            </div>

            <button
              type="submit"
              className="tc-btn-continue"
              disabled={cargando || !nombreValido}
            >
              {cargando ? "VALIDANDO..." : "INICIAR"}
            </button>
          </div>
        </form>

        <div className="tc-modal-foot">
          <button type="button" className="tc-btn-close" onClick={onCerrar}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
