import React, { useState, useContext, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../context/UserContext";
import "../../styles/components/Auth/_loginmodal.scss";

const AuthInput = React.forwardRef(
  ({ type = "text", placeholder, value, onChange, disabled, className }, ref) => (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      ref={ref}
      className={className}
      autoComplete="off"
      aria-label={placeholder}
    />
  )
);

const AuthButton = ({ children, onClick, disabled }) => (
  <button
    type={onClick ? "button" : "submit"}
    onClick={onClick}
    disabled={disabled}
    aria-label={children}
  >
    {disabled ? "Procesando..." : children}
  </button>
);

export default function LoginModal({ onClose }) {
  const [step, setStep] = useState("login");
  const [form, setForm] = useState({
    username: "",
    password: "",
    confirm: "",
    token: "",
    uuid: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const { setUser } = useContext(UserContext);
  const navigate = useNavigate();
  const usernameRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setModalVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (step === "login" && usernameRef.current) {
      const focusTimer = setTimeout(() => usernameRef.current.focus(), 100);
      return () => clearTimeout(focusTimer);
    }
  }, [step]);

  const updateForm = (key, value) => {
  setForm((prev) => ({ ...prev, [key]: value }));
  if (error) setError(null);
};

  const cerrarModal = () => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose?.();
    }, 600);
  };

