import { useState } from "react";
import { api } from "../api.js";
import { COLORS } from "../utils.js";
import { CATEGORY_ICONS, CategoryIcon } from "../icons.jsx";
import Modal from "./Modal.jsx";

export function ColorPicker({ value, onChange }) {
  return (
    <div className="color-picker">
      {COLORS.map((c) => (
        <button
          type="button"
          key={c}
          className={`color ${value === c ? "selected" : ""}`}
          style={{ background: c }}
          onClick={() => onChange(c)}
          aria-label={`Color ${c}`}
        />
      ))}
    </div>
  );
}

export function IconPicker({ value, color, onChange }) {
  return (
    <div className="icon-picker">
      {Object.entries(CATEGORY_ICONS).map(([name, Icon]) => (
        <button
          type="button"
          key={name}
          className={`icon-choice ${value === name ? "selected" : ""}`}
          style={{ "--cat": color }}
          onClick={() => onChange(name)}
          aria-label={name}
          title={name}
        >
          <Icon size={18} strokeWidth={2.2} />
        </button>
      ))}
    </div>
  );
}

/** Create (pass `kind`) or edit (pass `category`) a category. */
export default function CategoryForm({ category, kind, onSaved, onCancel, onDelete }) {
  const editing = Boolean(category);
  const [name, setName] = useState(category?.name ?? "");
  const [icon, setIcon] = useState(category?.icon ?? "tag");
  const [color, setColor] = useState(category?.color ?? (kind === "income" ? COLORS[4] : COLORS[0]));
  const [note, setNote] = useState(category?.note ?? "");
  const [limit, setLimit] = useState(category?.monthly_limit ?? "");
  const isExpense = (category?.kind ?? kind) === "expense";
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const data = { name, icon, color, monthly_limit: isExpense && limit !== "" ? limit : null };
      const saved = editing
        ? await api.updateCategory(category.id, data)
        : await api.createCategory({ ...data, note, kind });
      onSaved(saved);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <form className="form category-form" onSubmit={submit}>
      <div className="preview">
        <div className="tile preview-tile" style={{ "--cat": color }}>
          <span className="tile-name">{name || "Name"}</span>
          <CategoryIcon icon={icon} color={color} size={36} />
        </div>
        <label className="grow">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus maxLength={100} />
        </label>
      </div>

      <div className="field">
        <span className="field-label">Icon</span>
        <IconPicker value={icon} color={color} onChange={setIcon} />
      </div>

      <div className="field">
        <span className="field-label">Color</span>
        <ColorPicker value={color} onChange={setColor} />
      </div>

      {isExpense && (
        <label>
          Monthly limit <span className="muted">(optional)</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            placeholder="No limit"
          />
        </label>
      )}

      {!editing && (
        <label>
          Note <span className="muted">(optional)</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </label>
      )}

      {error && <div className="error">{error}</div>}
      <div className="form-actions">
        {onDelete && (
          <button type="button" className="btn danger-outline" onClick={onDelete}>
            Delete
          </button>
        )}
        <button type="button" className="btn ghost" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn primary" disabled={saving}>
          {editing ? "Save" : "Create"}
        </button>
      </div>
    </form>
  );
}

export function NewCategoryModal({ kind, onClose, onSaved }) {
  return (
    <Modal title={`New ${kind} category`} onClose={onClose}>
      <CategoryForm kind={kind} onSaved={onSaved} onCancel={onClose} />
    </Modal>
  );
}
