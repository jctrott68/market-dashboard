import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Minus, AlertCircle, ExternalLink } from "lucide-react";
import {
  LineChart, Line, ResponsiveContainer, Tooltip, YAxis,
} from "recharts";

const INDICATORS = [
  { id: "gdp",         name: "GDP Growth",          description: "Real GDP (QoQ Ann.)",     units: "%",   higherIsBetter: true,  frequency: "Quarterly", source: "BEA"  },
  { id: "unrate",      name: "Unemployment",         description: "Unemployment Rate",        units: "%",   higherIsBetter: false, frequency: "Monthly",   source: "BLS"  },
  { id: "cpi",         name: "CPI Inflation",        description: "Consumer Prices (YoY)",   units: "%",   higherIsBetter: null,  frequency: "Monthly",   source: "BLS"  },
  { id: "corecpi",     name: "Core CPI",             description: "Ex Food & Energy (YoY)",  units: "%",   higherIsBetter: null,  frequency: "Monthly",   source: "BLS"  },
  { id: "fedfunds",    name: "Fed Funds Rate",       description: "Effective Federal Funds",  units: "%",   higherIsBetter: null,  frequency: "Monthly",   source: "Fed"  },
  { id: "nfp",         name: "Nonfarm Payrolls",     description: "Jobs Added (MoM)",         units: "K",   higherIsBetter: true,  frequency: "Monthly",   source: "BLS"  },
  { id: "retail",      name: "Retail Sales",         description: "Consumer Spending (MoM)", units: "%",   higherIsBetter: true,  frequency: "Monthly",   source: "Census"},
  { id: "housing",     name: "Housing Starts",       description: "New Residential Units",   units: "K",   higherIsBetter: true,  frequency: "Monthly",   source: "Census"},
  { id: "sentiment",   name: "Consumer Sentiment",   description: "Univ. of Michigan Index", units: "",    higherIsBetter: true,  frequency: "Monthly",   source: "UMich" },
  { id: "indpro",      name: "Industrial Production",description: "Factory Output (MoM)",    units: "%",   higherIsBetter: true,  frequency: "Monthly",   source: "Fed"  },
];

function formatValue(id, value, units) {
  if (value == null) return "—";
  if (id === "nfp" || id === "housing") {
    return `${value > 0 ? "+" : ""}${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}${units}`;
  }
  return `${value > 0 && (id === "gdp" || id === "nfp" || id === "retail" || id === "indpro") ? "+" : ""}${value.toFixed(1)}${units}`;
}

function SparkLine({ data, color, units }) {
  if (!data?.length) return null;
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={data}>
        <YAxis domain={["auto", "auto"]} hide />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const { date, v } = payload[0].payload;
            return (
              <div className="spark-tooltip">
                {date && <div className="spark-tooltip-date">{date}</div>}
                <div>{v?.toFixed(2)}{units}</div>
              </div>
            );
          }}
        />
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function IndicatorCard({ indicator, data }) {
  const { id, name, description, units, higherIsBetter, frequency, source } = indicator;
  const current  = data?.current  ?? null;
  const previous = data?.previous ?? null;
  const history  = data?.history  ?? [];
  const change   = current != null && previous != null ? current - previous : null;
  const isUp     = change != null && change > 0;
  const isDown   = change != null && change < 0;

  let sentiment = "neutral";
  if (higherIsBetter === true)  sentiment = isUp ? "positive" : isDown ? "negative" : "neutral";
  if (higherIsBetter === false) sentiment = isDown ? "positive" : isUp ? "negative" : "neutral";

  const color = sentiment === "positive" ? "#10b981" : sentiment === "negative" ? "#ef4444" : "#94a3b8";

  return (
    <div className="econ-card">
      <div className="econ-card-header">
        <div>
          <div className="econ-name">{name}</div>
          <div className="econ-description">{description}</div>
        </div>
        <span className="econ-freq">{frequency}</span>
      </div>

      <div className="econ-value-row">
        <span className="econ-value">{formatValue(id, current, units)}</span>
        {change != null && (
          <span className="econ-change" style={{ color }}>
            {isUp ? <TrendingUp size={13} /> : isDown ? <TrendingDown size={13} /> : <Minus size={13} />}
            {isUp ? "+" : ""}{change.toFixed(id === "nfp" || id === "housing" ? 0 : 1)}{units}
          </span>
        )}
      </div>

      <SparkLine data={history} color={color} units={units} />

      <div className="econ-footer">
        <span className="econ-source">Source: {source}</span>
        {previous != null && (
          <span className="econ-prev">Prev: {formatValue(id, previous, units)}</span>
        )}
      </div>
    </div>
  );
}

export default function Economy() {
  const [data, setData]       = useState({});
  const [status, setStatus]   = useState("loading"); // loading | ok | no-key | error

  useEffect(() => {
    fetch("/api/economy")
      .then((r) => r.json())
      .then((json) => {
        if (json.needsKey) { setStatus("no-key"); return; }
        if (json.error)    { setStatus("error");   return; }
        setData(json);
        setStatus("ok");
      })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <section className="economy-section">
      <div className="section-header">
        <h2 className="section-title">Economy</h2>
        <span className="econ-data-badge">US Indicators</span>
      </div>

      {status === "loading" && (
        <div className="econ-state-box">
          <div className="econ-spinner" />
          <span>Loading economic data…</span>
        </div>
      )}

      {status === "no-key" && (
        <div className="econ-state-box econ-setup">
          <AlertCircle size={20} className="econ-alert-icon" />
          <div>
            <p className="econ-setup-title">FRED API key required</p>
            <p className="econ-setup-body">
              Economic data is sourced from the Federal Reserve (FRED). A free API key is required.
            </p>
            <ol className="econ-setup-steps">
              <li>Register for a free key at <a href="https://fred.stlouisfed.org/docs/api/api_key.html" target="_blank" rel="noopener noreferrer">fred.stlouisfed.org <ExternalLink size={11} /></a></li>
              <li>Create a <code>.env</code> file in the <code>market-dashboard</code> folder</li>
              <li>Add the line: <code>FRED_API_KEY=your_key_here</code></li>
              <li>Restart the server with <code>npm run dev:all</code></li>
            </ol>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="econ-state-box">
          <AlertCircle size={16} />
          <span>Could not load economic data. Check that the server is running.</span>
        </div>
      )}

      {status === "ok" && (
        <div className="econ-grid">
          {INDICATORS.map((ind) => (
            <IndicatorCard key={ind.id} indicator={ind} data={data[ind.id]} />
          ))}
        </div>
      )}
    </section>
  );
}
