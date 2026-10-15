/**
 * KandidFlow — LinkedIn Extractor Strategy
 * Targets: *.linkedin.com
 */

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.KandidFlow = root.KandidFlow || {};
    root.KandidFlow.extractors = root.KandidFlow.extractors || {};
    root.KandidFlow.extractors.linkedin = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const VERSION = "1.1.0";

  function extractLinkedIn() {
    const utils = (window.KandidFlow && window.KandidFlow.utils) || {};
    const canonicalUrl = utils.canonicalizeUrl
      ? utils.canonicalizeUrl(window.location.href)
      : window.location.href;

    const matchedSelectors = [];

    // 1. Role Title
    let title = null;
    const titleCandidates = [
      "h1.job-details-jobs-unified-top-card__job-title",
      "h1.top-card-layout__title",
      "h1.topcard__title",
      "div.job-details-jobs-unified-top-card__title-container h1",
      "h2.job-details-jobs-unified-top-card__job-title",
      "h1",
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
      "a.job-details-jobs-unified-top-card__primary-description-container-anchor",
      "div.job-details-jobs-unified-top-card__company-name a",
      "div.job-details-jobs-unified-top-card__company-name",
      "span.job-details-jobs-unified-top-card__company-name",
      "a.topcard__org-name-link",
      "span.topcard__flavor",
      'a[href*="/company/"]',
    ];
    for (const sel of companyCandidates) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) {
        company = utils.cleanText(el.textContent);
        matchedSelectors.push(sel);
        break;
      }
    }

    // 3. Work Model & Locations
    let workModel = null;
    let workModelDetails = null;
    const locations = [];
    let locationRaw = null;

    // Workplace type & Location badges
    const metaBadges = document.querySelectorAll(
      "span.job-details-jobs-unified-top-card__bullet, div.job-details-jobs-unified-top-card__workplace-type, span.topcard__flavor--bullet, li.job-details-jobs-unified-top-card__job-insight span"
    );

    metaBadges.forEach((b) => {
      const txt = utils.cleanText(b.textContent);
      const detected = utils.detectWorkModel ? utils.detectWorkModel(txt) : null;
      if (detected && !workModel) {
        workModel = detected;
        workModelDetails = txt;
      } else if (txt && !txt.includes("applicant") && !txt.includes("aplikuj") && !locationRaw) {
        // May be a location string like "Warsaw, Masovian, Poland"
        if (/poland|warsaw|krakow|wroclaw|gdansk|remote|hybrid|europe|united states/i.test(txt) || txt.includes(",")) {
          locationRaw = txt;
        }
      }
    });

    if (locationRaw) {
      const parts = locationRaw.split(/[,;/+]+/).map((s) => s.trim()).filter(Boolean);
      locations.push(...parts);
    }

    // 4. Salary
    let salaryRaw = null;
    let salaryMin = null;
    let salaryMax = null;
    let salaryCurrency = "PLN";

    const salaryContainer = document.querySelector(
      'div.job-details-jobs-unified-top-card__job-insight span[class*="salary"], div.job-details-preferences-and-skills span'
    );
    if (salaryContainer && salaryContainer.textContent.trim()) {
      const text = salaryContainer.textContent.trim();
      const parsed = utils.parseSalary ? utils.parseSalary(text) : { raw: text, min: null, max: null, currency: "PLN" };
      salaryRaw = parsed.raw;
      salaryMin = parsed.min;
      salaryMax = parsed.max;
      salaryCurrency = parsed.currency;
      matchedSelectors.push("linkedin-salary");
    }

    // 5. Job Description Container
    let descriptionHtml = null;
    let descriptionText = "";
    const descCandidates = [
      "#job-details",
      "div.jobs-description__content",
      "div.show-more-less-html__markup",
      "div.description__text",
      "article.jobs-description",
    ];

    let descElement = null;
    for (const sel of descCandidates) {
      const el = document.querySelector(sel);
      if (el && el.innerHTML.trim().length > 80) {
        descElement = el;
        matchedSelectors.push(sel);
        break;
      }
    }

    const requirements = [];
    if (descElement) {
      const cloned = descElement.cloneNode(true);

      // Strip LinkedIn noise: feedback buttons, premium badges, translate widgets
      const noise = cloned.querySelectorAll(
        'button, [class*="feedback"], [class*="applicant"], [class*="similar"], [class*="footer"], [class*="share"], [class*="banner"]'
      );
      noise.forEach((n) => n.remove());

      const sanitized = utils.sanitizeDomNode ? utils.sanitizeDomNode(cloned) : cloned;
      descriptionHtml = sanitized.innerHTML;
      descriptionText = utils.elementToStructuredText
        ? utils.elementToStructuredText(sanitized)
        : sanitized.textContent.trim();

      // Extract requirement bullets from description
      const bullets = sanitized.querySelectorAll("li");
      bullets.forEach((li) => {
        const txt = utils.cleanText(li.textContent);
        if (txt && txt.length > 5 && txt.length < 350) {
          requirements.push(txt);
        }
      });
    }

    // Application Deadline
    const ldData = utils.getJobPostingJsonLd ? utils.getJobPostingJsonLd(document) : null;
    const applicationDeadline = utils.extractDeadline ? utils.extractDeadline(document, ldData) : null;
    if (applicationDeadline) {
      matchedSelectors.push("deadline");
    }

    return {
      source_url: canonicalUrl,
      source_portal: "linkedin",
      title: title || document.title.replace(/\|.*LinkedIn/i, "").trim(),
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
        extra_info: "Extracted via LinkedIn strategy",
      },
    };
  }

  return extractLinkedIn;
});
