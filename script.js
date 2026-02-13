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
  let dashboardMap;
  let dashboardMarker;
  let dashboardCircle;
  let leafletLoadPromise;
  const dashboardPanelIds = [
    "dashboard-overview",
    "dashboard-activity",
    "dashboard-insights",
    "dashboard-visuals",
  ];
  const calculatorsPanelIds = [
    "calculators-core",
    "calculators-data",
    "calculators-scenario",
    "calculators-lca",
  ];

  function setNavOpen(open) {
    const btn = document.getElementById("nav-toggle");
    const nav = document.getElementById("primary-nav");
    if (!btn || !nav) return;
    nav.classList.toggle("open", !!open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function closeNavMenu() {
    setNavOpen(false);
  }

  function wireHamburgerNav() {
    const btn = document.getElementById("nav-toggle");
    const nav = document.getElementById("primary-nav");
    if (!btn || !nav || btn.dataset.wired === "1") return;
    btn.dataset.wired = "1";

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isOpen = btn.getAttribute("aria-expanded") === "true";
      setNavOpen(!isOpen);
    });

    nav.querySelectorAll("a, button").forEach((item) => {
      item.addEventListener("click", () => {
        if (window.innerWidth > 800) return;
        if (item.id === "nav-dashboard-link" || item.id === "nav-calculators-link")
          return;
        closeNavMenu();
      });
    });

    document.addEventListener("click", (e) => {
      if (window.innerWidth > 800) return;
      const target = e.target;
      if (!nav.contains(target) && !btn.contains(target)) {
        closeNavMenu();
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 800) closeNavMenu();
    });
  }

  function wireDashboardNavSubmenu() {
    const item = document.getElementById("nav-dashboard-item");
    const link = document.getElementById("nav-dashboard-link");
    if (!item || !link || link.dataset.wired === "1") return;
    link.dataset.wired = "1";

    link.addEventListener("click", (e) => {
      if (window.innerWidth <= 800) {
        e.preventDefault();
        item.classList.toggle("open");
      }
    });

    item.querySelectorAll("a[data-dashboard-panel]").forEach((sub) => {
      sub.addEventListener("click", (e) => {
        e.preventDefault();
        const panelId = sub.getAttribute("data-dashboard-panel");
        if (!panelId) return;
        showDashboardPanel(panelId);
        item.classList.remove("open");
        location.hash = "#/";
      });
    });

    document.addEventListener("click", (e) => {
      const target = e.target;
      if (!item.contains(target)) item.classList.remove("open");
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 800) item.classList.remove("open");
    });
  }

  function wireCalculatorsNavSubmenu() {
    const item = document.getElementById("nav-calculators-item");
    const link = document.getElementById("nav-calculators-link");
    if (!item || !link || link.dataset.wired === "1") return;
    link.dataset.wired = "1";

    link.addEventListener("click", (e) => {
      showCalculatorsPanel("calculators-core");
      if (window.innerWidth <= 800) {
        e.preventDefault();
        item.classList.toggle("open");
      }
    });

    item.querySelectorAll("a[data-calculators-panel]").forEach((sub) => {
      sub.addEventListener("click", (e) => {
        e.preventDefault();
        const panelId = sub.getAttribute("data-calculators-panel");
        if (!panelId) return;
        showCalculatorsPanel(panelId);
        item.classList.remove("open");
        location.hash = "#/calculators";
      });
    });

    document.addEventListener("click", (e) => {
      const target = e.target;
      if (!item.contains(target)) item.classList.remove("open");
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 800) item.classList.remove("open");
    });
  }

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
    if (window.innerWidth <= 800) {
      closeNavMenu();
    }
    if (page === "dashboard") {
      setTimeout(() => {
        try {
          refreshDashboardMapLayout();
        } catch (e) {}
      }, 60);
    }
    if (page === "calculators") {
      showCalculatorsPanel(getSavedCalculatorsPanel());
    }
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
    wireHamburgerNav();
    wireDashboardNavSubmenu();
    wireCalculatorsNavSubmenu();
    route();
    // wire theme early so toggle always works even if later UI blocks fail
    wireTheme();
    wireAuth();
    wireCalculators();
    wireSustainabilityStudio();
    wireGoals();
    wireGamification();
    wireIntegrations();
    renderOverview();
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
    if (!out) return;
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
    if (!out) return;
    const stored =
      data || JSON.parse(localStorage.getItem("sit_overview") || "null");
    if (!stored) {
      out.innerHTML =
        '<div class="muted">No live data. Use Refresh integrations or connect a service.</div>';
      return;
    }
    out.innerHTML = `<div><strong>Score:</strong> ${stored.score || "â€”"}</div><div><strong>Home impact:</strong> ${stored.sm?.impact || "â€”"}</div>`;
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
    const signup = document.getElementById("signup-form");
    const loginStatus = document.getElementById("login-status");
    const showSignupBtn = document.getElementById("show-signup");
    const showLoginBtn = document.getElementById("show-login");
    const forgotPassword = document.getElementById("forgot-password");
    const signupMethod = document.getElementById("signup-method");
    const signupContactLabel = document.getElementById("signup-contact-label");
    const signupContact = document.getElementById("signup-contact");

    if (!login || !signup || !loginStatus) return;

    function setAuthMessage(message, isError = false) {
      loginStatus.textContent = message;
      loginStatus.classList.toggle("is-error", isError);
    }

    function showLoginForm() {
      signup.hidden = true;
      login.hidden = false;
      setAuthMessage("");
    }

    function showSignupForm() {
      login.hidden = true;
      signup.hidden = false;
      setAuthMessage("");
    }

    function getAccounts() {
      return JSON.parse(localStorage.getItem("sit_accounts") || "[]");
    }

    function saveAccounts(accounts) {
      localStorage.setItem("sit_accounts", JSON.stringify(accounts));
    }

    function normalizePhone(value) {
      return value.replace(/\D/g, "");
    }

    function getContactKey(mode, value) {
      if (mode === "phone") return `phone:${normalizePhone(value)}`;
      return `email:${value.trim().toLowerCase()}`;
    }

    function updateSignupContactUi() {
      const mode = signupMethod.value;
      if (mode === "phone") {
        signupContactLabel.textContent = "Phone number";
        signupContact.type = "tel";
        signupContact.placeholder = "e.g. 5551234567";
        signupContact.autocomplete = "tel";
      } else {
        signupContactLabel.textContent = "Email";
        signupContact.type = "email";
        signupContact.placeholder = "you@example.com";
        signupContact.autocomplete = "email";
      }
      signupContact.value = "";
    }

    if (showSignupBtn) {
      showSignupBtn.addEventListener("click", showSignupForm);
    }

    if (showLoginBtn) {
      showLoginBtn.addEventListener("click", showLoginForm);
    }

    if (forgotPassword) {
      forgotPassword.addEventListener("click", (e) => {
        e.preventDefault();
        setAuthMessage(
          "Password reset is not available yet. Create a new account if needed.",
          true,
        );
      });
    }

    if (signupMethod) {
      signupMethod.addEventListener("change", updateSignupContactUi);
      updateSignupContactUi();
    }

    login.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const contactInput = document.getElementById("login-contact");
      const passwordInput = document.getElementById("login-password");
      const contactRaw = contactInput ? contactInput.value.trim() : "";
      const password = passwordInput ? passwordInput.value : "";
      if (!contactRaw || !password) {
        setAuthMessage("Enter email/phone and password.", true);
        return;
      }

      const mode = contactRaw.includes("@") ? "email" : "phone";
      const contactKey = getContactKey(mode, contactRaw);
      const accounts = getAccounts();
      const account = accounts.find((a) => a.contactKey === contactKey);

      if (!account) {
        setAuthMessage(
          "No account found for this email/phone. Create a new account.",
          true,
        );
        return;
      }

      if (account.password !== password) {
        setAuthMessage("Incorrect password. Try again.", true);
        return;
      }

      localStorage.setItem("sit_user", account.name);
      localStorage.setItem("sit_token", `local-${account.id}`);
      setAuthMessage(`Signed in as ${account.name}`);
      location.hash = "#/";
    });

    signup.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const name = document.getElementById("signup-name").value.trim();
      const mode = signupMethod.value;
      const contactRaw = signupContact.value.trim();
      const password = document.getElementById("signup-password").value;
      const confirm = document.getElementById("signup-password-confirm").value;

      if (name.length < 2) {
        setAuthMessage("Enter your full name.", true);
        return;
      }

      if (!contactRaw) {
        setAuthMessage("Enter your email or phone number.", true);
        return;
      }

      if (mode === "phone") {
        const digits = normalizePhone(contactRaw);
        if (digits.length < 7 || digits.length > 15) {
          setAuthMessage("Enter a valid phone number.", true);
          return;
        }
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactRaw)) {
        setAuthMessage("Enter a valid email address.", true);
        return;
      }

      if (password.length < 6) {
        setAuthMessage("Password must be at least 6 characters.", true);
        return;
      }

      if (password !== confirm) {
        setAuthMessage("Passwords do not match.", true);
        return;
      }

      const contactKey = getContactKey(mode, contactRaw);
      const accounts = getAccounts();
      const exists = accounts.some((a) => a.contactKey === contactKey);
      if (exists) {
        setAuthMessage("This account already exists. Please log in.", true);
        showLoginForm();
        return;
      }

      const account = {
        id: Date.now(),
        name,
        mode,
        contact: contactRaw,
        contactKey,
        password,
      };
      accounts.push(account);
      saveAccounts(accounts);

      localStorage.setItem("sit_user", account.name);
      localStorage.setItem("sit_token", `local-${account.id}`);
      setAuthMessage(`Welcome, ${account.name}. Your account is ready.`);
      location.hash = "#/";
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

    // initial theme (fallback to light when storage is empty/invalid)
    const saved = localStorage.getItem("sit_theme");
    const initialTheme = saved === "dark" || saved === "light" ? saved : "light";
    applyTheme(initialTheme);

    if (btn) {
      btn.addEventListener("click", () => {
        const isDark = document.documentElement.classList.contains("dark");
        applyTheme(isDark ? "light" : "dark");
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
      localStorage.setItem("sit_last_km", String(km));
      recordCalculation("travel", kgCO2, { mode, km });
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
      recordCalculation("food", kgCO2, { type, meals });
    });

    // home
    document.getElementById("calc-home-do").addEventListener("click", () => {
      const kwh = Number(document.getElementById("calc-home-kwh").value || 0);
      const kgCO2 = +(kwh * 0.233).toFixed(2); // average factor
      document.getElementById("calc-home-result").textContent =
        `${kgCO2} kg CO2 / month for ${kwh} kWh`;
      localStorage.setItem("sit_last_kwh", String(kwh));
      recordCalculation("home", kgCO2, { kwh });
    });
  }

  // ----------------- Calculations -> Progress data -----------------
  function getCalculationHistory() {
    try {
      const parsed = JSON.parse(localStorage.getItem("sit_calc_history") || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveCalculationHistory(history) {
    localStorage.setItem("sit_calc_history", JSON.stringify(history.slice(-500)));
  }

  function getMonthBuckets(monthCount) {
    const buckets = [];
    const now = new Date();
    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString(undefined, { month: "short" });
      buckets.push({ key, label });
    }
    return buckets;
  }

  function round2(value) {
    return +Number(value || 0).toFixed(2);
  }

  function readStoredArray(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "null");
      return Array.isArray(parsed) ? parsed : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function toNonNegativeNumber(value, fallback = 0) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return fallback;
    return parsed;
  }

  function getDefaultBaselineProfile() {
    return {
      electricityKwh: 300,
      waterM3: 18,
      fuelLiters: 45,
      wasteKg: 28,
      recycleRate: 35,
      materialsKg: 120,
      logisticsKm: 900,
      commuteKmWeek: 80,
    };
  }

  function getBaselineProfile() {
    const defaults = getDefaultBaselineProfile();
    try {
      const parsed = JSON.parse(
        localStorage.getItem("sit_baseline_profile") || "{}",
      );
      if (!parsed || typeof parsed !== "object") return defaults;
      return {
        electricityKwh: toNonNegativeNumber(
          parsed.electricityKwh,
          defaults.electricityKwh,
        ),
        waterM3: toNonNegativeNumber(parsed.waterM3, defaults.waterM3),
        fuelLiters: toNonNegativeNumber(parsed.fuelLiters, defaults.fuelLiters),
        wasteKg: toNonNegativeNumber(parsed.wasteKg, defaults.wasteKg),
        recycleRate: Math.max(
          0,
          Math.min(100, toNonNegativeNumber(parsed.recycleRate, defaults.recycleRate)),
        ),
        materialsKg: toNonNegativeNumber(parsed.materialsKg, defaults.materialsKg),
        logisticsKm: toNonNegativeNumber(parsed.logisticsKm, defaults.logisticsKm),
        commuteKmWeek: toNonNegativeNumber(
          parsed.commuteKmWeek,
          defaults.commuteKmWeek,
        ),
      };
    } catch (e) {
      return defaults;
    }
  }

  function saveBaselineProfile(profile) {
    localStorage.setItem("sit_baseline_profile", JSON.stringify(profile));
  }

  function applyBaselineProfileToForm(profile) {
    const fields = [
      ["pre-electricity", profile.electricityKwh],
      ["pre-water", profile.waterM3],
      ["pre-fuel", profile.fuelLiters],
      ["pre-waste", profile.wasteKg],
      ["pre-recycle-rate", profile.recycleRate],
      ["pre-materials", profile.materialsKg],
      ["pre-logistics-km", profile.logisticsKm],
      ["pre-commute-km", profile.commuteKmWeek],
    ];
    fields.forEach(([id, value]) => {
      const input = document.getElementById(id);
      if (!input) return;
      if (document.activeElement === input) return;
      input.value = String(value);
    });
  }

  function getRecentHistoryTotals(rangeDays = 30) {
    const history = getCalculationHistory();
    const cutoff = Date.now() - rangeDays * 24 * 3600 * 1000;
    const totals = { home: 0, food: 0, travel: 0 };
    history.forEach((entry) => {
      const ts = Number(entry.ts) || 0;
      const kg = Number(entry.kg) || 0;
      if (ts < cutoff || kg <= 0) return;
      if (entry.category in totals) totals[entry.category] += kg;
    });
    return {
      home: round2(totals.home),
      food: round2(totals.food),
      travel: round2(totals.travel),
    };
  }

  function buildCoreCalculationSnapshot() {
    const profile = getBaselineProfile();
    const recent = getRecentHistoryTotals(30);

    const scope1 = round2(
      profile.fuelLiters * 2.31 + profile.wasteKg * 0.28 + recent.travel * 0.35,
    );
    const scope2 = round2(profile.electricityKwh * 0.233);
    const scope3 = round2(
      recent.food +
        profile.materialsKg * 0.65 +
        profile.logisticsKm * 0.09 +
        profile.commuteKmWeek * 4 * 0.08,
    );

    const carbonTotal = round2(scope1 + scope2 + scope3);
    const recyclingShare = Math.max(0, Math.min(1, profile.recycleRate / 100));

    return {
      profile,
      recent,
      carbonTotal,
      scopes: {
        scope1,
        scope2,
        scope3,
      },
      resources: {
        electricityKwh: round2(profile.electricityKwh),
        waterM3: round2(profile.waterM3),
        fuelLiters: round2(profile.fuelLiters),
      },
      waste: {
        wasteKg: round2(profile.wasteKg),
        recycleRate: round2(profile.recycleRate),
        recycledKg: round2(profile.wasteKg * recyclingShare),
        virginMaterialsKg: round2(profile.materialsKg * (1 - recyclingShare)),
      },
      logistics: {
        shippingKm: round2(profile.logisticsKm),
        commuteKmWeek: round2(profile.commuteKmWeek),
      },
    };
  }

  function computeLcaStages(snapshot = buildCoreCalculationSnapshot()) {
    const total = Math.max(snapshot.carbonTotal, 1);
    const p = snapshot.profile;
    const rawMaterial = round2(total * 0.22 + p.materialsKg * 0.4);
    const manufacturing = round2(total * 0.24 + p.electricityKwh * 0.09);
    const transport = round2(total * 0.2 + p.logisticsKm * 0.03);
    const usage = round2(total * 0.24 + p.commuteKmWeek * 4 * 0.05);
    const disposal = round2(total * 0.1 + p.wasteKg * 0.25);
    return [
      { key: "raw", label: "Raw material extraction", value: rawMaterial },
      { key: "manufacturing", label: "Manufacturing", value: manufacturing },
      { key: "transport", label: "Transportation", value: transport },
      { key: "usage", label: "Usage", value: usage },
      { key: "disposal", label: "Disposal", value: disposal },
    ];
  }

  function renderLcaBreakdown() {
    const listEl = document.getElementById("lca-stage-list");
    const totalEl = document.getElementById("lca-total");
    if (!listEl || !totalEl) return;

    const stages = computeLcaStages();
    const maxValue = Math.max(...stages.map((s) => s.value), 1);
    const total = round2(stages.reduce((sum, s) => sum + s.value, 0));
    listEl.innerHTML = stages
      .map((stage) => {
        const widthPct = Math.max(4, Math.round((stage.value / maxValue) * 100));
        return `<div class="lca-stage-row"><div>${stage.label}</div><div class="lca-stage-track"><div class="lca-stage-fill" style="width:${widthPct}%"></div></div><div class="lca-stage-value">${stage.value}</div></div>`;
      })
      .join("");
    totalEl.textContent = `Estimated full life-cycle impact: ${total} kg CO2e`;
  }

  function getSavedScenarioResult() {
    try {
      const parsed = JSON.parse(
        localStorage.getItem("sit_scenario_result") || "null",
      );
      if (!parsed || typeof parsed !== "object") return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function renderScenarioResult(result) {
    const out = document.getElementById("scenario-result");
    if (!out) return;
    if (!result) {
      out.textContent = "Choose scenario settings and click Run scenario.";
      return;
    }
    const pct = Math.round((Number(result.reductionPct || 0) || 0) * 100);
    out.textContent =
      `Projected impact: ${result.projectedKg} kg CO2e (down ${pct}%, ${result.avoidedKg} kg CO2e avoided) from a ${result.baselineKg} kg CO2e baseline.`;
  }

  function renderBenchmarking() {
    const el = document.getElementById("benchmark-summary");
    if (!el) return;
    const snapshot = buildCoreCalculationSnapshot();
    const history = getCalculationHistory();
    const monthlySeries = buildMonthlySeries(history, 180).data || [];
    const populated = monthlySeries.filter((v) => Number(v) > 0);
    const historicalAvg = round2(
      populated.length
        ? populated.reduce((sum, value) => sum + Number(value || 0), 0) /
            populated.length
        : snapshot.carbonTotal,
    );
    const industryAvg = 390;
    const vsIndustryPct = round2(
      ((snapshot.carbonTotal - industryAvg) / industryAvg) * 100,
    );
    const vsHistoryPct = round2(
      ((snapshot.carbonTotal - historicalAvg) / Math.max(historicalAvg, 1)) * 100,
    );
    const scenario = getSavedScenarioResult();
    const scenarioLine = scenario
      ? `<div class="benchmark-row"><strong>Scenario forecast:</strong>${scenario.projectedKg} kg CO2e (${Math.round((scenario.reductionPct || 0) * 100)}% lower than baseline)</div>`
      : "";

    el.innerHTML =
      `<div class="benchmark-summary-list">` +
      `<div class="benchmark-row"><strong>Current estimate:</strong>${snapshot.carbonTotal} kg CO2e</div>` +
      `<div class="benchmark-row"><strong>Industry reference:</strong>${industryAvg} kg CO2e (${vsIndustryPct >= 0 ? "+" : ""}${vsIndustryPct}% vs you)</div>` +
      `<div class="benchmark-row"><strong>Historical average:</strong>${historicalAvg} kg CO2e (${vsHistoryPct >= 0 ? "+" : ""}${vsHistoryPct}% vs current)</div>` +
      scenarioLine +
      `</div>`;
  }

  function wirePrescreenForm() {
    const form = document.getElementById("prescreen-form");
    if (!form || form.dataset.wired === "1") {
      applyBaselineProfileToForm(getBaselineProfile());
      return;
    }
    form.dataset.wired = "1";
    applyBaselineProfileToForm(getBaselineProfile());

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const profile = {
        electricityKwh: toNonNegativeNumber(
          document.getElementById("pre-electricity")?.value,
          0,
        ),
        waterM3: toNonNegativeNumber(document.getElementById("pre-water")?.value, 0),
        fuelLiters: toNonNegativeNumber(
          document.getElementById("pre-fuel")?.value,
          0,
        ),
        wasteKg: toNonNegativeNumber(document.getElementById("pre-waste")?.value, 0),
        recycleRate: Math.max(
          0,
          Math.min(
            100,
            toNonNegativeNumber(
              document.getElementById("pre-recycle-rate")?.value,
              0,
            ),
          ),
        ),
        materialsKg: toNonNegativeNumber(
          document.getElementById("pre-materials")?.value,
          0,
        ),
        logisticsKm: toNonNegativeNumber(
          document.getElementById("pre-logistics-km")?.value,
          0,
        ),
        commuteKmWeek: toNonNegativeNumber(
          document.getElementById("pre-commute-km")?.value,
          0,
        ),
      };
      saveBaselineProfile(profile);
      const status = document.getElementById("prescreen-status");
      if (status) {
        status.textContent =
          "Baseline profile saved. Categories, LCA, benchmarks, and insights were refreshed.";
      }
      refreshSustainabilityStudio();
      generateInsights();
    });
  }

  function wireScenarioModeling() {
    const form = document.getElementById("scenario-form");
    if (!form || form.dataset.wired === "1") {
      renderScenarioResult(getSavedScenarioResult());
      return;
    }
    form.dataset.wired = "1";

    const saved = getSavedScenarioResult();
    if (saved) {
      const energy = document.getElementById("scenario-energy");
      const materials = document.getElementById("scenario-materials");
      const logistics = document.getElementById("scenario-logistics");
      const commute = document.getElementById("scenario-commute");
      if (energy && saved.energy) energy.value = saved.energy;
      if (materials && saved.materials) materials.value = saved.materials;
      if (logistics && saved.logistics) logistics.value = saved.logistics;
      if (commute && saved.commute) commute.value = saved.commute;
    }
    renderScenarioResult(saved);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const energy = document.getElementById("scenario-energy")?.value || "grid";
      const materials =
        document.getElementById("scenario-materials")?.value || "virgin";
      const logistics =
        document.getElementById("scenario-logistics")?.value || "truck";
      const commute =
        document.getElementById("scenario-commute")?.value || "private";

      const reductionPct = Math.min(
        0.55,
        (energy === "renewable" ? 0.18 : 0) +
          (materials === "recycled" ? 0.12 : 0) +
          (logistics === "rail" ? 0.1 : logistics === "ship" ? 0.07 : 0) +
          (commute === "public" ? 0.07 : commute === "remote" ? 0.12 : 0),
      );

      const baselineKg = round2(buildCoreCalculationSnapshot().carbonTotal);
      const projectedKg = round2(baselineKg * (1 - reductionPct));
      const avoidedKg = round2(baselineKg - projectedKg);
      const result = {
        energy,
        materials,
        logistics,
        commute,
        reductionPct,
        baselineKg,
        projectedKg,
        avoidedKg,
        ts: Date.now(),
      };
      localStorage.setItem("sit_scenario_result", JSON.stringify(result));
      renderScenarioResult(result);
      renderBenchmarking();
      generateInsights();
    });
  }

  function refreshSustainabilityStudio() {
    renderLcaBreakdown();
    renderBenchmarking();
    renderScenarioResult(getSavedScenarioResult());
  }

  function wireSustainabilityStudio() {
    wirePrescreenForm();
    wireScenarioModeling();
    refreshSustainabilityStudio();
  }

  function getProgressRangeDays() {
    const raw = Number(localStorage.getItem("sit_progress_range_days") || 180);
    if (!Number.isFinite(raw) || raw <= 0) return 180;
    return raw;
  }

  function setProgressRangeDays(days) {
    const safeDays = Number(days);
    if (!Number.isFinite(safeDays) || safeDays <= 0) return;
    localStorage.setItem("sit_progress_range_days", String(safeDays));
  }

  function describeRange(days) {
    if (days === 7) return "last 7 days";
    if (days === 30) return "last 30 days";
    if (days === 90) return "last 3 months";
    if (days === 180) return "last 6 months";
    if (days === 365) return "last 12 months";
    return `last ${days} days`;
  }

  function startOfDay(ts) {
    const d = new Date(ts);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }

  function buildLineSeries(history, rangeDays) {
    const now = Date.now();
    if (rangeDays <= 45) {
      const buckets = [];
      const map = {};
      for (let i = rangeDays - 1; i >= 0; i--) {
        const dayStart = startOfDay(now - i * 24 * 3600 * 1000);
        const d = new Date(dayStart);
        const key = String(dayStart);
        const label = `${d.getMonth() + 1}/${d.getDate()}`;
        buckets.push({ key, label });
        map[key] = 0;
      }
      history.forEach((entry) => {
        const ts = Number(entry.ts) || 0;
        const key = String(startOfDay(ts));
        if (key in map) map[key] += Number(entry.kg) || 0;
      });
      return {
        labels: buckets.map((b) => b.label),
        data: buckets.map((b) => round2(map[b.key])),
      };
    }

    if (rangeDays <= 180) {
      const weekCount = Math.max(4, Math.ceil(rangeDays / 7));
      const buckets = [];
      for (let i = weekCount - 1; i >= 0; i--) {
        const start = startOfDay(now - i * 7 * 24 * 3600 * 1000);
        const d = new Date(start);
        buckets.push({
          label: `${d.getMonth() + 1}/${d.getDate()}`,
          start,
          end: start + 7 * 24 * 3600 * 1000,
        });
      }
      const data = buckets.map((b) =>
        round2(
          history.reduce((sum, entry) => {
            const ts = Number(entry.ts) || 0;
            if (ts >= b.start && ts < b.end) return sum + (Number(entry.kg) || 0);
            return sum;
          }, 0),
        ),
      );
      return { labels: buckets.map((b) => b.label), data };
    }

    const months = Math.max(6, Math.min(12, Math.ceil(rangeDays / 30)));
    const monthBuckets = getMonthBuckets(months);
    const monthlyByKey = {};
    monthBuckets.forEach((b) => {
      monthlyByKey[b.key] = 0;
    });
    history.forEach((entry) => {
      const ts = Number(entry.ts) || 0;
      const d = new Date(ts);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (key in monthlyByKey) monthlyByKey[key] += Number(entry.kg) || 0;
    });
    return {
      labels: monthBuckets.map((b) => b.label),
      data: monthBuckets.map((b) => round2(monthlyByKey[b.key])),
    };
  }

  function buildMonthlySeries(history, rangeDays) {
    const monthCount = Math.max(2, Math.min(12, Math.ceil(rangeDays / 30)));
    const buckets = getMonthBuckets(monthCount);
    const monthlyByKey = {};
    buckets.forEach((b) => {
      monthlyByKey[b.key] = 0;
    });
    history.forEach((entry) => {
      const ts = Number(entry.ts) || 0;
      const d = new Date(ts);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (key in monthlyByKey) {
        monthlyByKey[key] += Number(entry.kg) || 0;
      }
    });
    return {
      labels: buckets.map((b) => b.label),
      data: buckets.map((b) => round2(monthlyByKey[b.key])),
    };
  }

  function updateProgressTrackSummary(progressData, rangeDays) {
    const el = document.getElementById("progress-track-summary");
    if (!el) return;
    if (!progressData.hasHistory) {
      el.textContent =
        `No calculator history in the ${describeRange(rangeDays)} yet. Run calculators to start tracking.`;
      return;
    }
    el.textContent =
      `Tracking ${progressData.entryCount} calculations in the ${describeRange(rangeDays)}. Total: ${progressData.total} kg CO2e.`;
  }

  function wireProgressRangeControl() {
    const select = document.getElementById("progress-range");
    if (!select) return;

    const current = String(getProgressRangeDays());
    if ([...select.options].some((o) => o.value === current)) {
      select.value = current;
    }

    if (progressRangeWired) return;
    select.addEventListener("change", () => {
      setProgressRangeDays(Number(select.value || 180));
      wireProgress().catch(() => {});
    });
    progressRangeWired = true;
  }

  function buildProgressDataFromHistory(rangeDays = getProgressRangeDays()) {
    const history = getCalculationHistory();
    const cutoff = Date.now() - rangeDays * 24 * 3600 * 1000;
    const scopedHistory = history.filter((entry) => {
      const ts = Number(entry.ts) || 0;
      return ts >= cutoff;
    });

    const categoryTotals = { home: 0, food: 0, travel: 0 };
    scopedHistory.forEach((entry) => {
      const kg = Number(entry.kg) || 0;
      if (kg <= 0) return;
      if (entry.category in categoryTotals) {
        categoryTotals[entry.category] += kg;
      }
    });

    const total = round2(
      categoryTotals.home + categoryTotals.food + categoryTotals.travel,
    );
    const hasHistory = total > 0;
    const fallbackCategories = readStoredArray("sit_categories", [40, 30, 30]);
    const fallbackMonthly = readStoredArray(
      "sit_monthly",
      [320, 300, 280, 260, 290, 310],
    );
    const fallbackMonthlyLabels = readStoredArray(
      "sit_monthly_labels",
      ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    );
    const fallbackLineData = readStoredArray("sit_weekly", [12, 10, 11, 9, 8, 7, 6]);
    const fallbackLineLabels = ["6w", "5w", "4w", "3w", "2w", "last", "this"];

    const monthlySeries = hasHistory
      ? buildMonthlySeries(scopedHistory, rangeDays)
      : { labels: fallbackMonthlyLabels, data: fallbackMonthly };
    const lineSeries = hasHistory
      ? buildLineSeries(scopedHistory, rangeDays)
      : { labels: fallbackLineLabels, data: fallbackLineData };

    const categories = hasHistory
      ? [
          round2(categoryTotals.home),
          round2(categoryTotals.food),
          round2(categoryTotals.travel),
        ]
      : fallbackCategories;
    const monthly = monthlySeries.data;
    const monthlyLabels = monthlySeries.labels;
    const lineData = lineSeries.data;
    const lineLabels = lineSeries.labels;

    localStorage.setItem("sit_categories", JSON.stringify(categories));
    localStorage.setItem("sit_monthly", JSON.stringify(monthly));
    localStorage.setItem("sit_monthly_labels", JSON.stringify(monthlyLabels));
    return {
      hasHistory,
      categories,
      monthly,
      monthlyLabels,
      lineData,
      lineLabels,
      total,
      entryCount: scopedHistory.length,
    };
  }

  function refreshProgressChartsFromCalculations() {
    const rangeDays = getProgressRangeDays();
    const progressData = buildProgressDataFromHistory(rangeDays);
    const { categories, monthly, monthlyLabels, lineData, lineLabels } =
      progressData;
    updateProgressTrackSummary(progressData, rangeDays);
    if (lineChart) {
      lineChart.data.labels = lineLabels;
      lineChart.data.datasets[0].data = lineData;
      lineChart.update();
    }
    if (pieChart) {
      pieChart.data.datasets[0].data = categories;
      pieChart.update();
    }
    if (barChart) {
      barChart.data.labels = monthlyLabels;
      barChart.data.datasets[0].data = monthly;
      barChart.update();
    }
  }

  function recordCalculation(category, kg, metadata = {}) {
    const value = Number(kg);
    if (!Number.isFinite(value) || value < 0) return;
    const history = getCalculationHistory();
    history.push({
      ts: Date.now(),
      category,
      kg: round2(value),
      ...metadata,
    });
    saveCalculationHistory(history);
    refreshProgressChartsFromCalculations();
    refreshSustainabilityStudio();
    generateInsights();
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
          `<div class="card goal"><strong>${g.title}</strong><div>Target: ${g.target}% by ${g.by || "â€”"}</div><div>Progress: <progress value="${g.progress}" max="100">${g.progress}%</progress></div></div>`,
      )
      .join("");
  }

  // ----------------- Progress / Charts -----------------
  let lineChart, pieChart, barChart;
  let progressRangeWired = false;
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
    wireProgressRangeControl();
    const rangeDays = getProgressRangeDays();
    const progressData = buildProgressDataFromHistory(rangeDays);
    const categories = progressData.categories;
    const monthly = progressData.monthly;
    const monthlyLabels = progressData.monthlyLabels;
    const lineData = progressData.lineData;
    const lineLabels = progressData.lineLabels;
    updateProgressTrackSummary(progressData, rangeDays);

    if (lineChart) lineChart.destroy();
    if (pieChart) pieChart.destroy();
    if (barChart) barChart.destroy();

    const ctxLine = document.getElementById("chart-line").getContext("2d");
    lineChart = new Chart(ctxLine, {
      type: "line",
      data: {
        labels: lineLabels,
        datasets: [
          {
            label: "kg CO2",
            data: lineData,
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
        labels: monthlyLabels,
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
          { name: "Neighbor", score: 640 },
          { name: "Top Local", score: 880 },
        ]),
    );
    lb.innerHTML = leaderboard
      .map((i) => `<li>${i.name} - ${i.score}</li>`)
      .join("");
    // level
    const score = Number(document.getElementById("eco-score").textContent) || 0;
    const level =
      score > 800 ? "Eco Hero" : score > 650 ? "Eco Advocate" : "Eco Novice";
    document.getElementById("user-level").textContent = level;
  }

  // ----------------- Insights -----------------
  function generateInsights() {
    const insights = [];
    const actionPlan = [];
    const snapshot = buildCoreCalculationSnapshot();
    const profile = snapshot.profile;
    const scopes = snapshot.scopes;
    const scenario = getSavedScenarioResult();
    const travelKm = Number(localStorage.getItem("sit_last_km") || 120);

    const scopeEntries = [
      { key: "scope1", label: "Scope 1 (direct)", value: round2(scopes.scope1) },
      { key: "scope2", label: "Scope 2 (energy-indirect)", value: round2(scopes.scope2) },
      { key: "scope3", label: "Scope 3 (value chain)", value: round2(scopes.scope3) },
    ].sort((a, b) => b.value - a.value);

    const primaryScope = scopeEntries[0];
    const scopePlaybook = {
      scope1: {
        summary:
          "Primary hotspot is Scope 1. Direct fuel/process emissions should be reduced first.",
        action:
          "Prioritize electrification of high-fuel tasks and tighten process controls on the largest emitting activity.",
        target: "Cut Scope 1 by 12% in the next 8 weeks.",
        cutFactor: 0.12,
      },
      scope2: {
        summary:
          "Primary hotspot is Scope 2. Electricity use and grid mix are the best near-term levers.",
        action:
          "Shift to renewable electricity and complete an efficiency sprint (lighting, HVAC schedule, idle-load reduction).",
        target: "Cut Scope 2 by 15% in the next 8 weeks.",
        cutFactor: 0.15,
      },
      scope3: {
        summary:
          "Primary hotspot is Scope 3. Materials and logistics decisions are driving most impact.",
        action:
          "Switch priority suppliers/materials to lower-carbon options and optimize freight lanes and load factors.",
        target: "Cut Scope 3 by 10% in the next 8 weeks.",
        cutFactor: 0.1,
      },
    };

    const primaryPlan = scopePlaybook[primaryScope.key] || scopePlaybook.scope3;
    insights.push({
      title: "Priority Hotspot",
      text: `${primaryPlan.summary} Current share: ${primaryScope.value} kg CO2e.`,
    });

    actionPlan.push({
      phase: "Weeks 1-2",
      title: `Focus on ${primaryScope.label}`,
      action: primaryPlan.action,
      target: primaryPlan.target,
      impact: `Expected reduction: ~${round2(primaryScope.value * primaryPlan.cutFactor)} kg CO2e/month.`,
    });

    if (profile.recycleRate < 50) {
      const recycleGap = round2(50 - profile.recycleRate);
      const recycleImpact = round2(profile.wasteKg * (recycleGap / 100) * 0.8);
      insights.push({
        title: "Materials & Waste",
        text: `Recycling is ${round2(profile.recycleRate)}%. Moving to 50% will reduce disposal pressure and virgin material demand.`,
      });
      actionPlan.push({
        phase: "Weeks 2-4",
        title: "Lift recycling performance",
        action:
          "Segment waste streams and set a weekly recycling checkpoint with clear ownership.",
        target: `Increase recycling by ${recycleGap}% points to reach 50%.`,
        impact: `Expected reduction: ~${recycleImpact} kg CO2e/month.`,
      });
    } else {
      insights.push({
        title: "Materials & Waste",
        text: `Recycling is ${round2(profile.recycleRate)}%. Maintain this level and push quality of recycled content in purchasing.`,
      });
    }

    if (scenario && Number(scenario.reductionPct) > 0) {
      insights.push({
        title: "Scenario Result",
        text: `Your latest scenario projects ${Math.round(
          scenario.reductionPct * 100,
        )}% reduction (${scenario.avoidedKg} kg CO2e).`,
      });
      actionPlan.push({
        phase: "Weeks 4-8",
        title: "Execute best scenario settings",
        action:
          "Apply the selected energy, materials, logistics, and commute settings in operations.",
        target: `Move baseline from ${scenario.baselineKg} to ${scenario.projectedKg} kg CO2e.`,
        impact: `Expected reduction: ${scenario.avoidedKg} kg CO2e per cycle.`,
      });
    } else {
      insights.push({
        title: "Scenario Planning",
        text: "No active scenario plan saved. Use Scenario Modeling to test options before implementation.",
      });
      actionPlan.push({
        phase: "This week",
        title: "Run and select a scenario",
        action:
          "Compare renewable energy, recycled materials, and logistics options and choose one target configuration.",
        target: "Select a scenario with at least 10% reduction potential.",
        impact: "Expected reduction: identifies highest-impact next action.",
      });
    }

    if (travelKm > 50) {
      const travelImpact = round2(travelKm * 0.04);
      insights.push({
        title: "Travel Optimization",
        text: `Recent travel activity is high (${travelKm} km). Route and mode shifts can cut recurring emissions quickly.`,
      });
      actionPlan.push({
        phase: "Next 30 days",
        title: "Reduce transport intensity",
        action:
          "Replace one weekly car-heavy route with transit/rail/remote and consolidate trips.",
        target: "Reduce travel distance by 15% over the next month.",
        impact: `Expected reduction: ~${travelImpact} kg CO2e/week.`,
      });
    } else if (profile.waterM3 > 22) {
      insights.push({
        title: "Resource Efficiency",
        text: `Water use is elevated (${round2(profile.waterM3)} m3/month). Leak control and fixture tuning can reduce both water and energy load.`,
      });
      actionPlan.push({
        phase: "Next 30 days",
        title: "Lower resource intensity",
        action:
          "Perform leak audit, set fixture flow targets, and monitor weekly water trend.",
        target: "Reduce water usage by 10% in one month.",
        impact: "Expected reduction: lowers utility-related emissions and cost.",
      });
    }

    actionPlan.push({
      phase: "Ongoing",
      title: "Governance and tracking",
      action:
        "Review monthly benchmark, scope mix, recycling rate, and progress chart. Keep only actions that show measurable reduction.",
      target: "Maintain month-over-month reduction trend for 3 consecutive months.",
      impact: "Expected reduction: prevents rebound and locks in gains.",
    });

    const planEl = document.getElementById("insight-action-plan");
    if (planEl) {
      planEl.innerHTML = actionPlan
        .slice(0, 4)
        .map(
          (step, i) =>
            `<div class="action-plan-step"><div class="action-plan-step-title">${i + 1}. ${step.phase} - ${step.title}</div><div>${step.action}</div><div class="action-plan-step-meta">Target: ${step.target}</div><div class="action-plan-step-meta">${step.impact}</div></div>`,
        )
        .join("");
    }

    const el = document.getElementById("insights-list");
    if (!el) return;
    el.innerHTML = insights
      .map(
        (item) =>
          `<div class="card"><div class="insight-card-title">${item.title}</div><div>${item.text}</div></div>`,
      )
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
          ? "Purr-fect â€” keep it up!"
          : pct > 0.33
            ? "Good â€” small wins matter"
            : "Letâ€™s try some small changes today";
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
              `<div class="story">${escapeHtml(s.text)}<div class="muted">â€” ${escapeHtml(s.name || "A neighbor")}</div></div>`,
          )
          .join("");
        return;
      }
      sumEl.textContent = `Combined impact: ${res.totalImpact || 0} kg CO2 saved by your community`;
      storiesEl.innerHTML = (res.stories || [])
        .map(
          (s) =>
            `<div class="story">${escapeHtml(s.text)}<div class="muted">â€” ${escapeHtml(s.name || "A neighbor")}</div></div>`,
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

  // ----------------- Dashboard map -----------------
  function setMapStatus(text) {
    const el = document.getElementById("map-status");
    if (el) el.textContent = text;
  }

  function getStoredMapLocation() {
    try {
      const raw = localStorage.getItem("sit_last_location");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (
        typeof parsed.lat !== "number" ||
        typeof parsed.lng !== "number"
      ) {
        return null;
      }
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function saveStoredMapLocation(lat, lng, accuracy = 100) {
    localStorage.setItem(
      "sit_last_location",
      JSON.stringify({
        lat,
        lng,
        accuracy: Number(accuracy) || 100,
        ts: Date.now(),
      }),
    );
  }

  function getSelectedMapMetric() {
    const active = document.querySelector(".metric-toggle.active");
    return active?.dataset?.metric === "trees" ? "trees" : "co2";
  }

  function getMapMetricValue(metric) {
    const co2 = Number(localStorage.getItem("sit_total_this") || 320);
    if (metric === "trees") return co2 / 21;
    return co2;
  }

  function getMapCircleRadius(metric, accuracy) {
    const impact = getMapMetricValue(metric);
    const impactRadius =
      metric === "trees"
        ? Math.min(1800, Math.max(120, impact * 18))
        : Math.min(1800, Math.max(120, impact * 2.5));
    return Math.max(Number(accuracy) || 120, impactRadius);
  }

  function updateDashboardMapMetric(metric = getSelectedMapMetric()) {
    if (!dashboardMap || !dashboardCircle || !dashboardMarker) return;
    const accuracy = Number(localStorage.getItem("sit_last_accuracy") || 120);
    dashboardCircle.setRadius(getMapCircleRadius(metric, accuracy));
    const value = getMapMetricValue(metric);
    const suffix = metric === "trees" ? "tree eq." : "kg CO2";
    dashboardMarker.bindPopup(
      `Your location\nEstimated impact: ${value.toFixed(1)} ${suffix}`,
    );
  }

  function placeDashboardLocation(lat, lng, accuracy = 100) {
    if (!dashboardMap || !window.L) return;
    const point = [lat, lng];
    if (!dashboardMarker) {
      dashboardMarker = window.L.marker(point).addTo(dashboardMap);
    } else {
      dashboardMarker.setLatLng(point);
    }
    const metric = getSelectedMapMetric();
    const radius = getMapCircleRadius(metric, accuracy);
    if (!dashboardCircle) {
      dashboardCircle = window.L.circle(point, {
        radius,
        color: "#2b9f6a",
        fillColor: "#2b9f6a",
        fillOpacity: 0.2,
        weight: 2,
      }).addTo(dashboardMap);
    } else {
      dashboardCircle.setLatLng(point);
      dashboardCircle.setRadius(radius);
    }
    const value = getMapMetricValue(metric);
    const suffix = metric === "trees" ? "tree eq." : "kg CO2";
    dashboardMarker.bindPopup(
      `Your location\nEstimated impact: ${value.toFixed(1)} ${suffix}`,
    );
    dashboardMap.setView(point, 13);
  }

  function locateUserOnDashboardMap() {
    if (!navigator.geolocation) {
      setMapStatus("Geolocation is not supported in this browser.");
      return;
    }
    setMapStatus("Finding your location...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Number(pos.coords.accuracy || 100);
        localStorage.setItem("sit_last_accuracy", String(accuracy));
        saveStoredMapLocation(lat, lng, accuracy);
        placeDashboardLocation(lat, lng, accuracy);
        setMapStatus(
          `Located: ${lat.toFixed(4)}, ${lng.toFixed(4)} (+/-${Math.round(accuracy)}m)`,
        );
      },
      (err) => {
        const saved = getStoredMapLocation();
        if (saved) {
          placeDashboardLocation(saved.lat, saved.lng, saved.accuracy || 120);
          setMapStatus(
            "Using your last saved location. Enable location permission for live updates.",
          );
          return;
        }
        if (err.code === 1) {
          setMapStatus(
            "Location permission denied. Allow access and click Locate me.",
          );
          return;
        }
        setMapStatus("Unable to locate your position right now.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 120000 },
    );
  }

  function refreshDashboardMapLayout() {
    if (!dashboardMap) return;
    setTimeout(() => {
      try {
        dashboardMap.invalidateSize();
      } catch (e) {}
    }, 80);
  }

  function ensureLeaflet() {
    if (window.L) return Promise.resolve();
    if (leafletLoadPromise) return leafletLoadPromise;

    leafletLoadPromise = new Promise((resolve, reject) => {
      if (!document.querySelector('link[data-leaflet="1"]')) {
        const css = document.createElement("link");
        css.rel = "stylesheet";
        css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        css.crossOrigin = "";
        css.setAttribute("data-leaflet", "1");
        document.head.appendChild(css);
      }
      const existing = document.querySelector('script[data-leaflet="1"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      const js = document.createElement("script");
      js.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      js.async = true;
      js.setAttribute("data-leaflet", "1");
      js.onload = () => resolve();
      js.onerror = reject;
      document.head.appendChild(js);
    });
    return leafletLoadPromise;
  }

  function initDashboardMap() {
    const mapEl = document.getElementById("map-placeholder");
    const locateBtn = document.getElementById("map-locate-btn");
    if (!mapEl) return;

    setMapStatus("Loading map...");
    ensureLeaflet()
      .then(() => {
        if (!dashboardMap) {
          dashboardMap = window.L.map(mapEl, { zoomControl: true }).setView(
            [20, 0],
            2,
          );
          window.L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
              maxZoom: 19,
              attribution: "&copy; OpenStreetMap contributors",
            },
          ).addTo(dashboardMap);
        }
        if (locateBtn && !locateBtn.dataset.wired) {
          locateBtn.dataset.wired = "1";
          locateBtn.addEventListener("click", locateUserOnDashboardMap);
        }
        const saved = getStoredMapLocation();
        if (saved) {
          placeDashboardLocation(saved.lat, saved.lng, saved.accuracy || 120);
          setMapStatus("Showing your last saved location.");
        } else {
          setMapStatus('Click "Locate me" to map your current position.');
        }
        refreshDashboardMapLayout();
      })
      .catch(() => {
        mapEl.textContent = "Map failed to load.";
        mapEl.classList.add("muted");
        setMapStatus("Map service unavailable. Check internet and reload.");
      });
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
    try {
      initDashboardMap();
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
        try {
          updateDashboardMapMetric(metric);
        } catch (e) {}
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
    showDashboardPanel(getSavedDashboardPanel());
  }

  function getSavedDashboardPanel() {
    const saved = localStorage.getItem("sit_dashboard_panel");
    return dashboardPanelIds.includes(saved) ? saved : "dashboard-overview";
  }

  function showDashboardPanel(panelId) {
    const activePanel = dashboardPanelIds.includes(panelId)
      ? panelId
      : "dashboard-overview";

    dashboardPanelIds.forEach((id) => {
      const panel = document.getElementById(id);
      if (!panel) return;
      panel.classList.toggle("dashboard-panel-hidden", id !== activePanel);
    });

    document
      .querySelectorAll(".dashboard-nav-submenu a[data-dashboard-panel]")
      .forEach((a) => {
        const isActive = a.dataset.dashboardPanel === activePanel;
        a.classList.toggle("active", isActive);
        if (isActive) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      });

    localStorage.setItem("sit_dashboard_panel", activePanel);
    if (activePanel === "dashboard-visuals") {
      setTimeout(() => {
        try {
          refreshDashboardMapLayout();
        } catch (e) {}
      }, 80);
    }
  }

  function getSavedCalculatorsPanel() {
    const saved = localStorage.getItem("sit_calculators_panel");
    return calculatorsPanelIds.includes(saved) ? saved : "calculators-core";
  }

  function showCalculatorsPanel(panelId) {
    const activePanel = calculatorsPanelIds.includes(panelId)
      ? panelId
      : "calculators-core";

    calculatorsPanelIds.forEach((id) => {
      const panel = document.getElementById(id);
      if (!panel) return;
      panel.classList.toggle("calculators-panel-hidden", id !== activePanel);
    });

    document
      .querySelectorAll(".dashboard-nav-submenu a[data-calculators-panel]")
      .forEach((a) => {
        const isActive = a.dataset.calculatorsPanel === activePanel;
        a.classList.toggle("active", isActive);
        if (isActive) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      });

    localStorage.setItem("sit_calculators_panel", activePanel);
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
    if (!scoreEl.textContent || scoreEl.textContent.trim() === "â€”")
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
