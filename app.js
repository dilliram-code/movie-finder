// =====================================================================
// CINEMATCH — frontend logic (plain JS, no framework)

// =====================================================================
const API_BASE = "http://127.0.0.1:8000";

// TMDB image sizes for the raw /tmdb/search response, which returns
// bare poster_path strings (e.g. "/abc123.jpg") instead of full URLs —
// unlike the backend's own card models, which already build the URL.
const TMDB_IMG_SMALL = "https://image.tmdb.org/t/p/w154";

// ---------------------------------------------------------------------
// Small DOM helpers so the rest of the file reads like plain English
// ---------------------------------------------------------------------
const $ = (selector) => document.querySelector(selector);

/** Create an element, optionally with a className and innerHTML. */
function make(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

/** Runs `fn` only after the user has stopped typing for `wait` ms. */
function debounce(fn, wait) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

/** Pulls just the year out of a "YYYY-MM-DD" release date string. */
function yearOf(dateStr) {
  return dateStr ? dateStr.slice(0, 4) : "—";
}

// ---------------------------------------------------------------------
// Toasts — used whenever the backend errors out (movie not found,
// TMDB request failed, server unreachable, etc.)
// ---------------------------------------------------------------------
function showToast(message) {
  const container = $("#toastContainer");
  const toast = make("div", "toast", message);
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("is-leaving");
    setTimeout(() => toast.remove(), 320);
  }, 3400);
}

/**
 * Wraps fetch() so every API call in this file gets the same
 * error handling: a friendly toast instead of a silent console error.
 */
async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch (_) {
      /* response wasn't JSON — keep statusText */
    }
    throw new Error(detail);
  }
  return res.json();
}

// ---------------------------------------------------------------------
// Movie card factory — used by both the main grid and the two
// horizontally-scrolling recommendation rows in the detail overlay.
// ---------------------------------------------------------------------
function ratingRingColor(vote) {
  if (vote >= 7) return "#2de2e6"; // cyan  = well liked
  if (vote >= 5) return "#ffc857"; // gold  = middling
  return "#ff2e9a";                // magenta = poorly rated
}

/**
 * `movie` follows the backend's TMDBMovieCard shape:
 * { tmdb_id, title, poster_url, release_date, vote_average }
 * `matchLabel` is optional text (e.g. "92% match") shown as a footer ribbon.
 * `isRec` marks a card as part of a horizontal recommendation row (narrower,
 * fixed-width) rather than the main grid.
 */
function buildMovieCard(movie, { matchLabel, isRec = false } = {}) {
  const card = make("div", "movie-card" + (isRec ? " rec-card is-visible" : ""));

  const posterWrap = make("div", "card-poster-wrap");
  if (movie.poster_url) {
    const img = make("img");
    img.src = movie.poster_url;
    img.alt = movie.title;
    img.loading = "lazy";
    posterWrap.appendChild(img);
  } else {
    posterWrap.appendChild(make("div", "card-noimg", "🎬<br>No poster"));
  }

  if (movie.vote_average !== undefined && movie.vote_average !== null) {
    const pct = Math.round(movie.vote_average * 10);
    const ring = make("div", "rating-ring");
    ring.style.setProperty("--pct", pct);
    ring.style.setProperty("--ring-color", ratingRingColor(movie.vote_average));
    ring.appendChild(make("span", null, movie.vote_average.toFixed(1)));
    posterWrap.appendChild(ring);
  }

  if (matchLabel) {
    posterWrap.appendChild(make("div", "match-badge", matchLabel));
  }

  card.appendChild(posterWrap);

  const info = make("div", "card-info");
  info.appendChild(make("p", "card-title", movie.title));
  info.appendChild(make("span", "card-year", yearOf(movie.release_date)));
  card.appendChild(info);

  // The cursor-tracked glass sheen (see .movie-card::after in styles.css)
  card.addEventListener("mousemove", (e) => {
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    card.style.setProperty("--my", `${e.clientY - rect.top}px`);
  });

  card.addEventListener("click", () => openDetail(movie.title));
  return card;
}

function revealOnScroll(container) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );
  container.querySelectorAll(".movie-card").forEach((card) => observer.observe(card));
}

function renderSkeletons(container, count) {
  container.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const sk = make("div", "skeleton");
    sk.appendChild(make("div", "sk-poster"));
    sk.appendChild(make("div", "sk-line"));
    sk.appendChild(make("div", "sk-line short"));
    container.appendChild(sk);
  }
}

// ---------------------------------------------------------------------
// Home feed — GET /home?category=&limit=
// ---------------------------------------------------------------------
const FEED_LABELS = {
  trending: ["Trending Today", "what everyone's watching right now"],
  popular: ["Popular Picks", "crowd favourites"],
  top_rated: ["Top Rated", "the best of all time, by score"],
  upcoming: ["Coming Soon", "not out yet — get ready"],
  now_playing: ["Now Playing", "in theatres this week"],
};

