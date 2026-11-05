import { useState } from "react";
import { api } from "../api.js";
import { FREQUENCIES, categoryOptions } from "../utils.js";

/**
 * Add a transaction (or a recurring rule when "Repeat" is checked), or edit `transaction` when given.
 * `categories` are full category objects (with their `tags`).
 * `lockCategory` hides the category picker (used inside a category popup).
 */
export default function TransactionForm({
  categories,
  defaultCategory,
  lockCategory = false,
  defaultDate,
  onSaved,
  submitLabel = "Save",
  forceRepeat = false,
  transaction = null,
}) {
  const editing = Boolean(transaction);
  const [category, setCategory] = useState(
    transaction?.category ?? defaultCategory ?? categoryOptions(categories)[0]?.id ?? ""
  );
  const [tag, setTag] = useState(transaction?.tag ?? null);
  const [amount, setAmount] = useState(transaction?.amount ?? "");
  const [date, setDate] = useState(transaction?.date ?? defaultDate);
  const [description, setDescription] = useState(transaction?.description ?? "");
  const [repeat, setRepeat] = useState(forceRepeat);
  const [frequency, setFrequency] = useState("monthly");
  const [every, setEvery] = useState(1);
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const tags = categories.find((c) => c.id === category)?.tags || [];
  const options = categoryOptions(categories);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (editing) {
        await api.updateTransaction(transaction.id, { category, tag, amount, date, description });
        onSaved?.();
        return;
      }
      if (repeat) {
        await api.createRecurring({
          category,
          tag,
          amount,
          description,
          frequency,
          interval: Number(every) || 1,
          start_date: date,
          end_date: endDate || null,
        });
      } else {
        await api.createTransaction({ category, tag, amount, date, description });
      }
      setAmount("");
      setDescription("");
      setTag(null);
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

      {!lockCategory && (
        <label>
          Category
          <select
            value={category}
            onChange={(e) => {
              setCategory(Number(e.target.value));
              setTag(null);
            }}
          >
            {["Expenses", "Income"].map((group) => {
              const items = options.filter((o) => o.group === group);
              return (
                items.length > 0 && (
                  <optgroup key={group} label={group}>
                    {items.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </optgroup>
                )
              );
            })}
          </select>
        </label>
      )}

      {tags.length > 0 && (
        <div className="field">
          <span className="field-label">Tag</span>
          <div className="chips">
            {tags.map((t) => (
              <button
                type="button"
                key={t.id}
                className={`chip selectable ${tag === t.id ? "active" : ""}`}
                onClick={() => setTag((cur) => (cur === t.id ? null : t.id))}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <label>
        Description <span className="muted">(optional)</span>
        <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={255} />
      </label>

      {!forceRepeat && !editing && (
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
