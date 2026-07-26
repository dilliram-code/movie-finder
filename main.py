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

TITLE_TO_IDX: Optional[Dict[str, str]] = None 