import { useState, useEffect } from "react";
import { INDEXES } from "../data/marketData";
import { TrendingUp, TrendingDown } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { getChartDataWithFallback } from "../api/marketApi";

function calcSentiment(avgChange, advances, total, vixPrice, yieldChange) {
  let score = 0;

  if (avgChange > 0.5)       score += 2;
  else if (avgChange > 0.1)  score += 1;
  else if (avgChange < -0.5) score -= 2;
  else if (avgChange < -0.1) score -= 1;

  const breadth = total > 0 ? advances / total : 0.5;
  if (breadth >= 0.75)      score += 1;
  else if (breadth <= 0.25) score -= 1;

  if (vixPrice != null) {
    if (vixPrice < 15)       score += 1;
    else if (vixPrice > 25)  score -= 2;
    else if (vixPrice > 20)  score -= 1;
  }

  if (yieldChange != null) {
    if (yieldChange > 0.05)       score -= 1;
    else if (yieldChange < -0.05) score += 1;
  }

  let label, color, icon;
  if (score >= 3)       { label = "Risk-On";  color = "#10b981"; icon = <TrendingUp size={14} />; }
  else if (score >= 1)  { label = "Bullish";  color = "#34d399"; icon = <TrendingUp size={14} />; }
  else if (score === 0) { label = "Mixed";    color = "#f59e0b"; icon = null; }
  else if (score >= -2) { label = "Cautious"; color = "#f97316"; icon = <TrendingDown size={14} />; }
  else                  { label = "Risk-Off"; color = "#ef4444"; icon = <TrendingDown size={14} />; }

  const qualifiers = [];
  if (vixPrice != null && vixPrice > 25)         qualifiers.push("High Fear");
  else if (vixPrice != null && vixPrice > 20)    qualifiers.push("Elevated Vol");
  if (yieldChange != null && yieldChange > 0.05) qualifiers.push("Rising Yields");
  if (breadth <= 0.25 && total > 0)              qualifiers.push("Narrow Breadth");

  const display = qualifiers.length > 0 ? `${label} · ${qualifiers.join(" · ")}` : label;
  return { label: display, color, icon, score };
}

export default function MarketSummary({ quotes }) {
  const equityIndexes = INDEXES.filter((i) => i.category === "equity");
  const sectorIndexes = INDEXES.filter((i) => i.category === "sectors");

  // Breadth based on sectors only (for sentiment score)
  const sectorAdvances = sectorIndexes.filter((i) => (quotes[i.symbol]?.change ?? 0) > 0).length;
  const sectorTotal    = sectorIndexes.filter((i) => quotes[i.symbol] != null).length;

  const vix = quotes["^VIX"];
  const tnx = quotes["^TNX"];

  const avgChange = equityIndexes.reduce((sum, i) => sum + (quotes[i.symbol]?.changePct ?? 0), 0) / equityIndexes.length;
  const yieldChange = tnx?.price != null && tnx?.prevClose != null ? tnx.price - tnx.prevClose : null;
  const sentiment = calcSentiment(avgChange, sectorAdvances, sectorTotal, vix?.price ?? null, yieldChange);

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

  // VIX 12M sparkline
  const [vixChart, setVixChart] = useState([]);
  useEffect(() => {
    let cancelled = false;
    getChartDataWithFallback("^VIX", "12M").then((data) => {
      if (!cancelled) setVixChart(data);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="market-summary">
      <div className="summary-pill">
        <span className="summary-label">Market Sentiment</span>
        <span className="summary-value" style={{ color: sentiment.color }}>
          {sentiment.icon} {sentiment.label}
        </span>
      </div>

      <div className="summary-pill summary-pill--vix">
        <span className="summary-label">VIX — Fear Index</span>
        <span className="summary-value" style={{ color: vixColor }}>{vixLabel}</span>
        {vixChart.length > 0 && (
          <div className="summary-sparkline">
            <ResponsiveContainer width="100%" height={44}>
              <AreaChart data={vixChart} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="vix-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={vixColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={vixColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis domain={["auto", "auto"]} hide />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const { date, price } = payload[0].payload;
                    return (
                      <div className="card-spark-tooltip">
                        <div className="card-spark-date">{date}</div>
                        <div>{price.toFixed(2)}</div>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={vixColor}
                  strokeWidth={1.5}
                  fill="url(#vix-grad)"
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="summary-pill">
        <span className="summary-label">10Y Yield</span>
        <span className="summary-value" style={{ color: yieldColor }}>{yieldDisplay}</span>
      </div>
    </div>
  );
}
