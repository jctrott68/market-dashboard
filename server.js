import express from "express";
import cors from "cors";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
});

const app = express();
app.use(cors());

const SYMBOLS = [
  "^GSPC", "^DJI", "^IXIC", "^RUT",
  "^VIX", "^TNX", "^TYX",
  "GC=F", "CL=F",
  "BTC-USD", "ETH-USD",
  "DX-Y.NYB",
];

const RANGE_MAP = { "1W": "5d", "1M": "1mo", "3M": "3mo" };

const QUOTE_OPTS = { validateResult: false };

app.get("/api/quotes", async (req, res) => {
  try {
    const results = await Promise.all(
      SYMBOLS.map((s) =>
        yahooFinance
          .quote(s, {
            fields: [
              "regularMarketPrice", "regularMarketChange",
              "regularMarketChangePercent", "regularMarketDayHigh",
              "regularMarketDayLow", "regularMarketOpen",
              "regularMarketVolume", "regularMarketPreviousClose",
            ],
          }, QUOTE_OPTS)
          .catch(() => null)
      )
    );

    const quotes = {};
    results.forEach((r, i) => {
      if (!r) return;
      quotes[SYMBOLS[i]] = {
        price: r.regularMarketPrice ?? 0,
        change: r.regularMarketChange ?? 0,
        changePct: r.regularMarketChangePercent ?? 0,
        high: r.regularMarketDayHigh ?? 0,
        low: r.regularMarketDayLow ?? 0,
        open: r.regularMarketOpen ?? 0,
        volume: r.regularMarketVolume ?? 0,
        prevClose: r.regularMarketPreviousClose ?? 0,
      };
    });
    res.json(quotes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Single symbol lookup — validates the ticker and returns quote + display name
app.get("/api/quote/:symbol", async (req, res) => {
  const { symbol } = req.params;
  try {
    const r = await yahooFinance.quote(
      symbol,
      { fields: ["regularMarketPrice", "regularMarketChange", "regularMarketChangePercent",
                  "regularMarketDayHigh", "regularMarketDayLow", "regularMarketOpen",
                  "regularMarketVolume", "regularMarketPreviousClose", "longName", "shortName",
                  "quoteType"] },
      QUOTE_OPTS,
    );
    if (!r || r.regularMarketPrice == null) {
      return res.status(404).json({ error: "Symbol not found" });
    }
    res.json({
      symbol: r.symbol ?? symbol.toUpperCase(),
      name: r.longName || r.shortName || symbol.toUpperCase(),
      quoteType: r.quoteType ?? "EQUITY",
      price: r.regularMarketPrice,
      change: r.regularMarketChange ?? 0,
      changePct: r.regularMarketChangePercent ?? 0,
      high: r.regularMarketDayHigh ?? 0,
      low: r.regularMarketDayLow ?? 0,
      open: r.regularMarketOpen ?? 0,
      volume: r.regularMarketVolume ?? 0,
      prevClose: r.regularMarketPreviousClose ?? 0,
    });
  } catch (err) {
    res.status(404).json({ error: "Symbol not found or invalid" });
  }
});

app.get("/api/quote-batch", async (req, res) => {
  const symbols = (req.query.symbols ?? "").split(",").filter(Boolean);
  if (!symbols.length) return res.json({});
  try {
    const results = await Promise.all(
      symbols.map((s) =>
        yahooFinance.quote(
          s,
          { fields: ["regularMarketPrice", "regularMarketChange", "regularMarketChangePercent",
                      "regularMarketDayHigh", "regularMarketDayLow", "regularMarketOpen",
                      "regularMarketVolume", "regularMarketPreviousClose", "longName", "shortName"] },
          QUOTE_OPTS,
        ).catch(() => null)
      )
    );
    const out = {};
    results.forEach((r, i) => {
      if (!r) return;
      out[symbols[i].toUpperCase()] = {
        price: r.regularMarketPrice ?? 0,
        change: r.regularMarketChange ?? 0,
        changePct: r.regularMarketChangePercent ?? 0,
        high: r.regularMarketDayHigh ?? 0,
        low: r.regularMarketDayLow ?? 0,
        open: r.regularMarketOpen ?? 0,
        volume: r.regularMarketVolume ?? 0,
        prevClose: r.regularMarketPreviousClose ?? 0,
      };
    });
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/chart/:symbol", async (req, res) => {
  const { symbol } = req.params;
  const rangeLabel = req.query.range ?? "1M";
  const range = RANGE_MAP[rangeLabel] ?? "1mo";

  try {
    const period1 = new Date();
    if (range === "5d") period1.setDate(period1.getDate() - 7);
    else if (range === "1mo") period1.setMonth(period1.getMonth() - 1);
    else period1.setMonth(period1.getMonth() - 3);

    const result = await yahooFinance.chart(symbol, { period1, interval: "1d" }, QUOTE_OPTS);

    const data = (result.quotes ?? [])
      .filter((q) => q.close != null)
      .map((q) => ({
        date: new Date(q.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        fullDate: new Date(q.date).toISOString().split("T")[0],
        price: parseFloat(q.close.toFixed(4)),
        volume: q.volume ?? 0,
      }));

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => console.log(`Market API server running on :${PORT}`));
