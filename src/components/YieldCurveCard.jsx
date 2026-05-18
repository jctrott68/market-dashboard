import { useState, useEffect } from "react";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, YAxis, ReferenceLine,
} from "recharts";
import { getYieldCurveData } from "../api/marketApi";

function curveStatus(spread) {
  if (spread == null) return { label: "—",        color: "#64748b" };
  if (spread >  1.5)  return { label: "Steep",    color: "#10b981" };
  if (spread >  0.25) return { label: "Normal",   color: "#34d399" };
  if (spread > -0.25) return { label: "Flat",     color: "#f59e0b" };
  if (spread > -0.75) return { label: "Inverted", color: "#f97316" };
  return                     { label: "Inverted", color: "#ef4444" };
}

export default function YieldCurveCard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getYieldCurveData().then((d) => { if (!cancelled) setData(d); });
    return () => { cancelled = true; };
  }, []);

  const status = curveStatus(data?.spread ?? null);
  const spread = data?.spread ?? null;
  const change = data?.change ?? null;
  const y10    = data?.y10   ?? null;
  const y2     = data?.y2    ?? null;
  const history = data?.history ?? [];

  const spreadLabel = spread == null ? "—"
    : `${spread >= 0 ? "+" : ""}${spread.toFixed(2)}%`;

  const changeLabel = change == null ? null
    : `${change >= 0 ? "▲" : "▼"}${Math.abs(change).toFixed(3)}`;

  return (
    <div className="yc-card">
      {/* Header */}
      <div className="yc-header">
        <span className="yc-title">YIELD CURVE</span>
        <span className="yc-status" style={{ color: status.color }}>{status.label}</span>
      </div>

      <div className="yc-subtitle">10Y – 2Y Spread</div>

      {/* Spread value */}
      <div className="yc-spread" style={{ color: status.color }}>
        {spreadLabel}
        {changeLabel && (
          <span className="yc-change" style={{ color: change >= 0 ? "#10b981" : "#ef4444" }}>
            {changeLabel}
          </span>
        )}
      </div>

      {/* Individual yields */}
      {y2 != null && y10 != null && (
        <div className="yc-yields">
          <span>2Y <strong>{y2.toFixed(3)}%</strong></span>
          <span className="yc-divider">·</span>
          <span>10Y <strong>{y10.toFixed(3)}%</strong></span>
        </div>
      )}

      {/* Sparkline of spread history */}
      {history.length > 0 && (
        <div className="yc-sparkline">
          <ResponsiveContainer width="100%" height={52}>
            <AreaChart data={history} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="yc-grad-pos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}   />
                </linearGradient>
                <linearGradient id="yc-grad-neg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <YAxis domain={["auto", "auto"]} hide />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const { date, spread: s, y10: t, y2: tw } = payload[0].payload;
                  return (
                    <div className="card-spark-tooltip">
                      <div className="card-spark-date">{date}</div>
                      <div style={{ color: curveStatus(s).color }}>
                        Spread: {s >= 0 ? "+" : ""}{s.toFixed(3)}%
                      </div>
                      {t != null && (
                        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
                          2Y {tw.toFixed(3)}% · 10Y {t.toFixed(3)}%
                        </div>
                      )}
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="spread"
                stroke={status.color}
                strokeWidth={1.5}
                fill={spread >= 0 ? "url(#yc-grad-pos)" : "url(#yc-grad-neg)"}
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
