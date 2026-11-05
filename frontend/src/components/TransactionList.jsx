import { Pencil, Repeat, Trash2 } from "lucide-react";
import { api } from "../api.js";
import { formatDayHeader, formatMoney, formatTime } from "../utils.js";
import { CategoryIcon } from "../icons.jsx";

function groupByDay(transactions) {
  const groups = [];
  transactions.forEach((t) => {
    let g = groups[groups.length - 1];
    if (!g || g.date !== t.date) {
      g = { date: t.date, items: [], income: 0, expense: 0 };
      groups.push(g);
    }
    g.items.push(t);
    g[t.kind] += Number(t.amount);
  });
  return groups;
}

/** Transactions grouped by day, newest first (the API already orders them). */
/** `onEdit(tx)`, when given, adds an edit button next to delete. */
export default function TransactionList({ transactions, onDeleted, onEdit, empty = "No transactions." }) {
  const remove = async (tx) => {
    if (!window.confirm("Delete this transaction?")) return;
    await api.deleteTransaction(tx.id);
    onDeleted?.();
  };

  if (!transactions.length) return <p className="empty-text">{empty}</p>;

  return (
    <div className="day-groups">
      {groupByDay(transactions).map((g) => (
        <section key={g.date} className="day-group">
          <header className="day-group-header">
            <span>{formatDayHeader(g.date)}</span>
            <span className="day-group-totals">
              {g.income > 0 && (
                <span>
                  IN <span className="income">{formatMoney(g.income)}</span>
                </span>
              )}
              {g.expense > 0 && (
                <span>
                  OUT <span className="expense">{formatMoney(g.expense)}</span>
                </span>
              )}
            </span>
          </header>
          <ul className="tx-list">
            {g.items.map((tx) => (
              <li key={tx.id} className="tx">
                <CategoryIcon icon={tx.category_icon} color={tx.category_color} size={36} />
                <div className="tx-main">
                  <div className="tx-title">
                    {tx.category_name}
                    {tx.recurring && <Repeat size={12} className="muted" aria-label="Recurring" />}
                  </div>
                  {(tx.tag_name || tx.description) && (
                    <div className="tx-sub">
                      {tx.tag_name && <span className="tag-pill">{tx.tag_name}</span>}
                      {tx.description}
                    </div>
                  )}
                </div>
                <div className="tx-right">
                  <span className={`tx-amount ${tx.kind}`}>
                    {tx.kind === "expense" ? "-" : "+"}
                    {formatMoney(tx.amount)}
                  </span>
                  <span className="tx-time">{formatTime(tx.created_at)}</span>
                </div>
                <div className="tx-actions">
                  {onEdit && (
                    <button className="icon-btn" onClick={() => onEdit(tx)} aria-label="Edit transaction" title="Edit">
                      <Pencil size={15} />
                    </button>
                  )}
                  <button className="icon-btn danger" onClick={() => remove(tx)} aria-label="Delete transaction" title="Delete">
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
