import os 
import pickle 
from typing import Optional, List, Dict, Any, Tuple

import numpy as np 
import pandas as pd 
import httpx 
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()
TMDB_API_KEY = os.getenv("TMDB_API_KEY")

TMDB_BASE = "https://api.themoviedb.org/3"
TMDB_IMG_500 = "https://image.tmdb.org/t/p/w500"

if not TMDB_API_KEY:
  raise RuntimeError("TMDB_API_KEY missing. Put it in .env as TMDB_API_KEY=xxxx")

# create fastapi app 

app = FastAPI(title="Movie Recommender API", version="1.0")

app.add_middleware(
  CORSMiddleware,
  allow_origings = ["*"],   # for local streamlit
  allow_credentials = True,
  allow_methods = ["*"],
  allow_headers = ["*"]
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DF_PATH = os.path.join(BASE_DIR, "model/df.pkl")
INDICES_PATH = os.path.join(BASE_DIR, "model/indices.pkl")
TFIDF_MATRIX_PATH = os.path.join(BASE_DIR, "tfidf_matrix.pkl")
TFIDF_PATH = os.path.join(BASE_DIR, "tfidf.pkl")

df: Optional[pd.DataFrame] = None 
indices_obj: Any = None 
tfidf_matrix: Any = None 

TITLE_TO_IDX: Optional[Dict[str, int]] = None 

class TMDBMovieCard(BaseModel):
  tmdb_id:int 
  title: str 
  poster_url: Optional[str] = None 
  release_date: Optional[float] = None 
  vote_average: Optional[float] = None  

class TMDBMovieDetails(BaseModel):
  tmdb_id: int 
  title: str 
  overview: Optional[str] = None 
  release_date: Optional[str] = None 
  poster_url: Optional[str] = None 
  backdrop_url: Optional[str] = None 
  genres: List[dict] = []

class TFIDFRecItem(BaseModel):
  title: str 
  score: float 
  tmdb: Optional[TMDBMovieCard] = None 

class SearchBundleResponse(BaseModel):
  query: str 
  movie_details: TMDBMovieDetails
  tfidf_recommendations: List[TFIDFRecItem]
  genre_recommendations: List[TMDBMovieDetails]
  

def _norm_title(t: str) -> str:
  return str(t).strip().lower()

def make_img_url(path: Optional[str]) -> Optional[str]:
  if not path:
    return None 
  return f"{TMDB_IMG_500}{path}"

