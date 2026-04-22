import { useState, useEffect } from "react";
import { Plus, X, TrendingUp, TrendingDown, Minus, Loader, Search } from "lucide-react";
import { lookupTicker, getChartDataWithFallback } from "../api/marketApi";
import { AreaChart, Area, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import ChartPanel from "./ChartPanel";

function formatPrice(price) {
  if (price >= 10000) return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (price >= 1) return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${price.toFixed(4)}`;
}

function StockCard({ stock, quote, onRemove, onSelect, isSelected }) {
  const [confirming, setConfirming] = useState(false);
  const [chartData, setChartData] = useState([]);
  const change = quote?.change ?? 0;
  const changePct = quote?.changePct ?? 0;
  const price = quote?.price ?? null;
  const isUp = change > 0;
  const isFlat = Math.abs(changePct) < 0.005;
  const color = isFlat ? "#94a3b8" : isUp ? "#10b981" : "#ef4444";

  useEffect(() => {
    let cancelled = false;
    getChartDataWithFallback(stock.symbol, "12M").then((data) => {
      if (!cancelled) setChartData(data);
    });
    return () => { cancelled = true; };
  }, [stock.symbol]);

  const handleRemoveClick = (e) => { e.stopPropagation(); setConfirming(true); };
  const handleConfirm = (e) => { e.stopPropagation(); onRemove(stock.symbol); };
  const handleCancel = (e) => { e.stopPropagation(); setConfirming(false); };

  return (
    <div className={`my-stock-card ${isSelected ? "selected" : ""} ${confirming ? "confirming" : ""}`} onClick={() => !confirming && onSelect(stock)}>
      {confirming ? (
        <div className="remove-confirm-overlay">
          <p className="remove-confirm-msg">Remove <strong>{stock.symbol}</strong>?</p>
          <div className="remove-confirm-actions">
            <button className="confirm-yes-btn" onClick={handleConfirm}>Remove</button>
            <button className="confirm-no-btn" onClick={handleCancel}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="stock-remove-btn" onClick={handleRemoveClick} title="Remove ticker">
          <X size={12} />
        </button>
      )}
      <div className="card-header">
        <span className="card-symbol">{stock.symbol}</span>
      </div>
      <div className="card-name">{stock.name}</div>
      {price != null ? (
        <>
          <div className="card-price">{formatPrice(price)}</div>
          <div className={`card-change ${isUp ? "up" : isFlat ? "flat" : "down"}`}>
            {isFlat ? <Minus size={12} /> : isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>{isUp && !isFlat ? "+" : ""}{change.toFixed(2)}</span>
            <span>({isUp && !isFlat ? "+" : ""}{changePct.toFixed(2)}%)</span>
          </div>
        </>
      ) : (
        <div className="card-price-loading"><Loader size={14} className="spin" /></div>
      )}

      {chartData.length > 0 && (
        <div className="card-sparkline">
          <ResponsiveContainer width="100%" height={50}>
            <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${stock.symbol}`} x1="0" y1="0" x2="0" y2="1">
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
                      <div>{formatPrice(p)}</div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={color}
                strokeWidth={1.5}
                fill={`url(#grad-${stock.symbol})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default function MyStocks({ stocks, quotes, onAdd, onRemove }) {
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [errors, setErrors] = useState([]);
  const [selected, setSelected] = useState(null);

  const handleAdd = async () => {
    // Parse comma-separated symbols, filter blanks and already-added
    const symbols = input
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    if (!symbols.length) return;

    setAdding(true);
    setErrors([]);

    const failed = [];
    for (const sym of symbols) {
      if (stocks.some((s) => s.symbol === sym)) {
        failed.push(`${sym} is already in your list`);
        continue;
      }
      try {
        const data = await lookupTicker(sym);
        onAdd({ symbol: data.symbol, name: data.name }, data);
      } catch {
        failed.push(`"${sym}" not found`);
      }
    }

    setErrors(failed);
    if (failed.length < symbols.length) setInput(""); // clear if at least one succeeded
    setAdding(false);
  };

  const handleSelect = (stock) => {
    setSelected((prev) => prev?.symbol === stock.symbol ? null : stock);
  };

  const handleKey = (e) => {
    if (e.key === "Enter") handleAdd();
    if (e.key === "Escape") { setInput(""); setErrors([]); }
  };

  return (
    <section className="my-stocks-section">
      <div className="section-header">
        <h2 className="section-title">Stock Quotes</h2>
        <span className="my-stocks-count">{stocks.length} ticker{stocks.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="my-stocks-add-row">
        <div className={`ticker-input-wrap ${errors.length ? "has-error" : ""}`}>
          <Search size={14} className="input-icon" />
          <input
            className="ticker-input"
            value={input}
            onChange={(e) => { setInput(e.target.value.toUpperCase()); setErrors([]); }}
            onKeyDown={handleKey}
            placeholder="Add tickers — e.g. AAPL, MSFT, TSLA"
            maxLength={100}
            disabled={adding}
          />
        </div>
        <button className="add-ticker-btn" onClick={handleAdd} disabled={adding || !input.trim()}>
          {adding ? <Loader size={14} className="spin" /> : <Plus size={14} />}
          <span>{adding ? "Looking up…" : "Add"}</span>
        </button>
      </div>
      {errors.length > 0 && (
        <p className="ticker-error">{errors.join(" · ")}</p>
      )}

      {stocks.length === 0 ? (
        <div className="my-stocks-empty">
          <p>No tickers yet. Add one or more symbols above, separated by commas.</p>
        </div>
      ) : (
        <div className="my-stocks-grid">
          {stocks.map((stock) => (
            <StockCard
              key={stock.symbol}
              stock={stock}
              quote={quotes[stock.symbol]}
              onRemove={onRemove}
              onSelect={handleSelect}
              isSelected={selected?.symbol === stock.symbol}
            />
          ))}
        </div>
      )}

      {selected && quotes[selected.symbol] && (
        <ChartPanel
          index={{ symbol: selected.symbol, name: selected.name, short: selected.symbol, category: "equity" }}
          quote={quotes[selected.symbol]}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}
