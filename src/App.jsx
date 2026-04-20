import { useState, useEffect, useCallback, useRef } from "react";
import { Activity, RefreshCw, Clock, Wifi, WifiOff } from "lucide-react";
import IndexCard from "./components/IndexCard";
import ChartPanel from "./components/ChartPanel";
import MarketSummary from "./components/MarketSummary";
import NewsSection from "./components/NewsSection";
import MyStocks from "./components/MyStocks";
import { INDEXES, getCurrentQuotes, MARKET_STATUS } from "./data/marketData";
import { getQuotesWithFallback } from "./api/marketApi";
import "./App.css";

const CATEGORY_ORDER = ["equity", "volatility", "bonds", "commodities", "crypto", "fx"];
const CATEGORY_LABELS = {
  equity: "Equities", bonds: "Fixed Income", volatility: "Volatility",
  commodities: "Commodities", crypto: "Crypto", fx: "Currencies",
};
const AUTO_REFRESH_MS = 30_000;

function isMarketOpen() {
  const now = new Date();
  const day = now.getDay();
  if (day === 0 || day === 6) return false;
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const h = et.getHours(), m = et.getMinutes();
  const mins = h * 60 + m;
  return mins >= 9 * 60 + 30 && mins < 16 * 60;
}

export default function App() {
  const [quotes, setQuotes] = useState(getCurrentQuotes());
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  const fetchQuotes = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const data = await getQuotesWithFallback(INDEXES);
      // detect live vs mock by checking if any price differs from initial mock
      const mockQuotes = getCurrentQuotes();
      const firstSymbol = INDEXES[0].symbol;
      const live = data[firstSymbol]?.price !== mockQuotes[firstSymbol]?.price;
      setIsLive(live);
      setQuotes(data);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
      if (showSpinner) setRefreshing(false);
    }
  }, []);

  // initial load
  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  // auto-refresh every 30s when market is open
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (isMarketOpen()) fetchQuotes();
    }, AUTO_REFRESH_MS);
    return () => clearInterval(timerRef.current);
  }, [fetchQuotes]);

  const handleRefresh = () => fetchQuotes(true);

  const handleCardClick = (index) => {
    setSelectedIndex((prev) => (prev?.symbol === index.symbol ? null : index));
  };

  const groupedIndexes = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    indexes: INDEXES.filter((i) => i.category === cat),
  }));

  const marketOpen = isMarketOpen();

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <Activity size={22} className="logo-icon" />
          <div>
            <h1 className="app-title">Market Dashboard</h1>
            <div className="market-status">
              <span className={`status-dot ${marketOpen ? "open" : "closed"}`} />
              <span>{marketOpen ? "Markets Open" : "Markets Closed"}</span>
              <span className="status-sep">·</span>
              <span>{MARKET_STATUS.session}</span>
            </div>
          </div>
        </div>
        <div className="header-right">
          <div className={`data-source-badge ${isLive ? "live" : "mock"}`}>
            {isLive ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span>{isLive ? "Live Data" : "Simulated"}</span>
          </div>
          {lastUpdated && (
            <div className="last-updated">
              <Clock size={13} />
              <span>Updated {lastUpdated.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
            </div>
          )}
          <button className={`refresh-btn ${refreshing ? "spinning" : ""}`} onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      <main className="app-main">
        <MarketSummary quotes={quotes} />

        <div className={`indexes-section ${loading ? "loading" : ""}`}>
          {groupedIndexes.map(({ category, indexes }) => (
            <div key={category} className="category-group">
              <h3 className="category-label">{CATEGORY_LABELS[category]}</h3>
              <div className="cards-row">
                {indexes.map((index) => (
                  <IndexCard
                    key={index.symbol}
                    index={index}
                    quote={quotes[index.symbol]}
                    onClick={handleCardClick}
                    isSelected={selectedIndex?.symbol === index.symbol}
                    loading={loading}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {selectedIndex && (
          <ChartPanel
            index={selectedIndex}
            quote={quotes[selectedIndex.symbol]}
            onClose={() => setSelectedIndex(null)}
          />
        )}

        <MyStocks />

        <NewsSection />
      </main>

      <footer className="app-footer">
        <p>
          {isLive
            ? "Live data via Yahoo Finance. Prices may be delayed ~15 min. Market hours: Mon–Fri 9:30 AM – 4:00 PM ET."
            : "Showing simulated data — live feed unavailable. Market hours: Mon–Fri 9:30 AM – 4:00 PM ET."}
        </p>
      </footer>
    </div>
  );
}
