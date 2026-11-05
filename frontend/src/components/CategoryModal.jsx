import { useCallback, useEffect, useMemo, useState } from "react";
import { Gauge, Pencil, Plus, X } from "lucide-react";
import { api } from "../api.js";
import { defaultDateFor, formatMoney, monthLabel, monthRange } from "../utils.js";
import { CategoryIcon } from "../icons.jsx";
import Modal from "./Modal.jsx";
import CategoryForm from "./CategoryForm.jsx";
import LimitBar from "./LimitBar.jsx";
import TransactionForm from "./TransactionForm.jsx";
import TransactionList from "./TransactionList.jsx";

export default function CategoryModal({ category, month, onChanged, onClose }) {
  const [transactions, setTransactions] = useState([]);
  const [note, setNote] = useState(category.note);
  const [noteSaved, setNoteSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [filterTag, setFilterTag] = useState(null);
  const [managingTags, setManagingTags] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [error, setError] = useState("");

  const loadTransactions = useCallback(async () => {
    setTransactions(await api.transactions({ ...monthRange(month), category: category.id }));
  }, [category.id, month]);

  useEffect(() => {
    loadTransactions().catch((e) => setError(e.message));
  }, [loadTransactions]);

  const refresh = () => {
    loadTransactions();
    onChanged();
  };

  const run = async (fn) => {
    setError("");
    try {
      await fn();
    } catch (err) {
      setError(err.message);
    }
  };

  const saveNote = () =>
    run(async () => {
      await api.updateCategory(category.id, { note });
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 1500);
      onChanged();
    });

  const addTag = (e) => {
    e.preventDefault();
    run(async () => {
      await api.createTag({ category: category.id, name: newTag });
      setNewTag("");
      onChanged();
    });
  };

  const removeTag = (tag) => {
    if (!window.confirm(`Delete the tag "${tag.name}"? Its transactions are kept, without tag.`)) return;
    run(async () => {
      await api.deleteTag(tag.id);
      if (filterTag === tag.id) setFilterTag(null);
      refresh();
    });
  };

  const removeCategory = () => {
    if (!window.confirm("Delete this category? All its transactions will be deleted too.")) return;
    run(async () => {
      await api.deleteCategory(category.id);
      onChanged();
      onClose();
    });
  };

  const monthTotal = transactions.reduce((s, t) => s + Number(t.amount), 0);
  const tagTotals = useMemo(() => {
    const totals = {};
    transactions.forEach((t) => {
      if (t.tag) totals[t.tag] = (totals[t.tag] || 0) + Number(t.amount);
    });
    return totals;
  }, [transactions]);
  const visible = filterTag ? transactions.filter((t) => t.tag === filterTag) : transactions;

  const title = editing ? (
    "Edit category"
  ) : (
    <span className="modal-title">
      <CategoryIcon icon={category.icon} color={category.color} size={34} />
      <span>
        <span className="modal-title-name">{category.name}</span>
        <span className={`modal-title-sub ${category.kind}`}>
          {formatMoney(monthTotal)} in {monthLabel(month)}
        </span>
      </span>
    </span>
  );

  return (
    <Modal
      wide={!editing}
      title={title}
      onClose={onClose}
      headerExtra={
        !editing && (
          <button className="icon-btn" onClick={() => setEditing(true)} aria-label="Edit category" title="Edit name, icon, color, limit">
            <Pencil size={16} />
          </button>
        )
      }
    >
      {error && <div className="error">{error}</div>}

      {editing ? (
        <CategoryForm
          category={category}
          onSaved={() => {
            setEditing(false);
            onChanged();
          }}
          onCancel={() => setEditing(false)}
          onDelete={removeCategory}
        />
      ) : (
        <>
          {category.monthly_limit ? (
            <LimitBar spent={monthTotal} limit={category.monthly_limit} onClick={() => setEditing(true)} />
          ) : (
            category.kind === "expense" && (
              <button className="link-btn set-limit" onClick={() => setEditing(true)}>
                <Gauge size={15} /> Set a monthly limit
              </button>
            )
          )}

          <div className="modal-grid">
            <div className="panel">
              <h4>Add {category.kind}</h4>
              <TransactionForm
                key={category.id}
                categories={[category]}
                defaultCategory={category.id}
                lockCategory
                defaultDate={defaultDateFor(month)}
                onSaved={() => {
                  onChanged();
                  onClose();
                }}
              />
            </div>

            <div className="side">
              <div className="side-header">
                <h4>Tags</h4>
                {category.tags.length > 0 && (
                  <button className="link-btn small-text" onClick={() => setManagingTags((v) => !v)}>
                    {managingTags ? "Done" : "Manage"}
                  </button>
                )}
              </div>
              <div className="chips">
                {category.tags.map((t) => (
                  <span key={t.id} className={`chip ${filterTag === t.id ? "active" : ""}`}>
                    <button
                      className="chip-main"
                      onClick={() => setFilterTag((f) => (f === t.id ? null : t.id))}
                      title="Show only this tag"
                    >
                      {t.name}
                      {tagTotals[t.id] > 0 && <span className="chip-amount">{formatMoney(tagTotals[t.id])}</span>}
                    </button>
                    {managingTags && (
                      <button className="chip-remove" onClick={() => removeTag(t)} aria-label={`Delete tag ${t.name}`}>
                        <X size={12} />
                      </button>
                    )}
                  </span>
                ))}
                {category.tags.length === 0 && <span className="muted small-text">No tags yet.</span>}
              </div>
              <form className="inline-form" onSubmit={addTag}>
                <input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="New tag (e.g. Lunch)" maxLength={50} required />
                <button className="btn small" aria-label="Add tag">
                  <Plus size={16} />
                </button>
              </form>

              <h4>Note</h4>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Add a note about this category…" />
              <div className="note-actions">
                {noteSaved && <span className="muted small-text">Saved ✓</span>}
                <button className="btn small" onClick={saveNote} disabled={note === category.note}>
                  Save note
                </button>
              </div>
            </div>
          </div>

          <h4>
            Transactions
            {filterTag && (
              <button className="filter-chip inline" onClick={() => setFilterTag(null)}>
                {category.tags.find((t) => t.id === filterTag)?.name} <X size={12} />
              </button>
            )}
          </h4>
          <TransactionList
            transactions={visible}
            onDeleted={refresh}
            empty={filterTag ? "No transactions with this tag this month." : "No transactions this month."}
          />
        </>
      )}
    </Modal>
  );
}
