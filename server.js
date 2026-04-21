import "dotenv/config";
import express from "express";
import cors from "cors";
import YahooFinance from "yahoo-finance2";
import RSSParser from "rss-parser";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
});

const app = express();
app.use(cors({
  origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(",") : "*",
}));

const SYMBOLS = [
  "^GSPC", "^DJI", "^IXIC", "^RUT",
  "EFA", "EEM",
  "^VIX", "^TNX", "^TYX", "MUB",
  "GC=F", "CL=F",
  "BTC-USD", "ETH-USD",
  "DX-Y.NYB", "GBPUSD=X", "EURUSD=X", "JPY=X",
];

const RANGE_MAP = {
  "1W": "5d", "1M": "1mo", "3M": "3mo",
  "6M": "6mo", "12M": "1y", "3Y": "3y", "5Y": "5y", "10Y": "10y",
};
const INTERVAL_MAP = {
  "1W": "1d", "1M": "1d", "3M": "1d",
  "6M": "1d", "12M": "1wk", "3Y": "1wk", "5Y": "1mo", "10Y": "1mo",
};

const QUOTE_OPTS = { validateResult: false };

const rss = new RSSParser({ timeout: 8000, headers: { "User-Agent": "Mozilla/5.0" } });

const NEWS_FEEDS = [
  { url: "https://finance.yahoo.com/news/rssindex",                      source: "Yahoo Finance", category: "equity"   },
  { url: "https://www.cnbc.com/id/10000664/device/rss/rss.html",         source: "CNBC",          category: "equity"   },
  { url: "https://feeds.content.dowjones.io/public/rss/mw_topstories",   source: "MarketWatch",   category: "equity"   },
  { url: "https://feeds.reuters.com/reuters/businessNews",               source: "Reuters",       category: "equity"   },
  { url: "https://feeds.apnews.com/apnews/business",                     source: "AP News",       category: "trends"   },
  { url: "https://rss.politico.com/politics-news.xml",                   source: "Politico",      category: "politics" },
  { url: "https://www.coindesk.com/arc/outboundfeeds/rss/",              source: "CoinDesk",      category: "crypto"   },
  { url: "https://cointelegraph.com/rss",                                source: "CoinTelegraph", category: "crypto"   },
  { url: "https://www.espn.com/espn/rss/news",                           source: "ESPN",          category: "sports"   },
  { url: "https://fred.stlouisfed.org/feed/releases/",                   source: "FRED",          category: "economy"  },
  { url: "https://www.stlouisfed.org/rss/news.aspx",                     source: "St. Louis Fed", category: "economy"  },
];

// Cache news for 5 minutes to avoid hammering feeds
let newsCache = { data: null, fetchedAt: 0 };
const NEWS_TTL = 5 * 60 * 1000;

async function fetchNews() {
  if (newsCache.data && Date.now() - newsCache.fetchedAt < NEWS_TTL) {
    return newsCache.data;
  }
  const results = await Promise.all(
    NEWS_FEEDS.map(({ url, source, category }) =>
      rss.parseURL(url)
        .then((feed) =>
          (feed.items ?? []).slice(0, 6).map((item) => ({
            id:          item.guid || item.link,
            headline:    item.title?.trim() ?? "",
            summary:     (item.contentSnippet || item.content || "").replace(/<[^>]+>/g, "").trim().slice(0, 200),
            url:         item.link ?? "",
            source,
            category,
            publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
          }))
        )
        .catch(() => [])
    )
  );
  const flat = results
    .flat()
    .filter((n) => n.headline && n.url)
    .sort((a, b) => b.publishedAt - a.publishedAt)
    .slice(0, 40)
    .map((n, i) => ({ ...n, publishedAt: n.publishedAt.toISOString() }));

  newsCache = { data: flat, fetchedAt: Date.now() };
  return flat;
}

const QUOTE_FIELDS = [
  "regularMarketPrice", "regularMarketChange", "regularMarketChangePercent",
  "regularMarketDayHigh", "regularMarketDayLow", "regularMarketOpen",
  "regularMarketVolume", "regularMarketPreviousClose",
  "trailingPE", "forwardPE",
];

