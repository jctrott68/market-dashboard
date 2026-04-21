import { useState, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, ReferenceLine,
} from "recharts";
import { X, TrendingUp, TrendingDown, Activity, Loader } from "lucide-react";
import { getChartDataWithFallback } from "../api/marketApi";

const RANGES = [
  { label: "1W" },
  { label: "1M" },
  { label: "3M" },
  { label: "6M" },
  { label: "12M" },
  { label: "3Y" },
  { label: "5Y" },
  { label: "10Y" },
];

function formatPrice(price, symbol) {
  if (symbol === "^TNX" || symbol === "^TYX") return `${price.toFixed(3)}%`;
  if (symbol === "^VIX") return price.toFixed(2);
  if (symbol === "BTC-USD") return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (price > 10000) return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const CustomTooltip = ({ active, payload, label, symbol }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="tooltip-date">{label}</p>
        <p className="tooltip-price">{formatPrice(payload[0].value, symbol)}</p>
      </div>
    );
  }
  return null;
};

export default function ChartPanel({ index, quote, onClose }) {
  const [range, setRange] = useState(RANGES[1]);
  const [data, setData] = useState([]);
  const [chartLoading, setChartLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setChartLoading(true);
    getChartDataWithFallback(index.symbol, range.label).then((d) => {
      if (!cancelled) {
        setData(d);
        setChartLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [index.symbol, range.label]);

  const first = data[0]?.price || 0;
  const last = data[data.length - 1]?.price || 0;
  const periodChange = last - first;
  const periodChangePct = first ? ((periodChange / first) * 100).toFixed(2) : "0.00";
  const isUp = periodChange >= 0;
  const color = isUp ? "#10b981" : "#ef4444";
  const periodHigh = data.length ? Math.max(...data.map((d) => d.price)) : 0;
  const periodLow = data.length ? Math.min(...data.map((d) => d.price)) : 0;
  const tickInterval = Math.max(1, Math.floor(data.length / 8));

  return (
    <div className="chart-panel">
      <div className="chart-panel-header">
        <div className="chart-title-group">
          <div className="chart-index-info">
            <span className="chart-symbol">{index.short}</span>
            <span className="chart-name">{index.name}</span>
          </div>
          <div className="chart-current-price">{formatPrice(quote.price, index.symbol)}</div>
          {!chartLoading && (
            <div className={`chart-change ${isUp ? "up" : "down"}`}>
              {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span>
                {isUp ? "+" : ""}{periodChange.toFixed(index.symbol === "^TNX" || index.symbol === "^TYX" ? 3 : 2)}{" "}
                ({isUp ? "+" : ""}{periodChangePct}%)
              </span>
              <span className="range-label">over {range.label}</span>
            </div>
          )}
        </div>
        <button className="close-btn" onClick={onClose}><X size={18} /></button>
      </div>

      <div className="chart-stats-row">
        <div className="stat-pill">
          <span className="stat-label">Open</span>
          <span className="stat-value">{formatPrice(quote.open, index.symbol)}</span>
        </div>
        <div className="stat-pill">
          <span className="stat-label">High</span>
          <span className="stat-value up">{formatPrice(quote.high, index.symbol)}</span>
        </div>
        <div className="stat-pill">
          <span className="stat-label">Low</span>
          <span className="stat-value down">{formatPrice(quote.low, index.symbol)}</span>
        </div>
        <div className="stat-pill">
          <span className="stat-label">Prev Close</span>
          <span className="stat-value">{formatPrice(quote.prevClose ?? quote.open, index.symbol)}</span>
        </div>
        {!chartLoading && (
          <>
            <div className="stat-pill">
              <span className="stat-label">{range.label} High</span>
              <span className="stat-value up">{formatPrice(periodHigh, index.symbol)}</span>
            </div>
            <div className="stat-pill">
              <span className="stat-label">{range.label} Low</span>
              <span className="stat-value down">{formatPrice(periodLow, index.symbol)}</span>
            </div>
          </>
        )}
        <div className="stat-pill">
          <span className="stat-label">Trailing P/E</span>
          <span className="stat-value">
            {quote.trailingPE != null ? `${quote.trailingPE.toFixed(1)}x` : "—"}
          </span>
        </div>
        <div className="stat-pill">
          <span className="stat-label">Forward P/E</span>
          <span className="stat-value">
            {quote.forwardPE != null ? `${quote.forwardPE.toFixed(1)}x` : "—"}
          </span>
        </div>
      </div>

      <div className="range-tabs">
        {RANGES.map((r) => (
          <button
            key={r.label}
            className={`range-tab ${range.label === r.label ? "active" : ""}`}
            onClick={() => setRange(r)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {chartLoading ? (
        <div className="chart-loading">
          <Loader size={22} className="spin" />
          <span>Loading chart data…</span>
        </div>
      ) : (
        <>
          <div className="chart-area">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="date"
                  interval={tickInterval}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={65}
                  tickFormatter={(v) => formatPrice(v, index.symbol)}
                />
                <Tooltip content={<CustomTooltip symbol={index.symbol} />} />
                <ReferenceLine y={first} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={color}
                  strokeWidth={2}
                  fill="url(#priceGradient)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: color }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="volume-area">
            <div className="volume-label"><Activity size={11} /> Volume</div>
            <ResponsiveContainer width="100%" height={60}>
              <BarChart data={data} margin={{ top: 0, right: 5, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" hide />
                <YAxis hide />
                <Bar dataKey="volume" fill={color} opacity={0.4} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
