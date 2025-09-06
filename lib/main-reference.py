from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import httpx
from bs4 import BeautifulSoup
from typing import List, Dict, Optional, Any
import asyncio
import re
from urllib.parse import urljoin, urlparse
from models import SearchResult, EpisodeResult, StreamResult, SeasonResult
from scrapers import AnimeWorldScraper, AnimeSaturnScraper
from utils import detect_duplicates

app = FastAPI(
    title="Anime Scraper API",
    description="API for scraping anime data from multiple sources",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize scrapers
animeworld_scraper = AnimeWorldScraper()
animesaturn_scraper = AnimeSaturnScraper()

@app.get("/")
async def root():
    return {"message": "Anime Scraper API", "version": "1.0.0"}

@app.get("/search", response_model=List[SearchResult])
async def search_anime(q: str = Query(..., description="Search query for anime")):
    """
    Search for anime across multiple sources and return unified results.
    """
    print(f"[v0] Search endpoint called with query: '{q}'")
    
    if not q or len(q.strip()) < 2:
        print("[v0] Query too short, raising HTTPException")
        raise HTTPException(status_code=400, detail="Query must be at least 2 characters long")
    
    try:
        print("[v0] Starting concurrent scraping tasks")
        # Scrape from both sources concurrently
        tasks = [
            animeworld_scraper.search(q),
            animesaturn_scraper.search(q)
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        print(f"[v0] Raw results from scrapers: {results}")
        
        animeworld_results = results[0] if not isinstance(results[0], Exception) else []
        animesaturn_results = results[1] if not isinstance(results[1], Exception) else []
        
        print(f"[v0] AnimeWorld results count: {len(animeworld_results)}")
        print(f"[v0] AnimeSaturn results count: {len(animesaturn_results)}")
        print(f"[v0] AnimeWorld results: {animeworld_results}")
        print(f"[v0] AnimeSaturn results: {animesaturn_results}")
        
        # Combine and deduplicate results
        unified_results = detect_duplicates(animeworld_results, animesaturn_results)
        print(f"[v0] Unified results after deduplication: {unified_results}")
        print(f"[v0] Final unified results count: {len(unified_results)}")
        
        return unified_results
        
    except Exception as e:
        print(f"[v0] Exception in search endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@app.get("/episodes", response_model=List[EpisodeResult])
async def get_episodes(
    AW: Optional[str] = Query(None, description="AnimeWorld anime ID"),
    AS: Optional[str] = Query(None, description="AnimeSaturn anime ID")
):
    """
    Get episode list for anime from specified sources.
    """
    print(f"[v0] Episodes endpoint called with AW: {AW}, AS: {AS}")
    
    if not AW and not AS:
        print("[v0] No IDs provided, raising HTTPException")
        raise HTTPException(status_code=400, detail="At least one source ID (AW or AS) must be provided")
    
    try:
        tasks = []
        
        if AW:
            print(f"[v0] Adding AnimeWorld task for ID: {AW}")
            tasks.append(animeworld_scraper.get_episodes(AW))
        if AS:
            print(f"[v0] Adding AnimeSaturn task for ID: {AS}")
            tasks.append(animesaturn_scraper.get_episodes(AS))
        
        print(f"[v0] Running {len(tasks)} episode scraping tasks")
        results = await asyncio.gather(*tasks, return_exceptions=True)
        print(f"[v0] Raw episode results: {results}")
        
        # Process results
        all_episodes = {}
        source_names = []
        
        if AW and len(results) > 0 and not isinstance(results[0], Exception):
            print(f"[v0] Processing AnimeWorld episodes: {results[0]}")
            source_names.append("AnimeWorld")
            for ep in results[0]:
                ep_num = ep["episode_number"]
                if ep_num not in all_episodes:
                    all_episodes[ep_num] = {"episode_number": ep_num, "sources": {}}
                all_episodes[ep_num]["sources"]["AnimeWorld"] = {
                    "available": True,
                    "url": ep.get("url") or ep.get("stream_url"),
                    "id": ep["id"]
                }
        
        if AS and len(results) > (1 if AW else 0) and not isinstance(results[-1], Exception):
            result_idx = 1 if AW else 0
            print(f"[v0] Processing AnimeSaturn episodes: {results[result_idx]}")
            source_names.append("AnimeSaturn")
            
            # AnimeSaturn episodes are simpler - just a flat list
            for ep in results[result_idx]:
                ep_num = ep["episode_number"]
                if ep_num not in all_episodes:
                    all_episodes[ep_num] = {"episode_number": ep_num, "sources": {}}
                all_episodes[ep_num]["sources"]["AnimeSaturn"] = {
                    "available": True,
                    "url": ep.get("url") or ep.get("stream_url"),
                    "id": ep["id"]
                }
        
        print(f"[v0] All episodes before filling missing sources: {all_episodes}")
        
        # Fill in missing sources as unavailable
        for ep_data in all_episodes.values():
            for source in ["AnimeWorld", "AnimeSaturn"]:
                if source not in ep_data["sources"]:
                    ep_data["sources"][source] = {
                        "available": False,
                        "url": None,
                        "id": None
                    }
        
        # Sort by episode number
        sorted_episodes = sorted(all_episodes.values(), key=lambda x: x["episode_number"])
        print(f"[v0] Final sorted episodes: {sorted_episodes}")
        print(f"[v0] Final episodes count: {len(sorted_episodes)}")
        
        return sorted_episodes
        
    except Exception as e:
        print(f"[v0] Exception in episodes endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get episodes: {str(e)}")

@app.get("/stream", response_model=StreamResult)
async def get_stream_urls(
    AW: Optional[str] = Query(None, description="AnimeWorld episode ID"),
    AS: Optional[str] = Query(None, description="AnimeSaturn episode ID")
):
    """
    Get streaming URLs for specific episode from specified sources.
    """
    if not AW and not AS:
        raise HTTPException(status_code=400, detail="At least one episode ID (AW or AS) must be provided")
    
    try:
        tasks = []
        if AW:
            tasks.append(animeworld_scraper.get_stream_url(AW))
        if AS:
            tasks.append(animesaturn_scraper.get_stream_url(AS))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        stream_result = {
            "AnimeWorld": {"available": False, "stream_url": None, "embed": None},
            "AnimeSaturn": {"available": False, "stream_url": None, "embed": None}
        }
        
        # Process AnimeWorld result
        if AW and len(results) > 0 and not isinstance(results[0], Exception) and results[0]:
            url = results[0] if isinstance(results[0], str) else results[0].get("stream_url")
            stream_result["AnimeWorld"] = {
                "available": True,
                "stream_url": url,
                "embed": f'<iframe src="{url}" width="560" height="315" scrolling="no" frameborder="0" allowfullscreen></iframe>' if url else None
            }
        
        if AS and len(results) > (1 if AW else 0) and not isinstance(results[-1], Exception):
            result_idx = 1 if AW else 0
            data = results[result_idx]
            if data:
                url = data if isinstance(data, str) else data.get("stream_url")
                provider = data.get("provider") if isinstance(data, dict) else "AnimeSaturn"
                embed_html = data.get("embed") if isinstance(data, dict) else None
                
                # Use the embed from AnimeSaturn scraper if available
                if not embed_html and url:
                    proxy_url = f"https://animesaturn-proxy.onrender.com/proxy?url={url}"
                    embed_html = f'''<video 
    src="{proxy_url}" 
    class="w-full h-full" 
    controls 
    playsinline 
    preload="metadata" 
    autoplay>
</video>'''
                
                stream_result["AnimeSaturn"] = {
                    "available": True,
                    "stream_url": url,
                    "embed": embed_html
                }
        
        return StreamResult(**stream_result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stream URLs: {str(e)}")

@app.get("/seasons", response_model=SeasonResult)
async def get_seasons(
    AW: Optional[str] = Query(None, description="AnimeWorld anime ID"),
    AS: Optional[str] = Query(None, description="AnimeSaturn anime ID")
):
    """
    Get episodes organized by seasons from specified sources.
    """
    print(f"[v0] Seasons endpoint called with AW: {AW}, AS: {AS}")
    
    if not AW and not AS:
        print("[v0] No IDs provided, raising HTTPException")
        raise HTTPException(status_code=400, detail="At least one source ID (AW or AS) must be provided")
    
    try:
        tasks = []
        
        if AW:
            print(f"[v0] Adding AnimeWorld task for ID: {AW}")
            tasks.append(animeworld_scraper.get_episodes(AW))
        if AS:
            print(f"[v0] Adding AnimeSaturn task for ID: {AS}")
            tasks.append(animesaturn_scraper.get_episodes(AS))
        
        print(f"[v0] Running {len(tasks)} season scraping tasks")
        results = await asyncio.gather(*tasks, return_exceptions=True)
        print(f"[v0] Raw season results: {results}")
        
        season_result = {
            "AnimeWorld": [],
            "AnimeSaturn": {}
        }
        
        # Process AnimeWorld result (flat list)
        if AW and len(results) > 0 and not isinstance(results[0], Exception):
            print(f"[v0] Processing AnimeWorld seasons: {results[0]}")
            for ep in results[0]:
                episode = {
                    "episode_number": ep["episode_number"],
                    "sources": {
                        "AnimeWorld": {
                            "available": True,
                            "url": ep.get("url") or ep.get("stream_url"),
                            "id": ep["id"]
                        },
                        "AnimeSaturn": {
                            "available": False,
                            "url": None,
                            "id": None
                        }
                    }
                }
                season_result["AnimeWorld"].append(episode)
        
        if AS and len(results) > (1 if AW else 0) and not isinstance(results[-1], Exception):
            result_idx = 1 if AW else 0
            as_data = results[result_idx]
            print(f"[v0] Processing AnimeSaturn seasons data: {as_data}")
            print(f"[v0] AnimeSaturn data type: {type(as_data)}")
            
            # AnimeSaturn episodes are simpler - just put in S1
            print("[v0] AnimeSaturn data is flat list, organizing into S1")
            season_episodes = []
            for ep in as_data:
                episode = {
                    "episode_number": ep["episode_number"],
                    "sources": {
                        "AnimeWorld": {
                            "available": False,
                            "url": None,
                            "id": None
                        },
                        "AnimeSaturn": {
                            "available": True,
                            "url": ep.get("url") or ep.get("stream_url"),
                            "id": ep["id"]
                        }
                    }
                }
                season_episodes.append(episode)
            season_result["AnimeSaturn"]["S1"] = season_episodes
        
        print(f"[v0] Final season result: {season_result}")
        print(f"[v0] AnimeWorld episodes count: {len(season_result['AnimeWorld'])}")
        print(f"[v0] AnimeSaturn seasons: {list(season_result['AnimeSaturn'].keys())}")
        
        return SeasonResult(**season_result)
        
    except Exception as e:
        print(f"[v0] Exception in seasons endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get seasons: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
