export default function SectorBreadthCard({ indexes, quotes }) {
  const withQuotes = indexes.filter((i) => quotes[i.symbol] != null);
  const advances = withQuotes.filter((i) => (quotes[i.symbol]?.change ?? 0) > 0);
  const declines = withQuotes.filter((i) => (quotes[i.symbol]?.change ?? 0) < 0);
  const flat     = withQuotes.filter((i) => (quotes[i.symbol]?.change ?? 0) === 0);
  const total    = withQuotes.length;

  const advPct = total > 0 ? (advances.length / total) * 100 : 0;
  const decPct = total > 0 ? (declines.length / total) * 100 : 0;

  const sentiment =
    advances.length >= 9 ? { label: "Broad Rally",    color: "#10b981" } :
    advances.length >= 7 ? { label: "Mostly Higher",  color: "#34d399" } :
    advances.length >= 5 ? { label: "Mixed",          color: "#f59e0b" } :
    advances.length >= 3 ? { label: "Mostly Lower",   color: "#f97316" } :
                           { label: "Broad Selloff",  color: "#ef4444" };

  // Top advancer and decliner
  const sorted = [...withQuotes].sort(
    (a, b) => (quotes[b.symbol]?.changePct ?? 0) - (quotes[a.symbol]?.changePct ?? 0)
  );
  const topUp   = sorted[0];
  const topDown = sorted[sorted.length - 1];

  return (
    <div className="sector-breadth-card">
      <div className="sb-header">
        <span className="sb-title">Sector Breadth</span>
        <span className="sb-sentiment" style={{ color: sentiment.color }}>{sentiment.label}</span>
      </div>

      <div className="sb-counts">
        <span className="sb-up">{advances.length}↑</span>
        <span className="sb-sep">/</span>
        <span className="sb-down">{declines.length}↓</span>
        {flat.length > 0 && <span className="sb-flat">{flat.length}–</span>}
        <span className="sb-total">of {total}</span>
      </div>

      {/* Progress bar */}
      <div className="sb-bar">
        <div className="sb-bar-up"   style={{ width: `${advPct}%` }} />
        <div className="sb-bar-down" style={{ width: `${decPct}%` }} />
      </div>

      {/* Best / worst sector */}
      {topUp && topDown && (
        <div className="sb-movers">
          <div className="sb-mover sb-mover-up">
            <span className="sb-mover-label">Best</span>
            <span className="sb-mover-sym">{topUp.short}</span>
            <span className="sb-mover-val">+{(quotes[topUp.symbol]?.changePct ?? 0).toFixed(2)}%</span>
          </div>
          <div className="sb-mover sb-mover-down">
            <span className="sb-mover-label">Worst</span>
            <span className="sb-mover-sym">{topDown.short}</span>
            <span className="sb-mover-val">{(quotes[topDown.symbol]?.changePct ?? 0).toFixed(2)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
