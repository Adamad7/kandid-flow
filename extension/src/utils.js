/**
 * KandidFlow — Extension Utilities
 * URL canonicalization, DOM sanitization, text processing, and salary parsing.
 */

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.KandidFlow = root.KandidFlow || {};
    root.KandidFlow.utils = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Query parameter blacklist for URL normalization
  const TRACKING_PARAMS = new Set([
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "utm_id",
    "searchid",
    "search_id",
    "searchId",
    "trk",
    "trackingid",
    "tracking_id",
    "refid",
    "ref_id",
    "refId",
    "fbclid",
    "gclid",
    "gclsrc",
    "dclid",
    "source",
    "origin",
    "originalSubdomain",
    "ref",
    "context",
    "spm",
    "mc_cid",
    "mc_eid",
    "_hsenc",
    "_hsmi",
    "gad_source",
    "gbraid",
    "wbraid",
    "sub_id",
    "aff_id",
    "click_id",
  ]);

  /**
   * Decodes basic HTML entities commonly found in text elements or attributes.
   *
   * @param {string} str - Raw string with possible HTML entities
   * @returns {string} Decoded string
   */
  function decodeHtmlEntities(str) {
    if (!str || typeof str !== "string") return "";
    return str
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&nbsp;/g, " ");
  }

  /**
   * Extracts canonical URL from link[rel="canonical"] if present,
   * otherwise canonicalizes the given fallback URL.
   *
   * @param {Document} doc - DOM Document
   * @param {string} fallbackUrl - Fallback URL (e.g. window.location.href)
   * @returns {string} Clean canonical URL
   */
  function getCanonicalUrl(doc, fallbackUrl) {
    try {
      if (doc && doc.querySelector) {
        const canonicalLink = doc.querySelector('link[rel="canonical"]');
        if (canonicalLink) {
          const href = canonicalLink.getAttribute("href");
          if (href && href.startsWith("http")) {
            return canonicalizeUrl(href);
          }
        }
      }
    } catch {
      // Fall through to fallback
    }
    return canonicalizeUrl(fallbackUrl);
  }

  /**
   * Safely searches DOM for application/ld+json scripts containing JobPosting schema.
   *
   * @param {Document} doc - DOM Document
   * @returns {object | null} JobPosting JSON object if found, or null
   */
  function getJobPostingJsonLd(doc) {
    if (!doc || !doc.querySelectorAll) return null;
    try {
      const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
      for (const s of scripts) {
        const content = (s.textContent || "").trim();
        if (!content) continue;
        try {
          const parsed = JSON.parse(content);
          if (parsed && (parsed["@type"] === "JobPosting" || parsed["@type"] === "jobPosting")) {
            return parsed;
          }
          if (Array.isArray(parsed)) {
            const found = parsed.find((item) => item && (item["@type"] === "JobPosting" || item["@type"] === "jobPosting"));
            if (found) return found;
          }
          if (parsed && Array.isArray(parsed["@graph"])) {
            const found = parsed["@graph"].find((item) => item && (item["@type"] === "JobPosting" || item["@type"] === "jobPosting"));
            if (found) return found;
          }
        } catch {
          // Ignore syntax errors in other JSON scripts
        }
      }
    } catch {
      // Ignore query errors
    }
    return null;
  }

  /**
   * Normalizes and strips marketing/tracking query parameters from job offer URLs.
   * Also handles portal-specific URL transformations (e.g., LinkedIn search to direct view).
   *
   * @param {string} rawUrl - Input raw URL
   * @returns {string} Clean canonical URL
   */
  function canonicalizeUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== "string") {
      return "";
    }

    try {
      const parsed = new URL(rawUrl.trim());

      // Special portal handling
      const host = parsed.hostname.toLowerCase();

      // LinkedIn: if user is on /jobs/search/ or has currentJobId
      if (host.includes("linkedin.com")) {
        const currentJobId =
          parsed.searchParams.get("currentJobId") ||
          parsed.searchParams.get("jobId");
        if (currentJobId && /^\d+$/.test(currentJobId)) {
          return `https://www.linkedin.com/jobs/view/${currentJobId}/`;
        }
        const viewMatch = parsed.pathname.match(/\/jobs\/view\/(\d+)/);
        if (viewMatch) {
          return `https://www.linkedin.com/jobs/view/${viewMatch[1]}/`;
        }
      }

      // Pracuj.pl: strip query parameters while preserving the main offer path
      if (host.includes("pracuj.pl")) {
        // e.g. /praca/senior-python-developer-warszawa,oferta,1003456789
        const cleanPath = parsed.pathname.replace(/\/+$/, "");
        return `${parsed.protocol}//${parsed.hostname}${cleanPath}`;
      }

      // Just Join IT: offers path (normalize legacy /oferta-pracy/ to /job-offer/)
      if (host.includes("justjoin.it")) {
        // e.g. /job-offer/company-role-slug, legacy /oferta-pracy/company-role-slug
        let cleanPath = parsed.pathname.replace(/\/+$/, "");
        if (cleanPath.startsWith("/oferta-pracy/")) {
          cleanPath = cleanPath.replace(/^\/oferta-pracy\//, "/job-offer/");
        }
        return `${parsed.protocol}//${parsed.hostname}${cleanPath}`;
      }

      // No Fluff Jobs: job path
      if (host.includes("nofluffjobs.com")) {
        const cleanPath = parsed.pathname.replace(/\/+$/, "");
        return `${parsed.protocol}//${parsed.hostname}${cleanPath}`;
      }

      // Generic cleanup: strip blacklisted parameters
      const paramsToKeep = new URLSearchParams();
      for (const [key, value] of parsed.searchParams.entries()) {
        if (!TRACKING_PARAMS.has(key.toLowerCase())) {
          paramsToKeep.append(key, value);
        }
      }

      const queryString = paramsToKeep.toString();
      let cleanPath = parsed.pathname;
      if (cleanPath.length > 1 && cleanPath.endsWith("/")) {
        cleanPath = cleanPath.slice(0, -1);
      }

      const searchPart = queryString ? `?${queryString}` : "";
      return `${parsed.protocol}//${parsed.hostname}${cleanPath}${searchPart}`;
    } catch {
      return rawUrl.trim();
    }
  }

  /**
   * Sanitizes single-line or multi-line text by normalizing whitespace,
   * non-breaking spaces, and HTML entities.
   *
   * @param {string} text - Raw text string
   * @returns {string} Trimmed, whitespace-collapsed string
   */
  function cleanText(text) {
    if (!text || typeof text !== "string") {
      return "";
    }
    const decoded = decodeHtmlEntities(text);
    return decoded
      .replace(/\u00a0/g, " ")
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s*\n\s*\n+/g, "\n\n")
      .trim();
  }

  /**
   * Detects normalized work model ('remote', 'hybrid', 'onsite') from text.
   *
   * @param {string} text - Text mentioning work arrangements
   * @returns {'remote' | 'hybrid' | 'onsite' | null}
   */
  function detectWorkModel(text) {
    if (!text) return null;
    const lower = text.toLowerCase();

    if (
      lower.includes("remote") ||
      lower.includes("zdaln") ||
      lower.includes("100% remote") ||
      lower.includes("w pełni zdalna")
    ) {
      if (lower.includes("hybryd") || lower.includes("hybrid")) {
        return "hybrid";
      }
      return "remote";
    }

    if (
      lower.includes("hybrid") ||
      lower.includes("hybryd") ||
      lower.includes("częściowo zdalna")
    ) {
      return "hybrid";
    }

    if (
      lower.includes("on-site") ||
      lower.includes("onsite") ||
      lower.includes("stacjonarn") ||
      lower.includes("w biurze") ||
      lower.includes("office")
    ) {
      return "onsite";
    }

    return null;
  }

  /**
   * Parses compensation text into structured min/max/currency values.
   * Supports Polish and international currency notations (e.g. 15 000 - 22 000 PLN, 5 000 – 7 000 zł, €4,000 - €6,000).
   *
   * @param {string} text - Raw salary text
   * @returns {{ raw: string, min: number | null, max: number | null, currency: string }}
   */
  function parseSalary(text) {
    if (!text || typeof text !== "string") {
      return { raw: null, min: null, max: null, currency: "PLN" };
    }

    const raw = cleanText(text);
    let currency = "PLN";

    if (/\$|USD/i.test(raw)) currency = "USD";
    else if (/€|EUR/i.test(raw)) currency = "EUR";
    else if (/£|GBP/i.test(raw)) currency = "GBP";
    else if (/CHF/i.test(raw)) currency = "CHF";
    else if (/PLN|zł/i.test(raw)) currency = "PLN";

    // Normalize dashes and thousands separators
    const normalized = raw
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/(\d+)\s*k\b/gi, (_, n) => `${n}000`)
      .replace(/\s+/g, " ");

    const matches = normalized.match(/\b\d{1,3}(?:[ ,.]\d{3})*\b|\b\d+\b/g);

    if (!matches || matches.length === 0) {
      return { raw, min: null, max: null, currency };
    }

    const numbers = matches
      .map((m) => parseInt(m.replace(/[ ,.]/g, ""), 10))
      .filter((n) => !isNaN(n) && n > 100); // Filter out irrelevant small integers like hours/days

    if (numbers.length === 0) {
      return { raw, min: null, max: null, currency };
    }

    if (numbers.length === 1) {
      return { raw, min: numbers[0], max: numbers[0], currency };
    }

    const min = Math.min(numbers[0], numbers[1]);
    const max = Math.max(numbers[0], numbers[1]);
    return { raw, min, max, currency };
  }

  /**
   * Strips noisy, non-content DOM elements from a cloned container.
   *
   * @param {HTMLElement} rootElement - DOM node to sanitize
   * @returns {HTMLElement} Cleaned clone of the node
   */
  function sanitizeDomNode(rootElement) {
    if (!rootElement) return document.createElement("div");

    const clone = rootElement.cloneNode(true);

    const noisySelectors = [
      "script",
      "style",
      "noscript",
      "iframe",
      "svg",
      "canvas",
      "video",
      "audio",
      "nav",
      "header",
      "footer",
      "aside",
      "form",
      "button",
      "input",
      "textarea",
      "select",
      "[role='alert']",
      "[role='banner']",
      "[role='navigation']",
      "[aria-modal='true']",
      "[class*='cookie']",
      "[id*='cookie']",
      "[class*='consent']",
      "[id*='consent']",
      "[class*='banner']",
      "[id*='banner']",
      "[class*='popup']",
      "[id*='popup']",
      "[class*='modal']",
      "[id*='modal']",
      "[class*='share']",
      "[class*='social']",
      "[class*='ad-']",
      "[class*='advert']",
      "[id*='advert']",
      "[class*='sponsored']",
    ];

    try {
      const elementsToRemove = clone.querySelectorAll(noisySelectors.join(","));
      elementsToRemove.forEach((el) => el.remove());

      // Strip attributes like inline onclick, style, etc.
      const allElements = clone.querySelectorAll("*");
      allElements.forEach((el) => {
        el.removeAttribute("style");
        el.removeAttribute("onclick");
        el.removeAttribute("onload");
        el.removeAttribute("onerror");
        // Keep meaningful links, strip javascript:
        if (el.tagName.toLowerCase() === "a") {
          const href = el.getAttribute("href") || "";
          if (href.startsWith("javascript:")) {
            el.removeAttribute("href");
          }
        }
      });
    } catch {
      // Fallback if querySelector fails
    }

    return clone;
  }

  /**
   * Extracts clean structured plain text representation from an HTML element,
   * properly preserving bullet points and paragraphs.
   *
   * @param {HTMLElement} element - Root element to format into text
   * @returns {string} Formatted text
   */
  function elementToStructuredText(element) {
    if (!element) return "";

    const lines = [];

    function walk(node, isInsideList = false) {
      if (!node) return;

      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent.trim();
        if (text) {
          lines.push(text);
        }
        return;
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toLowerCase();

        if (tag === "li") {
          const bulletText = cleanText(node.textContent);
          if (bulletText) {
            lines.push(`• ${bulletText}`);
          }
          return;
        }

        if (tag === "h1" || tag === "h2" || tag === "h3" || tag === "h4") {
          const headingText = cleanText(node.textContent);
          if (headingText) {
            lines.push(`\n### ${headingText}\n`);
          }
          return;
        }

        if (tag === "p" || tag === "div" || tag === "section") {
          for (const child of node.childNodes) {
            walk(child, isInsideList);
          }
          lines.push("\n");
          return;
        }

        for (const child of node.childNodes) {
          walk(child, isInsideList || tag === "ul" || tag === "ol");
        }
      }
    }

    walk(element);
    return cleanText(lines.join(" "));
  }

  const POLISH_MONTHS = {
    stycznia: "01",
    styczeń: "01",
    lutego: "02",
    luty: "02",
    marca: "03",
    marzec: "03",
    kwietnia: "04",
    kwiecień: "04",
    maja: "05",
    maj: "05",
    czerwca: "06",
    czerwiec: "06",
    lipca: "07",
    lipiec: "07",
    sierpnia: "08",
    sierpień: "08",
    września: "09",
    wrzesień: "09",
    października: "10",
    październik: "10",
    listopada: "11",
    listopad: "11",
    grudnia: "12",
    grudzień: "12",
  };

  /**
   * Normalizes various date string representations into YYYY-MM-DD format.
   *
   * @param {string} raw - Input raw date string
   * @returns {string | null} YYYY-MM-DD date or null
   */
  function normalizeDateToIso(raw) {
    if (!raw || typeof raw !== "string") return null;
    const trimmed = raw.trim();

    // Check ISO: 2026-11-20 or 2026-11-20T...
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }

    // Check DD.MM.YYYY or DD-MM-YYYY or DD/MM/YYYY
    const dmyMatch = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, "0");
      const month = dmyMatch[2].padStart(2, "0");
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }

    // Check Polish verbal month: 20 listopada 2026
    const verbalMatch = trimmed.match(/(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i);
    if (verbalMatch) {
      const day = verbalMatch[1].padStart(2, "0");
      const monthKey = verbalMatch[2].toLowerCase();
      const month = POLISH_MONTHS[monthKey];
      const year = verbalMatch[3];
      if (month) {
        return `${year}-${month}-${day}`;
      }
    }

    // Try new Date(trimmed)
    try {
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, "0");
        const d = String(parsed.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      }
    } catch {
      // Ignore
    }

    return null;
  }

  /**
   * Extracts application deadline from JSON-LD, metadata, DOM elements, or text patterns.
   *
   * @param {Document} doc - DOM document
   * @param {object} [ldData] - Extracted JobPosting JSON-LD object
   * @param {object} [extraData] - Portal specific state/attributes (e.g. Next.js state)
   * @returns {string | null} Normalized YYYY-MM-DD date string, or null
   */
  function extractDeadline(doc, ldData, extraData) {
    // 1. JSON-LD validThrough or expires
    if (ldData) {
      if (ldData.validThrough) {
        const norm = normalizeDateToIso(ldData.validThrough);
        if (norm) return norm;
      }
      if (ldData.expires) {
        const norm = normalizeDateToIso(ldData.expires);
        if (norm) return norm;
      }
    }

    // 2. Extra data attributes (Pracuj Next.js or others)
    if (extraData && typeof extraData === "object") {
      const candidates = [
        extraData.expirationDate,
        extraData.dateTo,
        extraData.validThrough,
        extraData.offerExpirationDate,
        extraData.attributes && extraData.attributes.expirationDate,
        extraData.attributes && extraData.attributes.dateTo,
        extraData.attributes && extraData.attributes.validThrough,
      ];
      for (const val of candidates) {
        if (val) {
          const norm = normalizeDateToIso(val);
          if (norm) return norm;
        }
      }
    }

    if (!doc || !doc.querySelector) return null;

    // 3. Meta tags & schema elements
    const metaSelectors = [
      'meta[property="og:expiration_time"]',
      'meta[name="expires"]',
      'meta[itemprop="validThrough"]',
      'time[itemprop="validThrough"]',
      '[data-test="text-expirationDate"]',
      '[data-test-id="offer-expiration-date"]',
      'time[datetime]',
    ];
    for (const sel of metaSelectors) {
      const el = doc.querySelector(sel);
      if (el) {
        const val = el.getAttribute("content") || el.getAttribute("datetime") || el.textContent;
        const norm = normalizeDateToIso(val);
        if (norm) return norm;
      }
    }

    // 4. Text regex patterns
    const textContent = doc.body ? doc.body.innerText : "";
    if (textContent) {
      // "aplikuj do 2026-11-20" or "ważna do: 20.11.2026"
      const dateMatch = textContent.match(
        /(?:aplikuj do|ważna do|termin składania|termin zgłoszeń|termin aplikacji|deadline|valid until|expires)[:\s]+([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{1,2}[./-][0-9]{1,2}[./-][0-9]{4})/i
      );
      if (dateMatch && dateMatch[1]) {
        const norm = normalizeDateToIso(dateMatch[1]);
        if (norm) return norm;
      }

      // "ważna do 20 listopada 2026"
      const verbalMatch = textContent.match(
        /(?:aplikuj do|ważna do|do dnia)[:\s]+(\d{1,2}\s+[a-ząćęłńóśźż]+\s+\d{4})/i
      );
      if (verbalMatch && verbalMatch[1]) {
        const norm = normalizeDateToIso(verbalMatch[1]);
        if (norm) return norm;
      }

      // Relative: "do końca: 5 dni" -> calculate date
      const relativeMatch = textContent.match(/(?:do końca|wygasa za|pozostało)[:\s]+(\d+)\s*dni/i);
      if (relativeMatch && relativeMatch[1]) {
        const days = parseInt(relativeMatch[1], 10);
        if (!isNaN(days) && days > 0 && days < 365) {
          const target = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
          const y = target.getFullYear();
          const m = String(target.getMonth() + 1).padStart(2, "0");
          const d = String(target.getDate()).padStart(2, "0");
          return `${y}-${m}-${d}`;
        }
      }
    }

    return null;
  }

  /**
   * Safely parses Schema.org baseSalary structure into min, max, currency, and clean raw string.
   * Handles quantitative values where value is an object { minValue, maxValue }.
   *
   * @param {object} baseSalary - Schema.org baseSalary object
   * @returns {{ raw: string | null, min: number | null, max: number | null, currency: string }}
   */
  function parseBaseSalary(baseSalary) {
    if (!baseSalary || typeof baseSalary !== "object") {
      return { raw: null, min: null, max: null, currency: "PLN" };
    }
    const val = typeof baseSalary.value === "object" && baseSalary.value !== null ? baseSalary.value : {};
    let min = null;
    let max = null;

    if (typeof baseSalary.minValue === "number") min = Math.round(baseSalary.minValue);
    else if (typeof val.minValue === "number") min = Math.round(val.minValue);
    else if (typeof baseSalary.value === "number") min = Math.round(baseSalary.value);

    if (typeof baseSalary.maxValue === "number") max = Math.round(baseSalary.maxValue);
    else if (typeof val.maxValue === "number") max = Math.round(val.maxValue);
    else if (typeof baseSalary.value === "number") max = Math.round(baseSalary.value);

    const currency = baseSalary.currency || val.unitText || "PLN";

    let raw = null;
    if (min && max && min !== max) {
      raw = `${min.toLocaleString("pl-PL")} - ${max.toLocaleString("pl-PL")} ${currency}`;
    } else if (min) {
      raw = `${min.toLocaleString("pl-PL")} ${currency}`;
    } else if (max) {
      raw = `${max.toLocaleString("pl-PL")} ${currency}`;
    }

    return { raw, min, max, currency };
  }

  /**
   * Cleans location text by stripping leading/trailing dots, commas, plus-indicators, and whitespace.
   *
   * @param {string} text - Raw location text
   * @returns {string} Clean location string
   */
  function cleanLocationText(text) {
    if (!text || typeof text !== "string") return "";
    return text
      .replace(/\+\d+\s*Lokalizacj[ae]/gi, "")
      .replace(/^[.,\s;/-]+|[.,\s;/-]+$/g, "")
      .trim();
  }

  return {
    canonicalizeUrl,
    getCanonicalUrl,
    getJobPostingJsonLd,
    decodeHtmlEntities,
    cleanText,
    detectWorkModel,
    parseSalary,
    parseBaseSalary,
    cleanLocationText,
    sanitizeDomNode,
    elementToStructuredText,
    normalizeDateToIso,
    extractDeadline,
  };
});
