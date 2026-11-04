/**
 * KandidFlow — Browser Extension Popup Controller
 * Manages extraction display, duplicate checking, settings, and inbox submission.
 * Strictly enforces supported portals whitelist (Pracuj.pl, Just Join IT).
 */

document.addEventListener("DOMContentLoaded", async () => {
  // Supported Job Boards Whitelist Configuration
  const SUPPORTED_PORTALS = [
    {
      id: "pracuj",
      name: "Pracuj.pl",
      pattern: /(^|\.)pracuj\.pl$/i,
      domainDisplay: "pracuj.pl",
      url: "https://www.pracuj.pl",
    },
    {
      id: "justjoin",
      name: "Just Join IT",
      pattern: /(^|\.)justjoin\.it$/i,
      domainDisplay: "justjoin.it",
      url: "https://justjoin.it",
    },
  ];

  // DOM Elements — Header & Navigation
  const mainView = document.getElementById("main-view");
  const settingsView = document.getElementById("settings-view");
  const toggleSettingsBtn = document.getElementById("toggle-settings-btn");
  const backToMainBtn = document.getElementById("back-to-main-btn");
  const connectionIndicator = document.getElementById("connection-indicator");
  const indicatorText = connectionIndicator.querySelector(".indicator-text");

  // DOM Elements — Views (Supported vs Unsupported)
  const supportedContent = document.getElementById("supported-content");
  const unsupportedView = document.getElementById("unsupported-view");
  const currentDomainText = document.getElementById("current-domain-text");

  // DOM Elements — Offer Preview
  const portalBadge = document.getElementById("portal-badge");
  const workModelBadge = document.getElementById("work-model-badge");
  const salaryBadge = document.getElementById("salary-badge");
  const deadlineBadge = document.getElementById("deadline-badge");
  const jobTitleEl = document.getElementById("job-title");
  const jobCompanyEl = document.getElementById("job-company");
  const jobLocationEl = document.getElementById("job-location");
  const canonicalUrlEl = document.getElementById("canonical-url");

  // DOM Elements — Duplicate Check & Actions
  const duplicateBanner = document.getElementById("duplicate-banner");
  const duplicateIcon = document.getElementById("duplicate-icon");
  const duplicateTitle = document.getElementById("duplicate-title");
  const duplicateDesc = document.getElementById("duplicate-desc");
  const ratingStarsContainer = document.getElementById("rating-stars");
  const ratingTextHint = document.getElementById("rating-text-hint");
  const starButtons = ratingStarsContainer ? ratingStarsContainer.querySelectorAll(".star-btn") : [];
  const customNotesEl = document.getElementById("custom-notes");
  const saveJobBtn = document.getElementById("save-job-btn");
  const saveSpinner = document.getElementById("save-spinner");
  const saveBtnText = document.getElementById("save-btn-text");
  const statusMessage = document.getElementById("status-message");
  const dashboardLinkWrapper = document.getElementById("dashboard-link-wrapper");

  // DOM Elements — Settings
  const backendUrlInput = document.getElementById("backend-url");
  const apiTokenInput = document.getElementById("api-token");
  const toggleTokenVisibilityBtn = document.getElementById("toggle-token-visibility");
  const testConnectionBtn = document.getElementById("test-connection-btn");
  const testSpinner = document.getElementById("test-spinner");
  const testConnectionResult = document.getElementById("test-connection-result");
  const saveSettingsBtn = document.getElementById("save-settings-btn");
  const settingsStatus = document.getElementById("settings-status-message");

  // State
  let currentPayload = null;
  let activeTab = null;
  let isCurrentPageSupported = false;
  let selectedRating = 1;

  const RATING_LABELS = {
    1: "1 — Mało ważna",
    2: "2 — Standardowa",
    3: "3 — Umiarkowana",
    4: "4 — Ważna",
    5: "5 — Priorytet",
  };

  const DEFAULT_BACKEND_URL = "http://localhost:8000";
  const DEFAULT_API_TOKEN = "kandid_dev_secret_token_replace_in_production_32chars";
  const CURRENT_EXTRACTOR_VERSION = "1.3.1";

  /**
   * Updates rating UI elements (active star classes, container data-active-color, aria tags, and hint text).
   */
  function updateRatingUI(rating, isPreview = false) {
    if (!ratingStarsContainer) return;

    ratingStarsContainer.setAttribute("data-active-color", String(rating));
    if (!isPreview) {
      ratingStarsContainer.setAttribute("data-rating", String(rating));
    }

    starButtons.forEach((btn) => {
      const btnRating = parseInt(btn.dataset.rating, 10);
      btn.classList.toggle("active", btnRating <= rating);
      if (!isPreview) {
        btn.setAttribute("aria-checked", btnRating === rating ? "true" : "false");
      }
    });

    if (ratingTextHint) {
      ratingTextHint.textContent = RATING_LABELS[rating] || `${rating}`;
    }
  }

  /**
   * Sets the active selected rating (clamped between 1 and 5) and updates UI.
   */
  function setRating(rating) {
    const clamped = Math.max(1, Math.min(5, parseInt(rating, 10) || 1));
    selectedRating = clamped;
    updateRatingUI(clamped, false);
  }

  /**
   * Extracts hostname from a given URL string safely.
   */
  function getTabDomain(urlStr) {
    if (!urlStr) return "";
    try {
      const parsed = new URL(urlStr);
      return parsed.hostname.toLowerCase();
    } catch {
      return "";
    }
  }

  /**
   * Matches URL hostname against configured supported portals.
   */
  function findSupportedPortal(urlStr) {
    const domain = getTabDomain(urlStr);
    if (!domain) return null;
    return SUPPORTED_PORTALS.find((p) => p.pattern.test(domain)) || null;
  }

  /**
   * Retrieves configured backend URL and API token from storage.
   */
  async function getStoredConfig() {
    return new Promise((resolve) => {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(["backendUrl", "apiToken"], (res) => {
          resolve({
            backendUrl: (res.backendUrl || DEFAULT_BACKEND_URL).replace(/\/+$/, ""),
            apiToken: res.apiToken || DEFAULT_API_TOKEN,
          });
        });
      } else {
        resolve({
          backendUrl: DEFAULT_BACKEND_URL,
          apiToken: DEFAULT_API_TOKEN,
        });
      }
    });
  }

  /**
   * Updates connection indicator status pill.
   */
  function updateConnectionStatus(status, text) {
    connectionIndicator.className = `connection-pill ${status}`;
    indicatorText.textContent = text;
  }

  /**
   * Translates internal portal key to Polish display name.
   */
  function getPortalDisplayName(portal) {
    switch (portal) {
      case "justjoin":
        return "Just Join IT";
      case "pracuj":
        return "Pracuj.pl";
      case "nofluffjobs":
        return "No Fluff Jobs";
      case "linkedin":
        return "LinkedIn";
      default:
        return "Inna strona";
    }
  }

  /**
   * Translates work model to Polish display string.
   */
  function getWorkModelDisplayName(model) {
    switch (model) {
      case "remote":
        return "Praca zdalna";
      case "hybrid":
        return "Praca hybrydowa";
      case "onsite":
        return "Praca w biurze";
      default:
        return model;
    }
  }

  /**
   * Checks basic connection to the KandidFlow backend (without offer duplicate check).
   * Used when on unsupported or system pages to update the header status indicator.
   */
  async function checkBackendConnection() {
    updateConnectionStatus("checking", "Weryfikacja...");
    const { backendUrl, apiToken } = await getStoredConfig();

    try {
      const pingUrl = `${backendUrl}/api/v1/inbox/check?url=${encodeURIComponent("https://kandidflow.local/health-check")}`;
      const response = await fetch(pingUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
          "X-API-Token": apiToken,
        },
      });

      if (response.ok) {
        updateConnectionStatus("connected", "Połączono");
      } else if (response.status === 401) {
        updateConnectionStatus("disconnected", "Błąd tokenu");
      } else {
        updateConnectionStatus("disconnected", `Błąd (${response.status})`);
      }
    } catch {
      updateConnectionStatus("disconnected", "Brak połączenia");
    }
  }

  /**
   * Activates the Unsupported Page View and hides the extraction card & form.
   */
  function showUnsupportedView(tabUrl, isSystemPage) {
    isCurrentPageSupported = false;
    currentPayload = null;
    setRating(1);

    supportedContent.classList.add("hidden");
    unsupportedView.classList.remove("hidden");

    if (isSystemPage) {
      currentDomainText.textContent = "Strona systemowa przeglądarki";
    } else {
      const domain = getTabDomain(tabUrl) || tabUrl || "Nieznana domena";
      currentDomainText.textContent = domain;
    }

    // Ensure save button is disabled
    saveJobBtn.disabled = true;
  }

  /**
   * Activates the Supported Page View and shows extraction components.
   */
  function showSupportedView() {
    isCurrentPageSupported = true;
    unsupportedView.classList.add("hidden");
    supportedContent.classList.remove("hidden");
  }

  /**
   * Injects content scripts into tab if not already present or outdated.
   */
  async function ensureContentScriptInjected(tabId) {
    try {
      // First ping to check if listener already responds with current version
      const pingResponse = await chrome.tabs.sendMessage(tabId, { action: "PING" }).catch(() => null);
      if (pingResponse && pingResponse.status === "ok" && pingResponse.version === CURRENT_EXTRACTOR_VERSION) {
        return true;
      }

      // If not responding or outdated, inject files sequentially
      await chrome.scripting.executeScript({
        target: { tabId },
        files: [
          "src/utils.js",
          "src/extractors/fallback.js",
          "src/extractors/justjoin.js",
          "src/extractors/pracuj.js",
          "src/extractors/nofluffjobs.js",
          "src/extractors/linkedin.js",
          "src/content.js",
        ],
      });
      return true;
    } catch (err) {
      console.warn("[KandidFlow] Failed to inject content scripts:", err);
      return false;
    }
  }

  /**
   * Queries the active tab DOM for job offer data on supported portals.
   */
  async function extractSupportedTabData(tab) {
    try {
      await ensureContentScriptInjected(tab.id);

      const response = await chrome.tabs.sendMessage(tab.id, { action: "EXTRACT_PAGE_DATA" }).catch((err) => {
        console.error("Message error:", err);
        return null;
      });

      if (!response || !response.success || !response.payload) {
        // Fallback info from active tab directly
        currentPayload = {
          source_url: tab.url,
          source_portal: "generic",
          title: tab.title || "Oferta pracy",
          company: null,
          locations: [],
          description_text: "",
          requirements_raw: [],
        };
      } else {
        currentPayload = response.payload;
      }

      setRating(1);
      renderExtractedOffer(currentPayload);
      await checkDuplicateOffer(currentPayload.source_url);
    } catch (error) {
      console.error("[KandidFlow] Error during extraction init:", error);
      jobTitleEl.textContent = "Wystąpił błąd podczas wczytywania oferty.";
    }
  }

  /**
   * Renders the extracted job offer details into the popup card.
   */
  function renderExtractedOffer(payload) {
    if (!payload) return;

    // Portal Badge
    const portal = payload.source_portal || "generic";
    portalBadge.textContent = getPortalDisplayName(portal);
    portalBadge.className = `badge portal-${portal}`;

    // Work Model Badge
    if (payload.work_model) {
      workModelBadge.textContent = getWorkModelDisplayName(payload.work_model);
      workModelBadge.classList.remove("hidden");
    } else {
      workModelBadge.classList.add("hidden");
    }

    // Salary Badge
    const hasValidRawSalary = payload.salary_raw && typeof payload.salary_raw === "string" && !payload.salary_raw.includes("[object");
    const hasValidMinSalary = typeof payload.salary_min === "number" && !isNaN(payload.salary_min);
    const hasValidMaxSalary = typeof payload.salary_max === "number" && !isNaN(payload.salary_max);

    if (hasValidRawSalary) {
      salaryBadge.textContent = payload.salary_raw;
      salaryBadge.classList.remove("hidden");
    } else if (hasValidMinSalary || hasValidMaxSalary) {
      const minStr = hasValidMinSalary ? payload.salary_min.toLocaleString("pl-PL") : "";
      const maxStr = hasValidMaxSalary ? payload.salary_max.toLocaleString("pl-PL") : "";
      const range = minStr && maxStr ? `${minStr} - ${maxStr}` : minStr || maxStr;
      salaryBadge.textContent = `${range} ${payload.salary_currency || "PLN"}`;
      salaryBadge.classList.remove("hidden");
    } else {
      salaryBadge.classList.add("hidden");
    }

    // Deadline Badge
    if (payload.application_deadline) {
      deadlineBadge.textContent = `📅 Termin: ${payload.application_deadline}`;
      deadlineBadge.classList.remove("hidden");
    } else {
      deadlineBadge.classList.add("hidden");
    }

    // Title & Company
    jobTitleEl.textContent = payload.title || "Oferta pracy bez tytułu";
    jobCompanyEl.textContent = payload.company || "Pracodawca nieokreślony";

    // Location
    const cleanLocs = (payload.locations || [])
      .map((l) => (l || "").replace(/^[.,\s;/-]+|[.,\s;/-]+$/g, "").trim())
      .filter((l) => l.length > 1 && l !== "." && l !== ",");
    const cleanRaw = (payload.location_raw || "")
      .replace(/\+\d+\s*Lokalizacj[ae]/gi, "")
      .replace(/^[.,\s;/-]+|[.,\s;/-]+$/g, "")
      .trim();

    if (cleanLocs.length > 0) {
      jobLocationEl.textContent = cleanLocs.join(", ");
    } else if (cleanRaw && cleanRaw !== "." && cleanRaw !== ",") {
      jobLocationEl.textContent = cleanRaw;
    } else {
      jobLocationEl.textContent = "Lokalizacja niepodana";
    }

    // Canonical URL
    canonicalUrlEl.textContent = payload.source_url || "—";
    canonicalUrlEl.title = payload.source_url || "";

    // Enable Save Button
    saveJobBtn.disabled = false;
  }

  /**
   * Checks whether the current canonical URL is already captured in the backend.
   */
  async function checkDuplicateOffer(url) {
    if (!url) return;

    updateConnectionStatus("checking", "Weryfikacja...");
    duplicateBanner.classList.remove("hidden", "warning", "success");
    duplicateBanner.classList.add("info");
    duplicateIcon.textContent = "⏳";
    duplicateTitle.textContent = "Sprawdzanie duplikatów w bazie...";
    duplicateDesc.textContent = "Trwa łączenie z serwerem KandidFlow...";

    const { backendUrl, apiToken } = await getStoredConfig();

    try {
      const checkUrl = `${backendUrl}/api/v1/inbox/check?url=${encodeURIComponent(url)}`;
      const response = await fetch(checkUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
          "X-API-Token": apiToken,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          updateConnectionStatus("disconnected", "Błąd tokenu");
          duplicateBanner.className = "alert-banner warning";
          duplicateIcon.textContent = "🔑";
          duplicateTitle.textContent = "Błąd autoryzacji (HTTP 401)";
          duplicateDesc.textContent = "Wprowadź prawidłowy EXTENSION_API_TOKEN w ustawieniach.";
          return;
        }
        throw new Error(`Serwer zwrócił status ${response.status}`);
      }

      updateConnectionStatus("connected", "Połączono");
      const data = await response.json();

      if (data.exists) {
        duplicateBanner.className = "alert-banner warning";
        duplicateIcon.textContent = "⚠️";
        duplicateTitle.textContent = "Ta oferta znajduje się już w bazie KandidFlow";
        const statusMap = {
          inbox: "Oczekuje w kolejce (inbox)",
          parsing: "Przetwarzanie przez AI",
          ready: "Gotowa do aplikacji",
          applied: "Aplikowano",
          interview: "W trakcie rozmów",
          rejected: "Odrzucona",
          failed_parsing: "Błąd parsowania",
        };
        const statusLabel = statusMap[data.status] || data.status || "w toku";
        duplicateDesc.textContent = `Status: ${statusLabel}${data.company_name ? ` • ${data.company_name}` : ""}`;
        saveBtnText.textContent = "Zaktualizuj / Zapisz ponownie";
      } else {
        duplicateBanner.className = "alert-banner success";
        duplicateIcon.textContent = "✨";
        duplicateTitle.textContent = "Nowa oferta — gotowa do zapisania";
        duplicateDesc.textContent = "Tej oferty nie ma jeszcze w Twoim panelu rekrutacji.";
        saveBtnText.textContent = "Zapisz ofertę w KandidFlow";
      }
    } catch (err) {
      updateConnectionStatus("disconnected", "Brak połączenia");
      duplicateBanner.className = "alert-banner warning";
      duplicateIcon.textContent = "⚠️";
      duplicateTitle.textContent = "Brak połączenia z KandidFlow";
      duplicateDesc.textContent = "Upewnij się, że serwer backendu działa pod adresem " + backendUrl;
    }
  }

  /**
   * Submits the extracted job offer to the backend inbox.
   */
  async function saveJobOffer() {
    if (!currentPayload) return;

    saveJobBtn.disabled = true;
    saveSpinner.classList.remove("hidden");
    saveBtnText.textContent = "Zapisywanie w KandidFlow...";
    statusMessage.classList.add("hidden");

    const { backendUrl, apiToken } = await getStoredConfig();
    const notesValue = customNotesEl.value.trim();

    // Prepare complete payload conforming strictly to ExtractedJobPayload
    const payload = {
      source_url: currentPayload.source_url,
      source_portal: currentPayload.source_portal || "generic",
      title: currentPayload.title || null,
      company: currentPayload.company || null,
      location_raw: currentPayload.location_raw || null,
      locations: currentPayload.locations || [],
      work_model: currentPayload.work_model || null,
      work_model_details: currentPayload.work_model_details || null,
      salary_raw: currentPayload.salary_raw || null,
      salary_min: currentPayload.salary_min != null ? Math.round(currentPayload.salary_min) : null,
      salary_max: currentPayload.salary_max != null ? Math.round(currentPayload.salary_max) : null,
      salary_currency: currentPayload.salary_currency || "PLN",
      description_html: currentPayload.description_html || null,
      description_text: currentPayload.description_text || "",
      requirements_raw: currentPayload.requirements_raw || [],
      application_deadline: currentPayload.application_deadline || null,
      notes: notesValue || null,
      rating: selectedRating,
      custom_metadata: currentPayload.custom_metadata || null,
    };

    try {
      const response = await fetch(`${backendUrl}/api/v1/inbox`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
          "X-API-Token": apiToken,
        },
        body: JSON.stringify(payload),
      });

      saveSpinner.classList.add("hidden");

      if (!response.ok) {
        const errorData = await response.text();
        statusMessage.textContent = `Błąd zapisu (${response.status}): ${errorData}`;
        statusMessage.className = "status-banner error";
        statusMessage.classList.remove("hidden");
        saveJobBtn.disabled = false;
        saveBtnText.textContent = "Zapisz ofertę w KandidFlow";
        return;
      }

      await response.json();

      statusMessage.textContent = "🎉 Zapisano pomyślnie! Oferta trafiła do kolejki KandidFlow.";
      statusMessage.className = "status-banner success";
      statusMessage.classList.remove("hidden");

      saveBtnText.textContent = "✅ Oferta zapisana!";
      saveJobBtn.disabled = true;

      // Reset rating to default state (1)
      setRating(1);

      dashboardLinkWrapper.classList.remove("hidden");
    } catch (err) {
      saveSpinner.classList.add("hidden");
      saveJobBtn.disabled = false;
      saveBtnText.textContent = "Spróbuj zapisać ponownie";

      statusMessage.textContent = `Błąd sieci: ${err.message}. Sprawdź konfigurację serwera.`;
      statusMessage.className = "status-banner error";
      statusMessage.classList.remove("hidden");
    }
  }

  // Star Rating Interaction Listeners
  if (ratingStarsContainer) {
    starButtons.forEach((btn) => {
      const btnRating = parseInt(btn.dataset.rating, 10);

      btn.addEventListener("click", () => {
        setRating(btnRating);
      });

      btn.addEventListener("mouseenter", () => {
        updateRatingUI(btnRating, true);
      });

      btn.addEventListener("focus", () => {
        updateRatingUI(btnRating, true);
      });
    });

    ratingStarsContainer.addEventListener("mouseleave", () => {
      updateRatingUI(selectedRating, false);
    });

    ratingStarsContainer.addEventListener("focusout", (event) => {
      if (!ratingStarsContainer.contains(event.relatedTarget)) {
        updateRatingUI(selectedRating, false);
      }
    });
  }

  // Event Listeners — Main View Actions
  saveJobBtn.addEventListener("click", saveJobOffer);

  // Settings View Navigation
  function showSettings() {
    mainView.classList.remove("active");
    settingsView.classList.remove("hidden");
    settingsView.classList.add("active");
  }

  function showMain() {
    settingsView.classList.add("hidden");
    settingsView.classList.remove("active");
    mainView.classList.add("active");
  }

  toggleSettingsBtn.addEventListener("click", showSettings);
  backToMainBtn.addEventListener("click", showMain);

  // Portal cards click handler to open websites in new tabs
  document.querySelectorAll(".portal-card").forEach((card) => {
    const openUrl = () => {
      const targetUrl = card.dataset.url;
      if (targetUrl && typeof chrome !== "undefined" && chrome.tabs) {
        chrome.tabs.create({ url: targetUrl });
      }
    };
    card.addEventListener("click", openUrl);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openUrl();
      }
    });
  });

  // Toggle Password Visibility
  toggleTokenVisibilityBtn.addEventListener("click", () => {
    if (apiTokenInput.type === "password") {
      apiTokenInput.type = "text";
      toggleTokenVisibilityBtn.textContent = "🔒";
    } else {
      apiTokenInput.type = "password";
      toggleTokenVisibilityBtn.textContent = "👁️";
    }
  });

  // Load Saved Settings into Form
  const currentConfig = await getStoredConfig();
  backendUrlInput.value = currentConfig.backendUrl;
  apiTokenInput.value = currentConfig.apiToken;

  // Test Connection Action in Settings
  testConnectionBtn.addEventListener("click", async () => {
    const testUrl = backendUrlInput.value.trim().replace(/\/+$/, "");
    const testToken = apiTokenInput.value.trim();

    testSpinner.classList.remove("hidden");
    testConnectionResult.textContent = "Testowanie...";
    testConnectionResult.className = "test-result-text";

    try {
      const response = await fetch(`${testUrl}/api/v1/inbox/check?url=${encodeURIComponent("https://kandidflow.local/health-check")}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${testToken}`,
          "X-API-Token": testToken,
        },
      });

      testSpinner.classList.add("hidden");

      if (response.ok) {
        testConnectionResult.textContent = "✓ Połączenie udane!";
        testConnectionResult.className = "test-result-text success";
      } else if (response.status === 401) {
        testConnectionResult.textContent = "✗ Błędny token (HTTP 401)";
        testConnectionResult.className = "test-result-text error";
      } else {
        testConnectionResult.textContent = `✗ Błąd serwera (HTTP ${response.status})`;
        testConnectionResult.className = "test-result-text error";
      }
    } catch {
      testSpinner.classList.add("hidden");
      testConnectionResult.textContent = "✗ Nie można połączyć";
      testConnectionResult.className = "test-result-text error";
    }
  });

  // Save Settings Action
  saveSettingsBtn.addEventListener("click", () => {
    const backendUrl = backendUrlInput.value.trim().replace(/\/+$/, "") || DEFAULT_BACKEND_URL;
    const apiToken = apiTokenInput.value.trim() || DEFAULT_API_TOKEN;

    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ backendUrl, apiToken }, () => {
        settingsStatus.textContent = "Ustawienia zostały pomyślnie zapisane.";
        settingsStatus.className = "status-banner success";
        settingsStatus.classList.remove("hidden");

        setTimeout(() => {
          settingsStatus.classList.add("hidden");
          showMain();
          // Refresh connection or duplicate check with updated settings
          if (isCurrentPageSupported && currentPayload && currentPayload.source_url) {
            checkDuplicateOffer(currentPayload.source_url);
          } else {
            checkBackendConnection();
          }
        }, 700);
      });
    }
  });

  // Main Initialization Workflow
  async function initPopup() {
    try {
      if (typeof chrome === "undefined" || !chrome.tabs) {
        showUnsupportedView("http://localhost", false);
        await checkBackendConnection();
        return;
      }

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      activeTab = tab;

      if (!tab || !tab.url) {
        showUnsupportedView("", true);
        await checkBackendConnection();
        return;
      }

      const tabUrl = tab.url;
      const isSystemPage =
        tabUrl.startsWith("chrome://") ||
        tabUrl.startsWith("chrome-extension://") ||
        tabUrl.startsWith("edge://") ||
        tabUrl.startsWith("about:") ||
        tabUrl.startsWith("file://");

      if (isSystemPage) {
        showUnsupportedView(tabUrl, true);
        await checkBackendConnection();
        return;
      }

      const matchedPortal = findSupportedPortal(tabUrl);

      if (!matchedPortal) {
        // Domain is not on the supported job boards whitelist
        showUnsupportedView(tabUrl, false);
        await checkBackendConnection();
        return;
      }

      // Domain IS supported — proceed to extraction and duplicate check
      showSupportedView();
      await extractSupportedTabData(tab);
    } catch (err) {
      console.error("[KandidFlow] Error during popup initialization:", err);
      showUnsupportedView("", false);
      await checkBackendConnection();
    }
  }

  // Launch popup initialization
  await initPopup();
});
