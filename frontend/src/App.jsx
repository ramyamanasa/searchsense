import { useState, useEffect, useRef } from "react";
import axios from "axios";

const SURFACES = ["browser", "bnpl", "ai_chat"];
const SURFACE_LABELS = {
  browser: "Browser",
  bnpl: "BNPL App",
  ai_chat: "AI Chat",
};

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
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIntent("");
      setConfidence(0);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await axios.post("http://127.0.0.1:8000/predict", {
          partial_query: query,
          surface: surface,
        });
        setResults(res.data.results);
        setIntent(res.data.predicted_intent);
        setConfidence(res.data.confidence);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }, 200);
  }, [query, surface]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>SearchSense</h1>
        <p style={styles.subtitle}>
          Real-time intent prediction and ad ranking across search surfaces
        </p>
      </div>

      {/* Surface Toggle */}
      <div style={styles.surfaceRow}>
        {SURFACES.map((s) => (
          <button
            key={s}
            onClick={() => setSurface(s)}
            style={{
              ...styles.surfaceBtn,
              ...(surface === s ? styles.surfaceBtnActive : {}),
            }}
          >
            {SURFACE_LABELS[s]}
          </button>
        ))}
      </div>
      <p style={styles.surfaceDesc}>{SURFACE_DESCRIPTIONS[surface]}</p>

      {/* Search Bar */}
      <div style={styles.searchWrapper}>
        <input
          type="text"
          placeholder="Start typing a search query..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={styles.input}
          autoFocus
        />
        {loading && <span style={styles.loadingDot}>...</span>}
      </div>

      {/* Intent Panel */}
      {intent && (
        <div style={styles.intentPanel}>
          <span style={styles.intentLabel}>Predicted Intent</span>
          <span style={styles.intentValue}>{intent}</span>
          <span style={styles.intentConf}>
            {(confidence * 100).toFixed(1)}% pCTR
          </span>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div style={styles.resultsContainer}>
          <p style={styles.resultsHeader}>Ranked Ad Candidates</p>
          {results.map((r, i) => (
            <div key={i} style={styles.resultCard}>
              <div style={styles.resultTop}>
                <span style={styles.resultRank}>#{i + 1}</span>
                <span style={styles.resultQuery}>{r.full_query}</span>
              </div>
              <div style={styles.resultMetrics}>
                <span style={styles.metric}>
                  pCTR: <strong>{(r.pctr * 100).toFixed(1)}%</strong>
                </span>
                <span style={styles.metric}>
                  Similarity: <strong>{(r.similarity * 100).toFixed(1)}%</strong>
                </span>
                <span style={styles.metric}>
                  Score: <strong>{r.rank_score.toFixed(4)}</strong>
                </span>
              </div>
              <div style={styles.progressBar}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${r.rank_score * 300}%`,
                    maxWidth: "100%",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {!query && (
        <div style={styles.placeholder}>
          <p>Try typing "best lapt" or "wireless head" and switch surfaces to see rankings shift</p>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#0f1117",
    color: "#ffffff",
    fontFamily: "'Inter', sans-serif",
    padding: "40px 20px",
    maxWidth: "720px",
    margin: "0 auto",
  },
  header: {
    marginBottom: "32px",
  },
  title: {
    fontSize: "32px",
    fontWeight: "700",
    margin: "0 0 8px 0",
    color: "#4fc9a4",
  },
  subtitle: {
    fontSize: "14px",
    color: "#888",
    margin: 0,
  },
  surfaceRow: {
    display: "flex",
    gap: "12px",
    marginBottom: "8px",
  },
  surfaceBtn: {
    padding: "8px 20px",
    borderRadius: "20px",
    border: "1px solid #333",
    backgroundColor: "transparent",
    color: "#aaa",
    cursor: "pointer",
    fontSize: "13px",
    transition: "all 0.2s",
  },
  surfaceBtnActive: {
    backgroundColor: "#4fc9a4",
    color: "#0f1117",
    border: "1px solid #4fc9a4",
    fontWeight: "600",
  },
  surfaceDesc: {
    fontSize: "12px",
    color: "#555",
    marginBottom: "24px",
  },
  searchWrapper: {
    position: "relative",
    marginBottom: "20px",
  },
  input: {
    width: "100%",
    padding: "16px 20px",
    fontSize: "18px",
    backgroundColor: "#1a1d26",
    border: "1px solid #2a2d3a",
    borderRadius: "12px",
    color: "#ffffff",
    outline: "none",
    boxSizing: "border-box",
  },
  loadingDot: {
    position: "absolute",
    right: "16px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#4fc9a4",
    fontSize: "20px",
  },
  intentPanel: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    backgroundColor: "#1a1d26",
    border: "1px solid #2a2d3a",
    borderRadius: "10px",
    padding: "12px 20px",
    marginBottom: "20px",
  },
  intentLabel: {
    fontSize: "11px",
    color: "#555",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  intentValue: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#4fc9a4",
    flex: 1,
  },
  intentConf: {
    fontSize: "12px",
    color: "#888",
  },
  resultsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  resultsHeader: {
    fontSize: "11px",
    color: "#555",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "4px",
  },
  resultCard: {
    backgroundColor: "#1a1d26",
    border: "1px solid #2a2d3a",
    borderRadius: "10px",
    padding: "14px 18px",
  },
  resultTop: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "8px",
  },
  resultRank: {
    fontSize: "11px",
    color: "#555",
    minWidth: "24px",
  },
  resultQuery: {
    fontSize: "15px",
    fontWeight: "500",
  },
  resultMetrics: {
    display: "flex",
    gap: "16px",
    marginBottom: "8px",
  },
  metric: {
    fontSize: "12px",
    color: "#888",
  },
  progressBar: {
    height: "3px",
    backgroundColor: "#2a2d3a",
    borderRadius: "2px",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4fc9a4",
    borderRadius: "2px",
  },
  placeholder: {
    textAlign: "center",
    color: "#444",
    fontSize: "14px",
    marginTop: "60px",
  },
};
