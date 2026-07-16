import { generateHistoricalData, getCurrentQuotes } from "../data/marketData";

const API = import.meta.env.VITE_API_URL ?? "";

export async function getLiveQuotes() {
  const res = await fetch(`${API}/api/quotes`);
  if (!res.ok) throw new Error(`Quote fetch failed: ${res.status}`);
  return res.json();
}

export async function getLiveChartData(symbol, rangeLabel) {
  const res = await fetch(`${API}/api/chart/${encodeURIComponent(symbol)}?range=${rangeLabel}`);
  if (!res.ok) throw new Error(`Chart fetch failed: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export async function lookupTicker(symbol) {
  const res = await fetch(`${API}/api/quote/${encodeURIComponent(symbol.toUpperCase())}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Symbol not found");
  return json;
}

export async function getBatchQuotes(symbols) {
  if (!symbols.length) return {};
  const res = await fetch(`${API}/api/quote-batch?symbols=${symbols.map(encodeURIComponent).join(",")}`);
  if (!res.ok) throw new Error("Batch quote fetch failed");
  return res.json();
}

export async function getQuotesWithFallback(indexes) {
  const mockQuotes = getCurrentQuotes();
  try {
    const data = await getLiveQuotes();
    if (Object.keys(data).length > 0) return { ...mockQuotes, ...data };
    throw new Error("Empty quote response");
  } catch (err) {
    console.warn("Live quote fetch failed, using mock data:", err.message);
    return mockQuotes;
  }
}

export async function getYieldCurveData() {
  try {
    const res = await fetch(`${API}/api/yield-curve`);
    if (!res.ok) throw new Error("Yield curve fetch failed");
    const data = await res.json();
    if (data.needsKey || data.spread == null) throw new Error("No data");
    return data;
  } catch {
    // Simulated fallback: gradual normalization from inversion
    const history = [];
    let spread = -0.95;
    const days = 260;
    for (let i = days; i >= 0; i--) {
      const d = new Date("2026-04-20");
      d.setDate(d.getDate() - i);
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      spread += (0.0025 + (Math.random() - 0.45) * 0.04);
      spread = Math.max(-1.5, Math.min(1.5, spread));
      const y2  = 4.85 - spread * 0.3;
      const y10 = y2 + spread;
      history.push({
        date:   d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        spread: parseFloat(spread.toFixed(3)),
        y10:    parseFloat(y10.toFixed(3)),
        y2:     parseFloat(y2.toFixed(3)),
      });
    }
    const cur  = history[history.length - 1];
    const prev = history[history.length - 2];
    return {
      spread:  cur.spread,
      change:  parseFloat((cur.spread - prev.spread).toFixed(3)),
      y10:     cur.y10,
      y2:      cur.y2,
      history,
    };
  }
}

export async function getChartDataWithFallback(symbol, rangeLabel) {
  try {
    const data = await getLiveChartData(symbol, rangeLabel);
    if (Array.isArray(data) && data.length > 0) return data;
    throw new Error("Empty chart result");
  } catch (err) {
    console.warn(`Live chart fetch failed for ${symbol}, using mock:`, err.message);
    const days = { "1W": 7, "1M": 30, "3M": 90, "6M": 180, "12M": 365, "3Y": 1095, "5Y": 1825, "10Y": 3650 }[rangeLabel] ?? 30;
    return generateHistoricalData(symbol, days);
  }
}
