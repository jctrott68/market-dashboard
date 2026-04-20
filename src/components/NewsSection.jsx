import { useState } from "react";
import { ExternalLink, TrendingUp, TrendingDown, Minus, Clock } from "lucide-react";
import { NEWS_ITEMS } from "../data/marketData";

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "equity", label: "Equities" },
  { key: "fixed-income", label: "Fixed Income" },
  { key: "trends", label: "Trends" },
  { key: "politics", label: "Politics" },
  { key: "commodities", label: "Commodities" },
  { key: "crypto", label: "Crypto" },
  { key: "sports", label: "Sports" },
];

const SENTIMENT_COLORS = {
  positive: "#10b981",
  negative: "#ef4444",
  neutral: "#94a3b8",
};

export default function NewsSection() {
  const [activeCategory, setActiveCategory] = useState("all");

  const filtered = activeCategory === "all"
    ? NEWS_ITEMS
    : NEWS_ITEMS.filter((n) => n.category === activeCategory);

  return (
    <section className="news-section">
      <div className="section-header">
        <h2 className="section-title">Market News</h2>
        <div className="live-badge"><span className="pulse-dot" />LIVE</div>
      </div>

      <div className="news-filter-tabs">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            className={`filter-tab ${activeCategory === cat.key ? "active" : ""}`}
            onClick={() => setActiveCategory(cat.key)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="news-grid">
        {filtered.map((item) => (
          <article key={item.id} className="news-card">
            <div className="news-card-meta">
              <span className="news-category-badge" data-category={item.category}>
                {item.category.replace("-", " ")}
              </span>
              <span className="news-time"><Clock size={11} />{item.time}</span>
            </div>
            <h3 className="news-headline">{item.headline}</h3>
            <p className="news-summary">{item.summary}</p>
            <div className="news-footer">
              <span className="news-source">{item.source}</span>
              <div className="news-sentiment" style={{ color: SENTIMENT_COLORS[item.sentiment] }}>
                {item.sentiment === "positive" ? (
                  <TrendingUp size={12} />
                ) : item.sentiment === "negative" ? (
                  <TrendingDown size={12} />
                ) : (
                  <Minus size={12} />
                )}
                <span>{item.sentiment}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
