export const INDEXES = [
  { symbol: "^GSPC", name: "S&P 500", short: "SPX", category: "equity" },
  { symbol: "^DJI", name: "Dow Jones", short: "DJIA", category: "equity" },
  { symbol: "^IXIC", name: "NASDAQ", short: "NDX", category: "equity" },
  { symbol: "^RUT", name: "Russell 2000", short: "RUT", category: "equity" },
  { symbol: "EFA", name: "Developed Intl", short: "EAFE", category: "equity" },
  { symbol: "EEM", name: "Emerging Markets", short: "EM", category: "equity" },
  { symbol: "^VIX", name: "VIX", short: "VIX", category: "volatility" },
  { symbol: "^TNX", name: "10Y Treasury", short: "10YR", category: "bonds" },
  { symbol: "^TYX", name: "30Y Treasury", short: "30YR", category: "bonds" },
  { symbol: "MUB", name: "Muni Bonds", short: "MUB", category: "bonds" },
  { symbol: "GC=F", name: "Gold", short: "GOLD", category: "commodities" },
  { symbol: "CL=F", name: "Crude Oil", short: "OIL", category: "commodities" },
  { symbol: "BTC-USD", name: "Bitcoin", short: "BTC", category: "crypto" },
  { symbol: "ETH-USD", name: "Ethereum", short: "ETH", category: "crypto" },
  { symbol: "DX-Y.NYB", name: "US Dollar", short: "DXY", category: "fx" },
  { symbol: "GBPUSD=X", name: "Sterling", short: "GBP", category: "fx" },
  { symbol: "EURUSD=X", name: "Euro", short: "EUR", category: "fx" },
  { symbol: "JPY=X", name: "Yen", short: "JPY", category: "fx" },
];

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

export function generateHistoricalData(symbol, days = 90) {
  const baseValues = {
    "^GSPC": 5200, "^DJI": 39000, "^IXIC": 16200, "^RUT": 2050,
    "^VIX": 18, "^TNX": 4.35, "^TYX": 4.6, "GC=F": 2310,
    "CL=F": 82, "BTC-USD": 68000, "ETH-USD": 3400, "DX-Y.NYB": 104,
  };
  const volatilities = {
    "^GSPC": 0.008, "^DJI": 0.007, "^IXIC": 0.012, "^RUT": 0.014,
    "^VIX": 0.06, "^TNX": 0.012, "^TYX": 0.01, "GC=F": 0.009,
    "CL=F": 0.018, "BTC-USD": 0.035, "ETH-USD": 0.045, "DX-Y.NYB": 0.004,
  };

  const base = baseValues[symbol] || 100;
  const vol = volatilities[symbol] || 0.01;
  const rand = seededRandom(symbol.charCodeAt(0) * 31 + symbol.length * 17);
  const data = [];
  let price = base * (0.88 + rand() * 0.04);
  const now = new Date("2026-04-20");

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;
    const change = (rand() - 0.48) * vol * price;
    price = Math.max(price + change, price * 0.5);
    data.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      fullDate: date.toISOString().split("T")[0],
      price: parseFloat(price.toFixed(symbol === "^TNX" || symbol === "^TYX" ? 3 : 2)),
      volume: Math.floor(rand() * 1e9 + 5e8),
    });
  }
  return data;
}

export function getCurrentQuotes() {
  const quotes = {};
  INDEXES.forEach(({ symbol }) => {
    const history = generateHistoricalData(symbol, 90);
    const latest = history[history.length - 1];
    const prev = history[history.length - 2];
    const change = latest.price - prev.price;
    const changePct = (change / prev.price) * 100;
    quotes[symbol] = {
      price: latest.price,
      change: parseFloat(change.toFixed(2)),
      changePct: parseFloat(changePct.toFixed(2)),
      high: parseFloat((latest.price * 1.003).toFixed(2)),
      low: parseFloat((latest.price * 0.997).toFixed(2)),
      open: parseFloat((prev.price * 1.001).toFixed(2)),
      volume: latest.volume,
    };
  });
  return quotes;
}

