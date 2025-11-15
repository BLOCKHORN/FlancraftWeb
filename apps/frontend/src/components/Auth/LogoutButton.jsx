// src/components/Auth/LogoutButton.jsx
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { UserContext } from "../../context/UserContext";

export default function LogoutButton() {
  const navigate = useNavigate();
  const { setUser } = useContext(UserContext);

  const handleLogout = () => {
    // Elimina toda la info relacionada al usuario
    localStorage.removeItem("flan_user");
    localStorage.removeItem("rol_admin"); // Por si se usó por separado

    // Limpia el contexto global de usuario
    setUser(null);

    // Navega al inicio y recarga para limpiar cualquier estado residual
    navigate("/");
    window.location.reload();
  };

  return (
    <button onClick={handleLogout} className="dropdown-link logout-btn">
      <i className="fas fa-sign-out-alt" /> Cerrar sesión
    </button>
  );
}
