import { useState, useEffect } from "react";
import { ExternalLink, TrendingUp, TrendingDown, Minus, Clock, Loader } from "lucide-react";

const CATEGORIES = [
  { key: "all",          label: "All" },
  { key: "equity",       label: "Equities" },
  { key: "fixed-income", label: "Fixed Income" },
  { key: "economy",      label: "Economy" },
  { key: "trends",       label: "Trends" },
  { key: "politics",     label: "Politics" },
  { key: "commodities",  label: "Commodities" },
  { key: "crypto",       label: "Crypto" },
  { key: "sports",       label: "Sports" },
];

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NewsSection() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/news")
      .then((r) => r.json())
      .then((data) => { setArticles(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = activeCategory === "all"
    ? articles
    : articles.filter((n) => n.category === activeCategory);

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

      {loading ? (
        <div className="news-loading">
          <Loader size={18} className="spin" />
          <span>Loading latest news…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="my-stocks-empty"><p>No articles found for this category.</p></div>
      ) : (
        <div className="news-grid">
          {filtered.map((item) => (
            <a
              key={item.id}
              className="news-card"
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="news-card-meta">
                <span className="news-category-badge" data-category={item.category}>
                  {item.category.replace("-", " ")}
                </span>
                <span className="news-time"><Clock size={11} />{timeAgo(item.publishedAt)}</span>
              </div>
              <h3 className="news-headline">
                {item.headline}
                <ExternalLink size={11} className="headline-link-icon" />
              </h3>
              {item.summary && <p className="news-summary">{item.summary}</p>}
              <div className="news-footer">
                <span className="news-source">{item.source}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
