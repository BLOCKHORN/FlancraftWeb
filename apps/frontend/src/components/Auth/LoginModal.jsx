import React, { useState, useContext, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../context/UserContext";
import { apiGet, apiPost } from "../../lib/api/client";
import { buildUserSession } from "../../lib/auth/session";
import { persistSession } from "../../lib/auth/storage";
import "../../styles/components/Auth/_loginmodal.scss";

const CODE_RE = /^[0-9]{6}$/;
const RESET_TOKEN_RE = /^[a-f0-9]{32}$/i;

const AuthInput = React.forwardRef(
  ({ type = "text", placeholder, value, onChange, disabled, className = "" }, ref) => (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      ref={ref}
      className={`mc-modal-input ${className}`}
      autoComplete="off"
      aria-label={placeholder}
    />
  )
);

const AuthButton = ({ children, onClick, disabled, variant = "primary" }) => (
  <button
    type={onClick ? "button" : "submit"}
    onClick={onClick}
    disabled={disabled}
    className={`mc-modal-btn ${variant === "secondary" ? "mc-modal-btn--secondary" : ""}`}
    aria-label={typeof children === "string" ? children : "Acción"}
  >
    {disabled ? "Procesando..." : children}
  </button>
);

const getErrorMessage = (context, status, backendError) => {
  if (backendError && typeof backendError === "string") return backendError;

  switch (context) {
    case "login":
      if (status === 400) return "Debes introducir usuario y contraseña.";
      if (status === 401) return "La contraseña no es correcta. Revisa mayúsculas y minúsculas.";
      if (status === 404) return "No hemos encontrado ninguna cuenta con esos datos. Vincula tu cuenta con /vincular.";
      if (status === 429) return "Has hecho demasiados intentos seguidos. Espera unos segundos.";
      return "No se ha podido iniciar sesión ahora mismo. Inténtalo de nuevo en unos segundos.";

    case "vincular-validate":
      if (status === 404) return "Ese token/código no existe o ya se ha usado.";
      if (status === 410) return "Ese token/código ha caducado. Genera uno nuevo con /vincular en el servidor.";
      if (status === 409) return "Este usuario ya está registrado. Inicia sesión.";
      return "El token/código no es válido. Prueba a generarlo otra vez con /vincular.";

    case "register":
      if (status === 409) return "Ya existe una cuenta web asociada a este jugador.";
      return "No se ha podido crear tu cuenta web. Inténtalo de nuevo en unos segundos.";

    case "reset-validate":
      if (status === 404) return "Ese token/código de recuperación no existe.";
      if (status === 410) return "Ese token/código ha caducado o ya se ha usado. Genera uno nuevo con /resetweb.";
      return "No se ha podido validar tu recuperación. Genera un nuevo /resetweb e inténtalo otra vez.";

    case "reset-change":
      if (status === 410) return "Tu recuperación ha caducado. Genera un nuevo /resetweb.";
      return "No se ha podido cambiar la contraseña. Inténtalo de nuevo en unos segundos.";

    default:
      return "Ha ocurrido un error inesperado. Inténtalo de nuevo.";
  }
};

export default function LoginModal({ onClose, initialStep, initialToken, autoValidateToken }) {
  const [step, setStep] = useState(initialStep || "login");
  const [form, setForm] = useState({
    username: "",
    password: "",
    confirm: "",
    token: "",
    uuid: null,
    codigo: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showError, setShowError] = useState(false);
  const [success, setSuccess] = useState(null);
  const [closing, setClosing] = useState(false);

  const { setUser } = useContext(UserContext);
  const navigate = useNavigate();

  const usernameRef = useRef(null);
  const tokenRef = useRef(null);

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) {
      setError(null);
      setShowError(false);
    }
  };

  const cerrarModal = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => {
      onClose?.();
    }, 300);
  };

  const finalizeLogin = (uuid, username, rol_admin, extras = {}) => {
    const userData = buildUserSession({
      uuid,
      username,
      loggedIn: true,
      rol_admin,
      ...extras,
    });

    persistSession(userData, extras.token);
    setUser(userData, extras.token);

    const pendingWelcomePack = localStorage.getItem("fc_pending_welcome_pack") === "true";

    cerrarModal();

    setTimeout(() => {
      if (pendingWelcomePack) {
        navigate("/tienda");
      }
    }, 300);
  };

  const validarPasswordsIguales = () => form.password === form.confirm;

  useEffect(() => {
    if (step === "login" && usernameRef.current) {
      const t = setTimeout(() => usernameRef.current.focus(), 100);
      return () => clearTimeout(t);
    }

    if ((step === "token" || step === "reset-password") && tokenRef.current) {
      const t = setTimeout(() => tokenRef.current.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [step]);

  useEffect(() => {
    if (!error) return;
    setShowError(true);
    const t = setTimeout(() => {
      setShowError(false);
      setError(null);
    }, 5000);
    return () => clearTimeout(t);
  }, [error]);

  useEffect(() => {
    const incomingInitial = String(initialToken || "").trim();
    const resetTokenPrefill = String(localStorage.getItem("prefill_reset_token") || "").trim();
    const resetCodigoPrefill = String(localStorage.getItem("prefill_reset_codigo") || "").trim();
    const vincularPrefill = String(localStorage.getItem("prefill_vincular_token") || "").trim();

    if (incomingInitial) {
      setForm((prev) => ({ ...prev, token: incomingInitial }));
      setStep(initialStep || "token");
      return;
    }

    if (resetTokenPrefill || resetCodigoPrefill) {
      const raw = resetTokenPrefill || resetCodigoPrefill;
      setForm((prev) => ({
        ...prev,
        token: raw,
        codigo: CODE_RE.test(raw) ? raw : "",
      }));
      setStep("reset-password");
      return;
    }

    if (vincularPrefill) {
      setForm((prev) => ({ ...prev, token: vincularPrefill }));
      setStep("token");
    }
  }, [initialToken, initialStep]);

  useEffect(() => {
    const tok = String(initialToken || form.token || "").trim();
    if (!tok || step !== "token") return;

    const prefill = String(localStorage.getItem("prefill_vincular_token") || "").trim();
    if (autoValidateToken || prefill === tok) {
      const t = setTimeout(() => {
        handleTokenValidate(tok);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [autoValidateToken, initialToken, step, form.token]);

  useEffect(() => {
    if (step !== "reset-password") return;

    const tokenPrefill = String(localStorage.getItem("prefill_reset_token") || "").trim();
    const codigoPrefill = String(localStorage.getItem("prefill_reset_codigo") || "").trim();
    const raw = String(form.token || tokenPrefill || codigoPrefill).trim();

    if (!raw) return;

    if (tokenPrefill === raw || codigoPrefill === raw) {
      const t = setTimeout(() => {
        handleResetValidateToken(raw);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [step, form.token]);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      let data;
      try {
        data = await apiPost("/api/vincular/login", { uid: form.username, password: form.password });
      } catch (err) {
        throw new Error(getErrorMessage("login", err?.status, err?.data?.error || err?.message));
      }

      const usuarioData = await apiGet(`/api/usuarios/${data.uuid}`);

      finalizeLogin(data.uuid, data.uid || data.username || form.username, usuarioData?.rol_admin || null, {
        token: data.token,
        rango_usuario: usuarioData?.rango_usuario,
        userLevel: usuarioData?.nivel,
        userXP: usuarioData?.experiencia,
        userXPMax: usuarioData?.experiencia_max,
        ecos: usuarioData?.ecos,
      });
    } catch (err) {
      setError(err?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  const handleTokenValidate = async (valueOverride) => {
    const raw = String(valueOverride ?? form.token ?? "").trim();
    const isCode = CODE_RE.test(raw);

    setError(null);
    setLoading(true);

    try {
      let data;
      try {
        data = await apiPost("/api/vincular/validate", isCode ? { codigo: raw } : { token: raw });
      } catch (err) {
        throw new Error(getErrorMessage("vincular-validate", err?.status, err?.data?.error || err?.message));
      }

      localStorage.removeItem("prefill_vincular_token");

      if (isCode) updateForm("codigo", raw);
      else updateForm("token", raw);

      updateForm("uuid", data.uuid_jugador);
      updateForm("username", data.username);
      setStep("set-password");
    } catch (err) {
      setError(err?.message || "Error");
      localStorage.removeItem("prefill_vincular_token");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError(null);

    if (!validarPasswordsIguales()) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        uuid: form.uuid,
        uid: form.username,
        password: form.password,
      };

      if (String(form.token || "").trim()) payload.token = String(form.token).trim();
      if (String(form.codigo || "").trim()) payload.codigo = String(form.codigo).trim();

      try {
        await apiPost("/api/vincular/registrar", payload);
      } catch (err) {
        throw new Error(getErrorMessage("register", err?.status, err?.data?.error || err?.message));
      }

      localStorage.removeItem("prefill_vincular_token");

      const loginData = await apiPost("/api/vincular/login", {
        uid: form.username,
        password: form.password,
      });

      const usuarioData = await apiGet(`/api/usuarios/${form.uuid}`);

      finalizeLogin(form.uuid, form.username, usuarioData?.rol_admin || null, {
        token: loginData?.token,
        rango_usuario: usuarioData?.rango_usuario,
        userLevel: usuarioData?.nivel,
        userXP: usuarioData?.experiencia,
        userXPMax: usuarioData?.experiencia_max,
        ecos: usuarioData?.ecos,
      });
    } catch (err) {
      setError(err?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  const handleResetValidateToken = async (valueOverride) => {
    const raw = String(valueOverride ?? form.token ?? "").trim();
    const isCode = CODE_RE.test(raw);

    setError(null);
    setLoading(true);

    try {
      let data;
      try {
        data = await apiPost("/api/reset/validate", isCode ? { codigo: raw } : { token: raw });
      } catch (err) {
        throw new Error(getErrorMessage("reset-validate", err?.status, err?.data?.error || err?.message));
      }

      localStorage.removeItem("prefill_reset_token");
      localStorage.removeItem("prefill_reset_codigo");

      updateForm("uuid", data.uuid);
      updateForm("token", String(data.token || raw).trim());
      updateForm("codigo", String(data.codigo || (isCode ? raw : "")).trim());
      setStep("reset-set-password");
    } catch (err) {
      setError(err?.message || "Error");
      localStorage.removeItem("prefill_reset_token");
      localStorage.removeItem("prefill_reset_codigo");
    } finally {
      setLoading(false);
    }
  };

  const handleResetChangePassword = async () => {
    setError(null);
    setSuccess(null);

    if (!validarPasswordsIguales()) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);

    try {
      const payload = { nuevaPassword: form.password };
      if (String(form.token || "").trim()) payload.token = String(form.token).trim();
      if (!payload.token && String(form.codigo || "").trim()) payload.codigo = String(form.codigo).trim();

      try {
        await apiPost("/api/reset/set-password", payload);
      } catch (err) {
        throw new Error(getErrorMessage("reset-change", err?.status, err?.data?.error || err?.message));
      }

      localStorage.removeItem("prefill_reset_token");
      localStorage.removeItem("prefill_reset_codigo");
      setSuccess("Contraseña actualizada correctamente. Ya puedes iniciar sesión.");
      setStep("reset-done");
    } catch (err) {
      setError(err?.message || "Error");
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
    >
      <AuthInput
        placeholder="Usuario o email"
        value={form.username}
        onChange={(val) => updateForm("username", val)}
        ref={usernameRef}
        className={error && step === "login" ? "is-error" : ""}
      />
      <AuthInput
        type="password"
        placeholder="Contraseña"
        value={form.password}
        onChange={(val) => updateForm("password", val)}
        className={error && step === "login" ? "is-error" : ""}
      />
      <AuthButton disabled={loading}>Iniciar sesión</AuthButton>
      <div className="mc-modal-options">
        <button type="button" onClick={() => setStep("token")}>Regístrate aquí</button>
        <button type="button" onClick={() => setStep("reset-password")}>Restablecer contraseña</button>
      </div>
    </form>
  );

  const renderTokenStep = () => (
    <>
      <p className="mc-modal-text">
        Entra al servidor y escribe <code>/vincular</code>. Introduce aquí el token o el código de 6 dígitos:
      </p>
      <AuthInput
        placeholder="Token o código"
        value={form.token}
        onChange={(val) => updateForm("token", val)}
        disabled={loading}
        className={error ? "is-error" : ""}
        ref={tokenRef}
      />
      <AuthButton onClick={() => handleTokenValidate()} disabled={loading}>Validar</AuthButton>
      <AuthButton onClick={() => setStep("login")} disabled={loading} variant="secondary">Volver</AuthButton>
    </>
  );

  const renderSetPasswordStep = () => (
    <>
      <p className="mc-modal-text">
        Cuenta detectada:
        <br />
        <strong style={{ color: "#fff" }}>{form.username}</strong>
      </p>
      <AuthInput
        type="password"
        placeholder="Nueva contraseña"
        value={form.password}
        onChange={(val) => updateForm("password", val)}
        disabled={loading}
        className={error ? "is-error" : ""}
      />
      <AuthInput
        type="password"
        placeholder="Confirmar contraseña"
        value={form.confirm}
        onChange={(val) => updateForm("confirm", val)}
        disabled={loading}
        className={error ? "is-error" : ""}
      />
      <AuthButton onClick={handleRegister} disabled={loading}>Crear cuenta</AuthButton>
      <AuthButton onClick={() => setStep("login")} disabled={loading} variant="secondary">Volver</AuthButton>
    </>
  );

  const renderResetPasswordStep = () => (
    <>
      <p className="mc-modal-text">
        Introduce el token o el código generado con <code>/resetweb</code>. En Java puedes abrir directamente el enlace que te da el servidor. En Bedrock entra en <code>flancraft.com/reset</code> y escribe tu código.
      </p>
      <AuthInput
        placeholder="Token o código de recuperación"
        value={form.token}
        onChange={(val) => updateForm("token", val)}
        disabled={loading}
        className={error ? "is-error" : ""}
        ref={tokenRef}
      />
      <AuthButton onClick={() => handleResetValidateToken()} disabled={loading}>Validar recuperación</AuthButton>
      <AuthButton onClick={() => setStep("login")} disabled={loading} variant="secondary">Volver</AuthButton>
    </>
  );

  const renderResetSetPasswordStep = () => (
    <>
      <p className="mc-modal-text">
        Recuperación validada correctamente. Ya puedes elegir una nueva contraseña.
      </p>
      <AuthInput
        type="password"
        placeholder="Nueva contraseña"
        value={form.password}
        onChange={(val) => updateForm("password", val)}
        disabled={loading}
        className={error ? "is-error" : ""}
      />
      <AuthInput
        type="password"
        placeholder="Confirmar contraseña"
        value={form.confirm}
        onChange={(val) => updateForm("confirm", val)}
        disabled={loading}
        className={error ? "is-error" : ""}
      />
      <AuthButton onClick={handleResetChangePassword} disabled={loading}>Guardar contraseña</AuthButton>
      <AuthButton onClick={() => setStep("login")} disabled={loading} variant="secondary">Volver</AuthButton>
    </>
  );

  return (
    <div className={`login-modal-root ${closing ? "is-closing" : "is-open"}`}>
      <div className="login-modal-overlay" onClick={cerrarModal} />
      <div className="mc-modal-box">
        <button className="mc-modal-close" onClick={cerrarModal} aria-label="Cerrar">X</button>

        <h2 className="mc-modal-title">
          {step === "login" && "INICIAR SESIÓN"}
          {step === "token" && "VINCULAR CUENTA"}
          {step === "set-password" && "ESTABLECER CONTRASEÑA"}
          {step === "reset-password" && "RECUPERAR ACCESO"}
          {step === "reset-set-password" && "NUEVA CONTRASEÑA"}
          {step === "reset-done" && "¡LISTO!"}
        </h2>

        {(step === "token" || step.startsWith("reset")) && step !== "reset-done" && (
          <div className="mc-modal-tag">
            {step === "token" ? "Vincula tu cuenta de Minecraft al sistema web." : "Estás restableciendo tu contraseña web."}
          </div>
        )}

        {step === "login" && renderLoginStep()}
        {step === "token" && renderTokenStep()}
        {step === "set-password" && renderSetPasswordStep()}
        {step === "reset-password" && renderResetPasswordStep()}
        {step === "reset-set-password" && renderResetSetPasswordStep()}

        {step === "reset-done" && success && (
          <>
            <p className="mc-modal-success">{success}</p>
            <AuthButton onClick={() => setStep("login")}>Ir a iniciar sesión</AuthButton>
          </>
        )}

        {showError && error && step !== "login" && (
          <div className="mc-modal-error">{error}</div>
        )}
      </div>
    </div>
  );
}