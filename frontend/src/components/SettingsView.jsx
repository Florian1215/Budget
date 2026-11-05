import { LogOut } from "lucide-react";
import { CURRENCIES } from "../utils.js";

export default function SettingsView({ user, currency, onCurrency, onLogout }) {
  return (
    <div className="narrow-page">
      <h3 className="section-title">Account</h3>
      <div className="group">
        <div className="group-row">
          <span>Username</span>
          <span className="muted">{user.username}</span>
        </div>
        {user.email && (
          <div className="group-row">
            <span>Email</span>
            <span className="muted">{user.email}</span>
          </div>
        )}
      </div>

      <h3 className="section-title">Preferences</h3>
      <div className="group">
        <label className="group-row">
          <span>Currency</span>
          <select className="bare-select" value={currency} onChange={(e) => onCurrency(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <div className="group-row">
          <span>Appearance</span>
          <span className="muted">Follows your system</span>
        </div>
      </div>

      <div className="group">
        <button className="group-row danger-row" onClick={onLogout}>
          <span>Log out</span>
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
}
