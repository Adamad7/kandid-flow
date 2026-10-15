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

  return {
    canonicalizeUrl,
    getCanonicalUrl,
    getJobPostingJsonLd,
    decodeHtmlEntities,
    cleanText,
    detectWorkModel,
    parseSalary,
    sanitizeDomNode,
    elementToStructuredText,
  };
});
