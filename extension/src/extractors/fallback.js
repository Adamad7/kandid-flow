/**
 * KandidFlow — Generic Fallback DOM Sanitizer & Extractor Strategy
 * Targets: Any job portal or careers site not covered by dedicated extractors
 */

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.KandidFlow = root.KandidFlow || {};
    root.KandidFlow.extractors = root.KandidFlow.extractors || {};
    root.KandidFlow.extractors.fallback = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const VERSION = "1.1.0";

  function extractFallback() {
    const utils = (window.KandidFlow && window.KandidFlow.utils) || {};
    const canonicalUrl = utils.canonicalizeUrl
      ? utils.canonicalizeUrl(window.location.href)
      : window.location.href;

    const matchedSelectors = [];

    // 1. Role Title
    let title = null;
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    const h1 = document.querySelector("h1");

    if (h1 && h1.textContent.trim()) {
      title = utils.cleanText(h1.textContent);
      matchedSelectors.push("h1");
    } else if (ogTitle && ogTitle.content) {
      title = utils.cleanText(ogTitle.content);
      matchedSelectors.push('meta[property="og:title"]');
    } else if (twitterTitle && twitterTitle.content) {
      title = utils.cleanText(twitterTitle.content);
      matchedSelectors.push('meta[name="twitter:title"]');
    } else {
      title = utils.cleanText(document.title);
    }

    // 2. Company Name
    let company = null;
    const ogSiteName = document.querySelector('meta[property="og:site_name"]');
    if (ogSiteName && ogSiteName.content) {
      company = utils.cleanText(ogSiteName.content);
      matchedSelectors.push('meta[property="og:site_name"]');
    } else {
      // Try parsing from title: "Position at Company" or "Position | Company" or "Position - Company"
      const titleParts = document.title.split(/[-|–—•]|\bat\b|\bw\b/i);
      if (titleParts.length > 1) {
        company = utils.cleanText(titleParts[titleParts.length - 1]);
      }
    }

    // 3. Main Content Root Selection
    const contentCandidates = [
      "main",
      "article",
      '[role="main"]',
      "#content",
      ".content",
      "#main",
      ".main",
      ".job-description",
      ".offer-description",
      "body",
    ];

    let targetRoot = null;
    for (const sel of contentCandidates) {
      const el = document.querySelector(sel);
      if (el && el.innerText && el.innerText.trim().length > 150) {
        targetRoot = el;
        matchedSelectors.push(sel);
        break;
      }
    }

    if (!targetRoot) {
      targetRoot = document.body || document.documentElement;
    }

    // Sanitize DOM
    const sanitizedNode = utils.sanitizeDomNode ? utils.sanitizeDomNode(targetRoot) : targetRoot.cloneNode(true);
    const descriptionHtml = sanitizedNode.innerHTML;
    const descriptionText = utils.elementToStructuredText
      ? utils.elementToStructuredText(sanitizedNode)
      : (sanitizedNode.innerText || "").trim();

    // 4. Requirements bullets
    const requirements = [];
    const listItems = sanitizedNode.querySelectorAll("li");
    listItems.forEach((li) => {
      const txt = utils.cleanText(li.textContent);
      if (txt && txt.length > 5 && txt.length < 300) {
        requirements.push(txt);
      }
    });

    // 5. Detect Salary & Work Model from Page Text
    const workModel = utils.detectWorkModel ? utils.detectWorkModel(descriptionText) : null;
    const salaryParsed = utils.parseSalary ? utils.parseSalary(descriptionText.slice(0, 1500)) : { raw: null, min: null, max: null, currency: "PLN" };

    // Application Deadline
    const ldData = utils.getJobPostingJsonLd ? utils.getJobPostingJsonLd(document) : null;
    const applicationDeadline = utils.extractDeadline ? utils.extractDeadline(document, ldData) : null;
    if (applicationDeadline) {
      matchedSelectors.push("deadline");
    }

    return {
      source_url: canonicalUrl,
      source_portal: "generic",
      title: title || "Oferta pracy",
      company: company || window.location.hostname.replace(/^www\./, ""),
      location_raw: null,
      locations: [],
      work_model: workModel,
      work_model_details: null,
      salary_raw: salaryParsed.raw,
      salary_min: salaryParsed.min,
      salary_max: salaryParsed.max,
      salary_currency: salaryParsed.currency,
      description_html: descriptionHtml,
      description_text: descriptionText,
      requirements_raw: requirements.slice(0, 20), // Cap reasonable bullet count
      application_deadline: applicationDeadline,
      custom_metadata: {
        page_title: document.title,
        extracted_at: new Date().toISOString(),
        extractor_version: VERSION,
        raw_selectors: matchedSelectors,
        extra_info: "Extracted via Generic Fallback strategy",
      },
    };
  }

  return extractFallback;
});
