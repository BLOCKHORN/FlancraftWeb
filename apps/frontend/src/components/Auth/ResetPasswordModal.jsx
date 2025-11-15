import { useState } from "react";
import "../../styles/components/Auth/_loginmodal.scss";

export default function ResetPasswordModal({ onClose }) {
  const [step, setStep] = useState("token");
  const [token, setToken] = useState("");
  const [uuid, setUuid] = useState(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleValidateToken = async () => {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("https://flancraftweb-backend.onrender.com/api/reset/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Token inválido");

      setUuid(data.uuid);
      setStep("set-password");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setError(null);
    setSuccess(null);

    if (password !== confirm) {
      return setError("Las contraseñas no coinciden");
    }

    setLoading(true);

    try {
      const res = await fetch("https://flancraftweb-backend.onrender.com/api/reset/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, nuevaPassword: password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cambiar la contraseña");

      setSuccess("Contraseña actualizada correctamente. Ya puedes iniciar sesión.");
      setStep("done");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-modal">
      <div className="overlay" onClick={onClose}></div>
      <div className="login-box">
        <button className="close-btn" onClick={onClose}>
          &times;
        </button>
        <h2>
          {step === "token"
            ? "Restablecer contraseña"
            : step === "set-password"
            ? "Nueva contraseña"
            : "Hecho"}
        </h2>

        {step === "token" && (
          <>
            <p>Pega aquí el token generado con <code>/resetweb</code> en el servidor:</p>
            <input
              type="text"
              placeholder="Token de reseteo"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={loading}
            />
            <button onClick={handleValidateToken} disabled={loading}>
              {loading ? "Validando..." : "Validar Token"}
            </button>
          </>
        )}

        {step === "set-password" && (
          <>
            <p><strong>UUID detectado:</strong> {uuid}</p>
            <input
              type="password"
              placeholder="Nueva contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <input
              type="password"
              placeholder="Confirmar contraseña"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={loading}
            />
            <button onClick={handleChangePassword} disabled={loading}>
              {loading ? "Cambiando..." : "Cambiar contraseña"}
            </button>
          </>
        )}

        {step === "done" && success && (
          <p className="success">{success}</p>
        )}

        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