export const NEWS_ITEMS = [
  {
    id: 1, category: "equity",
    headline: "S&P 500 Approaches All-Time Highs as Tech Earnings Beat Estimates",
    source: "Wall Street Journal", time: "2 min ago",
    summary: "Major technology companies reported better-than-expected Q1 earnings, pushing the S&P 500 within striking distance of record territory.",
    url: "#", sentiment: "positive",
  },
  {
    id: 2, category: "equity",
    headline: "Fed Officials Signal Patience on Rate Cuts Amid Sticky Inflation",
    source: "Bloomberg", time: "15 min ago",
    summary: "Federal Reserve governors indicated they need more evidence of sustained disinflation before cutting interest rates.",
    url: "#", sentiment: "negative",
  },
  {
    id: 3, category: "fixed-income",
    headline: "10-Year Treasury Yield Climbs to 4.4% on Strong Jobs Data",
    source: "Reuters", time: "32 min ago",
    summary: "Bond yields rose sharply after the Labor Department reported better-than-expected jobless claims, reducing expectations for near-term Fed easing.",
    url: "#", sentiment: "negative",
  },
  {
    id: 4, category: "fixed-income",
    headline: "Corporate Bond Spreads Tighten as Risk Appetite Returns",
    source: "Financial Times", time: "1 hr ago",
    summary: "Investment-grade and high-yield spreads compressed to multi-month lows as investors increased appetite for credit risk.",
    url: "#", sentiment: "positive",
  },
  {
    id: 5, category: "equity",
    headline: "NVIDIA Reports Record Revenue, Raises Forward Guidance",
    source: "CNBC", time: "1 hr ago",
    summary: "Chip giant NVIDIA exceeded expectations across all segments, driven by surging AI infrastructure demand from hyperscalers.",
    url: "#", sentiment: "positive",
  },
  {
    id: 6, category: "trends",
    headline: "AI Infrastructure Spending Accelerates Across Tech Sector",
    source: "The Information", time: "2 hrs ago",
    summary: "Capital expenditure forecasts from major cloud providers point to sustained AI infrastructure investment through 2027.",
    url: "#", sentiment: "positive",
  },
  {
    id: 7, category: "politics",
    headline: "Senate Passes Debt Ceiling Extension Through 2027",
    source: "Politico", time: "2 hrs ago",
    summary: "Bipartisan agreement averts potential default risk, removing a near-term market overhang that had weighed on risk assets.",
    url: "#", sentiment: "positive",
  },
  {
    id: 8, category: "commodities",
    headline: "Oil Prices Drop 3% as OPEC+ Signals Production Increase",
    source: "Reuters", time: "3 hrs ago",
    summary: "Crude futures fell sharply after OPEC+ members reached a preliminary agreement to gradually unwind voluntary production cuts.",
    url: "#", sentiment: "negative",
  },
  {
    id: 9, category: "politics",
    headline: "Trade Negotiations with China Resume After Six-Month Pause",
    source: "AP News", time: "3 hrs ago",
    summary: "U.S. and Chinese officials restarted trade talks, raising hopes for de-escalation in tariff tensions that have pressured equities.",
    url: "#", sentiment: "positive",
  },
  {
    id: 10, category: "crypto",
    headline: "Bitcoin Holds Above $68K as Institutional Demand Persists",
    source: "CoinDesk", time: "4 hrs ago",
    summary: "Spot Bitcoin ETFs continued to see net inflows for the 12th consecutive week, underpinning prices near recent highs.",
    url: "#", sentiment: "positive",
  },
  {
    id: 11, category: "trends",
    headline: "Global PMI Data Points to Synchronized Manufacturing Recovery",
    source: "IHS Markit", time: "4 hrs ago",
    summary: "Factory activity expanded in the US, Eurozone, and key Asian economies simultaneously for the first time since early 2022.",
    url: "#", sentiment: "positive",
  },
  {
    id: 12, category: "sports",
    headline: "NFL Draft: $2.4B Stadium Deal Signals League's Financial Strength",
    source: "ESPN", time: "5 hrs ago",
    summary: "A landmark venue financing arrangement highlights the robust monetization trajectory of sports franchises as alternative assets.",
    url: "#", sentiment: "positive",
  },
  {
    id: 13, category: "equity",
    headline: "Healthcare Sector Rallies on FDA Approval Wave",
    source: "Barron's", time: "5 hrs ago",
    summary: "Six major drug approvals in a two-week span lifted healthcare stocks, with biotech names outperforming the broader index.",
    url: "#", sentiment: "positive",
  },
  {
    id: 14, category: "fixed-income",
    headline: "Emerging Market Debt Outperforms as Dollar Weakens",
    source: "Bloomberg", time: "6 hrs ago",
    summary: "Dollar weakness provided tailwind for EM sovereign and corporate bonds, with Brazil and Mexico paper among top performers.",
    url: "#", sentiment: "positive",
  },
  {
    id: 15, category: "trends",
    headline: "Consumer Spending Data Signals Resilient US Economy",
    source: "WSJ", time: "6 hrs ago",
    summary: "Retail sales exceeded forecasts for the third consecutive month, pointing to durable household spending despite higher rates.",
    url: "#", sentiment: "positive",
  },
];

export const MARKET_STATUS = {
  isOpen: true,
  session: "Regular Trading Hours",
  nextEvent: "Market closes at 4:00 PM ET",
  lastUpdated: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
};
