import { INDEXES } from "../data/marketData";
import { TrendingUp, TrendingDown } from "lucide-react";

function calcSentiment(avgChange, advances, total, vixPrice, yieldChange) {
  let score = 0;

  // Equity momentum (weight: 2)
  if (avgChange > 0.5)       score += 2;
  else if (avgChange > 0.1)  score += 1;
  else if (avgChange < -0.5) score -= 2;
  else if (avgChange < -0.1) score -= 1;

  // Breadth — how many equity indexes are advancing
  const breadth = total > 0 ? advances / total : 0.5;
  if (breadth >= 0.75)      score += 1;
  else if (breadth <= 0.25) score -= 1;

  // VIX — fear gauge
  if (vixPrice != null) {
    if (vixPrice < 15)       score += 1;
    else if (vixPrice > 25)  score -= 2;
    else if (vixPrice > 20)  score -= 1;
  }

  // 10Y yield direction — rising yields pressure equities
  if (yieldChange != null) {
    if (yieldChange > 0.05)       score -= 1;
    else if (yieldChange < -0.05) score += 1;
  }

  // Primary label
  let label, color, icon;
  if (score >= 3)       { label = "Risk-On";   color = "#10b981"; icon = <TrendingUp size={14} />; }
  else if (score >= 1)  { label = "Bullish";   color = "#34d399"; icon = <TrendingUp size={14} />; }
  else if (score === 0) { label = "Mixed";     color = "#f59e0b"; icon = null; }
  else if (score >= -2) { label = "Cautious";  color = "#f97316"; icon = <TrendingDown size={14} />; }
  else                  { label = "Risk-Off";  color = "#ef4444"; icon = <TrendingDown size={14} />; }

  // Qualifiers
  const qualifiers = [];
  if (vixPrice != null && vixPrice > 25)         qualifiers.push("High Fear");
  else if (vixPrice != null && vixPrice > 20)    qualifiers.push("Elevated Vol");
  if (yieldChange != null && yieldChange > 0.05) qualifiers.push("Rising Yields");
  if (breadth <= 0.25 && total > 0)              qualifiers.push("Narrow Breadth");

  const display = qualifiers.length > 0 ? `${label} · ${qualifiers.join(" · ")}` : label;

  return { label: display, color, icon, score };
}

export default function MarketSummary({ quotes, myStocks = [], stockQuotes = {} }) {
  const equityIndexes = INDEXES.filter((i) => i.category === "equity");

  // Combine equity indexes + My Stocks for advances/declines
  const indexAdvances = equityIndexes.filter((i) => (quotes[i.symbol]?.change ?? 0) > 0).length;
  const indexDeclines = equityIndexes.filter((i) => (quotes[i.symbol]?.change ?? 0) < 0).length;
  const stockAdvances = myStocks.filter((s) => (stockQuotes[s.symbol]?.change ?? 0) > 0).length;
  const stockDeclines = myStocks.filter((s) => (stockQuotes[s.symbol]?.change ?? 0) < 0).length;
  const advances = indexAdvances + stockAdvances;
  const declines = indexDeclines + stockDeclines;
  const total = equityIndexes.length + myStocks.filter((s) => stockQuotes[s.symbol] != null).length;

  const vix = quotes["^VIX"];
  const tnx = quotes["^TNX"];

  const avgChange = equityIndexes.reduce((sum, i) => sum + (quotes[i.symbol]?.changePct ?? 0), 0) / equityIndexes.length;
  const yieldChange = tnx?.price != null && tnx?.prevClose != null ? tnx.price - tnx.prevClose : null;

  const sentiment = calcSentiment(avgChange, advances, total, vix?.price ?? null, yieldChange);

  const vixColor = !vix ? "#94a3b8"
    : vix.price > 25 ? "#ef4444"
    : vix.price > 20 ? "#f97316"
    : vix.price > 15 ? "#f59e0b"
    : "#10b981";

  const vixLabel = !vix ? "—"
    : vix.price > 25 ? `${vix.price.toFixed(2)} — High Fear`
    : vix.price > 20 ? `${vix.price.toFixed(2)} — Elevated`
    : vix.price > 15 ? `${vix.price.toFixed(2)} — Moderate`
    : `${vix.price.toFixed(2)} — Calm`;

  const yieldDisplay = tnx
    ? `${tnx.price.toFixed(3)}% ${yieldChange != null ? (yieldChange >= 0 ? `▲${yieldChange.toFixed(3)}` : `▼${Math.abs(yieldChange).toFixed(3)}`) : ""}`
    : "—";
  const yieldColor = yieldChange == null ? "#94a3b8" : yieldChange > 0.05 ? "#ef4444" : yieldChange < -0.05 ? "#10b981" : "#94a3b8";

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
          {myStocks.length > 0 && <span style={{ color: "var(--text-muted)", fontSize: "11px", marginLeft: "4px" }}>of {total}</span>}
        </span>
      </div>
      <div className="summary-pill">
        <span className="summary-label">VIX</span>
        <span className="summary-value" style={{ color: vixColor }}>{vixLabel}</span>
      </div>
      <div className="summary-pill">
        <span className="summary-label">10Y Yield</span>
        <span className="summary-value" style={{ color: yieldColor }}>{yieldDisplay}</span>
      </div>
    </div>
  );
}
