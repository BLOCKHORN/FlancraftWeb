import React, { useEffect, useState, useContext } from "react";
import { UserContext } from "../../context/UserContext";
import "../../styles/components/Admin/_gestionstaff.scss";

const API_URL = "https://flancraftweb-backend.onrender.com";

export default function GestionStaff() {
  const { user } = useContext(UserContext);
  const [usuarios, setUsuarios] = useState([]);
  const [permisos, setPermisos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [toast, setToast] = useState(null);

  const cargarDatos = async () => {
    try {
      const [usuariosRes, permisosRes] = await Promise.all([
        fetch(`${API_URL}/api/usuarios`),
        fetch(`${API_URL}/api/permisos-admin`)
      ]);
      if (!usuariosRes.ok || !permisosRes.ok) throw new Error("Error al cargar datos");

      const usuariosData = await usuariosRes.json();
      const permisosData = await permisosRes.json();
      setUsuarios(usuariosData);
      setPermisos(permisosData);
    } catch (err) {
      console.error("Error cargando datos", err);
    }
  };

  useEffect(() => {
    if (user?.loggedIn && user.rol_admin?.toLowerCase() === "owner") {
      cargarDatos();
    }
  }, [user]);

  const showToast = (mensaje, tipo = "success") => {
    setToast({ mensaje, tipo });
    setTimeout(() => setToast(null), 3000);
  };

  const actualizarPermiso = async (uuid, nuevoRol) => {
    try {
      if (!nuevoRol) {
        const res = await fetch(`${API_URL}/api/permisos-admin/${uuid}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Error al eliminar permiso");
        showToast("Permiso eliminado");
      } else {
        const res = await fetch(`${API_URL}/api/permisos-admin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uuid, rol: nuevoRol })
        });
        if (!res.ok) throw new Error("Error al asignar permiso");
        showToast("Permiso actualizado");
      }
      await cargarDatos();
    } catch (err) {
      showToast("Error: " + err.message, "error");
    }
  };

  const actualizarRango = async (uuid, nuevoRango) => {
    try {
      const res = await fetch(`${API_URL}/api/usuarios/rango`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uuid, rango_usuario: nuevoRango || null })
      });
      if (!res.ok) throw new Error("Error al actualizar rango");
      showToast("Rango actualizado");
      await cargarDatos();
    } catch (err) {
      showToast("Error: " + err.message, "error");
    }
  };

  const actualizarPremium = async (uuid, nuevoEstado) => {
    try {
      const res = await fetch(`${API_URL}/api/usuarios/premium`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uuid, es_premium: nuevoEstado })
      });
      if (!res.ok) throw new Error("Error al actualizar estado premium");
      showToast("Premium actualizado");
      await cargarDatos();
    } catch (err) {
      showToast("Error: " + err.message, "error");
    }
  };

  if (!user?.loggedIn || user.rol_admin?.toLowerCase() !== "owner") {
    return (
      <div className="admin-wrapper" style={{ textAlign: "center", padding: "4rem" }}>
        <img src="/assets/gandalf_minecraft.png" alt="No tienes poder aquí" style={{ maxWidth: "320px", marginBottom: "1rem" }} />
        <h2 style={{ fontFamily: "'IM Fell English SC', serif", fontSize: "2rem" }}>¡No tienes poder aquí!</h2>
        <p>Acceso denegado al panel de gestión de staff</p>
      </div>
    );
  }

  const permisosMap = Object.fromEntries(permisos.map(p => [p.uuid, p.rol]));
  const usuariosFiltrados = usuarios.filter((u) =>
    u.uid.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="staffpanel-wrapper">
      <h1 className="staffpanel-title">Gestión de Staff y Rangos</h1>

      <input
        type="text"
        placeholder="Buscar jugador por nombre..."
        className="staffpanel-search"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      <div className="staffpanel-permisos-list">
        {usuariosFiltrados.map((u) => (
          <div key={u.uuid} className="permiso-card fade-in">
            <img src={`https://mc-heads.net/avatar/${u.uid}/32`} alt={u.uid} className="avatar" />
            <div className="permiso-info">
              <strong>{u.uid}</strong>

              <select
                value={permisosMap[u.uuid] || ""}
                onChange={(e) => actualizarPermiso(u.uuid, e.target.value)}
              >
                <option value="">Sin permiso</option>
                <option value="mod">Mod</option>
                <option value="admin">Admin</option>
                <option value="owner">Owner</option>
              </select>

              <select
                value={u.rango_usuario || ""}
                onChange={(e) => actualizarRango(u.uuid, e.target.value)}
              >
                <option value="">Sin rango</option>
                <option value="nova">Nova</option>
                <option value="alpha">Alpha</option>
                <option value="inmortal">Inmortal</option>
    
              </select>

              <select
                value={u.es_premium === true ? "true" : u.es_premium === false ? "false" : ""}
                onChange={(e) => actualizarPremium(u.uuid, e.target.value === "true")}
              >
                <option value="true">Si Premium</option>
                <option value="false">No Premium</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      {toast && <div className={`toast ${toast.tipo}`}>{toast.mensaje}</div>}
    </div>
  );
}
