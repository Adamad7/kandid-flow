/**
 * KandidFlow — Just Join IT Extractor Strategy
 * Targets: justjoin.it
 */

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.KandidFlow = root.KandidFlow || {};
    root.KandidFlow.extractors = root.KandidFlow.extractors || {};
    root.KandidFlow.extractors.justjoin = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const VERSION = "1.3.2";

  const COMPANY_BLACKLIST_REGEX =
    /^(o nas|kariera|o nas i kariera|about us|career|zobacz profil firmy|opis|opis stanowiska|o firmie|tech stack|lokalizacja|wymagania|just join it|justjoin)$/i;

  function isBlacklistedCompany(name) {
    if (!name || typeof name !== "string") return true;
    const trimmed = name.trim();
    if (!trimmed) return true;
    const lower = trimmed.toLowerCase();
    if (lower.includes("just-join-it") || lower.includes("o nas i kariera")) {
      return true;
    }
    return COMPANY_BLACKLIST_REGEX.test(trimmed);
  }

  function extractJustJoin() {
    const utils = (window.KandidFlow && window.KandidFlow.utils) || {};
    const canonicalUrl = utils.getCanonicalUrl
      ? utils.getCanonicalUrl(document, window.location.href)
      : (utils.canonicalizeUrl ? utils.canonicalizeUrl(window.location.href) : window.location.href);

    const matchedSelectors = [];
    const ldData = utils.getJobPostingJsonLd ? utils.getJobPostingJsonLd(document) : null;
    if (ldData) {
      matchedSelectors.push('script[type="application/ld+json"]');
    }

    // 1. Role Title
    let title = null;
    const titleCandidates = [
      'h1[class*="offer-title"]',
      '[data-test-id="offer-title"]',
      'h1',
      'div[class*="offer-title"]',
    ];
    for (const sel of titleCandidates) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) {
        title = utils.cleanText(el.textContent);
        matchedSelectors.push(sel);
        break;
      }
    }
    if (!title && ldData && ldData.title) {
      title = utils.cleanText(ldData.title);
    }
    if (!title && document.title) {
      title = utils.cleanText(document.title.split("-")[0]);
    }

    // 2. Company Name
    let company = null;

    // 2.1 Check JSON-LD (ldData.hiringOrganization) first
    if (ldData && ldData.hiringOrganization) {
      const org = ldData.hiringOrganization;
      const orgName = typeof org === "string" ? org : (org && org.name ? org.name : null);
      if (orgName) {
        const cleanedOrg = utils.cleanText ? utils.cleanText(orgName) : orgName.trim();
        const candidate = cleanedOrg.replace(/^Praca\s+/i, "").trim();
        if (candidate && !isBlacklistedCompany(candidate)) {
          company = candidate;
          matchedSelectors.push('script[type="application/ld+json"].hiringOrganization');
        }
      }
    }

    // 2.2 Refactor DOM companyCandidates and logic
    if (!company) {
      const companyCandidates = [
        '[data-test-id="company-name"]',
        'h2[class*="company-name"]',
        'a.company_all_offers_link',
        'a[href*="/brands/story/"]:not([href*="just-join-it"]) h2',
        'a[href*="/brands/story/"]:not([href*="just-join-it"])',
        'h2',
        'a[href*="/companies/"]',
        'div[class*="company-name"]',
      ];
      for (const sel of companyCandidates) {
        const el = document.querySelector(sel);
        if (el && el.textContent.trim()) {
          const rawText = utils.cleanText ? utils.cleanText(el.textContent) : el.textContent.trim();
          const candidate = rawText.replace(/^Praca\s+/i, "").trim();
          if (candidate && !isBlacklistedCompany(candidate)) {
            company = candidate;
            matchedSelectors.push(sel);
            break;
          }
        }
      }
    }

    // 2.3 Fallback to document.title
    if (!company && document.title) {
      const titleParts = document.title.split(" - ");
      if (titleParts.length > 1) {
        const titleCandidate = titleParts.slice(1).join(" - ");
        const cleanedTitle = utils.cleanText ? utils.cleanText(titleCandidate) : titleCandidate.trim();
        const candidate = cleanedTitle.replace(/^Praca\s+/i, "").trim();
        if (candidate && !isBlacklistedCompany(candidate)) {
          company = candidate;
          matchedSelectors.push("document.title.company");
        }
      }
    }

    // 3. Salary
    let salaryRaw = null;
    let salaryMin = null;
    let salaryMax = null;
    let salaryCurrency = "PLN";

    const salaryCandidates = [
      '[data-test-id="offer-salary"]',
      'div[class*="salary"]',
      'span[class*="salary"]',
    ];
    for (const sel of salaryCandidates) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) {
        const text = el.textContent.trim();
        if (/pln|zł|eur|usd|b2b|uop|net|gross|\d{3,}/i.test(text)) {
          const parsed = utils.parseSalary ? utils.parseSalary(text) : { raw: text, min: null, max: null, currency: "PLN" };
          salaryRaw = parsed.raw;
          salaryMin = parsed.min;
          salaryMax = parsed.max;
          salaryCurrency = parsed.currency;
          matchedSelectors.push(sel);
          break;
        }
      }
    }

    // Fallback to JSON-LD baseSalary
    if (!salaryRaw && ldData && ldData.baseSalary) {
      const parsedBs = utils.parseBaseSalary ? utils.parseBaseSalary(ldData.baseSalary) : null;
      if (parsedBs && (parsedBs.min != null || parsedBs.max != null || parsedBs.raw)) {
        salaryMin = parsedBs.min;
        salaryMax = parsedBs.max;
        salaryCurrency = parsedBs.currency || "PLN";
        salaryRaw = parsedBs.raw;
      }
    }

    // 4. Work Model & Locations
    let workModel = null;
    let workModelDetails = null;
    const locations = [];
    let locationRaw = null;

    // Check JSON-LD for telecommute
    if (ldData && ldData.jobLocationType === "TELECOMMUTE") {
      workModel = "remote";
      workModelDetails = "Zdalnie";
    }

    // Scan badges / chips in header
    const chipElements = document.querySelectorAll(
      '[data-test-id="offer-badge"], div[class*="mui-jikuwi"], div[class*="badge"], div[class*="chip"], div[class*="tag"]'
    );
    chipElements.forEach((badge) => {
      const txt = utils.cleanText(badge.textContent);
      const detected = utils.detectWorkModel ? utils.detectWorkModel(txt) : null;
      if (detected && !workModel) {
        workModel = detected;
        workModelDetails = txt;
        matchedSelectors.push('div[class*="mui-jikuwi"]');
      }
    });

    // Extract location: JSON-LD is cleanest and structured
    if (ldData && ldData.jobLocation) {
      const addr = ldData.jobLocation.address || {};
      const locality = addr.addressLocality || ldData.jobLocation.name;
      const street = addr.streetAddress && addr.streetAddress !== "." ? addr.streetAddress : null;
      if (locality && locality !== ".") {
        const cleanLocality = utils.cleanLocationText ? utils.cleanLocationText(locality) : locality.trim();
        if (cleanLocality) {
          locationRaw = street ? `${street}, ${cleanLocality}` : cleanLocality;
          locations.push(cleanLocality);
          matchedSelectors.push('script[type="application/ld+json"].jobLocation');
        }
      }
    }

    // Also check location pin in DOM
    const locationPinEl = document.querySelector(
      'svg.lucide-map-pin, [class*="lucide-map-pin"], [data-test-id="offer-location"]'
    );
    if (locationPinEl) {
      const container = locationPinEl.closest('div[tabindex="0"]') || locationPinEl.parentElement;
      if (container) {
        const clone = container.cloneNode(true);
        const chevrons = clone.querySelectorAll('svg, [class*="chevron"]');
        chevrons.forEach((c) => c.remove());
        const locText = utils.cleanLocationText
          ? utils.cleanLocationText(clone.textContent)
          : utils.cleanText(clone.textContent).replace(/^[.,\s]+/, "").trim();
        if (locText && locText !== "." && !locationRaw) {
          locationRaw = locText;
          matchedSelectors.push('svg.lucide-map-pin');
        }
        if (locText && locText !== ".") {
          const parts = locText
            .split(/[,;/+]+/)
            .map((s) => (utils.cleanLocationText ? utils.cleanLocationText(s) : s.trim()))
            .filter((s) => s.length > 1 && s !== "." && !/^\d+/.test(s));
          for (const p of parts) {
            if (!locations.includes(p)) locations.push(p);
          }
        }
      }
    }

    if (locationRaw) {
      const parts = locationRaw
        .split(/[,;/+]+/)
        .map((s) => (utils.cleanLocationText ? utils.cleanLocationText(s) : s.trim()))
        .filter((s) => s.length > 1 && s !== "." && !/^\d+/.test(s));
      for (const p of parts) {
        if (!locations.includes(p)) locations.push(p);
      }
      if (!workModel && utils.detectWorkModel) {
        workModel = utils.detectWorkModel(locationRaw);
      }
    }

    // 5. Tech Stack & Requirements
    const requirements = [];

    // Modern JustJoin Tech stack extraction
    const headings = document.querySelectorAll('h3, h4');
    headings.forEach((h) => {
      const hText = (h.textContent || "").trim();
      if (/tech stack/i.test(hText)) {
        matchedSelectors.push('h3:contains("Tech stack")');
        const container = h.parentElement || h.closest('section') || h.nextElementSibling;
        if (container) {
          // Skills are represented with h4 (name) and optional span (level)
          const skillItems = container.querySelectorAll('li, div[class*="MuiBox-root"]');
          skillItems.forEach((item) => {
            const nameEl = item.querySelector('h4, span[class*="name"]') || item.querySelector('h4');
            const levelEl = item.querySelector('span[class*="MuiTypography-subtitle5"], span[class*="level"]');
            if (nameEl) {
              const sName = utils.cleanText(nameEl.textContent);
              const sLevel = levelEl ? utils.cleanText(levelEl.textContent) : null;
              if (sName && sName.length > 1 && sName.length < 50 && !/tech stack/i.test(sName)) {
                const fullSkill = sLevel ? `${sName} (${sLevel})` : sName;
                if (!requirements.includes(fullSkill)) {
                  requirements.push(fullSkill);
                }
              }
            }
          });
        }
      }
    });

    // Also check older JustJoin skill tags
    const legacySkillContainers = document.querySelectorAll(
      '[data-test-id="offer-skills"] div[class*="skill"], div[class*="skills"] div[class*="item"], div[class*="SkillTag"]'
    );
    legacySkillContainers.forEach((skill) => {
      const nameEl = skill.querySelector('h6, span, div[class*="name"]') || skill;
      const levelEl = skill.querySelector('span[class*="level"], div[class*="level"]');
      const name = utils.cleanText(nameEl.textContent);
      const level = levelEl ? utils.cleanText(levelEl.textContent) : null;
      if (name) {
        const fullSkill = level ? `${name} (${level})` : name;
        if (!requirements.includes(fullSkill)) {
          requirements.push(fullSkill);
        }
      }
    });

    // 6. Job Description & Opis Stanowiska bullets
    let descriptionHtml = null;
    let descriptionText = "";

    // Find "Opis stanowiska" section
    let opisContainer = null;
    headings.forEach((h) => {
      const hText = (h.textContent || "").trim();
      if (/opis stanowiska/i.test(hText)) {
        matchedSelectors.push('h3:contains("Opis stanowiska")');
        opisContainer = h.nextElementSibling || h.parentElement;
      }
    });

    if (opisContainer) {
      // Extract bullet points inside Opis stanowiska
      const bullets = opisContainer.querySelectorAll('li');
      bullets.forEach((li) => {
        const txt = utils.cleanText(li.textContent);
        if (txt && txt.length > 3 && txt.length < 400 && !requirements.includes(txt)) {
          requirements.push(txt);
        }
      });

      const sanitized = utils.sanitizeDomNode ? utils.sanitizeDomNode(opisContainer) : opisContainer.cloneNode(true);
      descriptionHtml = sanitized.innerHTML;
      descriptionText = utils.elementToStructuredText
        ? utils.elementToStructuredText(sanitized)
        : sanitized.textContent.trim();
    } else {
      // Fallback description candidates
      const descCandidates = [
        '[data-test-id="offer-description"]',
        'div[class*="description"]',
        'main',
        'article',
      ];
      for (const sel of descCandidates) {
        const el = document.querySelector(sel);
        if (el && el.innerHTML.trim().length > 100) {
          const cleanedNode = utils.sanitizeDomNode ? utils.sanitizeDomNode(el) : el.cloneNode(true);
          descriptionHtml = cleanedNode.innerHTML;
          descriptionText = utils.elementToStructuredText
            ? utils.elementToStructuredText(cleanedNode)
            : cleanedNode.textContent.trim();
          matchedSelectors.push(sel);
          break;
        }
      }
    }

    // Fallback to JSON-LD description if text is still empty
    if (!descriptionText && ldData && ldData.description) {
      descriptionText = utils.cleanText(ldData.description);
      descriptionHtml = `<p>${descriptionText}</p>`;
    }

    // Application Deadline
    const applicationDeadline = utils.extractDeadline ? utils.extractDeadline(document, ldData) : null;
    if (applicationDeadline) {
      matchedSelectors.push("deadline");
    }

    return {
      source_url: canonicalUrl,
      source_portal: "justjoin",
      title: title || (document.title ? document.title.split("-")[0].trim() : "Oferta pracy"),
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
        extra_info: "Extracted via JustJoinIT strategy",
      },
    };
  }

  return extractJustJoin;
});
