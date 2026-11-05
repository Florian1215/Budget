import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { api } from "../api.js";
import { categoryOptions, defaultDateFor, formatDayHeader, formatMoney, monthRange, toISO, todayISO } from "../utils.js";
import Modal from "./Modal.jsx";
import TransactionForm from "./TransactionForm.jsx";
import TransactionList from "./TransactionList.jsx";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const compact = (v) => formatMoney(v).replace(/[.,]00(?=\D*$)/, "");

export default function CalendarView({ month }) {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const range = useMemo(() => monthRange(month), [month]);

  const load = useCallback(async () => {
    try {
      const [tx, cats] = await Promise.all([api.transactions(range), api.categories()]);
      setTransactions(tx);
      setCategories(cats);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, [range]);

  useEffect(() => {
    load();
    setSelected(null);
  }, [load]);

  const byDay = useMemo(() => {
    const map = {};
    transactions.forEach((t) => {
      const d = (map[t.date] ||= { income: 0, expense: 0 });
      d[t.kind] += Number(t.amount);
    });
    return map;
  }, [transactions]);

  // Six-ish rows, Monday first, padded with the neighbouring months' days.
  const cells = useMemo(() => {
    const y = month.getFullYear();
    const m = month.getMonth();
    const lead = (new Date(y, m, 1).getDay() + 6) % 7;
    const days = new Date(y, m + 1, 0).getDate();
    const total = Math.ceil((lead + days) / 7) * 7;
    return Array.from({ length: total }, (_, i) => {
      const d = new Date(y, m, i - lead + 1);
      return { iso: toISO(d), day: d.getDate(), inMonth: d.getMonth() === m };
    });
  }, [month]);

  const totals = useMemo(
    () =>
      transactions.reduce(
        (acc, t) => ({ ...acc, [t.kind]: acc[t.kind] + Number(t.amount) }),
        { income: 0, expense: 0 }
      ),
    [transactions]
  );

  const options = useMemo(() => categoryOptions(categories), [categories]);
  const today = todayISO();
  const visible = selected ? transactions.filter((t) => t.date === selected) : transactions;

  return (
    <>
      {error && <div className="error">{error}</div>}

      <div className="calendar-card">
        <div className="calendar">
          {WEEKDAYS.map((w) => (
            <div key={w} className="weekday">
              {w}
            </div>
          ))}
          {cells.map(({ iso, day, inMonth }) => {
            const d = byDay[iso];
            return (
              <button
                key={iso}
                disabled={!inMonth}
                className={`day ${inMonth ? "" : "outside"} ${iso === selected ? "selected" : ""} ${iso === today ? "today" : ""}`}
                onClick={() => setSelected((s) => (s === iso ? null : iso))}
              >
                <span className="day-num">{day}</span>
                {d?.income > 0 && <span className="day-amt income">{compact(d.income)}</span>}
                {d?.expense > 0 && <span className="day-amt expense">{compact(d.expense)}</span>}
              </button>
            );
          })}
        </div>

        <div className="totals-row">
          <div>
            <span>Income</span>
            <strong className="income">{formatMoney(totals.income)}</strong>
          </div>
          <div>
            <span>Expense</span>
            <strong className="expense">{formatMoney(totals.expense)}</strong>
          </div>
          <div>
            <span>Balance</span>
            <strong>{formatMoney(totals.income - totals.expense)}</strong>
          </div>
        </div>
      </div>

      {selected && (
        <div className="filter-chip-row">
          <button className="filter-chip" onClick={() => setSelected(null)}>
            {formatDayHeader(selected)} <X size={14} />
          </button>
        </div>
      )}

      <TransactionList
        transactions={visible}
        onDeleted={load}
        empty={selected ? "Nothing on this day." : "No transactions this month."}
      />

      {options.length > 0 && (
        <button className="fab" onClick={() => setAdding(true)} aria-label="Add transaction">
          <Plus size={24} />
        </button>
      )}

      {adding && (
        <Modal title="New transaction" onClose={() => setAdding(false)}>
          <TransactionForm
            options={options}
            defaultDate={selected || defaultDateFor(month)}
            onSaved={() => {
              setAdding(false);
              load();
            }}
          />
        </Modal>
      )}
    </>
  );
}
