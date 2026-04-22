import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { getChartDataWithFallback } from "../api/marketApi";

const CATEGORY_COLORS = {
  equity: "#3b82f6",
  sectors: "#6366f1",
  bonds: "#8b5cf6",
  volatility: "#f59e0b",
  commodities: "#10b981",
  crypto: "#f97316",
  fx: "#06b6d4",
};

function formatPrice(price, symbol) {
  if (symbol === "^TNX" || symbol === "^TYX") return `${price.toFixed(3)}%`;
  if (symbol === "^VIX") return price.toFixed(2);
  if (symbol === "BTC-USD") return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (price > 10000) return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (price > 1000) return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${price.toFixed(2)}`;
}

export default function IndexCard({ index, quote, onClick, isSelected, loading }) {
  const { symbol, name, short, category } = index;
  const { price, change, changePct } = quote;
  const isUp = change >= 0;
  const isFlat = Math.abs(changePct) < 0.01;
  const color = CATEGORY_COLORS[category];

  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    let cancelled = false;
    getChartDataWithFallback(symbol, "12M").then((data) => {
      if (!cancelled) setChartData(data);
    });
    return () => { cancelled = true; };
  }, [symbol]);

  return (
    <button
      onClick={() => onClick(index)}
      className={`index-card ${isSelected ? "selected" : ""}`}
      style={{ "--accent": color }}
    >
      <div className="card-header">
        <span className="card-symbol">{short}</span>
        <span className="card-category">{category}</span>
      </div>
      <div className="card-name">{name}</div>
      <div className="card-price">{formatPrice(price, symbol)}</div>
      <div className={`card-change ${isUp ? "up" : isFlat ? "flat" : "down"}`}>
        {isFlat ? (
          <Minus size={12} />
        ) : isUp ? (
          <TrendingUp size={12} />
        ) : (
          <TrendingDown size={12} />
        )}
        <span>{isUp && !isFlat ? "+" : ""}{change.toFixed(symbol === "^TNX" || symbol === "^TYX" ? 3 : 2)}</span>
        <span>({isUp && !isFlat ? "+" : ""}{changePct.toFixed(2)}%)</span>
      </div>

      {chartData.length > 0 && (
        <div className="card-sparkline">
          <ResponsiveContainer width="100%" height={50}>
            <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis domain={["auto", "auto"]} hide />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const { date, price: p } = payload[0].payload;
                  return (
                    <div className="card-spark-tooltip">
                      <div className="card-spark-date">{date}</div>
                      <div>{formatPrice(p, symbol)}</div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={color}
                strokeWidth={1.5}
                fill={`url(#grad-${symbol})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </button>
  );
}