async function loadHome(category) {
  const grid = $("#movieGrid");
  const [title, sub] = FEED_LABELS[category];
  $("#feedTitle").textContent = title;
  $("#feedSub").textContent = sub;
  renderSkeletons(grid, 12);

  try {
    const movies = await apiGet(`/home?category=${category}&limit=24`);
    grid.innerHTML = "";
    if (!movies.length) {
      grid.appendChild(make("p", "rec-empty", "Nothing to show here yet."));
      return;
    }
    movies.forEach((m) => grid.appendChild(buildMovieCard(m)));
    revealOnScroll(grid);
  } catch (err) {
    grid.innerHTML = "";
    showToast(`Couldn't load "${title}": ${err.message}`);
  }
}

function initCategoryPills() {
  const pills = $("#categoryPills");
  pills.addEventListener("click", (e) => {
    const btn = e.target.closest(".pill");
    if (!btn) return;
    pills.querySelectorAll(".pill").forEach((p) => p.classList.remove("is-active"));
    btn.classList.add("is-active");
    loadHome(btn.dataset.category);
  });
}

// ---------------------------------------------------------------------
// Search suggestions — GET /tmdb/search?query=&page=
// The raw TMDB shape uses poster_path (not a full URL), so we build
// the image URL ourselves here. This one function powers BOTH the
// small navbar search and the big hero search, so they behave
// identically — attach it to any (input, box) pair.
// ---------------------------------------------------------------------
function attachSearchSuggestions(input, box) {
  let focusedIndex = -1;

  const closeBox = () => {
    box.hidden = true;
    box.innerHTML = "";
    focusedIndex = -1;
    input.setAttribute("aria-expanded", "false");
  };

  const pick = (title) => {
    input.value = title;
    closeBox();
    openDetail(title);
  };

  const runSearch = debounce(async (query) => {
    if (query.trim().length < 2) return closeBox();
    try {
      const data = await apiGet(`/tmdb/search?query=${encodeURIComponent(query)}&page=1`);
      const results = (data.results || []).slice(0, 6);
      box.innerHTML = "";
      if (!results.length) {
        box.appendChild(make("div", "s-empty", `No matches for "${query}"`));
      } else {
        results.forEach((m) => {
          const item = make("div", "suggestion-item");
          if (m.poster_path) {
            const img = make("img");
            img.src = `${TMDB_IMG_SMALL}${m.poster_path}`;
            img.alt = "";
            item.appendChild(img);
          } else {
            item.appendChild(make("div", "s-noimg", "🎬"));
          }
          const text = make("div");
          text.appendChild(make("p", "s-title", m.title));
          text.appendChild(make("span", "s-year", yearOf(m.release_date)));
          item.appendChild(text);
          item.addEventListener("click", () => pick(m.title));
          box.appendChild(item);
        });
      }
      box.hidden = false;
      input.setAttribute("aria-expanded", "true");
    } catch (err) {
      closeBox();
    }
  }, 300);

  input.addEventListener("input", (e) => runSearch(e.target.value));

  input.addEventListener("keydown", (e) => {
    const items = [...box.querySelectorAll(".suggestion-item")];
    if (e.key === "ArrowDown" && items.length) {
      e.preventDefault();
      focusedIndex = (focusedIndex + 1) % items.length;
      items.forEach((it, i) => it.classList.toggle("is-focused", i === focusedIndex));
    } else if (e.key === "ArrowUp" && items.length) {
      e.preventDefault();
      focusedIndex = (focusedIndex - 1 + items.length) % items.length;
      items.forEach((it, i) => it.classList.toggle("is-focused", i === focusedIndex));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (focusedIndex >= 0 && items[focusedIndex]) {
        items[focusedIndex].click();
      } else if (input.value.trim()) {
        closeBox();
        openDetail(input.value.trim());
      }
    } else if (e.key === "Escape") {
      closeBox();
      input.blur();
    }
  });

  document.addEventListener("click", (e) => {
    if (!box.hidden && !box.contains(e.target) && e.target !== input) closeBox();
  });
}

function initSearchBoxes() {
  attachSearchSuggestions($("#searchInput"), $("#suggestions"));
  attachSearchSuggestions($("#heroSearchInput"), $("#heroSuggestions"));

  // The hero "Search" button is a third way to trigger the same lookup,
  // for people who type a full title and just want to hit go.
  $("#heroSearchBtn").addEventListener("click", () => {
    const value = $("#heroSearchInput").value.trim();
    if (value) {
      $("#heroSuggestions").hidden = true;
      openDetail(value);
    }
  });
}

// ---------------------------------------------------------------------
// Detail overlay — GET /movie/search?query=&tfidf_top_n=&genre_limit=
// This single "bundle" endpoint returns the movie's own details plus
// both flavours of recommendation, so one fetch fills the whole panel.
// ---------------------------------------------------------------------
function detailSkeletonHTML() {
  return `
    <div class="detail-hero">
      <div class="skeleton detail-poster"><div class="sk-poster" style="aspect-ratio:auto;height:100%"></div></div>
      <div style="flex:1">
        <div class="sk-line" style="width:60%;height:40px;margin-left:0"></div>
        <div class="sk-line" style="width:30%;margin-left:0"></div>
        <div class="sk-line" style="width:90%;margin-left:0;margin-top:20px"></div>
        <div class="sk-line" style="width:80%;margin-left:0"></div>
      </div>
    </div>`;
}

