import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { UserContext } from "../../context/UserContext";

export default function LogoutButton() {
  const navigate = useNavigate();
  const { logout } = useContext(UserContext);

  const handleLogout = () => {
    logout();
    navigate("/");
    window.location.reload();
  };

  return (
    <button onClick={handleLogout} className="dropdown-link logout-btn">
      Cerrar sesión
    </button>
  );
}