function extractQuote(r) {
  return {
    price:      r.regularMarketPrice ?? 0,
    change:     r.regularMarketChange ?? 0,
    changePct:  r.regularMarketChangePercent ?? 0,
    high:       r.regularMarketDayHigh ?? 0,
    low:        r.regularMarketDayLow ?? 0,
    open:       r.regularMarketOpen ?? 0,
    volume:     r.regularMarketVolume ?? 0,
    prevClose:  r.regularMarketPreviousClose ?? 0,
    trailingPE: r.trailingPE ?? null,
    forwardPE:  r.forwardPE ?? null,
  };
}

app.get("/api/quotes", async (req, res) => {
  try {
    const results = await Promise.all(
      SYMBOLS.map((s) =>
        yahooFinance.quote(s, { fields: QUOTE_FIELDS }, QUOTE_OPTS).catch(() => null)
      )
    );
    const quotes = {};
    results.forEach((r, i) => {
      if (!r) return;
      quotes[SYMBOLS[i]] = extractQuote(r);
    });
    res.json(quotes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Single symbol lookup — validates ticker and returns quote + display name
app.get("/api/quote/:symbol", async (req, res) => {
  const { symbol } = req.params;
  try {
    const r = await yahooFinance.quote(
      symbol,
      { fields: [...QUOTE_FIELDS, "longName", "shortName", "quoteType"] },
      QUOTE_OPTS,
    );
    if (!r || r.regularMarketPrice == null) {
      return res.status(404).json({ error: "Symbol not found" });
    }
    res.json({
      symbol:    r.symbol ?? symbol.toUpperCase(),
      name:      r.longName || r.shortName || symbol.toUpperCase(),
      quoteType: r.quoteType ?? "EQUITY",
      ...extractQuote(r),
    });
  } catch {
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
          { fields: [...QUOTE_FIELDS, "longName", "shortName"] },
          QUOTE_OPTS,
        ).catch(() => null)
      )
    );
    const out = {};
    results.forEach((r, i) => {
      if (!r) return;
      out[symbols[i].toUpperCase()] = extractQuote(r);
    });
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Economy (FRED) ──────────────────────────────────────────────────────────
const FRED_SERIES = {
  gdp:       { id: "A191RL1Q225SBEA", limit: 8,  transform: "direct"   }, // Real GDP QoQ annualized
  unrate:    { id: "UNRATE",          limit: 13, transform: "direct"   }, // Unemployment rate
  cpi:       { id: "CPIAUCSL",        limit: 26, transform: "yoy"      }, // CPI → YoY %
  corecpi:   { id: "CPILFESL",        limit: 26, transform: "yoy"      }, // Core CPI → YoY %
  fedfunds:  { id: "FEDFUNDS",        limit: 13, transform: "direct"   }, // Fed funds rate
  nfp:       { id: "PAYEMS",          limit: 3,  transform: "diff_k"   }, // Payrolls MoM change (thousands)
  retail:    { id: "RSAFS",           limit: 3,  transform: "pct_mom"  }, // Retail sales MoM %
  housing:   { id: "HOUST",           limit: 3,  transform: "direct_k" }, // Housing starts (thousands)
  sentiment: { id: "UMCSENT",         limit: 13, transform: "direct"   }, // UMich sentiment
  indpro:    { id: "INDPRO",          limit: 3,  transform: "pct_mom"  }, // Industrial production MoM %
};

async function fetchFred(seriesId, limit) {
  const key = process.env.FRED_API_KEY;
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${key}&sort_order=desc&limit=${limit}&file_type=json`;
  const res = await fetch(url);
  const json = await res.json();
  return (json.observations ?? [])
    .filter((o) => o.value !== ".")
    .map((o) => ({ date: o.date, value: parseFloat(o.value) }));
}

function formatFredDate(dateStr) {
  if (!dateStr) return "";
  const [year, month] = dateStr.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(month, 10) - 1]} ${year}`;
}

function applyTransform(obs, transform) {
  if (!obs.length) return { current: null, previous: null, history: [] };
  const [cur, prev] = obs;

  switch (transform) {
    case "direct":
    case "direct_k": {
      const history = [...obs].reverse().map((o) => ({ date: formatFredDate(o.date), v: o.value }));
      return { current: cur.value, previous: prev?.value ?? null, history };
    }
    case "yoy": {
      if (obs.length < 13) return { current: null, previous: null, history: [] };
      const yoyCur  = ((obs[0].value  - obs[12].value) / obs[12].value) * 100;
      const yoyPrev = obs.length >= 14 ? ((obs[1].value - obs[13].value) / obs[13].value) * 100 : null;
      const h = obs.map((o, i) =>
        i + 12 < obs.length
          ? { date: formatFredDate(o.date), v: ((o.value - obs[i + 12].value) / obs[i + 12].value) * 100 }
          : null
      ).filter(Boolean).reverse();
      return { current: yoyCur, previous: yoyPrev, history: h };
    }
    case "diff_k": {
      if (obs.length < 2) return { current: null, previous: null, history: [] };
      const diff     = obs[0].value - obs[1].value;
      const diffPrev = obs.length >= 3 ? obs[1].value - obs[2].value : null;
      const h = obs.slice(0, -1).map((o, i) => ({
        date: formatFredDate(o.date),
        v: o.value - obs[i + 1].value,
      })).reverse();
      return { current: diff, previous: diffPrev, history: h };
    }
    case "pct_mom": {
      if (obs.length < 2) return { current: null, previous: null, history: [] };
      const mom     = ((obs[0].value - obs[1].value) / obs[1].value) * 100;
      const momPrev = obs.length >= 3 ? ((obs[1].value - obs[2].value) / obs[2].value) * 100 : null;
      const h = obs.slice(0, -1).map((o, i) => ({
        date: formatFredDate(o.date),
        v: ((o.value - obs[i + 1].value) / obs[i + 1].value) * 100,
      })).reverse();
      return { current: mom, previous: momPrev, history: h };
    }
    default: {
      const history = [...obs].reverse().map((o) => ({ date: formatFredDate(o.date), v: o.value }));
      return { current: cur.value, previous: prev?.value ?? null, history };
    }
  }
}

app.get("/api/economy", async (req, res) => {
  if (!process.env.FRED_API_KEY) {
    return res.json({ needsKey: true });
  }
  try {
    const entries = await Promise.all(
      Object.entries(FRED_SERIES).map(async ([key, cfg]) => {
        try {
          const obs = await fetchFred(cfg.id, cfg.limit);
          return [key, applyTransform(obs, cfg.transform)];
        } catch {
          return [key, { current: null, previous: null, history: [] }];
        }
      })
    );
    res.json(Object.fromEntries(entries));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/news", async (req, res) => {
  try {
    res.json(await fetchNews());
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
    if (range === "5d")       period1.setDate(period1.getDate() - 7);
    else if (range === "1mo") period1.setMonth(period1.getMonth() - 1);
    else if (range === "3mo") period1.setMonth(period1.getMonth() - 3);
    else if (range === "6mo") period1.setMonth(period1.getMonth() - 6);
    else if (range === "1y")  period1.setFullYear(period1.getFullYear() - 1);
    else if (range === "3y")  period1.setFullYear(period1.getFullYear() - 3);
    else if (range === "5y")  period1.setFullYear(period1.getFullYear() - 5);
    else if (range === "10y") period1.setFullYear(period1.getFullYear() - 10);

    const interval = INTERVAL_MAP[rangeLabel] ?? "1d";
    const result = await yahooFinance.chart(symbol, { period1, interval }, QUOTE_OPTS);

    const data = (result.quotes ?? [])
      .filter((q) => q.close != null)
      .map((q) => ({
        date: new Date(q.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        fullDate: new Date(q.date).toISOString().split("T")[0],
        price: parseFloat(q.close.toFixed(4)),
        volume: q.volume ?? 0,
      }));

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API_PORT for local dev; PORT for Railway/production
const PORT = process.env.API_PORT ?? process.env.PORT ?? 3001;
app.listen(PORT, () => console.log(`Market API server running on :${PORT}`));
