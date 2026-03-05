from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
import pickle
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

app = FastAPI(title="SearchSense API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Loading models...")

queries = [
    # Laptops & Electronics
    "best laptop under 1000", "best gaming laptop", "best ultrabook 2024",
    "macbook air alternatives", "laptop bag leather", "laptop stand adjustable",
    "best monitor for home office", "mechanical keyboard wireless",
    
    # Phones
    "best smartphone 2024", "best android phone under 500", "iphone 15 review",
    "samsung galaxy s24 review", "best budget phone", "phone case iphone 15",
    "fast charger iphone", "best phone camera 2024",
    
    # Audio
    "wireless noise cancelling headphones", "best earbuds under 100",
    "bluetooth speaker waterproof", "best headphones for gym",
    
    # Fashion & Shoes
    "running shoes for women", "nike running shoes sale", "best walking shoes men",
    "winter jacket men sale", "yoga pants women", "mens winter boots",
    "polarized sunglasses men", "hiking boots waterproof",
    
    # Home & Kitchen
    "best coffee maker 2024", "air fryer recipes", "instant pot deal",
    "standing desk adjustable cheap", "desk lamp led", "air purifier for bedroom",
    "best vacuum cleaner", "robot vacuum under 300",
    
    # Health & Fitness
    "whey protein powder", "best pre workout supplement", "yoga mat thick non slip",
    "protein bars low sugar", "best multivitamin women", "creatine powder",
    
    # Travel
    "cheap flights to miami", "hotel deals new york", "vacation packages cheap",
    "best luggage sets", "travel backpack carry on",
    
    # Smart Home & Gadgets
    "smartwatch fitness tracker", "apple watch alternatives", "smart watch under 200",
    "wireless earbuds", "best smart home devices", "water bottle insulated",
    
    # Skincare & Beauty
    "skincare routine for dry skin", "best vitamin c serum", "face moisturizer spf",
    
    # Office
    "office chair ergonomic cheap", "gaming chair ergonomic", "monitor arm desk mount",
]

embedder = None
query_embeddings = None

def get_embedder():
    global embedder, query_embeddings
    if embedder is None:
        embedder = SentenceTransformer('all-MiniLM-L6-v2')
        query_embeddings = embedder.encode(queries)
    return embedder, query_embeddings

# Query popularity scores — simulates historical click frequency
# In production this comes from real click logs
def compute_commercial_intent(query: str) -> float:
    query_lower = query.lower()
    score = 0.5
    high_intent = ["buy", "cheap", "deal", "price", "under", "sale", "discount", "order", "best"]
    medium_intent = ["top", "review", "compare", "vs", "recommend", "2024"]
    low_intent = ["what", "how", "why", "who", "where", "when", "history", "learn"]
    for word in high_intent:
        if word in query_lower:
            score += 0.15
    for word in medium_intent:
        if word in query_lower:
            score += 0.08
    for word in low_intent:
        if word in query_lower:
            score -= 0.1
    return round(min(max(score, 0.1), 1.0), 3)

QUERY_POPULARITY = {q: compute_commercial_intent(q) for q in queries}

# Surface intent profiles — based on adMarketplace's documented surface behavior
# Browser: general intent, early journey, moderate purchase probability
# BNPL: high purchase intent, buying mindset, actively shopping
# AI Chat: exploratory, conversational, lower immediate purchase intent
SURFACE_PROFILES = {
    "browser": {
        "weight": 1.0,
        "preferred_categories": ["best", "review", "compare", "top"],
        "intent_boost": 1.0
    },
    "bnpl": {
        "weight": 1.4,
        "preferred_categories": ["buy", "cheap", "deal", "price", "under"],
        "intent_boost": 1.5
    },
    "ai_chat": {
        "weight": 0.7,
        "preferred_categories": ["what", "how", "best", "recommend"],
        "intent_boost": 0.6
    },
}


def compute_surface_affinity(query: str, surface: str) -> float:
    """Score how well a query matches a surface's typical intent pattern."""
    profile = SURFACE_PROFILES.get(surface, SURFACE_PROFILES["browser"])
    query_lower = query.lower()
    matches = sum(1 for kw in profile["preferred_categories"] if kw in query_lower)
    affinity = 1.0 + (matches * 0.15)
    return round(affinity * profile["intent_boost"], 4)


def compute_length_confidence(partial: str, full: str) -> float:
    """Shorter partial queries are more ambiguous — lower confidence."""
    completeness = len(partial) / max(len(full), 1)
    return round(min(completeness + 0.3, 1.0), 4)


class SearchRequest(BaseModel):
    partial_query: str
    surface: str


@app.post("/predict")
def predict(request: SearchRequest):
    partial_query = request.partial_query.strip()
    surface = request.surface

    if not partial_query:
        return {"results": [], "predicted_intent": "", "confidence": 0.0}

    # Step 1: Semantic similarity search
    emb, q_embeddings = get_embedder()
    embedding = emb.encode([partial_query])
    similarities = cosine_similarity(embedding, q_embeddings)[0]
    top_indices = similarities.argsort()[-5:][::-1]

    results = []

    for idx in top_indices:
        full_query = queries[idx]
        similarity = float(similarities[idx])

        # Step 2: Surface affinity — how well this query fits this surface
        surface_affinity = compute_surface_affinity(full_query, surface)

        # Step 3: Query popularity — historical click frequency proxy
        popularity = QUERY_POPULARITY.get(full_query, 0.5)

        # Step 4: Length confidence — how complete is the partial query
        length_conf = compute_length_confidence(partial_query, full_query)

        # Step 5: Final ranking score
        # Combines semantic match + surface fit + historical popularity + query completeness
        rank_score = (similarity ** 2) * surface_affinity * popularity * length_conf


        # Step 6: pCTR estimate — normalized rank score as click probability
        pctr = min(rank_score * 1.8, 0.99)

        results.append({
            "full_query": full_query,
            "pctr": round(pctr, 4),
            "similarity": round(similarity, 4),
            "surface_affinity": round(surface_affinity, 4),
            "popularity": round(popularity, 4),
            "rank_score": round(rank_score, 4)
        })

    results = sorted(results, key=lambda x: x["rank_score"], reverse=True)
    predicted_intent = results[0]["full_query"] if results else ""
    confidence = results[0]["pctr"] if results else 0.0

    return {
        "results": results,
        "predicted_intent": predicted_intent,
        "confidence": round(confidence, 4),
        "surface": surface
    }


@app.get("/health")
def health():
    return {"status": "ok"}
