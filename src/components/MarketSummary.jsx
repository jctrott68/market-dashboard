import { INDEXES } from "../data/marketData";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function MarketSummary({ quotes }) {
  const equityIndexes = INDEXES.filter((i) => i.category === "equity");
  const advances = equityIndexes.filter((i) => (quotes[i.symbol]?.change ?? 0) > 0).length;
  const declines = equityIndexes.filter((i) => (quotes[i.symbol]?.change ?? 0) < 0).length;
  const vix = quotes["^VIX"];
  const tnx = quotes["^TNX"];

  const vixLevel = !vix ? null
    : vix.price > 25 ? { label: "High Fear", color: "#ef4444" }
    : vix.price > 18 ? { label: "Elevated", color: "#f59e0b" }
    : { label: "Low Volatility", color: "#10b981" };

  const avgChange = equityIndexes.reduce((sum, i) => sum + (quotes[i.symbol]?.changePct ?? 0), 0) / equityIndexes.length;
  const sentiment = avgChange > 0.5 ? { label: "Risk-On", color: "#10b981", icon: <TrendingUp size={14} /> }
    : avgChange < -0.5 ? { label: "Risk-Off", color: "#ef4444", icon: <TrendingDown size={14} /> }
    : { label: "Mixed", color: "#f59e0b", icon: null };

  return (
    <div className="market-summary">
      <div className="summary-pill">
        <span className="summary-label">Market Sentiment</span>
        <span className="summary-value" style={{ color: sentiment.color }}>
          {sentiment.icon} {sentiment.label}
        </span>
      </div>
      <div className="summary-pill">
        <span className="summary-label">Advances / Declines</span>
        <span className="summary-value">
          <span style={{ color: "#10b981" }}>{advances}↑</span>
          {" / "}
          <span style={{ color: "#ef4444" }}>{declines}↓</span>
        </span>
      </div>
      <div className="summary-pill">
        <span className="summary-label">VIX</span>
        <span className="summary-value" style={{ color: vixLevel?.color ?? "#94a3b8" }}>
          {vix ? `${vix.price.toFixed(2)} — ${vixLevel?.label}` : "—"}
        </span>
      </div>
      <div className="summary-pill">
        <span className="summary-label">10Y Yield</span>
        <span className="summary-value">{tnx ? `${tnx.price.toFixed(3)}%` : "—"}</span>
      </div>
    </div>
  );
}
