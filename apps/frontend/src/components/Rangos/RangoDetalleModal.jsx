import { useEffect, useMemo, useRef } from "react";

function isAction(v) {
  return v && typeof v === "object" && (v.kind === "kit" || v.kind === "cmds");
}

export default function RangoDetalleModal({ open, rango, servidor, filas, onClose, onOpenAction }) {
  const closeBtnRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    closeBtnRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const resumen = useMemo(() => {
    if (!rango?.id) return [];
    return (filas || []).map((f) => ({
      key: f.key,
      label: f.label,
      hint: f.hint,
      value: f.values?.[rango.id],
    }));
  }, [filas, rango?.id]);

  if (!open || !rango) return null;

  const kitAction = resumen.find((r) => r.key === "kit_cd" && isAction(r.value))?.value || null;
  const cmdsAction = resumen.find((r) => r.key === "cmds" && isAction(r.value))?.value || null;

  const handleBackdropMouseDown = (e) => {
    if (e.currentTarget === e.target) onClose?.();
  };

  return (
    <div className="modal-accion-rango" role="dialog" aria-modal="true" onMouseDown={handleBackdropMouseDown}>
      <div className="modal-accion-panel">
        <button ref={closeBtnRef} className="modal-accion-close" type="button" onClick={onClose} aria-label="Cerrar">
          ×
        </button>

        <div className="modal-accion-head">
          <div className="modal-accion-rank">
            <img src={rango.imagen} alt={rango.nombre} className="modal-accion-rankimg" draggable="false" />
            <div className="modal-accion-ranktxt">
              <div className="modal-accion-title">{rango.nombre}</div>
              <div className="modal-accion-sub">
                30 días · {String(servidor).toUpperCase()}
              </div>
            </div>
          </div>

          <div className="modal-accion-quick">
            {kitAction && (
              <button type="button" className="celda-accion" onClick={() => onOpenAction?.(kitAction)}>
                {kitAction.label || "Abrir armory"}
              </button>
            )}
            {cmdsAction && (
              <button type="button" className="celda-accion" onClick={() => onOpenAction?.(cmdsAction)}>
                {cmdsAction.label || "Ver comandos"}
              </button>
            )}
          </div>
        </div>

        <div className="modal-accion-body">
          <div className="modal-accion-section">
            <div className="modal-accion-sectiontitle">Resumen de perks</div>

            <div className="modal-accion-grid">
              {resumen.map((r) => {
                const v = r.value;

                return (
                  <div key={r.key} className="modal-accion-row">
                    <div className="modal-accion-k">
                      {r.label}
                      {r.hint && <div className="modal-accion-hint">{r.hint}</div>}
                    </div>

                    <div className="modal-accion-v">
                      {typeof v === "boolean" ? (
                        v ? <span className="pill-ok">Sí</span> : <span className="pill-no">No</span>
                      ) : isAction(v) ? (
                        <button type="button" className="celda-accion" onClick={() => onOpenAction?.(v)}>
                          {v.label || "Ver"}
                        </button>
                      ) : v === undefined || v === null ? (
                        <span className="valor-num">—</span>
                      ) : Array.isArray(v) ? (
                        <span className="valor-num">{v.join(" · ")}</span>
                      ) : (
                        <span className="valor-num">{String(v)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="modal-accion-footer">
            <button type="button" className="btn-cerrar" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
