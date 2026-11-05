import { formatMoney } from "../utils.js";

/** ok below 80 %, warn from 80 %, over above 100 %. */
export function limitState(spent, limit) {
  if (!limit) return null;
  const ratio = spent / limit;
  return ratio > 1 ? "over" : ratio >= 0.8 ? "warn" : "ok";
}

/** "Spent / Left" strip with a progress fill, as shown in the category popup. */
export default function LimitBar({ spent, limit, onClick, label }) {
  const s = Number(spent || 0);
  const l = Number(limit);
  const pct = Math.round((s / l) * 100);
  const left = l - s;
  const state = limitState(s, l);
  const Tag = onClick ? "button" : "div";

  return (
    <Tag className={`limit-bar ${state}`} onClick={onClick} type={onClick ? "button" : undefined}>
      <span className="limit-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
      <span className="limit-side">
        <strong>{formatMoney(s)}</strong>
        <small>{pct}% Spent</small>
      </span>
      {label && <span className="limit-label">{label}</span>}
      <span className="limit-side right">
        <strong>{left >= 0 ? formatMoney(left) : `${formatMoney(-left)} over`}</strong>
        <small>{left >= 0 ? `${Math.max(100 - pct, 0)}% Left of ${formatMoney(l)}` : `Limit ${formatMoney(l)}`}</small>
      </span>
    </Tag>
  );
}

/** Thin progress line for category tiles. */
export function TileProgress({ spent, limit }) {
  const pct = Math.min((Number(spent || 0) / Number(limit)) * 100, 100);
  return (
    <span className={`tile-progress ${limitState(Number(spent || 0), Number(limit))}`}>
      <span style={{ width: `${pct}%` }} />
    </span>
  );
}
