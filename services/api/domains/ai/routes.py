"""
AI Domain — Routes (PLACEHOLDER — Month 9+)

This domain handles all AI/ML features:

1. EMBEDDINGS
   Every item gets a 512-dimensional embedding vector computed from:
   - Product image (CLIP ViT-B/32)
   - Product name + category text (text encoder)
   
   Stored in: items.embedding (pgvector column, vector(512))
   Used for: similarity search, "complete the look"

2. RECOMMENDATION PIPELINE
   Input: user's liked sets + item library + browsing history
   Output: ranked list of sets/items to surface in feed
   
   Algorithm at launch: collaborative filtering (user-item matrix)
   At scale: two-tower neural retrieval (like YouTube DNN)
   
   Infrastructure: 
   - Training: GitHub Actions nightly job (small model, CPU OK)
   - Serving: FastAPI endpoint with pre-computed scores in Redis
   - Cold start: fallback to trending/aesthetic-match for new users

3. "COMPLETE THE LOOK"
   Given items already on a canvas, suggest complementary items.
   
   Implementation:
   - Encode current canvas items → average embedding
   - Nearest-neighbor search in pgvector
   - Filter by category balance (don't suggest 3rd pair of shoes)
   - Return top 5 suggestions from user's library + trending items
   
   UI: "Add to your look" panel in the canvas properties sidebar

4. AESTHETIC CLASSIFIER
   Automatically tag sets with aesthetics (Quiet Luxury, Y2K, etc.)
   using a fine-tuned vision classifier.
   
   Training data: sets manually tagged during beta (seed with ~500 labeled sets)
   Model: CLIP zero-shot at launch → fine-tuned ResNet-50 at Month 12+

WHY THIS IS MONTH 9+:
   - Needs sufficient user data to be useful (cold start problem)
   - Canvas + Commerce must be proven first (Core product > AI features)
   - CLIP inference is CPU-viable but adds 200ms latency — needs profiling
   - pgvector similarity search needs an HNSW index (fast) not a full table scan

MILESTONE: Ship when we have 10K+ items in the database.
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/status")
async def ai_status():
    """AI domain status — placeholder until Month 9 implementation."""
    return {
        "status": "coming_soon",
        "eta": "Month 9",
        "planned_features": [
            "item_embeddings",
            "complete_the_look",
            "feed_recommendations",
            "aesthetic_auto_tagging",
        ],
    }