async function openDetail(query) {
  const overlay = $("#detailOverlay");
  const backdrop = $("#detailBackdrop");
  const content = $("#detailContent");

  backdrop.style.backgroundImage = "none";
  content.innerHTML = detailSkeletonHTML();
  overlay.classList.add("is-open");
  overlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  try {
    const bundle = await apiGet(
      `/movie/search?query=${encodeURIComponent(query)}&tfidf_top_n=12&genre_limit=12`
    );
    renderDetail(bundle);
  } catch (err) {
    closeDetail();
    showToast(`No match found for "${query}": ${err.message}`);
  }
}

/**
 * Combines the two recommendation sources the backend returns into one
 * ranked, de-duplicated list:
 *   1. TF-IDF content matches first (already ranked by similarity score) —
 *      these are the "reads like the same story" matches.
 *   2. Genre-discovery results fill in the rest, skipping anything already
 *      included — these are the "same genre, popular" matches.
 * This way the searched movie is always followed by a real, sequential
 * list of similar movies, even when the local TF-IDF dataset doesn't
 * contain that particular title.
 */
function buildSimilarList(tfidfItems, genreItems, targetCount = 16) {
  const seenIds = new Set();
  const similar = [];

  tfidfItems.forEach((item) => {
    if (item.tmdb && !seenIds.has(item.tmdb.tmdb_id)) {
      seenIds.add(item.tmdb.tmdb_id);
      const pct = Math.round(Math.min(item.score, 1) * 100);
      similar.push({ movie: item.tmdb, matchLabel: `${pct}% match` });
    }
  });

  for (const m of genreItems) {
    if (similar.length >= targetCount) break;
    if (!seenIds.has(m.tmdb_id)) {
      seenIds.add(m.tmdb_id);
      similar.push({ movie: m, matchLabel: null });
    }
  }
  return similar;
}

function renderDetail(bundle) {
  const details = bundle.movie_details;
  const backdrop = $("#detailBackdrop");
  const content = $("#detailContent");

  backdrop.style.backgroundImage = `url("${details.backdrop_url || details.poster_url || ""}")`;

  content.innerHTML = "";

  // --- hero row: poster + title/meta/overview ---
  const hero = make("div", "detail-hero");

  const posterBox = make("div", "detail-poster");
  if (details.poster_url) {
    const img = make("img");
    img.src = details.poster_url;
    img.alt = details.title;
    posterBox.appendChild(img);
  }
  hero.appendChild(posterBox);

  const info = make("div", "detail-info");
  info.appendChild(make("h1", "detail-title", details.title));

  const meta = make("div", "detail-meta");
  meta.appendChild(make("span", "detail-year", yearOf(details.release_date)));
  (details.genres || []).forEach((g) => meta.appendChild(make("span", "genre-chip", g.name)));
  info.appendChild(meta);

  if (details.overview) {
    info.appendChild(make("p", "detail-overview", details.overview));
  }
  hero.appendChild(info);
  content.appendChild(hero);

  // --- Similar Movies: TF-IDF matches first, genre picks fill the rest ---
  const genreName = details.genres && details.genres[0] ? details.genres[0].name : null;
  const similar = buildSimilarList(bundle.tfidf_recommendations || [], bundle.genre_recommendations || []);

  const recSection = make("div", "rec-section");
  recSection.appendChild(make("h3", "rec-heading", "Similar Movies"));
  recSection.appendChild(
    make(
      "span",
      "rec-sub",
      genreName ? `Ranked by content similarity, filled out with ${genreName} picks` : "Ranked by content similarity"
    )
  );
  recSection.appendChild(make("span", "rec-divider"));
  const recRow = make("div", "rec-row");
  if (!similar.length) {
    recRow.appendChild(make("p", "rec-empty", "No similar movies found for this title yet."));
  } else {
    similar.forEach(({ movie, matchLabel }) => {
      recRow.appendChild(buildMovieCard(movie, { matchLabel, isRec: true }));
    });
  }
  recSection.appendChild(recRow);
  content.appendChild(recSection);
}

function closeDetail() {
  const overlay = $("#detailOverlay");
  overlay.classList.remove("is-open");
  overlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function initDetailOverlay() {
  $("#closeDetail").addEventListener("click", closeDetail);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && $("#detailOverlay").classList.contains("is-open")) closeDetail();
  });
  // clicking the dark scrim (but not the content itself) also closes it
  $("#detailOverlay").addEventListener("click", (e) => {
    if (e.target.id === "detailOverlay" || e.target.classList.contains("detail-scrim")) closeDetail();
  });
}

// ---------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  initCategoryPills();
  initSearchBoxes();
  initDetailOverlay();
  loadHome("trending");
});
