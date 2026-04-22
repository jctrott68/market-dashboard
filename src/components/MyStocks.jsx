import { useState } from "react";
import { Plus, X, TrendingUp, TrendingDown, Minus, Loader, Search } from "lucide-react";
import ChartPanel from "./ChartPanel";

function formatPrice(price) {
  if (price >= 10000) return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (price >= 1) return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${price.toFixed(4)}`;
}

function StockCard({ stock, quote, onRemove, onSelect, isSelected }) {
  const [confirming, setConfirming] = useState(false);
  const change = quote?.change ?? 0;
  const changePct = quote?.changePct ?? 0;
  const price = quote?.price ?? null;
  const isUp = change > 0;
  const isFlat = Math.abs(changePct) < 0.005;

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
    </div>
  );
}

export default function MyStocks({ stocks, quotes, onAdd, onRemove }) {
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  const handleAdd = async () => {
    const sym = input.trim().toUpperCase();
    if (!sym) return;
    setAdding(true);
    setError("");
    try {
      await onAdd(sym);
      setInput("");
    } catch (err) {
      setError(err.message || `"${sym}" not found. Check the ticker symbol and try again.`);
    } finally {
      setAdding(false);
    }
  };

  const handleSelect = (stock) => {
    setSelected((prev) => prev?.symbol === stock.symbol ? null : stock);
  };

  const handleKey = (e) => {
    if (e.key === "Enter") handleAdd();
    if (e.key === "Escape") { setInput(""); setError(""); }
  };

  return (
    <section className="my-stocks-section">
      <div className="section-header">
        <h2 className="section-title">My Stocks</h2>
        <span className="my-stocks-count">{stocks.length} ticker{stocks.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="my-stocks-add-row">
        <div className={`ticker-input-wrap ${error ? "has-error" : ""}`}>
          <Search size={14} className="input-icon" />
          <input
            className="ticker-input"
            value={input}
            onChange={(e) => { setInput(e.target.value.toUpperCase()); setError(""); }}
            onKeyDown={handleKey}
            placeholder="Add ticker — e.g. AAPL, MSFT, TSLA"
            maxLength={12}
            disabled={adding}
          />
        </div>
        <button className="add-ticker-btn" onClick={handleAdd} disabled={adding || !input.trim()}>
          {adding ? <Loader size={14} className="spin" /> : <Plus size={14} />}
          <span>{adding ? "Looking up…" : "Add"}</span>
        </button>
      </div>
      {error && <p className="ticker-error">{error}</p>}

      {stocks.length === 0 ? (
        <div className="my-stocks-empty">
          <p>No tickers yet. Add symbols above to start tracking.</p>
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
