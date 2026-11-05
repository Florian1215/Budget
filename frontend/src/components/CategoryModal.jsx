import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Gauge, Pencil, Plus } from "lucide-react";
import { api } from "../api.js";
import { defaultDateFor, formatMoney, monthLabel, monthRange } from "../utils.js";
import { CategoryIcon } from "../icons.jsx";
import Modal from "./Modal.jsx";
import CategoryForm from "./CategoryForm.jsx";
import LimitBar, { limitState } from "./LimitBar.jsx";
import TransactionForm from "./TransactionForm.jsx";
import TransactionList from "./TransactionList.jsx";

export default function CategoryModal({ category, categories, month, onOpen, onChanged, onClose }) {
  const isSub = Boolean(category.parent);
  const parent = isSub ? categories.find((c) => c.id === category.parent) : null;
  const children = categories.filter((c) => c.parent === category.id);

  const [transactions, setTransactions] = useState([]);
  const [note, setNote] = useState(category.note);
  const [noteSaved, setNoteSaved] = useState(false);
  const [mode, setMode] = useState("view"); // view | edit | new-sub
  const [error, setError] = useState("");

  useEffect(() => {
    setNote(category.note);
    setMode("view");
    setError("");
  }, [category.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadTransactions = useCallback(async () => {
    const list = await api.transactions({
      ...monthRange(month),
      category: category.id,
      include_children: isSub ? undefined : 1,
    });
    setTransactions(list);
  }, [category.id, isSub, month]);

  useEffect(() => {
    loadTransactions().catch((e) => setError(e.message));
  }, [loadTransactions]);

  const refresh = () => {
    loadTransactions();
    onChanged();
  };

  const saveNote = async () => {
    try {
      await api.updateCategory(category.id, { note });
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 1500);
      onChanged();
    } catch (err) {
      setError(err.message);
    }
  };

  const removeCategory = async () => {
    const what = isSub ? "subcategory" : "category";
    const extra = !isSub && children.length ? " and its subcategories" : "";
    if (!window.confirm(`Delete this ${what}${extra}? All its transactions will be deleted too.`)) return;
    try {
      await api.deleteCategory(category.id);
      onChanged();
      if (parent) onOpen(parent.id);
      else onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  const options = [
    { id: category.id, label: isSub ? category.name : `${category.name} (no subcategory)` },
    ...children.map((c) => ({ id: c.id, label: `${category.name} › ${c.name}` })),
  ];
  const monthTotal = transactions.reduce((s, t) => s + Number(t.amount), 0);

  const title =
    mode === "edit" ? (
      `Edit ${isSub ? "subcategory" : "category"}`
    ) : mode === "new-sub" ? (
      `New subcategory in ${category.name}`
    ) : (
      <span className="modal-title">
        {parent && (
          <button className="icon-btn" onClick={() => onOpen(parent.id)} aria-label={`Back to ${parent.name}`}>
            <ChevronLeft size={18} />
          </button>
        )}
        <CategoryIcon icon={category.icon} color={category.color} size={34} />
        <span>
          <span className="modal-title-name">{category.name}</span>
          <span className={`modal-title-sub ${category.kind}`}>
            {parent ? `${parent.name} · ` : ""}
            {formatMoney(monthTotal)} in {monthLabel(month)}
          </span>
        </span>
      </span>
    );

  return (
    <Modal
      wide={mode === "view"}
      title={title}
      onClose={onClose}
      headerExtra={
        mode === "view" && (
          <button className="icon-btn" onClick={() => setMode("edit")} aria-label="Edit category" title="Edit name, icon, color">
            <Pencil size={16} />
          </button>
        )
      }
    >
      {error && <div className="error">{error}</div>}

      {mode === "edit" && (
        <CategoryForm
          category={category}
          onSaved={() => {
            setMode("view");
            onChanged();
          }}
          onCancel={() => setMode("view")}
          onDelete={removeCategory}
        />
      )}

      {mode === "new-sub" && (
        <CategoryForm
          parent={category}
          onSaved={(sub) => {
            onChanged();
            onOpen(sub.id);
          }}
          onCancel={() => setMode("view")}
        />
      )}

      {mode === "view" && (
        <>
          {category.monthly_limit ? (
            <LimitBar spent={monthTotal} limit={category.monthly_limit} onClick={() => setMode("edit")} />
          ) : (
            category.kind === "expense" && (
              <button className="link-btn set-limit" onClick={() => setMode("edit")}>
                <Gauge size={15} /> Set a monthly limit
              </button>
            )
          )}

          <div className="modal-grid">
            <div className="panel">
              <h4>Add {category.kind}</h4>
              <TransactionForm
                key={category.id}
                options={options}
                defaultCategory={category.id}
                defaultDate={defaultDateFor(month)}
                onSaved={refresh}
              />
            </div>

            <div className="side">
              {!isSub && (
                <>
                  <h4>Subcategories</h4>
                  <div className="group compact">
                    {children.map((c) => (
                      <button key={c.id} className="group-row" onClick={() => onOpen(c.id)}>
                        <span className="row-label">
                          <CategoryIcon icon={c.icon} color={c.color} size={26} />
                          {c.name}
                        </span>
                        <span className={`muted row-label ${limitState(Number(c.total), Number(c.monthly_limit)) === "over" ? "expense" : ""}`}>
                          {formatMoney(c.total)}
                          {c.monthly_limit && ` / ${formatMoney(c.monthly_limit)}`} <ChevronRight size={16} />
                        </span>
                      </button>
                    ))}
                    <button className="group-row add-row" onClick={() => setMode("new-sub")}>
                      <span className="row-label">
                        <Plus size={16} /> Add subcategory
                      </span>
                    </button>
                  </div>
                </>
              )}

              <h4>Note</h4>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Add a note about this category…"
              />
              <div className="note-actions">
                {noteSaved && <span className="muted small-text">Saved ✓</span>}
                <button className="btn small" onClick={saveNote} disabled={note === category.note}>
                  Save note
                </button>
              </div>
            </div>
          </div>

          <h4>Transactions</h4>
          <TransactionList transactions={transactions} onDeleted={refresh} empty="No transactions this month." />
        </>
      )}
    </Modal>
  );
}
