import React, { useEffect, useRef, useState } from "react";
import useMinecraftProfile from "../hooks/useMinecraftProfile";
import "../../../styles/components/Tienda/tienda-modal-jugador.scss";

export default function TiendaModalJugador({ onConfirmar, onCerrar }) {
  const [nombre, setNombre] = useState("");
  const inputRef = useRef(null);

  // CORRECTO: Llamada al hook como función
  const profile = useMinecraftProfile(nombre);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanName = nombre.trim();
    if (cleanName.length < 3) return;

    // Usamos los datos que el hook ya resolvió
    onConfirmar?.(cleanName, profile.uuid || "");
  };

  return (
    <div className="tc-modal-overlay" onMouseDown={onCerrar}>
      <div className="tc-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="tc-modal-head">
          <div className="tc-modal-title">ELEGIR CUENTA</div>
          <p className="tc-modal-desc">Escribe tu nombre de Minecraft para continuar.</p>
        </div>

        <form className="tc-modal-body" onSubmit={handleSubmit}>
          <div className="tc-field">
            <label className="tc-label">Nombre de Minecraft</label>
            <div className="tc-inputwrap">
              <div className="tc-head-frame">
                <img
                  src={profile.headUrl}
                  className="tc-headimg"
                  alt="Avatar"
                  style={{ opacity: profile.loading ? 0.5 : 1 }}
                />
              </div>
              <input
                ref={inputRef}
                className="tc-input"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Steve"
                autoComplete="off"
                maxLength={16}
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            className="tc-btn-continue" 
            disabled={nombre.trim().length < 3}
          >
            {profile.loading ? "BUSCANDO..." : "INICIAR SESIÓN"}
          </button>
        </form>

        <div className="tc-modal-foot">
          <button className="tc-btn-close" onClick={onCerrar}>CANCELAR</button>
        </div>
      </div>
    </div>
  );
}