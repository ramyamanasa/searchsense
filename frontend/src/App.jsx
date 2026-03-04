import { useState, useEffect, useRef } from "react";
import axios from "axios";

const SURFACES = ["browser", "bnpl", "ai_chat"];
const SURFACE_LABELS = { browser: "Browser", bnpl: "BNPL App", ai_chat: "AI Chat" };
const SURFACE_DESCRIPTIONS = {
  browser: "General search intent, early in journey",
  bnpl: "High purchase intent, buying mindset",
  ai_chat: "Conversational search, exploratory",
};

export default function App() {
  const [query, setQuery] = useState("");
  const [surface, setSurface] = useState("browser");
  const [results, setResults] = useState([]);
  const [intent, setIntent] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [loading, setLoading] = useState(false);
  const [shutterOpen, setShutterOpen] = useState(false);
  const [visibleCards, setVisibleCards] = useState([]);
  const debounceRef = useRef(null);

  useEffect(() => {
    setTimeout(() => setShutterOpen(true), 100);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIntent("");
      setConfidence(0);
      setVisibleCards([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setVisibleCards([]);
      try {
        const res = await axios.post("http://127.0.0.1:8000/predict", {
          partial_query: query,
          surface,
        });
        setResults(res.data.results);
        setIntent(res.data.predicted_intent);
        setConfidence(res.data.confidence);
        res.data.results.forEach((_, i) => {
          setTimeout(() => setVisibleCards((prev) => [...prev, i]), i * 80);
        });
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }, 200);
  }, [query, surface]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          background: linear-gradient(135deg, #1a2a3a 0%, #355C7D 40%, #6C5B7B 100%);
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          color: #ffffff;
        }

        .shutter-left, .shutter-right {
          position: fixed;
          top: 0;
          width: 50%;
          height: 100vh;
          background: #0a0a0f;
          z-index: 100;
          transition: transform 0.9s cubic-bezier(0.77, 0, 0.175, 1);
        }
        .shutter-left { left: 0; transform: translateX(0); }
        .shutter-right { right: 0; transform: translateX(0); }
        .shutter-open .shutter-left { transform: translateX(-100%); }
        .shutter-open .shutter-right { transform: translateX(100%); }

        .container {
          max-width: 760px;
          margin: 0 auto;
          padding: 60px 24px 80px;
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.6s ease 0.8s, transform 0.6s ease 0.8s;
        }
        .shutter-open .container {
          opacity: 1;
          transform: translateY(0);
        }

        .header { margin-bottom: 48px; }

        .title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 42px;
          font-weight: 700;
          background: linear-gradient(90deg, #F8B195, #F67280);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 10px;
          letter-spacing: -0.5px;
        }

        .subtitle {
          font-size: 15px;
          color: rgba(255,255,255,0.5);
          font-weight: 300;
          letter-spacing: 0.02em;
        }

        .surface-row {
          display: flex;
          gap: 10px;
          margin-bottom: 10px;
        }

        .surface-btn {
          padding: 10px 24px;
          border-radius: 100px;
          border: 1px solid rgba(255,255,255,0.15);
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.5);
          cursor: pointer;
          font-size: 13px;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 500;
          transition: all 0.25s ease;
          backdrop-filter: blur(10px);
        }
        .surface-btn:hover {
          border-color: rgba(246,114,128,0.5);
          color: #F8B195;
          background: rgba(246,114,128,0.08);
        }
        .surface-btn.active {
          background: linear-gradient(135deg, #F67280, #C06C84);
          border-color: transparent;
          color: #ffffff;
          font-weight: 600;
          box-shadow: 0 4px 20px rgba(246,114,128,0.35);
        }

        .surface-desc {
          font-size: 12px;
          color: rgba(255,255,255,0.3);
          margin-bottom: 28px;
          letter-spacing: 0.03em;
        }

        .search-wrapper {
          position: relative;
          margin-bottom: 24px;
        }

        .search-input {
          width: 100%;
          padding: 18px 24px;
          font-size: 18px;
          font-family: 'Space Grotesk', sans-serif;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 16px;
          color: #ffffff;
          outline: none;
          backdrop-filter: blur(20px);
          transition: border-color 0.25s, box-shadow 0.25s;
        }
        .search-input:focus {
          border-color: rgba(246,114,128,0.5);
          box-shadow: 0 0 0 3px rgba(246,114,128,0.1);
        }
        .search-input::placeholder { color: rgba(255,255,255,0.25); }

        .loading-indicator {
          position: absolute;
          right: 18px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          gap: 4px;
        }
        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #F67280;
          animation: bounce 0.8s infinite;
        }
        .dot:nth-child(2) { animation-delay: 0.15s; }
        .dot:nth-child(3) { animation-delay: 0.3s; }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }

        .intent-panel {
          display: flex;
          align-items: center;
          gap: 14px;
          background: rgba(248,177,149,0.08);
          border: 1px solid rgba(248,177,149,0.2);
          border-radius: 14px;
          padding: 14px 20px;
          margin-bottom: 24px;
          backdrop-filter: blur(10px);
        }
        .intent-label {
          font-size: 10px;
          color: rgba(255,255,255,0.3);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          white-space: nowrap;
          font-family: 'Space Grotesk', sans-serif;
        }
        .intent-value {
          font-size: 15px;
          font-weight: 600;
          color: #F8B195;
          flex: 1;
          font-family: 'Space Grotesk', sans-serif;
        }
        .intent-conf {
          font-size: 12px;
          color: rgba(255,255,255,0.4);
          white-space: nowrap;
        }

        .results-header {
          font-size: 10px;
          color: rgba(255,255,255,0.25);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          margin-bottom: 12px;
          font-family: 'Space Grotesk', sans-serif;
        }

        .results-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .result-card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 16px 20px;
          backdrop-filter: blur(10px);
          cursor: default;
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 0.3s ease, transform 0.3s ease,
                      background 0.25s ease, border-color 0.25s ease,
                      box-shadow 0.25s ease;
        }
        .result-card.visible {
          opacity: 1;
          transform: translateY(0);
        }
        .result-card:hover {
          background: rgba(255,255,255,0.09);
          border-color: rgba(246,114,128,0.25);
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
          transform: translateY(-2px);
        }

        .result-top {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 10px;
        }
        .result-rank {
          font-size: 11px;
          color: rgba(255,255,255,0.25);
          font-family: 'Space Grotesk', sans-serif;
          min-width: 24px;
        }
        .result-query {
          font-size: 15px;
          font-weight: 500;
          font-family: 'Space Grotesk', sans-serif;
          color: rgba(255,255,255,0.9);
        }

        .result-metrics {
          display: flex;
          gap: 20px;
          margin-bottom: 10px;
        }
        .metric {
          font-size: 12px;
          color: rgba(255,255,255,0.35);
        }
        .metric strong {
          color: rgba(255,255,255,0.7);
          font-weight: 500;
        }

        .progress-track {
          height: 3px;
          background: rgba(255,255,255,0.08);
          border-radius: 2px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          border-radius: 2px;
          background: linear-gradient(90deg, #F67280, #F8B195);
          transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .placeholder {
          text-align: center;
          color: rgba(255,255,255,0.2);
          font-size: 14px;
          margin-top: 80px;
          line-height: 1.7;
          font-style: italic;
        }
      `}</style>

      <div className={shutterOpen ? "shutter-open" : ""}>
        <div className="shutter-left" />
        <div className="shutter-right" />

        <div className="container">
          <div className="header">
            <h1 className="title">SearchSense</h1>
            <p className="subtitle">
              Real-time intent prediction and ad ranking across search surfaces
            </p>
          </div>

          <div className="surface-row">
            {SURFACES.map((s) => (
              <button
                key={s}
                className={`surface-btn ${surface === s ? "active" : ""}`}
                onClick={() => setSurface(s)}
              >
                {SURFACE_LABELS[s]}
              </button>
            ))}
          </div>
          <p className="surface-desc">{SURFACE_DESCRIPTIONS[surface]}</p>

          <div className="search-wrapper">
            <input
              className="search-input"
              type="text"
              placeholder="Start typing a search query..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            {loading && (
              <div className="loading-indicator">
                <div className="dot" />
                <div className="dot" />
                <div className="dot" />
              </div>
            )}
          </div>

          {intent && (
            <div className="intent-panel">
              <span className="intent-label">Predicted Intent</span>
              <span className="intent-value">{intent}</span>
              <span className="intent-conf">
                {(confidence * 100).toFixed(1)}% pCTR
              </span>
            </div>
          )}

          {results.length > 0 && (
            <>
              <p className="results-header">Ranked Ad Candidates</p>
              <div className="results-list">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className={`result-card ${visibleCards.includes(i) ? "visible" : ""}`}
                  >
                    <div className="result-top">
                      <span className="result-rank">#{i + 1}</span>
                      <span className="result-query">{r.full_query}</span>
                    </div>
                    <div className="result-metrics">
                      <span className="metric">
                        pCTR: <strong>{(r.pctr * 100).toFixed(1)}%</strong>
                      </span>
                      <span className="metric">
                        Similarity: <strong>{(r.similarity * 100).toFixed(1)}%</strong>
                      </span>
                      <span className="metric">
                        Score: <strong>{r.rank_score.toFixed(4)}</strong>
                      </span>
                    </div>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{
                          width: visibleCards.includes(i)
                            ? `${Math.min(r.rank_score * 400, 100)}%`
                            : "0%",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {!query && (
            <p className="placeholder">
              Try typing "best lapt" or "wireless head"<br />
              Switch surfaces to see rankings shift in real time
            </p>
          )}
        </div>
      </div>
    </>
  );
}