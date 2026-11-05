import { useState } from "react";
import { Wallet } from "lucide-react";
import { api } from "../api.js";

export default function AuthPage({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (mode === "register" && form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const data =
        mode === "login"
          ? await api.login({ username: form.username, password: form.password })
          : await api.register({ username: form.username, email: form.email, password: form.password });
      onAuth(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m) => {
    setMode(m);
    setError("");
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-logo">
            <Wallet size={28} strokeWidth={2.2} />
          </span>
          <h1>Budget</h1>
          <p className="muted">Track your income and expenses with ease.</p>
        </div>

        <div className="segmented">
          <button className={mode === "login" ? "active" : ""} onClick={() => switchMode("login")} type="button">
            Log in
          </button>
          <button className={mode === "register" ? "active" : ""} onClick={() => switchMode("register")} type="button">
            Create account
          </button>
        </div>

        <form onSubmit={submit} className="form">
          <label>
            Username
            <input value={form.username} onChange={set("username")} autoComplete="username" required autoFocus />
          </label>
          {mode === "register" && (
            <label>
              Email <span className="muted">(optional)</span>
              <input type="email" value={form.email} onChange={set("email")} autoComplete="email" />
            </label>
          )}
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={set("password")}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
            />
          </label>
          {mode === "register" && (
            <label>
              Confirm password
              <input type="password" value={form.confirm} onChange={set("confirm")} autoComplete="new-password" required />
            </label>
          )}
          {error && <div className="error">{error}</div>}
          <button className="btn primary block" disabled={loading}>
            {loading ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
