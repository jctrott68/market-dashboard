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
  try {
    const data = await getLiveQuotes();
    if (Object.keys(data).length > 0) return data;
    throw new Error("Empty quote response");
  } catch (err) {
    console.warn("Live quote fetch failed, using mock data:", err.message);
    return getCurrentQuotes();
  }
}

export async function getChartDataWithFallback(symbol, rangeLabel) {
  try {
    const data = await getLiveChartData(symbol, rangeLabel);
    if (Array.isArray(data) && data.length > 0) return data;
    throw new Error("Empty chart result");
  } catch (err) {
    console.warn(`Live chart fetch failed for ${symbol}, using mock:`, err.message);
    const days = rangeLabel === "1W" ? 7 : rangeLabel === "1M" ? 30 : 90;
    return generateHistoricalData(symbol, days);
  }
}
