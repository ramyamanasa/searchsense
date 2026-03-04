# SearchSense

Real-time search ad ranking with partial query intent prediction across multiple search surfaces.

Built to simulate the core ML challenges at native search advertising platforms: predicting click intent from incomplete queries, generalizing across surfaces with different user behavior, and ranking ads by predicted value without PII or cookies.

---

## Problem

Search advertising outside of Google and Bing operates under different constraints. Users express intent through partial, evolving queries. The same query typed in a browser, a BNPL app, or an AI chat interface carries different purchase intent signals. A ranking system must account for all of this in real time, with no user identity data.

---

## System Architecture
User types partial query
↓
Sentence Transformer (all-MiniLM-L6-v2)
↓
Cosine Similarity Search over Query Index
↓
Top 5 Candidate Queries Retrieved
↓
Scoring Pipeline per Candidate:

Semantic Similarity (dominant signal)
Surface Affinity (Browser / BNPL / AI Chat)
Commercial Intent Score
Query Completeness Confidence
↓
Ranked Results + pCTR Estimate
↓
React Frontend (live, updates as you type)


---

## Components

### 1. pCTR Model (XGBoost)
Trained on 500K rows from the Criteo Display Advertising Challenge dataset. Baseline logistic regression achieved AUC 0.678. XGBoost achieved AUC 0.775, a 14.3% improvement. Features include frequency-encoded categoricals, log-transformed numerical features, and interaction terms between top predictors.

### 2. Query Expansion via Semantic Search
Partial queries are embedded using a pretrained sentence transformer and matched against a query index using cosine similarity. Resolves "best lapt" to "best laptop under 1000" in real time.

### 3. Surface-Aware Ranking
Each search surface applies a different scoring profile:
- **Browser**: baseline intent, general product search
- **BNPL App**: high purchase intent, price-sensitive queries boosted
- **AI Chat**: exploratory intent, lower immediate purchase probability

### 4. Ranking Score
rank_score = similarity² × surface_affinity × commercial_intent × length_confidence
Semantic similarity is squared to make it the dominant signal. Surface affinity and commercial intent modulate the score based on context.

---

## Dataset

**Criteo Display Advertising Challenge** — 45M ad impressions, 500K sampled for training. Each row represents one ad impression with a binary click label, 13 numerical features, and 26 anonymized categorical features.

Note: Criteo is a display advertising dataset and does not contain query text. The pCTR model captures click behavior patterns from ad impression data. Query-level ranking uses semantic similarity as the primary signal.

---

## Results

| Model | AUC | Log Loss |
|-------|-----|----------|
| Logistic Regression (baseline) | 0.678 | 0.537 |
| XGBoost | 0.775 | 0.565 |
| Improvement | +14.3% | — |

---

## Project Structure
searchsense/
backend/
main.py          # FastAPI prediction endpoint
train.py         # Full model training pipeline
data_loader.py   # Criteo data loading utility
xgb_model.pkl    # Trained XGBoost model
feature_cols.pkl # Feature column names
freq_encoders.pkl# Categorical frequency encoders
data/
dac/             # Raw Criteo dataset
frontend/
src/
App.jsx        # React UI
index.css      # Global styles
notebooks/
01_eda.ipynb
02_feature_engineering.ipynb
03_model_training.ipynb
04_query_expansion.ipynb

---

## Running Locally

**Backend**
```bash
python3 -m venv venv311
source venv311/bin/activate
pip install fastapi uvicorn sentence-transformers scikit-learn xgboost pandas numpy
python3 -m uvicorn backend.main:app
```

**Frontend**
```bash
cd frontend
nvm use 20
npm install
npm run dev
```

Open http://localhost:5173

---

## Limitations

- Query index contains ~60 representative e-commerce queries. In production this would be millions of queries from real search logs.
- Criteo dataset contains no query text. The pCTR model is trained on display ad click patterns, not search-specific signals.
- Surface differences are modeled via scoring profiles, not learned from surface-specific click data.
- No online experimentation framework. Offline AUC improvements would need A/B testing to validate against live CTR.

---

## Relevance to Search Advertising

| SearchSense Component | Analogous Concept |
|----------------------|-------------------|
| Cosine similarity retrieval | Vector-based ad matching |
| pCTR model (XGBoost) | Click probability estimation |
| Surface-aware ranking | Multi-surface intent modeling |
| Partial query expansion | Pre-query intent prediction |

