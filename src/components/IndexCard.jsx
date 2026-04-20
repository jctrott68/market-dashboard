import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const CATEGORY_COLORS = {
  equity: "#3b82f6",
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

export default function IndexCard({ index, quote, onClick, isSelected }) {
  const { symbol, name, short, category } = index;
  const { price, change, changePct } = quote;
  const isUp = change >= 0;
  const isFlat = Math.abs(changePct) < 0.01;
  const color = CATEGORY_COLORS[category];

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
    </button>
  );
}
