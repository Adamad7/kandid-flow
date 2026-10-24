/**
 * KandidFlow — No Fluff Jobs Extractor Strategy
 * Targets: nofluffjobs.com
 */

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.KandidFlow = root.KandidFlow || {};
    root.KandidFlow.extractors = root.KandidFlow.extractors || {};
    root.KandidFlow.extractors.nofluffjobs = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const VERSION = "1.1.1";

  function extractNoFluffJobs() {
    const utils = (window.KandidFlow && window.KandidFlow.utils) || {};
    const canonicalUrl = utils.canonicalizeUrl
      ? utils.canonicalizeUrl(window.location.href)
      : window.location.href;

    const matchedSelectors = [];

    // 1. Role Title
    let title = null;
    const titleCandidates = [
      'h1.posting-details-description__title',
      '[data-cy="posting-title"]',
      'h1[class*="title"]',
      'h1',
    ];
    for (const sel of titleCandidates) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) {
        title = utils.cleanText(el.textContent);
        matchedSelectors.push(sel);
        break;
      }
    }

    // 2. Company Name
    let company = null;
    const companyCandidates = [
      'a.posting-details-description__company-badge',
      '[data-cy="Company"]',
      'a[href*="/company/"]',
      'h2.company-name',
      'h2',
    ];
    for (const sel of companyCandidates) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) {
        company = utils.cleanText(el.textContent);
        matchedSelectors.push(sel);
        break;
      }
    }

    // 3. Salary
    let salaryRaw = null;
    let salaryMin = null;
    let salaryMax = null;
    let salaryCurrency = "PLN";

    const salaryCandidates = [
      'nfj-posting-salaries',
      '[data-cy="Salary"]',
      'h4.salary',
      'span.salary',
      'div[class*="salary"]',
    ];
    for (const sel of salaryCandidates) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) {
        const text = el.textContent.trim();
        const parsed = utils.parseSalary ? utils.parseSalary(text) : { raw: text, min: null, max: null, currency: "PLN" };
        salaryRaw = parsed.raw;
        salaryMin = parsed.min;
        salaryMax = parsed.max;
        salaryCurrency = parsed.currency;
        matchedSelectors.push(sel);
        break;
      }
    }

    // 4. Work Model & Locations
    let workModel = null;
    let workModelDetails = null;
    const locations = [];
    let locationRaw = null;

    // Check tags / badges
    const badges = document.querySelectorAll(
      'li.posting-spec__item, [data-cy="Workplace"], div.posting-details-badges span, nfj-posting-item-tags'
    );
    badges.forEach((b) => {
      const txt = b.textContent.trim();
      const detected = utils.detectWorkModel ? utils.detectWorkModel(txt) : null;
      if (detected) {
        if (!workModel) {
          workModel = detected;
        }
        const hasDetails = utils.hasWorkModelDetails
          ? utils.hasWorkModelDetails(txt)
          : !/^(praca\s+)?(zdaln[a-ząćęłńóśźż]*|remote|hybryd[a-ząćęłńóśźż]*|hybrid|stacjonarn[a-ząćęłńóśźż]*|onsite|on-site)$/i.test(txt.trim());
        if (hasDetails && !workModelDetails) {
          workModelDetails = txt;
        }
      }
    });

    // Locations
    const locCandidates = [
      '[data-cy="Location"]',
      'nfj-posting-locations',
      'li.posting-locations__location',
      'span[class*="location"]',
    ];
    for (const sel of locCandidates) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) {
        locationRaw = utils.cleanText(el.textContent);
        matchedSelectors.push(sel);
        const parts = locationRaw.split(/[,;/+]+/).map((s) => s.trim()).filter(Boolean);
        locations.push(...parts);
        if (!workModel && utils.detectWorkModel) {
          workModel = utils.detectWorkModel(locationRaw);
        }
        break;
      }
    }

    // 5. Must-have and Nice-to-have Requirements
    const requirements = [];

    // Must-have section
    const mustSection = document.querySelector(
      'section#posting-requirements [commonpostingitem="musts"], section#posting-requirements [class*="must"], [data-cy="requirements-musts"]'
    );
    if (mustSection) {
      const items = mustSection.querySelectorAll("li, span.ng-star-inserted, div.posting-tag");
      items.forEach((it) => {
        const val = utils.cleanText(it.textContent);
        if (val && val.length > 1 && !requirements.includes(`[Must have] ${val}`)) {
          requirements.push(`[Must have] ${val}`);
        }
      });
      matchedSelectors.push("must-requirements");
    }

    // Nice-to-have section
    const niceSection = document.querySelector(
      'section#posting-requirements [commonpostingitem="nices"], section#posting-requirements [class*="nice"], [data-cy="requirements-nices"]'
    );
    if (niceSection) {
      const items = niceSection.querySelectorAll("li, span.ng-star-inserted, div.posting-tag");
      items.forEach((it) => {
        const val = utils.cleanText(it.textContent);
        if (val && val.length > 1 && !requirements.includes(`[Nice to have] ${val}`)) {
          requirements.push(`[Nice to have] ${val}`);
        }
      });
      matchedSelectors.push("nice-requirements");
    }

    // General requirements fallback
    if (requirements.length === 0) {
      const reqList = document.querySelectorAll(
        "section#posting-requirements li, nfj-posting-requirements li"
      );
      reqList.forEach((li) => {
        const val = utils.cleanText(li.textContent);
        if (val && val.length > 2) {
          requirements.push(val);
        }
      });
    }

    // 6. Job Description Container
    let descriptionHtml = null;
    let descriptionText = "";

    const descContainer = document.querySelector(
      "section#posting-description, article.posting-details, div.posting-details, main"
    );

    if (descContainer) {
      const sanitized = utils.sanitizeDomNode ? utils.sanitizeDomNode(descContainer) : descContainer.cloneNode(true);
      descriptionHtml = sanitized.innerHTML;
      descriptionText = utils.elementToStructuredText
        ? utils.elementToStructuredText(sanitized)
        : sanitized.textContent.trim();
      matchedSelectors.push("posting-description");
    }

    // Application Deadline
    const ldData = utils.getJobPostingJsonLd ? utils.getJobPostingJsonLd(document) : null;
    const applicationDeadline = utils.extractDeadline ? utils.extractDeadline(document, ldData) : null;
    if (applicationDeadline) {
      matchedSelectors.push("deadline");
    }

    return {
      source_url: canonicalUrl,
      source_portal: "nofluffjobs",
      title: title || document.title.split("|")[0].trim(),
      company: company,
      location_raw: locationRaw,
      locations: locations.length > 0 ? Array.from(new Set(locations)) : (locationRaw ? [locationRaw] : []),
      work_model: workModel,
      work_model_details: workModelDetails,
      salary_raw: salaryRaw,
      salary_min: salaryMin,
      salary_max: salaryMax,
      salary_currency: salaryCurrency,
      description_html: descriptionHtml,
      description_text: descriptionText,
      requirements_raw: requirements,
      application_deadline: applicationDeadline,
      custom_metadata: {
        page_title: document.title,
        extracted_at: new Date().toISOString(),
        extractor_version: VERSION,
        raw_selectors: matchedSelectors,
        extra_info: "Extracted via NoFluffJobs strategy",
      },
    };
  }

  return extractNoFluffJobs;
});
