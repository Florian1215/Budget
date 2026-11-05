import { useCallback, useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, LayoutGrid, Repeat, Settings } from "lucide-react";
import { api, getToken, setToken, setUnauthorizedHandler } from "./api.js";
import { addMonths, getCurrency, relativeMonthLabel, saveCurrency, startOfMonth } from "./utils.js";
import AuthPage from "./components/AuthPage.jsx";
import Dashboard from "./components/Dashboard.jsx";
import CalendarView from "./components/CalendarView.jsx";
import RecurringView from "./components/RecurringView.jsx";
import SettingsView from "./components/SettingsView.jsx";

const VIEWS = [
  { id: "home", label: "Home", Icon: LayoutGrid },
  { id: "transactions", label: "Transactions", Icon: CalendarDays },
  { id: "recurring", label: "Recurring", Icon: Repeat },
  { id: "settings", label: "Settings", Icon: Settings },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(getToken()));
  const [view, setView] = useState("home");
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [currency, setCurrency] = useState(getCurrency);

  const signOut = useCallback(() => {
    setToken(null);
    setUser(null);
    setView("home");
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(signOut);
    if (!getToken()) return;
    api
      .me()
      .then(setUser)
      .catch(signOut)
      .finally(() => setChecking(false));
  }, [signOut]);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      /* token may already be invalid */
    }
    signOut();
  };

  const changeCurrency = (c) => {
    saveCurrency(c);
    setCurrency(c);
  };

  if (checking) return <div className="center-screen muted">Loading…</div>;
  if (!user)
    return (
      <AuthPage
        onAuth={({ token, user }) => {
          setToken(token);
          setUser(user);
        }}
      />
    );

  const showMonth = view === "home" || view === "transactions";
  const title = VIEWS.find((v) => v.id === view).label;

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-side">
          <span className="account-name">{user.username}</span>
        </div>
        {showMonth ? (
          <div className="month-switch">
            <button className="icon-btn" onClick={() => setMonth((m) => addMonths(m, -1))} aria-label="Previous month">
              <ChevronLeft size={18} />
            </button>
            <button className="month-label" onClick={() => setMonth(startOfMonth(new Date()))} title="Back to this month">
              {relativeMonthLabel(month)}
            </button>
            <button className="icon-btn" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Next month">
              <ChevronRight size={18} />
            </button>
          </div>
        ) : (
          <div className="month-switch">
            <span className="month-label static">{title}</span>
          </div>
        )}
        <div className="topbar-side right" />
      </header>

      <main className="content" key={currency}>
        {view === "home" && <Dashboard month={month} />}
        {view === "transactions" && <CalendarView month={month} />}
        {view === "recurring" && <RecurringView />}
        {view === "settings" && (
          <SettingsView user={user} currency={currency} onCurrency={changeCurrency} onLogout={handleLogout} />
        )}
      </main>

      <nav className="dock" aria-label="Main navigation">
        {VIEWS.map(({ id, label, Icon }) => (
          <button key={id} className={`dock-item ${view === id ? "active" : ""}`} onClick={() => setView(id)}>
            <span className="dock-icon">
              <Icon size={18} strokeWidth={2.2} />
            </span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
