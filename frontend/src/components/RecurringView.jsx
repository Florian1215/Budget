import { useCallback, useEffect, useMemo, useState } from "react";
import { Pause, Play, Plus, Trash2 } from "lucide-react";
import { api } from "../api.js";
import { FREQUENCIES, categoryOptions, formatDate, formatMoney, todayISO } from "../utils.js";
import { CategoryIcon } from "../icons.jsx";
import Modal from "./Modal.jsx";
import TransactionForm from "./TransactionForm.jsx";

function describe(rule) {
  const f = FREQUENCIES.find((x) => x.value === rule.frequency)?.label.toLowerCase();
  return rule.interval > 1 ? `Every ${rule.interval} ${f}s` : `Every ${f}`;
}

const PER_MONTH = { daily: 30.44, weekly: 4.35, monthly: 1, yearly: 1 / 12 };

export default function RecurringView() {
  const [rules, setRules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [r, c] = await Promise.all([api.recurring(), api.categories()]);
      setRules(r);
      setCategories(c);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const options = useMemo(() => categoryOptions(categories), [categories]);

  const run = async (fn) => {
    try {
      await fn();
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggle = (rule) => run(() => api.updateRecurring(rule.id, { active: !rule.active }));
  const remove = (rule) => {
    if (!window.confirm("Delete this recurring rule? Transactions already created are kept.")) return;
    run(() => api.deleteRecurring(rule.id));
  };

  const monthly = (kind) =>
    rules
      .filter((r) => r.active && r.kind === kind && (!r.end_date || r.end_date >= todayISO()))
      .reduce((s, r) => s + (Number(r.amount) * PER_MONTH[r.frequency]) / r.interval, 0);

  return (
    <div className="narrow-page">
      {error && <div className="error">{error}</div>}

      <div className="totals-row card-like">
        <div>
          <span>Income / month</span>
          <strong className="income">≈ {formatMoney(monthly("income"))}</strong>
        </div>
        <div>
          <span>Expense / month</span>
          <strong className="expense">≈ {formatMoney(monthly("expense"))}</strong>
        </div>
      </div>

      <p className="hint">Rules add a transaction automatically on each due date — rent, salary, subscriptions…</p>

      {!options.length && <p className="empty-text">Create a category first, then add recurring transactions.</p>}
      {options.length > 0 && rules.length === 0 && <p className="empty-text">No recurring transaction yet.</p>}

      {rules.length > 0 && (
        <ul className="tx-list group">
          {rules.map((r) => (
            <li key={r.id} className={`tx ${r.active ? "" : "inactive"}`}>
              <CategoryIcon icon={r.category_icon} color={r.category_color} size={36} />
              <div className="tx-main">
                <div className="tx-title">{r.description || r.category_name}</div>
                <div className="tx-sub">
                  {describe(r)}
                  {r.description && ` · ${r.category_name}`}
                  {r.end_date && ` · until ${formatDate(r.end_date)}`}
                </div>
              </div>
              <div className="tx-right">
                <span className={`tx-amount ${r.kind}`}>
                  {r.kind === "expense" ? "-" : "+"}
                  {formatMoney(r.amount)}
                </span>
                <span className="tx-time">
                  {!r.next_date ? "Finished" : r.active ? `Next ${formatDate(r.next_date)}` : "Paused"}
                </span>
              </div>
              <button className="icon-btn" onClick={() => toggle(r)} aria-label={r.active ? "Pause" : "Resume"} title={r.active ? "Pause" : "Resume"}>
                {r.active ? <Pause size={15} /> : <Play size={15} />}
              </button>
              <button className="icon-btn danger" onClick={() => remove(r)} aria-label="Delete rule">
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {options.length > 0 && (
        <button className="fab" onClick={() => setAdding(true)} aria-label="New recurring transaction">
          <Plus size={24} />
        </button>
      )}

      {adding && (
        <Modal title="New recurring transaction" onClose={() => setAdding(false)}>
          <TransactionForm
            options={options}
            defaultDate={todayISO()}
            forceRepeat
            onSaved={() => {
              setAdding(false);
              load();
            }}
          />
        </Modal>
      )}
    </div>
  );
}
