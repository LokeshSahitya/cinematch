import { useState, useEffect, useRef, useCallback } from "react";

/* ─── Google Fonts injection ─────────────────────────────────────────────── */
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href =
  "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap";
document.head.appendChild(fontLink);

/* ─── Global CSS ─────────────────────────────────────────────────────────── */
const globalCSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body {
    background: #0c0b0e;
    color: #e8e0d4;
    font-family: 'DM Sans', sans-serif;
    overflow-x: hidden;
  }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #0c0b0e; }
  ::-webkit-scrollbar-thumb { background: #2a2520; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #c9a84c; }
  ::selection { background: #c9a84c33; color: #f5e6c8; }
  input, button { font-family: inherit; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes pulseGold {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.4; }
  }
  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(100%); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes slideOutRight {
    from { opacity: 1; transform: translateX(0); }
    to   { opacity: 0; transform: translateX(100%); }
  }
  @keyframes popIn {
    0%   { transform: scale(0.85); opacity: 0; }
    70%  { transform: scale(1.08); }
    100% { transform: scale(1);    opacity: 1; }
  }
  @keyframes heartBeat {
    0%   { transform: scale(1); }
    25%  { transform: scale(1.3); }
    50%  { transform: scale(1); }
    75%  { transform: scale(1.15); }
    100% { transform: scale(1); }
  }
  .watchlist-btn-anim { animation: heartBeat 0.4s ease; }
  .watchlist-panel { animation: slideInRight 0.32s cubic-bezier(0.34,1.2,0.64,1) both; }

  .card-hover {
    transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1),
                box-shadow 0.3s ease, border-color 0.2s ease;
  }
  .card-hover:hover {
    transform: translateY(-6px) scale(1.015);
    box-shadow: 0 28px 56px rgba(0,0,0,0.65), 0 0 0 1px rgba(201,168,76,0.2);
  }
  .film-grain::before {
    content: '';
    position: fixed; inset: 0;
    pointer-events: none; z-index: 9999;
    opacity: 0.028;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    background-size: 160px 160px;
  }
  .nav-link {
    position: relative;
    color: #6a6058; text-decoration: none;
    font-size: 12px; font-weight: 600;
    letter-spacing: 0.12em; text-transform: uppercase;
    transition: color 0.2s; cursor: pointer;
    background: none; border: none; padding: 0;
    font-family: 'DM Mono', monospace;
  }
  .nav-link::after {
    content: ''; position: absolute;
    bottom: -3px; left: 0;
    width: 0; height: 1px;
    background: #c9a84c; transition: width 0.25s ease;
  }
  .nav-link:hover, .nav-link.active { color: #e8e0d4; }
  .nav-link:hover::after, .nav-link.active::after { width: 100%; }
  .skeleton {
    background: linear-gradient(90deg, #151210 25%, #1e1a16 50%, #151210 75%);
    background-size: 200% 100%;
    animation: shimmer 1.6s infinite;
  }
  .genre-chip {
    display: inline-flex; align-items: center;
    padding: 3px 10px; border-radius: 2px;
    font-size: 9.5px; font-weight: 600;
    letter-spacing: 0.14em; text-transform: uppercase;
    cursor: pointer; transition: all 0.18s;
    border: 1px solid transparent;
    font-family: 'DM Mono', monospace;
  }
  .spotlight {
    position: fixed; pointer-events: none; z-index: 0;
    width: 700px; height: 700px; border-radius: 50%;
    background: radial-gradient(circle, rgba(201,168,76,0.035) 0%, transparent 68%);
    transform: translate(-50%, -50%);
    transition: left 0.12s ease, top 0.12s ease;
  }
`;
const styleEl = document.createElement("style");
styleEl.textContent = globalCSS;
document.head.appendChild(styleEl);

/* ─── Config ─────────────────────────────────────────────────────────────── */
const API_BASE = "http://localhost:8000/api";
const api = {
  async get(path) {
    try {
      const r = await fetch(`${API_BASE}${path}`);
      if (!r.ok) throw new Error(r.status);
      return r.json();
    } catch { return null; }
  },
};

/* ─── Data ───────────────────────────────────────────────────────────────── */
const DEMO = [
  { movieId:1,  title:"The Shawshank Redemption", year:"1994", rating:9.3, voteCount:2800000, genres:["Drama"],                        overview:"Two imprisoned men bond over years, finding solace and eventual redemption through acts of common decency.", cast:["Tim Robbins","Morgan Freeman"], director:["Frank Darabont"], tagline:"Fear can hold you prisoner. Hope can set you free.", runtime:142, bg:"#142838" },
  { movieId:2,  title:"The Godfather",              year:"1972", rating:9.2, voteCount:1900000, genres:["Crime","Drama"],                 overview:"The aging patriarch of an organized crime dynasty transfers control to his reluctant son.",                       cast:["Marlon Brando","Al Pacino"], director:["Francis Ford Coppola"], tagline:"An offer you can't refuse.", runtime:175, bg:"#1a1008" },
  { movieId:3,  title:"The Dark Knight",            year:"2008", rating:9.0, voteCount:2600000, genres:["Action","Crime","Drama"],        overview:"Batman faces his greatest challenge yet when the mysterious Joker emerges with his reign of anarchy.",             cast:["Christian Bale","Heath Ledger"], director:["Christopher Nolan"], tagline:"Why so serious?", runtime:152, bg:"#0a0c1a" },
  { movieId:4,  title:"Pulp Fiction",               year:"1994", rating:8.9, voteCount:2000000, genres:["Crime","Thriller"],              overview:"The lives of two mob hitmen, a boxer, a gangster and his wife intertwine in four tales of violence and redemption.", cast:["John Travolta","Samuel L. Jackson"], director:["Quentin Tarantino"], tagline:"You won't know the facts until you've seen the fiction.", runtime:154, bg:"#1c0d0a" },
  { movieId:5,  title:"Schindler's List",           year:"1993", rating:9.0, voteCount:1400000, genres:["Biography","Drama","History"],    overview:"In Nazi-occupied Poland, Oskar Schindler gradually becomes concerned for his Jewish workforce.",                      cast:["Liam Neeson","Ralph Fiennes"], director:["Steven Spielberg"], tagline:"Whoever saves one life, saves the world entire.", runtime:195, bg:"#111111" },
  { movieId:6,  title:"LOTR: Return of the King",   year:"2003", rating:9.0, voteCount:1800000, genres:["Action","Adventure","Drama"],     overview:"Gandalf and Aragorn lead the World of Men against Sauron's army to draw his gaze from Frodo and Sam.",               cast:["Elijah Wood","Viggo Mortensen"], director:["Peter Jackson"], tagline:"The eye of the enemy is moving.", runtime:201, bg:"#0e1408" },
  { movieId:7,  title:"Fight Club",                 year:"1999", rating:8.8, voteCount:2100000, genres:["Drama","Thriller"],               overview:"An insomniac office worker and a devil-may-care soapmaker form an underground fight club.",                          cast:["Brad Pitt","Edward Norton"], director:["David Fincher"], tagline:"Mischief. Mayhem. Soap.", runtime:139, bg:"#120808" },
  { movieId:8,  title:"Forrest Gump",               year:"1994", rating:8.8, voteCount:2000000, genres:["Drama","Romance"],                overview:"A man with below-average intelligence witnesses and influences several defining historical events.",                   cast:["Tom Hanks","Robin Wright"], director:["Robert Zemeckis"], tagline:"Life is like a box of chocolates.", runtime:142, bg:"#0a1420" },
  { movieId:9,  title:"Inception",                  year:"2010", rating:8.8, voteCount:2300000, genres:["Action","Sci-Fi"],                overview:"A thief who steals corporate secrets through dream-sharing is given the task of planting an idea into a mind.",       cast:["Leonardo DiCaprio","Joseph Gordon-Levitt"], director:["Christopher Nolan"], tagline:"Your mind is the scene of the crime.", runtime:148, bg:"#080e1c" },
  { movieId:10, title:"The Silence of the Lambs",   year:"1991", rating:8.6, voteCount:1400000, genres:["Crime","Drama","Thriller"],       overview:"A young FBI cadet must receive help from an incarcerated cannibal killer to catch another serial killer.",             cast:["Jodie Foster","Anthony Hopkins"], director:["Jonathan Demme"], tagline:"To enter the mind of a killer she must challenge the mind of a madman.", runtime:118, bg:"#0c0a06" },
  { movieId:11, title:"Interstellar",               year:"2014", rating:8.6, voteCount:1800000, genres:["Adventure","Drama","Sci-Fi"],     overview:"A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",                  cast:["Matthew McConaughey","Anne Hathaway"], director:["Christopher Nolan"], tagline:"Mankind was born on Earth. It was never meant to die here.", runtime:169, bg:"#060812" },
  { movieId:12, title:"Goodfellas",                 year:"1990", rating:8.7, voteCount:1100000, genres:["Biography","Crime","Drama"],      overview:"The story of Henry Hill and his life in the mob, covering his relationship with his wife and mob partners.",            cast:["Robert De Niro","Ray Liotta"], director:["Martin Scorsese"], tagline:"Three Decades of Life in the Mafia.", runtime:146, bg:"#140808" },
  { movieId:13, title:"The Matrix",                 year:"1999", rating:8.7, voteCount:1900000, genres:["Action","Sci-Fi"],                overview:"A hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.", cast:["Keanu Reeves","Laurence Fishburne"], director:["Lana Wachowski"], tagline:"Free your mind.", runtime:136, bg:"#020a02" },
  { movieId:14, title:"Se7en",                      year:"1995", rating:8.6, voteCount:1600000, genres:["Crime","Drama","Mystery"],        overview:"Two detectives hunt a serial killer who uses the seven deadly sins as his motives.",                                    cast:["Morgan Freeman","Brad Pitt"], director:["David Fincher"], tagline:"Seven deadly sins. Seven ways to die.", runtime:127, bg:"#0c0808" },
  { movieId:15, title:"The Usual Suspects",         year:"1995", rating:8.5, voteCount:1100000, genres:["Crime","Mystery","Thriller"],     overview:"A sole survivor tells of twisting events leading up to a horrific gun battle on a boat.",                               cast:["Kevin Spacey","Gabriel Byrne"], director:["Bryan Singer"], tagline:"The greatest trick the devil ever pulled...", runtime:106, bg:"#0a0c10" },
  { movieId:16, title:"Léon: The Professional",     year:"1994", rating:8.5, voteCount:1000000, genres:["Action","Crime","Drama"],         overview:"12-year-old Mathilda is reluctantly taken in by Léon, a professional cleaner, after her family is murdered.",            cast:["Jean Reno","Gary Oldman","Natalie Portman"], director:["Luc Besson"], tagline:"He's the best. She's tough.", runtime:110, bg:"#0e0c08" },
  { movieId:17, title:"American History X",         year:"1998", rating:8.5, voteCount:1100000, genres:["Crime","Drama"],                  overview:"A former neo-nazi skinhead tries to prevent his younger brother from going down the same wrong path.",                   cast:["Edward Norton","Edward Furlong"], director:["Tony Kaye"], tagline:"Some legacies must end.", runtime:119, bg:"#0c0c0c" },
  { movieId:18, title:"Saving Private Ryan",        year:"1998", rating:8.6, voteCount:1400000, genres:["Drama","War"],                    overview:"Following D-Day, a group of U.S. soldiers go behind enemy lines to retrieve a paratrooper whose brothers have been killed.", cast:["Tom Hanks","Matt Damon"], director:["Steven Spielberg"], tagline:"The mission is a man.", runtime:169, bg:"#101208" },
  { movieId:19, title:"The Green Mile",             year:"1999", rating:8.6, voteCount:1300000, genres:["Crime","Drama","Fantasy"],        overview:"Paul Edgecomb narrates the history of John Coffey, convicted of murder but possessed of a mysterious healing power.",     cast:["Tom Hanks","Michael Clarke Duncan"], director:["Frank Darabont"], tagline:"Miracles do happen.", runtime:189, bg:"#0a1008" },
  { movieId:20, title:"Gladiator",                  year:"2000", rating:8.5, voteCount:1400000, genres:["Action","Adventure","Drama"],     overview:"A former Roman General sets out to exact vengeance against the corrupt emperor who murdered his family.",                 cast:["Russell Crowe","Joaquin Phoenix"], director:["Ridley Scott"], tagline:"What we do in life echoes in eternity.", runtime:155, bg:"#180e04" },
  { movieId:21, title:"Memento",                    year:"2000", rating:8.4, voteCount:1200000, genres:["Mystery","Thriller"],             overview:"A man with short-term memory loss attempts to track down his wife's murderer using notes and tattoos.",                  cast:["Guy Pearce","Carrie-Anne Moss"], director:["Christopher Nolan"], tagline:"Some memories are best forgotten.", runtime:113, bg:"#0c0e14" },
  { movieId:22, title:"Parasite",                   year:"2019", rating:8.5, voteCount:860000,  genres:["Comedy","Drama","Thriller"],      overview:"Greed and class discrimination threaten the symbiotic relationship between the wealthy Park family and the destitute Kims.", cast:["Song Kang-ho","Lee Sun-kyun"], director:["Bong Joon-ho"], tagline:"Act like you own the place.", runtime:132, bg:"#0c1008" },
  { movieId:23, title:"Avengers: Infinity War",     year:"2018", rating:8.4, voteCount:1000000, genres:["Action","Adventure","Sci-Fi"],   overview:"The Avengers and their allies must sacrifice all in an attempt to defeat the powerful Thanos before his blitz of devastation.", cast:["Robert Downey Jr.","Chris Hemsworth"], director:["Anthony Russo"], tagline:"Destiny arrives.", runtime:149, bg:"#080a18" },
  { movieId:24, title:"Get Out",                    year:"2017", rating:7.7, voteCount:610000,  genres:["Horror","Mystery","Thriller"],    overview:"A young African-American visits his white girlfriend's parents for the weekend in a thriller that simmers into terror.",      cast:["Daniel Kaluuya","Allison Williams"], director:["Jordan Peele"], tagline:"Just because you're invited doesn't mean you're welcome.", runtime:104, bg:"#0a0e08" },
  { movieId:25, title:"La La Land",                 year:"2016", rating:8.0, voteCount:680000,  genres:["Drama","Music","Romance"],        overview:"A pianist and an aspiring actress fall in love while chasing their dreams in sun-drenched Los Angeles.",                  cast:["Ryan Gosling","Emma Stone"], director:["Damien Chazelle"], tagline:"Here's to the ones who dream.", runtime:128, bg:"#14101c" },
  { movieId:26, title:"Mad Max: Fury Road",         year:"2015", rating:8.1, voteCount:870000,  genres:["Action","Adventure","Sci-Fi"],   overview:"In a post-apocalyptic wasteland, a woman rebels against a tyrannical ruler in search for her homeland.",                    cast:["Tom Hardy","Charlize Theron"], director:["George Miller"], tagline:"What a lovely day!", runtime:120, bg:"#180a00" },
  { movieId:27, title:"The Revenant",               year:"2015", rating:8.0, voteCount:730000,  genres:["Action","Adventure","Drama"],     overview:"A frontiersman in the 1820s fights for survival after being mauled by a bear and left for dead.",                          cast:["Leonardo DiCaprio","Tom Hardy"], director:["Alejandro G. Iñárritu"], tagline:"Blood lost. Life found.", runtime:156, bg:"#080e14" },
  { movieId:28, title:"Whiplash",                   year:"2014", rating:8.5, voteCount:880000,  genres:["Drama","Music"],                  overview:"A promising drummer enrolls at a cut-throat music conservatory where his dreams are tested by an abusive instructor.",      cast:["Miles Teller","J.K. Simmons"], director:["Damien Chazelle"], tagline:"The road to greatness can take you to the edge.", runtime:107, bg:"#0e0808" },
  { movieId:29, title:"Gone Girl",                  year:"2014", rating:8.1, voteCount:790000,  genres:["Drama","Mystery","Thriller"],     overview:"With his wife's disappearance becoming a media circus, a man is suspected of being the perpetrator, not the victim.",       cast:["Ben Affleck","Rosamund Pike"], director:["David Fincher"], tagline:"You don't know what you've got 'til it's gone.", runtime:149, bg:"#0c0a10" },
  { movieId:30, title:"Her",                        year:"2013", rating:8.0, voteCount:720000,  genres:["Drama","Romance","Sci-Fi"],       overview:"In a near future, a lonely writer develops an unlikely relationship with an AI operating system.",                         cast:["Joaquin Phoenix","Scarlett Johansson"], director:["Spike Jonze"], tagline:"A love story for the digital age.", runtime:126, bg:"#1c0c08" },
  { movieId:31, title:"Django Unchained",           year:"2012", rating:8.4, voteCount:1400000, genres:["Drama","Western"],                overview:"With the help of a German bounty hunter, a freed slave sets out to rescue his wife from a brutal plantation owner.",       cast:["Jamie Foxx","Christoph Waltz"], director:["Quentin Tarantino"], tagline:"Life, liberty and the pursuit of vengeance.", runtime:165, bg:"#140c06" },
  { movieId:32, title:"The Grand Budapest Hotel",   year:"2014", rating:8.1, voteCount:740000,  genres:["Adventure","Comedy","Drama"],     overview:"A writer encounters an ageing hotel owner who tells him of his early years serving as a lobby boy in the hotel's heyday.",  cast:["Ralph Fiennes","Saoirse Ronan"], director:["Wes Anderson"], tagline:"A famous author. His adventure. Their story.", runtime:99, bg:"#1c1008" },
  { movieId:37, title:"Toy Story",                  year:"1995", rating:8.3, voteCount:1000000, genres:["Animation","Comedy","Family"],    overview:"A cowboy doll is threatened when a new spaceman figure supplants him as top toy in a boy's room.",                          cast:["Tom Hanks","Tim Allen"], director:["John Lasseter"], tagline:"Hang on for the comedy that goes to infinity and beyond!", runtime:81, bg:"#0c1420" },
  { movieId:38, title:"Up",                         year:"2009", rating:8.3, voteCount:1000000, genres:["Animation","Adventure","Drama"],  overview:"A 78-year-old man travels to Paradise Falls by tying thousands of balloons to his house, meeting a wilderness explorer.",  cast:["Edward Asner","Jordan Nagai"], director:["Pete Docter"], tagline:"Adventure Is Out There.", runtime:96, bg:"#0c1420" },
  { movieId:42, title:"Spirited Away",              year:"2001", rating:8.6, voteCount:740000,  genres:["Animation","Fantasy","Mystery"], overview:"A sullen 10-year-old wanders into a world ruled by gods, witches, and spirits after her family moves to a new neighbourhood.", cast:["Daveigh Chase","Suzanne Pleshette"], director:["Hayao Miyazaki"], tagline:"The tunnel led Chihiro to a magical world.", runtime:125, bg:"#080e18" },
  { movieId:46, title:"Blade Runner",               year:"1982", rating:8.1, voteCount:780000,  genres:["Sci-Fi","Thriller"],              overview:"A blade runner must pursue and terminate replicants who stole a ship in space and returned to Earth to find their creator.", cast:["Harrison Ford","Rutger Hauer"], director:["Ridley Scott"], tagline:"Man has made his match... now it's his problem.", runtime:117, bg:"#08080e" },
  { movieId:47, title:"2001: A Space Odyssey",      year:"1968", rating:8.3, voteCount:700000,  genres:["Adventure","Sci-Fi"],             overview:"Mankind uncovers a mysterious artifact buried beneath the lunar surface and sets off on a quest to find its origins.",      cast:["Keir Dullea","Gary Lockwood"], director:["Stanley Kubrick"], tagline:"An epic drama of adventure and exploration.", runtime:149, bg:"#04040a" },
  { movieId:48, title:"Alien",                      year:"1979", rating:8.5, voteCount:860000,  genres:["Horror","Sci-Fi","Thriller"],     overview:"After a space merchant vessel perceives an unknown transmission as a distress call, its landing on the source moon proves fatal.", cast:["Sigourney Weaver","Tom Skerritt"], director:["Ridley Scott"], tagline:"In space, no one can hear you scream.", runtime:117, bg:"#060608" },
  { movieId:49, title:"Star Wars: Episode IV",      year:"1977", rating:8.6, voteCount:1400000, genres:["Action","Adventure","Sci-Fi"],   overview:"Luke Skywalker joins forces with a Jedi Knight, a cocky pilot, and two droids to save the galaxy from the Empire.",         cast:["Mark Hamill","Harrison Ford","Carrie Fisher"], director:["George Lucas"], tagline:"A long time ago in a galaxy far, far away...", runtime:121, bg:"#06080e" },
  { movieId:50, title:"Jurassic Park",              year:"1993", rating:8.2, voteCount:950000,  genres:["Action","Adventure","Sci-Fi"],   overview:"A pragmatic paleontologist visits an almost complete theme park and must protect kids when the cloned dinosaurs run loose.",   cast:["Sam Neill","Laura Dern","Jeff Goldblum"], director:["Steven Spielberg"], tagline:"An adventure 65 million years in the making.", runtime:127, bg:"#080e06" },
];

const GENRES = ["Action","Adventure","Animation","Biography","Comedy","Crime","Drama","Fantasy","History","Horror","Music","Mystery","Romance","Sci-Fi","Thriller","War","Western"];

const GC = {
  Action:"#e8604a",Adventure:"#e8944a",Animation:"#9b72d6",Biography:"#4abce8",
  Comedy:"#d4c04a",Crime:"#c44848",Drama:"#6b75e8",Fantasy:"#b070d6",
  History:"#9a7040",Horror:"#a00000",Music:"#e870a0",Mystery:"#3aaab8",
  Romance:"#e86080","Sci-Fi":"#3ab4e8",Thriller:"#c48800",War:"#7a8040",Western:"#8a5828",
};

/* ─── Hooks ──────────────────────────────────────────────────────────────── */
function useSpotlight() {
  const [p, setP] = useState({ x: -999, y: -999 });
  useEffect(() => {
    const h = e => setP({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", h, { passive: true });
    return () => window.removeEventListener("mousemove", h);
  }, []);
  return p;
}

/* ─── Watchlist Hook (persists in sessionStorage) ───────────────────────── */
function useWatchlist() {
  const [watchlist, setWatchlist] = useState(() => {
    try {
      const raw = sessionStorage.getItem("cinematch_watchlist");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  const save = (list) => {
    setWatchlist(list);
    try { sessionStorage.setItem("cinematch_watchlist", JSON.stringify(list)); } catch {}
  };

  const toggle = (film) => {
    const exists = watchlist.some(m => m.movieId === film.movieId);
    if (exists) {
      save(watchlist.filter(m => m.movieId !== film.movieId));
      return "removed";
    } else {
      save([{ ...film, addedAt: Date.now() }, ...watchlist]);
      return "added";
    }
  };

  const isIn = (movieId) => watchlist.some(m => m.movieId === movieId);
  const clear = () => save([]);
  const remove = (movieId) => save(watchlist.filter(m => m.movieId !== movieId));

  return { watchlist, toggle, isIn, clear, remove };
}

/* ─── Toast Notification ─────────────────────────────────────────────────── */
function Toast({ message, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, []);
  const bg = type === "added" ? "#1a2e1a" : "#2a1a1a";
  const border = type === "added" ? "#4ade8044" : "#f8714444";
  const color = type === "added" ? "#4ade80" : "#f87171";
  const icon = type === "added" ? "✦" : "✕";
  return (
    <div style={{
      position: "fixed", bottom: 32, right: 32, zIndex: 9000,
      background: bg, border: `1px solid ${border}`,
      borderRadius: 8, padding: "13px 20px",
      display: "flex", alignItems: "center", gap: 10,
      boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
      animation: "popIn 0.3s ease both",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <span style={{ color, fontSize: 14 }}>{icon}</span>
      <span style={{ color: "#e8e0d4", fontSize: 13, fontWeight: 500 }}>{message}</span>
    </div>
  );
}

/* ─── Watchlist Bookmark Button ──────────────────────────────────────────── */
function BookmarkBtn({ film, isIn, onToggle, size = "md" }) {
  const [anim, setAnim] = useState(false);
  const sz = size === "sm" ? 28 : 34;
  const iconSz = size === "sm" ? 13 : 16;

  const handle = (e) => {
    e.stopPropagation();
    setAnim(true);
    onToggle(film);
    setTimeout(() => setAnim(false), 420);
  };

  return (
    <button
      onClick={handle}
      title={isIn ? "Remove from Watchlist" : "Add to Watchlist"}
      className={anim ? "watchlist-btn-anim" : ""}
      style={{
        width: sz, height: sz,
        borderRadius: "50%",
        background: isIn ? "#c9a84c22" : "rgba(12,11,14,0.75)",
        border: `1px solid ${isIn ? "#c9a84c66" : "rgba(255,255,255,0.12)"}`,
        color: isIn ? "#c9a84c" : "#6a6058",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", fontSize: iconSz,
        backdropFilter: "blur(8px)",
        transition: "all 0.2s",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "#c9a84c88"; e.currentTarget.style.color = "#c9a84c"; }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = isIn ? "#c9a84c66" : "rgba(255,255,255,0.12)";
        e.currentTarget.style.color = isIn ? "#c9a84c" : "#6a6058";
      }}
    >
      {isIn ? "★" : "☆"}
    </button>
  );
}

/* ─── Watchlist Panel (slide-in drawer) ─────────────────────────────────── */
function WatchlistPanel({ watchlist, onClose, onSelect, onRemove, onClear }) {
  const empty = watchlist.length === 0;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 3000,
        background: "rgba(8,6,4,0.6)", backdropFilter: "blur(4px)",
        animation: "fadeIn 0.2s ease",
      }} />

      {/* Drawer */}
      <div className="watchlist-panel" style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 3001,
        width: "min(420px, 92vw)",
        background: "#0e0c0a",
        borderLeft: "1px solid #2a2520",
        boxShadow: "-40px 0 80px rgba(0,0,0,0.7)",
        display: "flex", flexDirection: "column",
        overflowY: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "28px 28px 22px",
          borderBottom: "1px solid #1a1814",
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{
              fontFamily: "'Playfair Display', serif", fontWeight: 900,
              fontSize: 22, color: "#f5e6c8", marginBottom: 4,
            }}>My Watchlist</h2>
            <p style={{ fontSize: 11, color: "#3a3530", fontFamily: "'DM Mono', monospace" }}>
              {watchlist.length} film{watchlist.length !== 1 ? "s" : ""} saved
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {!empty && (
              <button onClick={onClear} style={{
                background: "transparent", border: "1px solid #2a2520",
                color: "#4a4540", fontSize: 11, padding: "5px 12px",
                borderRadius: 4, cursor: "pointer",
                fontFamily: "'DM Mono', monospace", letterSpacing: "0.05em",
                transition: "all 0.2s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#c44"; e.currentTarget.style.color = "#f87171"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2520"; e.currentTarget.style.color = "#4a4540"; }}
              >
                Clear all
              </button>
            )}
            <button onClick={onClose} style={{
              background: "#1a1814", border: "1px solid #2a2520",
              color: "#6a6058", width: 34, height: 34, borderRadius: "50%",
              cursor: "pointer", fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.color = "#e8e0d4"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#6a6058"; }}
            >✕</button>
          </div>
        </div>

        {/* Genre breakdown */}
        {!empty && (() => {
          const genreCounts = {};
          watchlist.forEach(m => (m.genres || []).forEach(g => { genreCounts[g] = (genreCounts[g] || 0) + 1; }));
          const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
          return (
            <div style={{ padding: "14px 28px 16px", borderBottom: "1px solid #161210", flexShrink: 0 }}>
              <div style={{ fontSize: 9.5, color: "#3a3530", fontFamily: "'DM Mono', monospace", letterSpacing: "0.15em", marginBottom: 10, textTransform: "uppercase" }}>
                Your Taste Profile
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {topGenres.map(([g, count]) => (
                  <div key={g} style={{
                    display: "flex", alignItems: "center", gap: 5,
                    background: `${GC[g] || "#6b75e8"}14`,
                    border: `1px solid ${GC[g] || "#6b75e8"}33`,
                    borderRadius: 3, padding: "3px 9px",
                  }}>
                    <span style={{ fontSize: 9.5, color: GC[g] || "#6b75e8", fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{g}</span>
                    <span style={{ fontSize: 8.5, color: "#3a3530", fontFamily: "'DM Mono', monospace" }}>×{count}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Watchlist items */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
          {empty ? (
            <div style={{ textAlign: "center", padding: "60px 24px" }}>
              <div style={{ fontSize: 44, opacity: 0.12, marginBottom: 16 }}>☆</div>
              <p style={{ fontFamily: "'Playfair Display', serif", color: "#2a2520", fontSize: 16, marginBottom: 8 }}>
                Your watchlist is empty
              </p>
              <p style={{ fontSize: 12, color: "#1e1c18", lineHeight: 1.7 }}>
                Click the ☆ icon on any film<br />to save it here
              </p>
            </div>
          ) : (
            watchlist.map((film, i) => {
              const g = film.genres?.[0] || "Drama";
              const c = GC[g] || "#6b75e8";
              return (
                <div key={film.movieId}
                  style={{
                    display: "flex", gap: 14, padding: "14px 28px",
                    cursor: "pointer", transition: "background 0.15s",
                    borderBottom: "1px solid #100e0c",
                    animation: `fadeUp 0.3s ${i * 0.04}s ease both`,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#161210"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  onClick={() => { onClose(); setTimeout(() => onSelect(film), 150); }}
                >
                  {/* Mini poster */}
                  <div style={{
                    width: 50, height: 74, borderRadius: 5, flexShrink: 0,
                    background: `linear-gradient(155deg, ${film.bg || "#181410"} 0%, ${c}18 100%)`,
                    border: `1px solid ${c}18`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, opacity: 0.7,
                  }}>🎬</div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: "'Playfair Display', serif", fontWeight: 700,
                      fontSize: 14, color: "#e8e0d4", lineHeight: 1.3, marginBottom: 4,
                      overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                    }}>{film.title}</div>
                    <div style={{ fontSize: 11, color: "#3a3530", fontFamily: "'DM Mono', monospace", marginBottom: 6 }}>
                      {film.year} · {film.runtime}m
                    </div>
                    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                      <span style={{ color: "#c9a84c", fontSize: 11 }}>★</span>
                      <span style={{ color: "#c9a84c", fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>
                        {(film.rating || 7.5).toFixed(1)}
                      </span>
                      <span style={{ color: "#2a2520", fontSize: 10, marginLeft: 4 }}>·</span>
                      {(film.genres || []).slice(0, 2).map(g => (
                        <span key={g} style={{
                          fontSize: 9, color: `${GC[g] || "#6b75e8"}99`,
                          fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em",
                          textTransform: "uppercase",
                        }}>{g}</span>
                      ))}
                    </div>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={e => { e.stopPropagation(); onRemove(film.movieId); }}
                    style={{
                      background: "transparent", border: "none",
                      color: "#2a2520", cursor: "pointer", fontSize: 16,
                      padding: "0 4px", alignSelf: "center", flexShrink: 0,
                      transition: "color 0.15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                    onMouseLeave={e => e.currentTarget.style.color = "#2a2520"}
                    title="Remove"
                  >×</button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer CTA */}
        {!empty && (
          <div style={{
            padding: "18px 28px 24px",
            borderTop: "1px solid #1a1814",
            flexShrink: 0,
          }}>
            <div style={{
              background: "#c9a84c0e", border: "1px solid #c9a84c22",
              borderRadius: 7, padding: "14px 16px",
              display: "flex", gap: 10, alignItems: "center",
            }}>
              <span style={{ fontSize: 20 }}>🤖</span>
              <div>
                <div style={{ fontSize: 12, color: "#c9a84c", fontWeight: 600, marginBottom: 2 }}>
                  Get AI Recommendations
                </div>
                <div style={{ fontSize: 11, color: "#4a4540", lineHeight: 1.5 }}>
                  Our hybrid engine learns from your watchlist to improve suggestions
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ─── Poster ─────────────────────────────────────────────────────────────── */
function Poster({ movie, tall }) {
  const g = movie.genres?.[0] || "Drama";
  const c = GC[g] || "#6b75e8";
  return (
    <div style={{
      width: "100%", height: "100%",
      background: `linear-gradient(155deg, ${movie.bg || "#181410"} 0%, ${c}1a 100%)`,
      borderRadius: "inherit",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden",
      border: `1px solid ${c}18`,
    }}>
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{
          position: "absolute", top: 0, bottom: 0,
          left: `${(i + 1) * 18}%`, width: 1,
          background: `${c}07`,
        }} />
      ))}
      <div style={{ fontSize: tall ? 52 : 34, opacity: 0.14, zIndex: 1 }}>🎬</div>
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: "linear-gradient(transparent, rgba(0,0,0,0.82))",
        padding: tall ? "40px 14px 14px" : "24px 10px 10px",
        zIndex: 2,
      }}>
        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: tall ? 12 : 10,
          fontWeight: 700, color: "#e8e0d4",
          lineHeight: 1.3, display: "-webkit-box",
          WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {movie.title}
        </div>
      </div>
    </div>
  );
}

/* ─── Rating ─────────────────────────────────────────────────────────────── */
function Rating({ val, size = "md" }) {
  const fs = { sm: 11, md: 13, lg: 22 }[size];
  const color = val >= 8.5 ? "#c9a84c" : val >= 7.5 ? "#90b060" : "#888";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
      <span style={{ color: "#c9a84c", fontSize: fs }}>★</span>
      <span style={{ color, fontWeight: 700, fontSize: fs, fontFamily: "'DM Mono', monospace" }}>
        {val.toFixed(1)}
      </span>
      {size !== "sm" && (
        <span style={{ color: "#3a3530", fontSize: fs - 3 }}>/10</span>
      )}
    </div>
  );
}

/* ─── GenreChip ──────────────────────────────────────────────────────────── */
function GenreChip({ genre, active, onClick, tiny }) {
  const c = GC[genre] || "#6b75e8";
  return (
    <button className="genre-chip" onClick={() => onClick?.(genre)} style={{
      background: active ? `${c}1e` : "transparent",
      borderColor: active ? `${c}77` : tiny ? `${c}30` : "#222",
      color: active ? c : tiny ? `${c}aa` : "#4a4540",
      fontSize: tiny ? 8.5 : 9.5,
      padding: tiny ? "2px 7px" : "3px 10px",
      cursor: onClick ? "pointer" : "default",
    }}>
      {genre}
    </button>
  );
}

/* ─── Movie Card ─────────────────────────────────────────────────────────── */
function MovieCard({ movie, onClick, rank, matchScore, delay = 0, isInWatchlist, onWatchlistToggle }) {
  const [hov, setHov] = useState(false);
  return (
    <article
      className="card-hover"
      onClick={() => onClick?.(movie)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? "#161210" : "#100e0c",
        border: `1px solid ${hov ? "#2a2418" : "#181410"}`,
        borderRadius: 10, overflow: "hidden", cursor: "pointer",
        animation: `fadeUp 0.45s ${delay}s ease both`,
      }}
    >
      <div style={{ position: "relative", paddingBottom: "150%", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0 }}>
          <Poster movie={movie} tall />
        </div>
        {rank && (
          <div style={{
            position: "absolute", top: 9, left: 9, zIndex: 10,
            background: "#c9a84c", color: "#0c0b0e",
            fontWeight: 900, fontSize: 10, padding: "2px 7px",
            borderRadius: 2, fontFamily: "'DM Mono', monospace",
          }}>#{rank}</div>
        )}
        {/* Watchlist bookmark — top right */}
        {onWatchlistToggle && (
          <div style={{ position: "absolute", top: 9, right: 9, zIndex: 10, opacity: hov || isInWatchlist ? 1 : 0, transition: "opacity 0.2s" }}>
            <BookmarkBtn film={movie} isIn={isInWatchlist} onToggle={onWatchlistToggle} size="sm" />
          </div>
        )}
        {matchScore !== undefined && matchScore && (
          <div style={{
            position: "absolute", bottom: 9, left: 9, zIndex: 10,
            background: "rgba(8,6,4,0.88)", backdropFilter: "blur(6px)",
            border: "1px solid #4ade8044", color: "#4ade80",
            fontWeight: 700, fontSize: 10, padding: "2px 7px",
            borderRadius: 2, fontFamily: "'DM Mono', monospace",
          }}>{Math.round(matchScore * 100)}% match</div>
        )}
        {hov && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none",
            background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.07) 2px,rgba(0,0,0,0.07) 4px)",
          }} />
        )}
      </div>
      <div style={{ padding: "12px 12px 14px" }}>
        <div style={{
          fontFamily: "'Playfair Display', serif", fontWeight: 700,
          fontSize: 13, color: "#e8e0d4", lineHeight: 1.35, marginBottom: 5,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>{movie.title}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 10, color: "#3a3530", fontFamily: "'DM Mono', monospace" }}>
            {movie.year}{movie.runtime ? ` · ${movie.runtime}m` : ""}
          </span>
          <Rating val={movie.rating || 7.5} size="sm" />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
          {(movie.genres || []).slice(0, 2).map(g => <GenreChip key={g} genre={g} tiny />)}
        </div>
      </div>
    </article>
  );
}

/* ─── Skeleton ───────────────────────────────────────────────────────────── */
function Skel() {
  return (
    <div style={{ borderRadius: 10, overflow: "hidden", background: "#100e0c", border: "1px solid #181410" }}>
      <div className="skeleton" style={{ paddingBottom: "150%" }} />
      <div style={{ padding: "12px 12px 14px" }}>
        <div className="skeleton" style={{ height: 14, borderRadius: 3, marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 11, width: "55%", borderRadius: 3, marginBottom: 10 }} />
        <div className="skeleton" style={{ height: 18, width: "45%", borderRadius: 3 }} />
      </div>
    </div>
  );
}

/* ─── Hero ───────────────────────────────────────────────────────────────── */
function Hero({ film, onOpen }) {
  if (!film) return null;
  const g = film.genres?.[0] || "Drama";
  const c = GC[g] || "#6b75e8";

  return (
    <section style={{
      position: "relative", overflow: "hidden",
      background: `linear-gradient(120deg, #0c0b0e 0%, ${film.bg || "#181410"} 55%, #0c0b0e 100%)`,
      borderBottom: "1px solid #1a1814",
      padding: "72px 48px 60px",
    }}>
      <div style={{
        position: "absolute", top: "50%", right: "5%",
        transform: "translate(0,-50%)",
        width: 560, height: 560, borderRadius: "50%",
        background: `radial-gradient(circle, ${c}14 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: -30, right: -10,
        fontFamily: "'Playfair Display', serif", fontWeight: 900,
        fontSize: 200, lineHeight: 1, color: `${c}05`,
        pointerEvents: "none", userSelect: "none", letterSpacing: "-0.04em",
      }}>{film.year}</div>

      <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", gap: 56, alignItems: "center", position: "relative", zIndex: 1 }}>
        <div style={{ flexShrink: 0, width: 200, height: 300, borderRadius: 12, overflow: "hidden", animation: "fadeUp 0.6s ease both" }}>
          <Poster movie={film} tall />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 9.5, fontWeight: 600, letterSpacing: "0.28em",
            color: "#c9a84c", fontFamily: "'DM Mono', monospace",
            textTransform: "uppercase", marginBottom: 18,
            animation: "fadeUp 0.6s 0.1s ease both", opacity: 0,
          }}>
            ✦ Editor's Pick
          </div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif", fontWeight: 900,
            fontSize: "clamp(28px,4vw,50px)", color: "#f5e6c8",
            lineHeight: 1.1, marginBottom: 14, letterSpacing: "-0.02em",
            animation: "fadeUp 0.6s 0.15s ease both", opacity: 0,
          }}>{film.title}</h1>
          {film.tagline && (
            <p style={{
              fontFamily: "'Playfair Display', serif", fontStyle: "italic",
              color: "#c9a84c", fontSize: 15, marginBottom: 18, opacity: 0.85,
              animation: "fadeUp 0.6s 0.2s ease both",
            }}>"{film.tagline}"</p>
          )}
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center",
            marginBottom: 18, animation: "fadeUp 0.6s 0.25s ease both", opacity: 0,
          }}>
            <Rating val={film.rating || 7.5} size="lg" />
            <span style={{ color: "#2a2520" }}>|</span>
            <span style={{ color: "#4a4540", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>
              {film.year} · {film.runtime}min · {(film.voteCount / 1000000).toFixed(1)}M votes
            </span>
          </div>
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 20,
            animation: "fadeUp 0.6s 0.3s ease both", opacity: 0,
          }}>
            {(film.genres || []).map(g => <GenreChip key={g} genre={g} />)}
          </div>
          {film.overview && (
            <p style={{
              color: "#7a7060", fontSize: 14, lineHeight: 1.85, maxWidth: 540,
              marginBottom: 28, animation: "fadeUp 0.6s 0.35s ease both", opacity: 0,
            }}>
              {film.overview.slice(0, 230)}…
            </p>
          )}
          <div style={{ display: "flex", gap: 12, animation: "fadeUp 0.6s 0.4s ease both", opacity: 0 }}>
            <button
              onClick={() => onOpen(film)}
              style={{
                padding: "12px 30px", background: "#c9a84c",
                color: "#0c0b0e", border: "none", borderRadius: 5,
                fontWeight: 700, fontSize: 13, cursor: "pointer",
                letterSpacing: "0.06em", textTransform: "uppercase",
                transition: "background 0.2s",
              }}
              onMouseEnter={e => e.target.style.background = "#e2c060"}
              onMouseLeave={e => e.target.style.background = "#c9a84c"}
            >
              View Film
            </button>
            <div style={{
              padding: "12px 20px",
              background: "transparent", border: "1px solid #2a2520",
              borderRadius: 5, color: "#5a5248", fontSize: 12,
              letterSpacing: "0.04em",
            }}>
              {film.director?.[0] || "Unknown"}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Movie Modal ────────────────────────────────────────────────────────── */
function Modal({ film, onClose, onSelect, apiOk, isInWatchlist, onWatchlistToggle }) {
  const [recs, setRecs] = useState([]);
  const [recLoading, setRecLoading] = useState(true);
  const [modelTab, setModelTab] = useState("hybrid");
  const g = film.genres?.[0] || "Drama";
  const c = GC[g] || "#6b75e8";

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    setRecLoading(true);
    (async () => {
      let data = null;
      if (apiOk) {
        data = await api.get(`/recommend/${modelTab}/${film.movieId}?top_n=6`);
      }
      if (data?.recommendations) {
        setRecs(data.recommendations);
      } else {
        const similar = [...DEMO]
          .filter(m => m.movieId !== film.movieId)
          .sort((a, b) => {
            const am = a.genres.filter(g => film.genres.includes(g)).length;
            const bm = b.genres.filter(g => film.genres.includes(g)).length;
            return bm - am || b.rating - a.rating;
          })
          .slice(0, 6)
          .map(m => ({ ...m, score: +(0.58 + Math.random() * 0.38).toFixed(2) }));
        setRecs(similar);
      }
      setRecLoading(false);
    })();
  }, [film.movieId, modelTab, apiOk]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        background: "rgba(8,6,4,0.88)", backdropFilter: "blur(14px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24, overflowY: "auto",
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 920,
          background: "#0e0c0a",
          border: `1px solid ${c}1a`,
          borderRadius: 18, overflow: "hidden",
          boxShadow: `0 60px 120px rgba(0,0,0,0.85), 0 0 0 1px ${c}18`,
          animation: "fadeUp 0.28s ease",
          maxHeight: "90vh", overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${film.bg || "#181410"} 0%, #0e0c0a 100%)`,
          padding: "36px 36px 32px",
          borderBottom: "1px solid #1a1814",
          position: "relative",
        }}>
          <button
            onClick={onClose}
            style={{
              position: "absolute", top: 18, right: 18,
              background: "#1a1814", border: "1px solid #2a2520",
              color: "#6a6058", width: 36, height: 36, borderRadius: "50%",
              cursor: "pointer", fontSize: 17, display: "flex",
              alignItems: "center", justifyContent: "center",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#2a2520"; e.currentTarget.style.color = "#e8e0d4"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#1a1814"; e.currentTarget.style.color = "#6a6058"; }}
          >✕</button>

          {/* Watchlist button in modal */}
          <div style={{ position: "absolute", top: 18, right: 64 }}>
            <BookmarkBtn film={film} isIn={isInWatchlist} onToggle={onWatchlistToggle} size="md" />
          </div>

          <div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
            <div style={{ flexShrink: 0, width: 140, height: 210, borderRadius: 10, overflow: "hidden" }}>
              <Poster movie={film} tall />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{
                fontFamily: "'Playfair Display', serif", fontWeight: 900,
                fontSize: 28, color: "#f5e6c8", lineHeight: 1.15, marginBottom: 8,
              }}>{film.title}</h2>
              {film.tagline && (
                <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", color: "#c9a84c", fontSize: 13, marginBottom: 14 }}>
                  "{film.tagline}"
                </p>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 14 }}>
                <Rating val={film.rating || 7.5} size="lg" />
                <span style={{ color: "#2a2520" }}>|</span>
                <span style={{ color: "#4a4540", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>
                  {film.year} · {film.runtime}min · {film.voteCount ? (film.voteCount / 1000000).toFixed(1) + "M votes" : ""}
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14 }}>
                {(film.genres || []).map(g => <GenreChip key={g} genre={g} />)}
              </div>
              {film.director?.length > 0 && (
                <div style={{ fontSize: 12, color: "#4a4540", marginBottom: 5 }}>
                  Directed by <span style={{ color: "#c9a84c", fontWeight: 500 }}>{film.director.join(", ")}</span>
                </div>
              )}
              {film.cast?.length > 0 && (
                <div style={{ fontSize: 12, color: "#4a4540" }}>
                  Starring <span style={{ color: "#7a7060" }}>{film.cast.slice(0, 4).join(" · ")}</span>
                </div>
              )}
            </div>
          </div>
          {film.overview && (
            <div style={{
              marginTop: 24, padding: "16px 18px",
              background: "rgba(0,0,0,0.22)", borderRadius: 7,
              border: `1px solid ${c}14`,
            }}>
              <div style={{ fontSize: 9, color: "#c9a84c", fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 7, fontFamily: "'DM Mono', monospace" }}>
                Synopsis
              </div>
              <p style={{ fontSize: 13, color: "#7a7060", lineHeight: 1.85 }}>{film.overview}</p>
            </div>
          )}
        </div>

        {/* Recommendations */}
        <div style={{ padding: "28px 36px 36px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
            <div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: "#e8e0d4", marginBottom: 2 }}>
                You Might Also Like
              </h3>
              <p style={{ fontSize: 11, color: "#3a3530", fontFamily: "'DM Mono', monospace" }}>Powered by Hybrid ML Engine</p>
            </div>
            <div style={{ display: "flex", gap: 3, background: "#0a0908", borderRadius: 7, padding: 3 }}>
              {[{ id: "hybrid", label: "Hybrid" }, { id: "content", label: "Content" }].map(t => (
                <button key={t.id} onClick={() => setModelTab(t.id)} style={{
                  padding: "5px 14px", borderRadius: 5, border: "none", cursor: "pointer",
                  background: modelTab === t.id ? "#1a1814" : "transparent",
                  color: modelTab === t.id ? "#c9a84c" : "#3a3530",
                  fontSize: 11, fontWeight: 600, letterSpacing: "0.06em",
                  transition: "all 0.18s", fontFamily: "'DM Mono', monospace",
                }}>{t.label}</button>
              ))}
            </div>
          </div>
          {recLoading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(128px, 1fr))", gap: 12 }}>
              {[...Array(6)].map((_, i) => <Skel key={i} />)}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(128px, 1fr))", gap: 12 }}>
              {recs.map(r => (
                <MovieCard key={r.movieId} movie={r} matchScore={r.score}
                  onClick={m => { onClose(); setTimeout(() => onSelect(m), 180); }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Nav ────────────────────────────────────────────────────────────────── */
function Nav({ tab, setTab, apiOk, watchlistCount, onOpenWatchlist }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 1000,
      background: scrolled ? "rgba(12,11,14,0.97)" : "rgba(12,11,14,0.82)",
      backdropFilter: "blur(22px)",
      borderBottom: "1px solid #1a1814",
      padding: "0 48px",
      transition: "background 0.3s",
    }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", gap: 36, height: 64 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, marginRight: 8 }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: 19, color: "#c9a84c" }}>
            CINÉ
          </span>
          <span style={{ width: 1, height: 18, background: "#2a2520", display: "block" }} />
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#3a3530", letterSpacing: "0.32em" }}>
            MATCH
          </span>
        </div>
        {[
          { id: "trending", label: "Trending" },
          { id: "top_rated", label: "Top Rated" },
          { id: "for_you", label: "For You" },
        ].map(t => (
          <button key={t.id}
            className={`nav-link${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}
          >{t.label}</button>
        ))}
        <div style={{ flex: 1 }} />
        {/* Watchlist trigger */}
        <button
          onClick={onOpenWatchlist}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            background: watchlistCount > 0 ? "#c9a84c14" : "transparent",
            border: `1px solid ${watchlistCount > 0 ? "#c9a84c33" : "#1e1a14"}`,
            borderRadius: 6, padding: "6px 14px", cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#c9a84c55"; e.currentTarget.style.background = "#c9a84c1a"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = watchlistCount > 0 ? "#c9a84c33" : "#1e1a14"; e.currentTarget.style.background = watchlistCount > 0 ? "#c9a84c14" : "transparent"; }}
        >
          <span style={{ fontSize: 13, color: watchlistCount > 0 ? "#c9a84c" : "#4a4540" }}>☆</span>
          <span style={{ fontSize: 11, color: watchlistCount > 0 ? "#c9a84c" : "#3a3530", fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
            Watchlist{watchlistCount > 0 ? ` (${watchlistCount})` : ""}
          </span>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: apiOk ? "#4ade80" : "#c9a84c",
            animation: "pulseGold 2s infinite",
          }} />
          <span style={{ fontSize: 10, color: "#2a2520", fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>
            {apiOk ? "API LIVE" : "DEMO"}
          </span>
        </div>
      </div>
    </nav>
  );
}

/* ─── ML Status Bar ──────────────────────────────────────────────────────── */
function MLBar({ info }) {
  const items = [
    { k: "Engine",  v: "Hybrid TF-IDF + SVD" },
    { k: "Movies",  v: info?.content_model?.movies_indexed?.toLocaleString() || "40+" },
    { k: "Ratings", v: info?.collab_model?.total_ratings?.toLocaleString() || "5,000+" },
    { k: "Factors", v: info?.collab_model?.n_factors || "100" },
    { k: "Weights", v: "40% Content · 60% CF" },
  ];
  return (
    <div style={{ background: "#080706", borderBottom: "1px solid #161210", padding: "9px 48px" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", gap: 28, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 9, color: "#2a2520", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>
          ML Engine
        </span>
        <span style={{ color: "#1e1c18" }}>·</span>
        {items.map(({ k, v }) => (
          <div key={k} style={{ display: "flex", gap: 5, alignItems: "center" }}>
            <span style={{ fontSize: 9.5, color: "#2e2a24", fontFamily: "'DM Mono', monospace" }}>{k}:</span>
            <span style={{ fontSize: 9.5, color: "#c9a84c", fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Search Bar ─────────────────────────────────────────────────────────── */
function Search({ val, onChange, onSearch }) {
  const [focused, setFocused] = useState(false);
  return (
    <form onSubmit={e => { e.preventDefault(); onSearch(val); }}
      style={{ display: "flex", gap: 0, maxWidth: 600, margin: "0 auto" }}
    >
      <div style={{
        flex: 1, display: "flex", alignItems: "center",
        background: focused ? "#161210" : "#100e0c",
        border: `1px solid ${focused ? "#322a20" : "#1a1814"}`,
        borderRight: "none", borderRadius: "6px 0 0 6px",
        transition: "all 0.2s",
      }}>
        <span style={{ padding: "0 14px", color: "#2a2520", fontSize: 16, lineHeight: 1 }}>⌕</span>
        <input
          value={val}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === "Enter" && onSearch(val)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search by title, director, genre…"
          style={{
            flex: 1, padding: "13px 0", background: "transparent",
            border: "none", outline: "none", color: "#e8e0d4",
            fontSize: 14, letterSpacing: "0.01em",
          }}
        />
        {val && (
          <button type="button" onClick={() => { onChange(""); onSearch(""); }}
            style={{ padding: "0 14px", background: "none", border: "none", color: "#2a2520", cursor: "pointer", fontSize: 18 }}>
            ×
          </button>
        )}
      </div>
      <button type="submit" style={{
        padding: "13px 22px", background: "#c9a84c",
        border: "none", borderRadius: "0 6px 6px 0",
        color: "#0c0b0e", fontWeight: 700, fontSize: 11,
        cursor: "pointer", letterSpacing: "0.1em", textTransform: "uppercase",
        transition: "background 0.18s",
      }}
        onMouseEnter={e => e.target.style.background = "#e2c060"}
        onMouseLeave={e => e.target.style.background = "#c9a84c"}
      >Search</button>
    </form>
  );
}

/* ─── App ────────────────────────────────────────────────────────────────── */
export default function App() {
  const [tab, setTab]               = useState("trending");
  const [films, setFilms]           = useState(DEMO);
  const [loading, setLoading]       = useState(false);
  const [selected, setSelected]     = useState(null);
  const [query, setQuery]           = useState("");
  const [genre, setGenre]           = useState(null);
  const [apiOk, setApiOk]           = useState(false);
  const [modelInfo, setModelInfo]   = useState(null);
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [toast, setToast]           = useState(null);
  const { watchlist, toggle, isIn, clear, remove } = useWatchlist();
  const spot = useSpotlight();

  const handleWatchlistToggle = (film) => {
    const action = toggle(film);
    setToast({
      message: action === "added" ? `Added "${film.title}" to Watchlist` : `Removed "${film.title}"`,
      type: action,
    });
  };

  useEffect(() => {
    api.get("/health").then(d => d?.status === "healthy" && setApiOk(true));
    api.get("/recommend/info/models").then(d => d && setModelInfo(d));
  }, []);

  const loadFilms = useCallback(async () => {
    if (query) return;
    setLoading(true);
    let data = null;
    if (apiOk) {
      if (tab === "trending")  data = await api.get("/movies/trending?top_n=36");
      if (tab === "top_rated") data = await api.get(`/movies/top-rated?top_n=36${genre ? `&genre=${genre}` : ""}`);
      if (tab === "for_you")   data = await api.get("/recommend/collab/42?top_n=36");
    }
    const list = data?.movies || data?.recommendations;
    if (list?.length) {
      setFilms(list);
    } else {
      let f = [...DEMO];
      if (genre) f = f.filter(m => m.genres.includes(genre));
      if (tab === "trending")  f.sort((a, b) => b.voteCount - a.voteCount);
      if (tab === "top_rated") f.sort((a, b) => b.rating - a.rating);
      if (tab === "for_you")   f.sort(() => Math.random() - 0.5);
      setFilms(f);
    }
    setLoading(false);
  }, [tab, genre, apiOk, query]);

  useEffect(() => { loadFilms(); }, [loadFilms]);

  const handleSearch = async q => {
    if (!q.trim()) { loadFilms(); return; }
    setLoading(true);
    const data = apiOk ? await api.get(`/search?q=${encodeURIComponent(q)}`) : null;
    if (data?.results?.length) {
      setFilms(data.results);
    } else {
      const ql = q.toLowerCase();
      const r = DEMO.filter(m =>
        m.title.toLowerCase().includes(ql) ||
        m.genres.some(g => g.toLowerCase().includes(ql)) ||
        m.director?.some(d => d.toLowerCase().includes(ql))
      );
      setFilms(r.length ? r : DEMO.slice(0, 10));
    }
    setLoading(false);
  };

  const tabMeta = {
    trending:  { title: "Trending Now",          sub: "Most-watched films ranked by IMDB-style weighted rating" },
    top_rated: { title: "Critically Acclaimed",   sub: "Highest-rated films across all genres" },
    for_you:   { title: "Curated For You",         sub: "Personalized via Collaborative Filtering (SVD)" },
  };

  const featured = DEMO.find(m => m.movieId === 3);

  return (
    <div className="film-grain" style={{ minHeight: "100vh" }}>
      {/* Cursor spotlight */}
      <div className="spotlight" style={{ left: spot.x, top: spot.y }} />

      <Nav tab={tab} setTab={t => { setTab(t); setQuery(""); setGenre(null); }} apiOk={apiOk}
        watchlistCount={watchlist.length} onOpenWatchlist={() => setShowWatchlist(true)} />
      <MLBar info={modelInfo} />

      {tab === "trending" && !query && !genre && (
        <Hero film={featured} onOpen={setSelected} />
      )}

      <main style={{ maxWidth: 1400, margin: "0 auto", padding: "44px 48px 80px", position: "relative", zIndex: 1 }}>

        {/* Search */}
        <div style={{ marginBottom: 40 }}>
          <Search val={query} onChange={setQuery} onSearch={handleSearch} />
        </div>

        {/* Genre filter */}
        {!query && (
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 7,
            marginBottom: 36, paddingBottom: 28,
            borderBottom: "1px solid #161210",
          }}>
            <button className="genre-chip" onClick={() => setGenre(null)} style={{
              borderColor: !genre ? "#c9a84c88" : "#1e1a14",
              color: !genre ? "#c9a84c" : "#3a3530",
              background: !genre ? "#c9a84c12" : "transparent",
            }}>All</button>
            {GENRES.map(g => <GenreChip key={g} genre={g} active={genre === g} onClick={g => setGenre(genre === g ? null : g)} />)}
          </div>
        )}

        {/* Section header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 5 }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 22, color: "#e8e0d4" }}>
              {query ? `Results for "${query}"` : tabMeta[tab].title}
            </h2>
            <span style={{ fontSize: 11, color: "#2a2520", fontFamily: "'DM Mono', monospace" }}>
              {films.length} titles{genre ? ` · ${genre}` : ""}
            </span>
          </div>
          {!query && <p style={{ fontSize: 12, color: "#3a3530" }}>{tabMeta[tab].sub}</p>}
          <div style={{ width: 36, height: 1.5, background: "#c9a84c", marginTop: 14, borderRadius: 1 }} />
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(182px, 1fr))", gap: 20 }}>
            {[...Array(16)].map((_, i) => <Skel key={i} />)}
          </div>
        ) : films.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: 48, opacity: 0.18, marginBottom: 14 }}>🎬</div>
            <p style={{ color: "#2a2520", fontFamily: "'Playfair Display', serif", fontSize: 18 }}>No films found</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(182px, 1fr))", gap: 20 }}>
            {films.map((film, i) => (
              <MovieCard
                key={film.movieId}
                movie={film}
                onClick={setSelected}
                rank={tab === "trending" && !query && !genre ? i + 1 : undefined}
                matchScore={tab === "for_you" && film.score}
                delay={Math.min(i * 0.035, 0.55)}
                isInWatchlist={isIn(film.movieId)}
                onWatchlistToggle={handleWatchlistToggle}
              />
            ))}
          </div>
        )}

        {/* Demo banner */}
        {!apiOk && !loading && (
          <div style={{
            marginTop: 56, padding: "26px 28px",
            background: "#0e0c0a", border: "1px solid #2a2520",
            borderRadius: 10, display: "flex", gap: 20, alignItems: "flex-start",
            borderLeft: "3px solid #c9a84c",
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 7, flexShrink: 0,
              background: "#c9a84c18", border: "1px solid #c9a84c28",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
            }}>⚙️</div>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: "#c9a84c", fontSize: 16, marginBottom: 7 }}>
                Running in Demo Mode
              </div>
              <p style={{ color: "#4a4540", fontSize: 13, lineHeight: 1.85, marginBottom: 10 }}>
                Showing 40 curated films with demo ML logic. Start the FastAPI backend to enable live hybrid recommendations with the full MovieLens 1M + TMDB 5000 datasets.
              </p>
              <code style={{
                display: "inline-block",
                background: "#080706", border: "1px solid #222",
                borderRadius: 5, padding: "7px 14px",
                color: "#4ade80", fontSize: 12, fontFamily: "'DM Mono', monospace",
              }}>
                cd backend && uvicorn app.main:app --reload --port 8000
              </code>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #161210", background: "#080706", padding: "24px 48px" }}>
        <div style={{
          maxWidth: 1400, margin: "0 auto",
          display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "'Playfair Display', serif", color: "#c9a84c", fontWeight: 700, fontSize: 15 }}>CINÉ</span>
            <span style={{ color: "#2a2520" }}>·</span>
            <span style={{ color: "#2a2520", fontSize: 11, fontFamily: "'DM Mono', monospace" }}>MATCH</span>
          </div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {["Hybrid ML", "TF-IDF + Cosine Similarity", "SVD Matrix Factorization", "MovieLens 1M", "TMDB 5000"].map(t => (
              <span key={t} style={{ fontSize: 10, color: "#1e1c18", fontFamily: "'DM Mono', monospace" }}>{t}</span>
            ))}
          </div>
          <span style={{ fontSize: 10, color: "#1e1c18", fontFamily: "'DM Mono', monospace" }}>MIT License</span>
        </div>
      </footer>

      {selected && (
        <Modal
          film={selected}
          onClose={() => setSelected(null)}
          onSelect={setSelected}
          apiOk={apiOk}
          isInWatchlist={isIn(selected.movieId)}
          onWatchlistToggle={handleWatchlistToggle}
        />
      )}

      {showWatchlist && (
        <WatchlistPanel
          watchlist={watchlist}
          onClose={() => setShowWatchlist(false)}
          onSelect={setSelected}
          onRemove={remove}
          onClear={clear}
        />
      )}

      {toast && (
        <Toast
          key={toast.message + Date.now()}
          message={toast.message}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}
    </div>
  );
}