const goToDashboard = (uuid, username, rol_admin, extras = {}) => {
  const userData = {
    uuid,
    username,
    loggedIn: true,
    rol_admin,
    token: extras.token,
    ...extras,
  };
  localStorage.setItem("flan_user", JSON.stringify(userData));
  setUser(userData);
  navigate("/dashboard");
  cerrarModal();
};

  const validarPasswordsIguales = () => form.password === form.confirm;

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        "https://flancraftweb-backend.onrender.com/api/vincular/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: form.username, password: form.password }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al iniciar sesión");

      localStorage.setItem("token", data.token);
      
      const usuarioRes = await fetch(
        `https://flancraftweb-backend.onrender.com/api/usuarios/${data.uuid}`
      );
      const usuarioData = await usuarioRes.json();

      goToDashboard(data.uuid, data.uid, usuarioData.rol_admin, {
  token: data.token,
  rango_usuario: usuarioData.rango_usuario,
  userLevel: usuarioData.nivel,
  userXP: usuarioData.experiencia,
  userXPMax: usuarioData.experiencia_max,
  ecos: usuarioData.ecos,
});
    } catch (err) {
  console.error("Error en login:", err);
  setError(err.message);
  setShowToast(true);
  setTimeout(() => setShowToast(false), 5000);
} finally {
      setLoading(false);
    }
  };

  const handleTokenValidate = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        "https://flancraftweb-backend.onrender.com/api/vincular/validate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: form.token }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Token inválido");

      updateForm("uuid", data.uuid_jugador);
      updateForm("username", data.username);
      setStep("set-password");
    } catch (err) {
      console.error("Error al validar token:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError(null);
    if (!validarPasswordsIguales())
      return setError("Las contraseñas no coinciden");

    setLoading(true);
    try {
      const registerRes = await fetch(
        "https://flancraftweb-backend.onrender.com/api/vincular/registrar",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uuid: form.uuid,
            uid: form.username,
            password: form.password,
          }),
        }
      );
      const registerData = await registerRes.json();
      if (!registerRes.ok)
        throw new Error(registerData.error || "Error al registrar usuario");

      const markRes = await fetch(
        "https://flancraftweb-backend.onrender.com/api/vincular/marcar",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: form.token }),
        }
      );
      if (!markRes.ok) throw new Error("Error al marcar token como usado");

      const usuarioRes = await fetch(
        `https://flancraftweb-backend.onrender.com/api/usuarios/${form.uuid}`
      );
      const usuarioData = await usuarioRes.json();

      goToDashboard(form.uuid, form.username, usuarioData.rol_admin, {
        rango_usuario: usuarioData.rango_usuario,
        userLevel: usuarioData.nivel,
        userXP: usuarioData.experiencia,
        userXPMax: usuarioData.experiencia_max,
        ecos: usuarioData.ecos,
      });
    } catch (err) {
      console.error("Error al registrar:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetValidateToken = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("https://flancraftweb-backend.onrender.com/api/reset/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: form.token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Token inválido");

      updateForm("uuid", data.uuid);
      setStep("reset-set-password");
    } catch (err) {
      console.error("Error al validar token de reseteo:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetChangePassword = async () => {
    setError(null);
    setSuccess(null);
    if (!validarPasswordsIguales())
      return setError("Las contraseñas no coinciden");

    setLoading(true);
    try {
      const res = await fetch("https://flancraftweb-backend.onrender.com/api/reset/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: form.token, nuevaPassword: form.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cambiar la contraseña");

      setSuccess("Contraseña actualizada correctamente. Ya puedes iniciar sesión.");
      setStep("reset-done");
    } catch (err) {
      console.error("Error al cambiar contraseña:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderLoginStep = () => (
  <form
    onSubmit={(e) => {
      e.preventDefault();
      handleLogin();
    }}
    style={{ width: "100%" }}
  >
    <AuthInput
      placeholder="Usuario o email"
      value={form.username}
      onChange={(val) => updateForm("username", val)}
      ref={usernameRef}
      className={error ? "error-input" : ""}
    />
    <AuthInput
      type="password"
      placeholder="Contraseña"
      value={form.password}
      onChange={(val) => updateForm("password", val)}
      className={error ? "error-input" : ""}
    />
    <AuthButton disabled={loading}>Iniciar sesión</AuthButton>

    <div className="auth-options">
      <div className="auth-buttons-row">
        <button type="button" onClick={() => setStep("token")}>Regístrate aquí</button>
        <button type="button" onClick={() => setStep("reset-password")}>Restablecer</button>
      </div>
    </div>
  </form>
);


  const renderTokenStep = () => (
    <>
      <button className="back-button" onClick={() => setStep("login")}>← Volver</button>
      <p>Entra al servidor y escribe <code>/vincular</code>. Luego pega el token aquí:</p>
      <AuthInput
        placeholder="Token de vinculación"
        value={form.token}
        onChange={(val) => updateForm("token", val)}
        disabled={loading}
      />
      <AuthButton onClick={handleTokenValidate} disabled={loading}>Validar Token</AuthButton>
    </>
  );

  const renderSetPasswordStep = () => (
    <>
      <button className="back-button" onClick={() => setStep("login")}>← Volver</button>
      <p><strong>Nombre detectado:</strong> {form.username}</p>
      <p><strong>UUID:</strong> {form.uuid}</p>
      <AuthInput
        type="password"
        placeholder="Nueva contraseña"
        value={form.password}
        onChange={(val) => updateForm("password", val)}
        disabled={loading}
      />
      <AuthInput
        type="password"
        placeholder="Confirmar contraseña"
        value={form.confirm}
        onChange={(val) => updateForm("confirm", val)}
        disabled={loading}
      />
      <AuthButton onClick={handleRegister} disabled={loading}>Crear cuenta</AuthButton>
    </>
  );

  const renderResetPasswordStep = () => (
    <>
      <button className="back-button" onClick={() => setStep("login")}>← Volver</button>
      <p>Pega aquí el token generado con <code>/resetweb</code> en el servidor:</p>
      <AuthInput
        placeholder="Token de reseteo"
        value={form.token}
        onChange={(val) => updateForm("token", val)}
        disabled={loading}
      />
      <AuthButton onClick={handleResetValidateToken} disabled={loading}>Validar Token</AuthButton>
    </>
  );

  const renderResetSetPasswordStep = () => (
    <>
      <button className="back-button" onClick={() => setStep("login")}>← Volver</button>
      <p><strong>UUID detectado:</strong> {form.uuid}</p>
      <AuthInput
        type="password"
        placeholder="Nueva contraseña"
        value={form.password}
        onChange={(val) => updateForm("password", val)}
        disabled={loading}
      />
      <AuthInput
        type="password"
        placeholder="Confirmar contraseña"
        value={form.confirm}
        onChange={(val) => updateForm("confirm", val)}
        disabled={loading}
      />
      <AuthButton onClick={handleResetChangePassword} disabled={loading}>Cambiar contraseña</AuthButton>
    </>
  );

  return (
    <div className={`login-modal ${closing ? "fade-out-up" : ""}`}>
      <div className="overlay" onClick={cerrarModal} />
      {modalVisible && (
        <div className="hanging-login">
          <div className="frame-wrapper">
            <img src="/assets/hanging-frame.png" alt="Marco colgante" className="hanging-frame" />
            <div className="login-inside">
              <div className={`login-box
                ${step === 'set-password' ? 'registro' : ''}
                ${step.startsWith('reset') ? 'reset' : ''}
              `}>
                <h2>
                  {step === "login" && "Inicia sesión en Flancraft"}
                  {step === "token" && "Vincula tu cuenta Minecraft"}
                  {step === "set-password" && "Elige tu contraseña"}
                  {step === "reset-password" && "Restablecer contraseña"}
                  {step === "reset-set-password" && "Nueva contraseña"}
                  {step === "reset-done" && "Hecho"}
                </h2>

                {step === "login" && renderLoginStep()}
                {step === "token" && renderTokenStep()}
                {step === "set-password" && renderSetPasswordStep()}
                {step === "reset-password" && renderResetPasswordStep()}
                {step === "reset-set-password" && renderResetSetPasswordStep()}
                {step === "reset-done" && success && <p className="success">{success}</p>}
              </div>
            </div>
          </div>
                        {showToast && (
  <div className="toast-error">
    {error}
  </div>
)}
        </div>
        
      )}
    </div>
    
  );
}
