// apps/frontend/src/components/Rangos/RangoAccionModal.jsx

import { useEffect, useRef } from "react";

function iconForSlot(slot) {
  const s = String(slot || "").toLowerCase();
  if (["helmet", "chest", "legs", "boots"].includes(s)) return "🛡️";
  if (["sword"].includes(s)) return "⚔️";
  if (["pickaxe", "axe", "shovel"].includes(s)) return "⛏️";
  return "◆";
}

function RangoAccionModal({ open, accion, dataModal, onClose }) {
  const closeBtnRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    closeBtnRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !accion) return null;

  const handleBackdropMouseDown = (e) => {
    if (e.currentTarget === e.target) onClose?.();
  };

  const { kind, server, rank } = accion;

  const kit = kind === "kit" ? dataModal?.kits?.[rank] : null;
  const cmds = kind === "cmds" ? dataModal?.cmds?.[server]?.[rank] : null;

  return (
    <div className="modal-accion-rango" role="dialog" aria-modal="true" onMouseDown={handleBackdropMouseDown}>
      <div className="modal-accion-panel">
        <button ref={closeBtnRef} className="modal-accion-close" type="button" onClick={onClose} aria-label="Cerrar">
          ×
        </button>

        {kind === "kit" && kit && (
          <>
            <div className="modal-accion-head">
              <div className="modal-accion-title">{kit.title}</div>
              <div className="modal-accion-sub">
                {kit.subtitle} · Cooldown: <strong>{kit.cooldown}</strong>
              </div>
            </div>

            <div className="modal-accion-body">
              <div className="armory-block">
                <div className="armory-title">Armadura</div>
                <div className="armory-list">
                  {kit.armor?.map((it) => (
                    <div key={it.slot + it.name} className="armory-item">
                      <div className="armory-icon">{iconForSlot(it.slot)}</div>
                      <div className="armory-main">
                        <div className="armory-name">{it.name}</div>
                        <div className="armory-lines">
                          {it.ench?.map((l, i) => (
                            <div key={i} className="armory-line">{l}</div>
                          ))}
                          {it.extra?.map((l, i) => (
                            <div key={"e" + i} className="armory-line subtle">{l}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="armory-block">
                <div className="armory-title">Herramientas</div>
                <div className="armory-list">
                  {kit.tools?.map((it) => (
                    <div key={it.slot + it.name} className="armory-item">
                      <div className="armory-icon">{iconForSlot(it.slot)}</div>
                      <div className="armory-main">
                        <div className="armory-name">{it.name}</div>
                        <div className="armory-lines">
                          {it.ench?.map((l, i) => (
                            <div key={i} className="armory-line">{l}</div>
                          ))}
                          {it.extra?.map((l, i) => (
                            <div key={"e" + i} className="armory-line subtle">{l}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="armory-block">
                <div className="armory-title">Recursos</div>
                <div className="armory-chips">
                  {kit.resources?.map((r, i) => (
                    <span key={i} className="chip">{r}</span>
                  ))}
                </div>
              </div>

              <div className="modal-accion-footer">
                <button type="button" className="btn-cerrar" onClick={onClose}>
                  Cerrar
                </button>
              </div>
            </div>
          </>
        )}

        {kind === "cmds" && (
          <>
            <div className="modal-accion-head">
              <div className="modal-accion-title">Comandos del rango</div>
              <div className="modal-accion-sub">
                Servidor: <strong>{String(server).toUpperCase()}</strong> · Rango: <strong>{String(rank).toUpperCase()}</strong>
              </div>
            </div>

            <div className="modal-accion-body">
              {Array.isArray(cmds) && cmds.length > 0 ? (
                <ul className="cmds-list">
                  {cmds.map((c, i) => (
                    <li key={i} className="cmds-item">{c}</li>
                  ))}
                </ul>
              ) : (
                <div className="rango-empty">No hay comandos definidos para este rango aquí.</div>
              )}

              <div className="modal-accion-footer">
                <button type="button" className="btn-cerrar" onClick={onClose}>
                  Cerrar
                </button>
              </div>
            </div>
          </>
        )}

        {kind === "kit" && !kit && (
          <div className="modal-accion-body">
            <div className="rango-empty">No hay kit definido para este rango.</div>
            <div className="modal-accion-footer">
              <button type="button" className="btn-cerrar" onClick={onClose}>Cerrar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RangoAccionModal;
