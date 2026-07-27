# 🎬 Movie Finder

A fast and intelligent **Movie Recommendation System** built using **FastAPI** for the backend and **HTML, CSS, and JavaScript** for the frontend. The application recommends movies similar to the one entered by the user using **Content-Based Filtering** powered by **TF-IDF Vectorization** and **Cosine Similarity**.

🌐 **Live Demo:** https://movie-finder-1-6gxf.onrender.com/

📂 **GitHub Repository:** https://github.com/dilliram-code/movie-finder

---

## 📖 Overview

Movie Finder helps users discover movies similar to their favorite ones by analyzing movie metadata. Instead of relying on user ratings, the recommendation engine compares movie descriptions and metadata using Natural Language Processing (NLP).

When a movie title is entered:

- The application searches for the movie.
- Converts movie metadata into TF-IDF vectors.
- Computes the cosine similarity between the selected movie and all other movies.
- Returns the top most similar movie recommendations ranked by similarity score.

---

## ✨ Features

-  Search any movie by title
-  Content-Based Movie Recommendation
-  Cosine Similarity ranking
-  FastAPI REST API backend
-  Pydantic data validation
-  Responsive frontend built with HTML, CSS & JavaScript
-  Deployed on Render
-  Pre-trained recommendation model using Pickle

---

## 🛠️ Tech Stack

### Backend

- FastAPI
- Pydantic
- Pandas
- Scikit-learn
- Pickle

### Frontend

- HTML5
- CSS3
- JavaScript (Vanilla)

### Machine Learning

- TF-IDF Vectorization
- Cosine Similarity
- Content-Based Recommendation System

---

## 📁 Project Structure

```
movie-finder/
│
├── data/
│   └── movies_metadata.csv
│
├── model/
│   ├── df.pkl
│   ├── indices.pkl
│   ├── tfidf.pkl
│   └── tfidf_matrix.pkl
│
├── notebook/
│   └── movie_recommender.ipynb
│
├── index.html
├── styles.css
├── app.js
├── main.py
├── requirements.txt
├── .env
└── README.md
```

---

## ⚙️ How It Works

### Step 1

Movie metadata is cleaned and preprocessed.

### Step 2

TF-IDF Vectorizer transforms movie descriptions into numerical vectors.

### Step 3

The trained vectorizer and processed data are saved using Pickle.

### Step 4

When a user searches for a movie:

- The movie title is located.
- Its TF-IDF vector is retrieved.
- Cosine similarity is calculated against every movie.
- Movies are sorted by similarity score.
- The top recommendations are returned.

---

##  Recommendation Algorithm

```python
def recommend(title, n=10):
    if title not in indices:
        return ["Movie not found"]

    idx = indices[title]
    sim_score = cosine_similarity(tfidf_matrix[idx], tfidf_matrix).flatten()
    similar_idx = sim_score.argsort()[::-1][1:n+1]

    return df["title"].iloc[similar_idx]
```

---

##  Installation

### Clone the repository

```bash
git clone https://github.com/dilliram-code/movie-finder.git
```

```bash
cd movie-finder
```

---

### Create a virtual environment

```bash
python -m venv .venv
```

Activate it

**Windows**

```bash
.venv\Scripts\activate
```

**macOS/Linux**

```bash
source .venv/bin/activate
```

---

### Install dependencies

```bash
pip install -r requirements.txt
```

---

### Run the FastAPI server

```bash
uvicorn main:app --reload
```

Open:

```
http://127.0.0.1:8000
```

---

## 📡 API Endpoint

### POST `/recommend`

Request

```json
{
    "title": "Avatar"
}
```

Response

```json
[
    "Avatar: The Way of Water",
    "John Carter",
    "Titan A.E.",
    "Star Trek",
    "Guardians of the Galaxy"
]
```

---

##  Dataset

The project uses a movie metadata dataset containing movie information such as:

- Title
- Overview
- Genres
- Keywords
- Cast
- Crew

These features are combined and transformed into TF-IDF vectors for similarity computation.

---

## Deployment

The application is deployed on **Render**.

Deployment includes:

- FastAPI Backend
- Static Frontend
- GitHub Integration
- Automatic Deployment on Push

---

## Future Improvements

- Movie posters
- Genre filtering
- Fuzzy search for misspelled titles
- Similarity score display
- Movie details page
- IMDb ratings integration
- Personalized recommendations
- Dark/Light mode

---

## Author

**Dilli Ram Chaudhary**

Passionate about Artificial Intelligence, Machine Learning, Computer Vision, and Full-Stack AI Applications.

GitHub:
https://github.com/dilliram-code

---

## ⭐ Support

If you found this project useful, consider giving it a **⭐ Star** on GitHub. It helps support the project and encourages future improvements.

---

## 📄 License

This project is developed for educational and learning purposes.
