// src/components/Tienda/TiendaModalJugador.jsx
import React, { useState, useEffect, useRef } from "react";
import "../../styles/components/Tienda/tienda-modal-jugador.scss";

const TiendaModalJugador = ({ onConfirmar, onCerrar }) => {
  const [jugador, setJugador] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const modalRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onCerrar();
    };

    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onCerrar();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onCerrar]);

  const confirmarNombre = async () => {
    if (!jugador || jugador.length < 3) {
      setError("Ingresa un nombre válido.");
      return;
    }

    setCargando(true);
    setError("");

    try {
      const res = await fetch(
        `https://corsproxy.io/?https://api.mojang.com/users/profiles/minecraft/${jugador}`
      );
      if (!res.ok) throw new Error("Jugador no encontrado");
      const data = await res.json();
      const uuid = data.id;
      onConfirmar(jugador, uuid);
    } catch {
      setError("No se pudo encontrar ese jugador.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="modal-login-overlay">
      <div className="modal-login" ref={modalRef}>
        <div className="modal-contenido">
          <h2>Ingresa tu nombre de jugador</h2>
          <input
            type="text"
            placeholder="Tu nombre de Minecraft"
            value={jugador}
            onChange={(e) => setJugador(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && confirmarNombre()}
          />
          {error && <p className="error">{error}</p>}
          {cargando ? (
            <p>Cargando...</p>
          ) : (
            <div className="acciones">
              <button onClick={confirmarNombre}>Confirmar</button>
              <button className="cerrar" onClick={onCerrar}>
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TiendaModalJugador;
