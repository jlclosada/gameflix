import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { Icon } from "./Icons.jsx";

// Login / register modal. `mode` is "login" or "register".
export default function AuthModal({ onClose, initialMode = "login" }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState(initialMode);
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        await login(identifier, password);
      } else {
        await register(username, email, password);
      }
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="ghost close" onClick={onClose} aria-label="Cerrar">
          <Icon.Close style={{ width: 18, height: 18 }} />
        </button>

        <div className="tabs">
          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            Iniciar sesión
          </button>
          <button
            className={mode === "register" ? "active" : ""}
            onClick={() => {
              setMode("register");
              setError("");
            }}
          >
            Crear cuenta
          </button>
        </div>

        <h2>{mode === "login" ? "Bienvenido de nuevo" : "Únete a GameTier"}</h2>
        <p className="modal-sub">
          {mode === "login"
            ? "Accede para publicar tus tier lists."
            : "Crea tu cuenta y deja tu huella en la comunidad."}
        </p>

        {error && <div className="error">{error}</div>}

        <form className="stack" onSubmit={submit}>
          {mode === "login" ? (
            <div className="field">
              <label>Usuario o email</label>
              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="tu_usuario"
                autoFocus
                required
              />
            </div>
          ) : (
            <>
              <div className="field">
                <label>Usuario</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="tu_usuario"
                  autoFocus
                  required
                />
              </div>
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                />
              </div>
            </>
          )}

          <div className="field">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" disabled={busy} style={{ marginTop: 4 }}>
            {busy
              ? "Procesando..."
              : mode === "login"
                ? "Entrar"
                : "Crear cuenta"}
          </button>
        </form>

        <div className="switch">
          {mode === "login" ? (
            <>
              ¿No tienes cuenta?
              <button onClick={() => setMode("register")}>Regístrate</button>
            </>
          ) : (
            <>
              ¿Ya tienes cuenta?
              <button onClick={() => setMode("login")}>Inicia sesión</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
