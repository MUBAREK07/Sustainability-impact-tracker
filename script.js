// Simple client-side multi-page SPA behavior + logic
(function () {
  const pages = [
    "dashboard",
    "calculators",
    "progress",
    "goals",
    "gamification",
    "insights",
    "auth",
  ];

  function show(page) {
    pages.forEach((p) => {
      const el = document.getElementById(p);
      if (!el) return;
      el.style.display = p === page ? "block" : "none";
    });
    // update auth link text
    const user = localStorage.getItem("sit_user");
    document
      .querySelectorAll(".auth-link")
      .forEach((a) => (a.textContent = user ? "Hi, " + user : "Log in"));
  }

  function route() {
    const hash = location.hash.replace("#/", "") || "";
    const page = pages.includes(hash) ? hash : "dashboard";
    show(page);
    // if navigating to progress, lazy-load charts and initialize
    if (page === "progress") {
      // ensure charts and then wire progress (idempotent)
      ensureCharts().then(() => {
        try {
          wireProgress();
        } catch (e) {}
      });
    }
  }

  window.addEventListener("hashchange", route);
  document.addEventListener("DOMContentLoaded", () => {
    // wire nav default
    route();
    wireAuth();
    wireCalculators();
    wireGoals();
    wireGamification();
    wireIntegrations();
    renderOverview();
    wireTheme();
    wireCommunityForm();
    initDashboard();
    // register service worker for PWA caching
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/service-worker.js").catch(() => {});
    }
    // header scroll handler
    handleHeaderOnScroll();
    window.addEventListener("scroll", handleHeaderOnScroll, { passive: true });
  });

  // ----------------- Integrations -----------------
  async function refreshIntegrations() {
    const out = document.getElementById("integrations-list");
    out.textContent = "Loading...";
    try {
      const [sm, gr, tr] = await Promise.all([
        fetch("/api/data/smart-meter")
          .then((r) => r.json())
          .catch(() => ({ impact: 0 })),
        fetch("/api/data/grocery")
          .then((r) => r.json())
          .catch(() => ({ impact: 0 })),
        fetch("/api/data/travel")
          .then((r) => r.json())
          .catch(() => ({ impact: 0 })),
      ]);
      out.innerHTML = `<div>Smart meter: ${sm.impact || 0}</div><div>Grocery: ${gr.impact || 0}</div><div>Travel: ${tr.impact || 0}</div>`;
      // update overview and score
      const score = Math.round(
        800 -
          ((sm.impact || 0) * 0.3 +
            (gr.impact || 0) * 0.2 +
            (tr.impact || 0) * 0.25),
      );
      document.getElementById("eco-score").textContent = score;
      renderOverview({ sm, gr, tr, score });
    } catch (e) {
      out.textContent = "Failed to load integrations";
    }
  }
  document.addEventListener("click", (e) => {
    if (e.target && e.target.id === "refresh-integrations")
      refreshIntegrations();
  });

  // ----------------- Overview -----------------
  function renderOverview(data) {
    const out = document.getElementById("overview-content");
    const stored =
      data || JSON.parse(localStorage.getItem("sit_overview") || "null");
    if (!stored) {
      out.innerHTML =
        '<div class="muted">No live data. Use Refresh integrations or connect a service.</div>';
      return;
    }
    out.innerHTML = `<div><strong>Score:</strong> ${stored.score || "—"}</div><div><strong>Home impact:</strong> ${stored.sm?.impact || "—"}</div>`;
    // update critter based on score
    try {
      renderCritter(
        stored.score ||
          Number(document.getElementById("eco-score").textContent) ||
          0,
      );
    } catch (e) {}
  }

  // ----------------- Auth -----------------
  function wireAuth() {
    const login = document.getElementById("login-form");
    if (!login) return;
    login.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const name = document.getElementById("login-name").value.trim();
      if (!name) return;
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        const j = await res.json();
        if (j.token) {
          localStorage.setItem("sit_user", j.name);
          localStorage.setItem("sit_token", j.token);
          document.getElementById("login-status").textContent =
            "Signed in as " + j.name;
          location.hash = "#/";
        } else {
          document.getElementById("login-status").textContent =
            "Sign in failed";
        }
      } catch (e) {
        document.getElementById("login-status").textContent = "Sign in failed";
      }
    });
  }

  // ----------------- Theme / Dark mode -----------------
  function applyTheme(theme) {
    const html = document.documentElement;
    if (theme === "dark") html.classList.add("dark");
    else html.classList.remove("dark");
    // update toggle state
    const btn = document.getElementById("dark-toggle");
    if (btn) btn.setAttribute("aria-pressed", theme === "dark");
    localStorage.setItem("sit_theme", theme);
  }

  function wireTheme() {
  const btn = document.getElementById("dark-toggle");

  function setTheme(mode) {
    if (mode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("sit_theme", mode);
  }

  // initial
  const saved = localStorage.getItem("sit_theme") || "light";
  setTheme(saved);

  // toggle
  if (btn) {
    btn.addEventListener("click", () => {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "light" : "dark");
    });
  }
}


  // ----------------- Header scroll behavior -----------------
  function handleHeaderOnScroll() {
    const header = document.querySelector(".site-header");
    if (!header) return;
    const scrolled = window.scrollY > 20;
    header.classList.toggle("scrolled", scrolled);
  }

  // ----------------- Calculators -----------------
  function wireCalculators() {
    // travel
    document.getElementById("calc-travel-do").addEventListener("click", () => {
      const km = Number(document.getElementById("calc-travel-km").value || 0);
      const mode = document.getElementById("calc-travel-mode").value;
      const factor =
        { car: 0.21, bus: 0.05, train: 0.06, plane: 0.255 }[mode] || 0.2;
      const kgCO2 = +(km * factor).toFixed(2);
      document.getElementById("calc-travel-result").textContent =
        `${kgCO2} kg CO2 for ${km} km by ${mode}`;
    });

    // diet
    document.getElementById("calc-diet-do").addEventListener("click", () => {
      const type = document.getElementById("calc-diet-type").value;
      const meals = Number(
        document.getElementById("calc-diet-meals").value || 0,
      );
      const perMeal = { omnivore: 3.0, vegetarian: 1.6, vegan: 1.1 }[type] || 2;
      const kgCO2 = +(perMeal * meals).toFixed(2);
      document.getElementById("calc-diet-result").textContent =
        `${kgCO2} kg CO2 per week for ${meals} meals as ${type}`;
    });

    // home
    document.getElementById("calc-home-do").addEventListener("click", () => {
      const kwh = Number(document.getElementById("calc-home-kwh").value || 0);
      const kgCO2 = +(kwh * 0.233).toFixed(2); // average factor
      document.getElementById("calc-home-result").textContent =
        `${kgCO2} kg CO2 / month for ${kwh} kWh`;
    });
  }

  // ----------------- Goals -----------------
  function wireGoals() {
    const form = document.getElementById("goal-form");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const title = document.getElementById("goal-title").value.trim();
      const target = Number(document.getElementById("goal-target").value || 0);
      const by = document.getElementById("goal-date").value;
      const list = JSON.parse(localStorage.getItem("sit_goals") || "[]");
      const goal = { id: Date.now(), title, target, by, progress: 0 };
      list.push(goal);
      localStorage.setItem("sit_goals", JSON.stringify(list));
      renderGoals();
      form.reset();
    });
    renderGoals();
  }
  function renderGoals() {
    const el = document.getElementById("goals-list");
    const list = JSON.parse(localStorage.getItem("sit_goals") || "[]");
    if (!list.length) {
      el.innerHTML = '<div class="muted">No pledges yet</div>';
      return;
    }
    el.innerHTML = list
      .map(
        (g) =>
          `<div class="card goal"><strong>${g.title}</strong><div>Target: ${g.target}% by ${g.by || "—"}</div><div>Progress: <progress value="${g.progress}" max="100">${g.progress}%</progress></div></div>`,
      )
      .join("");
  }

  // ----------------- Progress / Charts -----------------
  let lineChart, pieChart, barChart;
  // lazy-load Chart.js (CDN) and initialize charts when Progress page is opened
  let chartsInitialized = false;
  function ensureCharts() {
    if (chartsInitialized) return Promise.resolve();
    return new Promise((resolve, reject) => {
      // load Chart.js dynamically
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/chart.js";
      s.async = true;
      s.onload = () => {
        chartsInitialized = true;
        resolve();
      };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function wireProgress() {
    await ensureCharts();
    // prepare sample data or load from storage
    const weekly = JSON.parse(
      localStorage.getItem("sit_weekly") || "[12,10,11,9,8,7,6]",
    );
    const categories = JSON.parse(
      localStorage.getItem("sit_categories") || "[40,30,30]",
    );
    const monthly = JSON.parse(
      localStorage.getItem("sit_monthly") || "[320,300,280,260,290,310]",
    );

    const ctxLine = document.getElementById("chart-line").getContext("2d");
    lineChart = new Chart(ctxLine, {
      type: "line",
      data: {
        labels: ["6w", "5w", "4w", "3w", "2w", "last", "this"],
        datasets: [
          {
            label: "kg CO2",
            data: weekly,
            borderColor: "#2b9f6a",
            backgroundColor: "#2b9f6a22",
            fill: true,
          },
        ],
      },
      options: { responsive: true },
    });

    const ctxPie = document.getElementById("chart-pie").getContext("2d");
    pieChart = new Chart(ctxPie, {
      type: "pie",
      data: {
        labels: ["Home", "Food", "Travel"],
        datasets: [
          {
            data: categories,
            backgroundColor: ["#2b9f6a", "#60a5fa", "#f59e0b"],
          },
        ],
      },
      options: { responsive: true },
    });

    const ctxBar = document.getElementById("chart-bar").getContext("2d");
    barChart = new Chart(ctxBar, {
      type: "bar",
      data: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        datasets: [{ label: "CO2", data: monthly, backgroundColor: "#60a5fa" }],
      },
      options: { responsive: true },
    });
  }

  // ----------------- Gamification -----------------
  function wireGamification() {
    renderGamification();
  }
  function renderGamification() {
    const badgesEl = document.getElementById("badges");
    const lb = document.getElementById("leaderboard");
    const badges = JSON.parse(
      localStorage.getItem("sit_badges") || '["Getting Started"]',
    );
    badgesEl.innerHTML = badges
      .map((b) => `<span class="badge">${b}</span>`)
      .join("");
    const leaderboard = JSON.parse(
      localStorage.getItem("sit_leaderboard") ||
        JSON.stringify([
          { name: "You", score: 720 },
          { name: "Neighbour", score: 640 },
          { name: "Top Local", score: 880 },
        ]),
    );
    lb.innerHTML = leaderboard
      .map((i) => `<li>${i.name} — ${i.score}</li>`)
      .join("");
    // level
    const score = Number(document.getElementById("eco-score").textContent) || 0;
    const level =
      score > 800 ? "Eco Hero" : score > 650 ? "Eco Advocate" : "Eco Novice";
    document.getElementById("user-level").textContent = level;
  }

  // ----------------- Insights -----------------
  function generateInsights() {
    // simple rule-based insights
    const insights = [];
    const kwh = Number(localStorage.getItem("sit_last_kwh") || 300);
    if (kwh > 250)
      insights.push({
        text: "Your household electricity use is above 250 kWh — consider switching to LED bulbs and smarter heating controls.",
      });
    const travelKm = Number(localStorage.getItem("sit_last_km") || 120);
    if (travelKm > 50)
      insights.push({
        text: "You drive frequently — try combining errands or using public transit once per week.",
      });
    if (!insights.length)
      insights.push({
        text: "Good job — no immediate actionable items. Keep tracking to get personalized tips.",
      });
    const el = document.getElementById("insights-list");
    el.innerHTML = insights
      .map((i) => `<div class="card"><div>${i.text}</div></div>`)
      .join("");
  }

  // ----------------- Charismatic Critter -----------------
  function renderCritter(score) {
    const mouth = document.getElementById("critter-mouth");
    const svg = document.getElementById("critter-svg");
    if (!mouth || !svg) return;
    // normalize score to 0-1000 range
    const s = Math.max(0, Math.min(1000, Number(score || 0)));
    // set color intensity
    const pct = s / 1000;
    const color =
      pct > 0.66 ? "var(--accent)" : pct > 0.33 ? "#f59e0b" : "#ef4444";
    svg.style.color = color;
    // change mouth path: happy (smile), neutral, sad
    if (pct > 0.66) {
      mouth.setAttribute("d", "M40 68 Q60 82 80 68");
    } else if (pct > 0.33) {
      mouth.setAttribute("d", "M45 72 Q60 76 75 72");
    } else {
      mouth.setAttribute("d", "M40 78 Q60 66 80 78");
    }
    const caption = document.getElementById("critter-caption");
    if (caption)
      caption.textContent =
        pct > 0.66
          ? "Purr-fect — keep it up!"
          : pct > 0.33
            ? "Good — small wins matter"
            : "Let’s try some small changes today";
  }

  // ----------------- Community Impact Board -----------------
  async function updateCommunityBoard() {
    const sumEl = document.getElementById("community-summary");
    const storiesEl = document.getElementById("community-stories");
    if (!sumEl || !storiesEl) return;
    sumEl.textContent = "Loading...";
    try {
      const res = await fetch("/api/community")
        .then((r) => r.json())
        .catch(() => null);
      if (!res) {
        // fallback to local aggregated sample
        const total = Number(localStorage.getItem("sit_community_total") || 0);
        sumEl.textContent = `Combined impact: ${total} kg CO2 saved by your community`;
        storiesEl.innerHTML = JSON.parse(
          localStorage.getItem("sit_community_stories") || "[]",
        )
          .map(
            (s) =>
              `<div class="story">${escapeHtml(s.text)}<div class="muted">— ${escapeHtml(s.name || "A neighbor")}</div></div>`,
          )
          .join("");
        return;
      }
      sumEl.textContent = `Combined impact: ${res.totalImpact || 0} kg CO2 saved by your community`;
      storiesEl.innerHTML = (res.stories || [])
        .map(
          (s) =>
            `<div class="story">${escapeHtml(s.text)}<div class="muted">— ${escapeHtml(s.name || "A neighbor")}</div></div>`,
        )
        .join("");
    } catch (e) {
      sumEl.textContent = "Community data unavailable";
    }
  }

  function escapeHtml(s) {
    return String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  }

  function wireCommunityForm() {
    const form = document.getElementById("community-form");
    if (!form) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = document.getElementById("community-text").value.trim();
      if (!text) return;
      const payload = {
        name: localStorage.getItem("sit_user") || "Anonymous",
        text,
        ts: Date.now(),
      };
      // try to POST to server; use safeFetch which queues when offline
      try {
        await safeFetch("/api/community", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        // update local mirror
        const list = JSON.parse(
          localStorage.getItem("sit_community_stories") || "[]",
        );
        list.unshift(payload);
        localStorage.setItem(
          "sit_community_stories",
          JSON.stringify(list.slice(0, 50)),
        );
        // update total
        const total =
          Number(localStorage.getItem("sit_community_total") || 0) + 0;
        localStorage.setItem("sit_community_total", total);
        document.getElementById("community-text").value = "";
        updateCommunityBoard();
      } catch (e) {
        // still update local UI
        const list = JSON.parse(
          localStorage.getItem("sit_community_stories") || "[]",
        );
        list.unshift(payload);
        localStorage.setItem(
          "sit_community_stories",
          JSON.stringify(list.slice(0, 50)),
        );
        updateCommunityBoard();
      }
    });
    // initial load
    updateCommunityBoard();
  }

  // ----------------- Misc -----------------
  function wireIntegrations() {
    // trigger initial refresh but non-blocking
    refreshIntegrations();
  }

  // ----------------- Dashboard init and behaviors -----------------
  function initDashboard() {
    try {
      populateFootprint();
    } catch (e) {}
    try {
      renderGauges();
    } catch (e) {}
    try {
      wireLogger();
    } catch (e) {}
    try {
      renderStreaks();
    } catch (e) {}
    try {
      renderGoals();
    } catch (e) {}
    try {
      renderPeerComparison();
    } catch (e) {}
    try {
      renderRecommendation();
    } catch (e) {}
    try {
      renderSavings();
    } catch (e) {}
    // wire metric toggles for dashboard chart
    document.querySelectorAll(".metric-toggle").forEach((btn) =>
      btn.addEventListener("click", (ev) => {
        document
          .querySelectorAll(".metric-toggle")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const metric = btn.dataset.metric;
        document.getElementById("map-metric").textContent =
          metric === "co2" ? "kg CO2" : "Tree eq.";
        // re-render dashboard chart for chosen metric
        try {
          renderDashboardChart(metric);
        } catch (e) {}
      }),
    );
    // initial dashboard chart render
    ensureCharts().then(() => {
      try {
        renderDashboardChart("co2");
      } catch (e) {}
    });
  }

  function populateFootprint() {
    // mock aggregated values or read from localStorage
    const thisMonth = Number(localStorage.getItem("sit_total_this") || 320);
    const prev = Number(localStorage.getItem("sit_total_prev") || 360);
    document.getElementById("total-this-month").textContent =
      `${thisMonth} kg CO2e`;
    document.getElementById("total-prev-month").textContent = `${prev} kg CO2e`;
    // simple overshoot calc: if per-capita annual > 1.7*global, compute date
    const annualEstimate = thisMonth * 12;
    const overshoot =
      annualEstimate > 8000
        ? "In " + Math.round((8000 / annualEstimate) * 365) + " days"
        : "Beyond year";
    document.getElementById("overshoot-date").textContent =
      `Earth Overshoot projection: ${overshoot}`;
    // eco-score already updated by integrations; fallback
    const scoreEl = document.getElementById("eco-score");
    if (!scoreEl.textContent || scoreEl.textContent.trim() === "—")
      scoreEl.textContent = Math.round(800 - thisMonth * 0.2);
  }

  function renderGauges() {
    const env = Number(localStorage.getItem("sit_gauge_env") || 40);
    const soc = Number(localStorage.getItem("sit_gauge_soc") || 30);
    const eco = Number(localStorage.getItem("sit_gauge_eco") || 30);
    document.querySelector("#gauge-environment .gauge-value").textContent =
      env + "%";
    document.querySelector("#gauge-social .gauge-value").textContent =
      soc + "%";
    document.querySelector("#gauge-economic .gauge-value").textContent =
      eco + "%";
  }

  function wireLogger() {
    const form = document.getElementById("logger-form");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const action = document.getElementById("logger-action").value;
      const count = Number(document.getElementById("logger-count").value || 1);
      const logs = JSON.parse(localStorage.getItem("sit_logs") || "[]");
      logs.unshift({ action, count, ts: Date.now() });
      localStorage.setItem("sit_logs", JSON.stringify(logs.slice(0, 200)));
      document.getElementById("logger-status").textContent =
        "Logged: " + action + " x" + count;
      // update small analytics
      updateHabitsFromLogs();
      renderStreaks();
      renderRecommendation();
    });
  }

  function updateHabitsFromLogs() {
    const logs = JSON.parse(localStorage.getItem("sit_logs") || "[]");
    // derive simple streaks: count actions in last 7 days
    const now = Date.now();
    const week = 7 * 24 * 3600 * 1000;
    const recent = logs.filter((l) => now - l.ts < week);
    const map = {};
    recent.forEach((l) => (map[l.action] = (map[l.action] || 0) + l.count));
    localStorage.setItem("sit_habits", JSON.stringify(map));
  }

  function renderStreaks() {
    const el = document.getElementById("streaks-list");
    const map = JSON.parse(localStorage.getItem("sit_habits") || "{}");
    const entries = Object.keys(map);
    if (!entries.length) {
      el.innerHTML = '<div class="muted">No habits logged yet.</div>';
      return;
    }
    el.innerHTML = entries
      .map(
        (k) =>
          `<div class="streak"><strong>${k.replace(/_/g, " ")}</strong>: ${map[k]} this week</div>`,
      )
      .join("");
  }

  function renderGoals() {
    const el = document.getElementById("goal-progress-list");
    const list = JSON.parse(localStorage.getItem("sit_goals") || "[]");
    if (!list.length) {
      el.innerHTML = '<div class="muted">No goals yet.</div>';
      return;
    }
    el.innerHTML = list
      .map(
        (g) =>
          `<div class="goal-row"><div><strong>${g.title}</strong></div><div><progress value="${g.progress || 0}" max="100"></progress></div></div>`,
      )
      .join("");
  }

  function renderPeerComparison() {
    // mock peer data
    const peers = [
      { name: "Neighborhood", avg: 340 },
      { name: "City Avg", avg: 410 },
      { name: "Top 10%", avg: 220 },
    ];
    const el = document.getElementById("peer-compare");
    el.innerHTML = peers
      .map(
        (p) =>
          `<div><strong>${p.name}:</strong> ${p.avg} kg CO2 <div class="bar" style="width:${Math.min(100, p.avg / 5)}%"></div></div>`,
      )
      .join("");
  }

  function renderRecommendation() {
    // naive recommendation: check biggest gauge
    const env = Number(localStorage.getItem("sit_gauge_env") || 40);
    const soc = Number(localStorage.getItem("sit_gauge_soc") || 30);
    const eco = Number(localStorage.getItem("sit_gauge_eco") || 30);
    const max = Math.max(env, soc, eco);
    const rec =
      max === env
        ? "Switch to LED and optimize heating to reduce environmental impact."
        : max === soc
          ? "Prefer ethically sourced brands when shopping."
          : "Consider bulk purchases and energy-efficient appliances to save money.";
    document.getElementById("top-recommendation").textContent = rec;
  }

  function renderSavings() {
    // show simple savings estimate
    const saved = Number(localStorage.getItem("sit_savings") || 45);
    document.getElementById("financial-savings").textContent =
      `$${saved} estimated saved this month`;
  }

  function renderDashboardChart(metric = "co2") {
    // reuse ensureCharts and create a small chart for dashboard
    try {
      const ctx = document
        .getElementById("dashboard-chart-line")
        .getContext("2d");
      const data = JSON.parse(
        localStorage.getItem("sit_weekly") || "[12,10,11,9,8,7,6]",
      );
      if (window.dashboardChart) window.dashboardChart.destroy();
      window.dashboardChart = new Chart(ctx, {
        type: "line",
        data: {
          labels: ["6w", "5w", "4w", "3w", "2w", "last", "this"],
          datasets: [
            {
              label: metric === "co2" ? "kg CO2" : "trees",
              data: data,
              borderColor: "#2b9f6a",
              backgroundColor: "#2b9f6a22",
              fill: true,
            },
          ],
        },
        options: { responsive: true, maintainAspectRatio: false },
      });
    } catch (e) {
      console.warn(e);
    }
  }

  // ----------------- Offline queue for API calls -----------------
  function enqueueRequest(url, opts) {
    const queue = JSON.parse(localStorage.getItem("sit_queue") || "[]");
    queue.push({ url, opts, ts: Date.now() });
    localStorage.setItem("sit_queue", JSON.stringify(queue));
  }

  async function flushQueue() {
    const queue = JSON.parse(localStorage.getItem("sit_queue") || "[]");
    if (!queue.length) return;
    const remaining = [];
    for (const req of queue) {
      try {
        await fetch(req.url, req.opts);
      } catch (e) {
        remaining.push(req);
      }
    }
    localStorage.setItem("sit_queue", JSON.stringify(remaining));
  }

  window.addEventListener("online", () => {
    flushQueue().catch(() => {});
  });

  // helper to do fetch with offline-queue fallback
  async function safeFetch(url, opts = {}) {
    try {
      const resp = await fetch(url, opts);
      if (!resp.ok) throw new Error("bad");
      return resp;
    } catch (e) {
      // offline or network error -> enqueue
      enqueueRequest(url, opts);
      return new Response(JSON.stringify({ error: "queued" }), {
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // expose small API for other modules
  window.sit = { refreshIntegrations, generateInsights };
  // render insights once
  setTimeout(generateInsights, 700);
})();
