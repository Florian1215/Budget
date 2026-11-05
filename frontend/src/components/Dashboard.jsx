import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { api } from "../api.js";
import { formatMoney, monthRange } from "../utils.js";
import { CategoryIcon } from "../icons.jsx";
import CategoryModal from "./CategoryModal.jsx";
import { NewCategoryModal } from "./CategoryForm.jsx";
import LimitBar, { TileProgress, limitState } from "./LimitBar.jsx";

const SECTIONS = [
  { kind: "expense", title: "Expense" },
  { kind: "income", title: "Income" },
];

export default function Dashboard({ month }) {
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);
  const [creating, setCreating] = useState(null);
  const [collapsed, setCollapsed] = useState({});

  const range = useMemo(() => monthRange(month), [month]);

  const load = useCallback(async () => {
    try {
      const [cats, sum] = await Promise.all([api.categories(range), api.summary(range)]);
      setCategories(cats);
      setSummary(sum);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  const openCategory = categories.find((c) => c.id === openId);

  return (
    <>
      {error && <div className="error">{error}</div>}

      {SECTIONS.map(({ kind, title }) => {
        const items = categories.filter((c) => c.kind === kind);
        const isCollapsed = collapsed[kind];
        return (
          <section key={kind} className="home-section">
            <button className="section-toggle" onClick={() => setCollapsed((s) => ({ ...s, [kind]: !s[kind] }))}>
              {title} <strong>{formatMoney(summary?.[kind])}</strong>
              <span className={`chevron ${isCollapsed ? "closed" : ""}`}>
                <ChevronDown size={14} strokeWidth={2.5} />
              </span>
            </button>

            {!isCollapsed && kind === "expense" && summary?.limit && (
              <div className="total-limit" title="Sum of your category limits">
                <LimitBar spent={summary.expense} limit={summary.limit} label="Total limit" />
              </div>
            )}

            {!isCollapsed && (
              <div className="tile-grid">
                {items.map((c) => (
                  <button key={c.id} className="tile" style={{ "--cat": c.color }} onClick={() => setOpenId(c.id)}>
                    <span className="tile-name">{c.name}</span>
                    <CategoryIcon icon={c.icon} color={c.color} size={36} />
                    <span className={`tile-amount ${limitState(Number(c.total), Number(c.monthly_limit)) === "over" ? "expense" : ""}`}>
                      {formatMoney(c.total)}
                    </span>
                    {c.monthly_limit && <TileProgress spent={c.total} limit={c.monthly_limit} />}
                    {c.note && <span className="tile-note" title={c.note} />}
                  </button>
                ))}
                <button className="tile tile-add" onClick={() => setCreating(kind)} aria-label={`New ${kind} category`}>
                  <Plus size={22} />
                  <span>New</span>
                </button>
              </div>
            )}
          </section>
        );
      })}

      {summary && (
        <p className="balance-line">
          Balance{" "}
          <strong className={Number(summary.balance) < 0 ? "expense" : "income"}>{formatMoney(summary.balance)}</strong>
        </p>
      )}

      {creating && (
        <NewCategoryModal
          kind={creating}
          onClose={() => setCreating(null)}
          onSaved={() => {
            setCreating(null);
            load();
          }}
        />
      )}

      {openCategory && (
        <CategoryModal
          category={openCategory}
          month={month}
          onOpen={setOpenId}
          onChanged={load}
          onClose={() => setOpenId(null)}
        />
      )}
    </>
  );
}
