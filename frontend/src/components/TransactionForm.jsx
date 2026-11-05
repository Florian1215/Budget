import { useState } from "react";
import { api } from "../api.js";
import { FREQUENCIES } from "../utils.js";

function groupOptions(options) {
  const groups = new Map();
  options.forEach((o) => {
    const g = o.group || "";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(o);
  });
  return [...groups.entries()];
}

/**
 * Form to add a transaction (or a recurring rule when "Repeat" is checked).
 * `options` is a list of { id, label, group? } the user can pick the category from.
 */
export default function TransactionForm({ options, defaultCategory, defaultDate, onSaved, submitLabel = "Add", forceRepeat = false }) {
  const [category, setCategory] = useState(defaultCategory ?? options[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [description, setDescription] = useState("");
  const [repeat, setRepeat] = useState(forceRepeat);
  const [frequency, setFrequency] = useState("monthly");
  const [every, setEvery] = useState(1);
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (repeat) {
        await api.createRecurring({
          category,
          amount,
          description,
          frequency,
          interval: Number(every) || 1,
          start_date: date,
          end_date: endDate || null,
        });
      } else {
        await api.createTransaction({ category, amount, date, description });
      }
      setAmount("");
      setDescription("");
      setRepeat(forceRepeat);
      setEndDate("");
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="form tx-form" onSubmit={submit}>
      <div className="row">
        <label className="grow">
          Amount
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            autoFocus
            placeholder="0.00"
            className="amount-input"
          />
        </label>
        <label className="grow">
          {repeat ? "Start date" : "Date"}
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
      </div>
      {(options.length > 1 || options[0]?.group) && (
        <label>
          Category
          <select value={category} onChange={(e) => setCategory(Number(e.target.value))}>
            {groupOptions(options).map(([group, items]) =>
              group ? (
                <optgroup key={group} label={group}>
                  {items.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
              ) : (
                items.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))
              )
            )}
          </select>
        </label>
      )}
      <label>
        Description <span className="muted">(optional)</span>
        <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={255} />
      </label>

      {!forceRepeat && (
        <label className="checkbox">
          <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} />
          Repeat automatically
        </label>
      )}
      {repeat && (
        <div className="row repeat-row">
          <label>
            Every
            <input type="number" min="1" value={every} onChange={(e) => setEvery(e.target.value)} className="narrow" />
          </label>
          <label className="grow">
            Period
            <select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {`${f.label}${Number(every) > 1 ? "s" : ""}`}
                </option>
              ))}
            </select>
          </label>
          <label className="grow">
            Until <span className="muted">(optional)</span>
            <input type="date" value={endDate} min={date} onChange={(e) => setEndDate(e.target.value)} />
          </label>
        </div>
      )}

      {error && <div className="error">{error}</div>}
      <button className="btn primary block" disabled={saving || !category}>
        {repeat ? "Add recurring" : submitLabel}
      </button>
    </form>
  );
}
