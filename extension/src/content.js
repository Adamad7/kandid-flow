/**
 * KandidFlow — Content Script Coordinator
 * Injected into portal pages to orchestrate DOM extraction strategies.
 * Runs strictly within the page isolated world; performs ZERO network requests.
 */

(function () {
  "use strict";

  console.log("[KandidFlow] Content script initialized.");

  /**
   * Identifies the portal name based on current window location hostname.
   * @returns {"justjoin" | "pracuj" | "nofluffjobs" | "linkedin" | "generic"}
   */
  function detectPortal() {
    const host = window.location.hostname.toLowerCase();
    if (host.includes("justjoin.it")) return "justjoin";
    if (host.includes("pracuj.pl")) return "pracuj";
    if (host.includes("nofluffjobs.com")) return "nofluffjobs";
    if (host.includes("linkedin.com")) return "linkedin";
    return "generic";
  }

  /**
   * Executes the appropriate strategy extractor and ensures a valid payload.
   * Falls back gracefully to generic extractor if portal-specific extractor fails.
   */
  function runExtraction() {
    const portal = detectPortal();
    const extractors = (window.KandidFlow && window.KandidFlow.extractors) || {};
    let extractorFn = extractors[portal];

    let result = null;

    if (typeof extractorFn === "function") {
      try {
        result = extractorFn();
      } catch (err) {
        console.warn(`[KandidFlow] Strategy '${portal}' encountered an error, using fallback:`, err);
      }
    }

    if (!result && typeof extractors.fallback === "function") {
      try {
        result = extractors.fallback();
      } catch (err) {
        console.error("[KandidFlow] Fallback extractor also failed:", err);
      }
    }

    if (!result) {
      // Minimal safe payload
      const utils = (window.KandidFlow && window.KandidFlow.utils) || {};
      result = {
        source_url: utils.canonicalizeUrl ? utils.canonicalizeUrl(window.location.href) : window.location.href,
        source_portal: portal,
        title: document.title,
        company: null,
        description_text: document.body ? document.body.innerText.slice(0, 2000) : "",
        requirements_raw: [],
        locations: [],
      };
    }

    return result;
  }

  // Register Chrome runtime message listener for communication with popup / background
  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "PING") {
        sendResponse({
          status: "ok",
          portal: detectPortal(),
          url: window.location.href,
        });
        return false;
      }

      if (request.action === "EXTRACT_PAGE_DATA" || request.action === "GET_PAGE_DATA") {
        try {
          const payload = runExtraction();
          sendResponse({
            success: true,
            payload: payload,
          });
        } catch (error) {
          console.error("[KandidFlow] Extraction failed:", error);
          sendResponse({
            success: false,
            error: error.message || String(error),
          });
        }
        return false;
      }

      return false;
    });
  }
})();
