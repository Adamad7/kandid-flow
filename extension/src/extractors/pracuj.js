/**
 * KandidFlow — Pracuj.pl Extractor Strategy
 * Targets: *.pracuj.pl
 */

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.KandidFlow = root.KandidFlow || {};
    root.KandidFlow.extractors = root.KandidFlow.extractors || {};
    root.KandidFlow.extractors.pracuj = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const VERSION = "1.2.0";

  function extractPracuj() {
    const utils = (window.KandidFlow && window.KandidFlow.utils) || {};
    const matchedSelectors = [];

    // 0. Next.js SSR dehydratedState extraction
    let nextOfferData = null;
    try {
      const nextScript = document.getElementById("__NEXT_DATA__");
      if (nextScript && nextScript.textContent) {
        const parsed = JSON.parse(nextScript.textContent);
        const queries =
          (parsed.props &&
            parsed.props.pageProps &&
            parsed.props.pageProps.dehydratedState &&
            parsed.props.pageProps.dehydratedState.queries) ||
          [];
        for (const q of queries) {
          if (q && Array.isArray(q.queryKey) && q.queryKey[0] === "jobOffer") {
            nextOfferData = q.state && q.state.data;
            matchedSelectors.push('#__NEXT_DATA__[jobOffer]');
            break;
          }
        }
      }
    } catch {
      // Non-blocking
    }

    // JSON-LD fallback
    const ldData = utils.getJobPostingJsonLd ? utils.getJobPostingJsonLd(document) : null;
    if (ldData) {
      matchedSelectors.push('script[type="application/ld+json"]');
    }

    // Canonical URL
    let canonicalUrl = "";
    if (nextOfferData && nextOfferData.attributes && nextOfferData.attributes.offerAbsoluteUrl) {
      canonicalUrl = utils.canonicalizeUrl
        ? utils.canonicalizeUrl(nextOfferData.attributes.offerAbsoluteUrl)
        : nextOfferData.attributes.offerAbsoluteUrl;
    } else if (utils.getCanonicalUrl) {
      canonicalUrl = utils.getCanonicalUrl(document, window.location.href);
    } else {
      canonicalUrl = utils.canonicalizeUrl ? utils.canonicalizeUrl(window.location.href) : window.location.href;
    }

    // 1. Role Title
    let title = null;
    const titleCandidates = [
      'h1[data-test="text-positionName"]',
      '[data-test="text-positionName"]',
      'h1.offer-view__title',
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
    if (!title && nextOfferData && nextOfferData.attributes && nextOfferData.attributes.jobTitle) {
      title = utils.cleanText(nextOfferData.attributes.jobTitle);
    }
    if (!title && ldData && ldData.title) {
      title = utils.cleanText(ldData.title);
    }
    if (!title && document.title) {
      title = utils.cleanText(document.title.split("-")[0]);
    }

    // 2. Company Name
    let company = null;
    const companyCandidates = [
      'h2[data-test="text-employerName"]',
      '[data-test="anchor-employer"]',
      '[data-test="text-employerName"]',
      'h2.offer-view__employer-name',
      '[data-test="text-companyName"]',
    ];
    for (const sel of companyCandidates) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) {
        // Clone and strip child anchor tags (like 'O firmie')
        const clone = el.cloneNode(true);
        const childAnchors = clone.querySelectorAll("a, button");
        childAnchors.forEach((a) => a.remove());
        const cleanedText = utils.cleanText(clone.textContent);
        if (cleanedText) {
          company = cleanedText;
          matchedSelectors.push(sel);
          break;
        }
      }
    }
    if (!company && nextOfferData && nextOfferData.attributes && nextOfferData.attributes.displayEmployerName) {
      company = utils.cleanText(nextOfferData.attributes.displayEmployerName);
    }
    if (!company && ldData && ldData.hiringOrganization) {
      const org = ldData.hiringOrganization;
      company = utils.cleanText(typeof org === "string" ? org : org.name);
    }

    // 3. Salary
    let salaryRaw = null;
    let salaryMin = null;
    let salaryMax = null;
    let salaryCurrency = "PLN";

    const salaryCandidates = [
      '[data-test="text-earningAmount"]',
      'span[data-test="text-salary"]',
      '[data-test="section-salary"]',
      'div.offer-view__salary',
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

    // Fallback to Next.js data salary
    if (!salaryRaw && nextOfferData && nextOfferData.attributes && nextOfferData.attributes.employment) {
      const contracts = nextOfferData.attributes.employment.typesOfContracts || [];
      for (const c of contracts) {
        if (c && c.salary && typeof c.salary === "object") {
          salaryMin = c.salary.from || null;
          salaryMax = c.salary.to || null;
          if (c.salary.currency && c.salary.currency.code) {
            salaryCurrency = c.salary.currency.code;
          }
          if (salaryMin && salaryMax && salaryMin !== salaryMax) {
            salaryRaw = `${salaryMin} - ${salaryMax} ${salaryCurrency}`;
          } else if (salaryMin) {
            salaryRaw = `${salaryMin} ${salaryCurrency}`;
          }
          break;
        }
      }
    }

    // Fallback to JSON-LD baseSalary
    if (!salaryRaw && ldData && ldData.baseSalary) {
      const bs = ldData.baseSalary;
      salaryMin = bs.minValue || bs.value || null;
      salaryMax = bs.maxValue || bs.value || null;
      salaryCurrency = bs.currency || "PLN";
      if (salaryMin && salaryMax && salaryMin !== salaryMax) {
        salaryRaw = `${salaryMin} - ${salaryMax} ${salaryCurrency}`;
      } else if (salaryMin) {
        salaryRaw = `${salaryMin} ${salaryCurrency}`;
      }
    }

    // 4. Work Model & Locations
    let workModel = null;
    let workModelDetails = null;
    const locations = [];
    let locationRaw = null;

    // Scan badges (offer-badge-title)
    const badgeElements = document.querySelectorAll('[data-test="offer-badge-title"]');
    if (badgeElements.length > 0) {
      matchedSelectors.push('[data-test="offer-badge-title"]');
      badgeElements.forEach((badge) => {
        // Clone badge to format description cleanly with comma
        const clone = badge.cloneNode(true);
        const descEl = clone.querySelector('[data-test="offer-badge-description"]');
        let descText = "";
        if (descEl) {
          descText = utils.cleanText(descEl.textContent);
          descEl.remove();
        }
        const mainBadgeText = utils.cleanText(clone.textContent);
        const fullBadgeText = descText ? `${mainBadgeText}, ${descText}` : mainBadgeText;

        const detected = utils.detectWorkModel ? utils.detectWorkModel(fullBadgeText) : null;
        if (detected && !workModel) {
          workModel = detected;
          workModelDetails = mainBadgeText;
        }

        // Location badge detection (contains province description or matches location pattern)
        if (descText && !locationRaw) {
          locationRaw = mainBadgeText;
        }
      });
    }

    // Next.js workplaces check
    if (nextOfferData && nextOfferData.attributes) {
      const workplaces = nextOfferData.attributes.workplaces || [];
      workplaces.forEach((wp) => {
        const addr = wp.displayAddress;
        if (addr && !locationRaw) {
          locationRaw = addr;
        }
        const city = (wp.inlandLocation && wp.inlandLocation.location && wp.inlandLocation.location.name) || (addr ? addr.split(",").pop().trim() : null);
        if (city && !locations.includes(city)) {
          locations.push(city);
        }
      });

      // Next.js work modes check
      if (!workModel && nextOfferData.attributes.employment) {
        const modes = nextOfferData.attributes.employment.workModes || [];
        for (const m of modes) {
          const detected = utils.detectWorkModel ? utils.detectWorkModel(m.name || m.code) : null;
          if (detected) {
            workModel = detected;
            workModelDetails = m.name || m.code;
            break;
          }
        }
      }
    }

    // JSON-LD fallback for location
    if (!locationRaw && ldData && ldData.jobLocation) {
      const locName = ldData.jobLocation.name || (ldData.jobLocation.address && ldData.jobLocation.address.addressLocality);
      if (locName) {
        locationRaw = locName;
        locations.push(locName);
      }
    }

    if (locationRaw) {
      const parts = locationRaw
        .split(/[,;/+]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 1 && !/^\d+/.test(s));
      locations.push(...parts);
      if (!workModel && utils.detectWorkModel) {
        workModel = utils.detectWorkModel(locationRaw);
      }
    }

    // 5. Requirements & Technologies
    const requirements = [];

    // Scan requirement and technology sections
    const reqSectionSelectors = [
      'section[data-test="section-requirements"]',
      'section[data-test="section-technologies"]',
      'section[data-test="section-technologies-expected"]',
      'section[data-test="section-requirements-expected"]',
      'section[data-test="section-requirements-optional"]',
    ];
    reqSectionSelectors.forEach((sel) => {
      const secs = document.querySelectorAll(sel);
      secs.forEach((sec) => {
        matchedSelectors.push(sel);
        const bullets = sec.querySelectorAll('[data-test="text-bullet"], li');
        bullets.forEach((b) => {
          const txt = utils.cleanText(b.textContent);
          if (txt && txt.length > 1 && txt.length < 350 && !requirements.includes(txt)) {
            requirements.push(txt);
          }
        });
      });
    });

    // Technology badges/chips
    const techItems = document.querySelectorAll(
      '[data-test="item-technologies-expected"], [data-test="it-technologies"] div'
    );
    techItems.forEach((item) => {
      const txt = utils.cleanText(item.textContent);
      if (txt && txt.length > 1 && txt.length < 60 && !requirements.includes(txt)) {
        requirements.push(txt);
      }
    });

    // Next.js secondaryAttributes technologies
    if (requirements.length === 0 && nextOfferData && Array.isArray(nextOfferData.secondaryAttributes)) {
      for (const attr of nextOfferData.secondaryAttributes) {
        if (attr && attr.model && Array.isArray(attr.model.items)) {
          for (const item of attr.model.items) {
            if (item && item.name && !requirements.includes(item.name)) {
              requirements.push(item.name);
            }
          }
        }
      }
    }

    // 6. Job Description Container
    // In modern Pracuj.pl, offer sections are individual <section data-test="section-...">
    let descriptionHtml = null;
    let descriptionText = "";

    const offerSections = document.querySelectorAll(
      'section[data-test^="section-"], div[data-test="work-conditions"]'
    );

    if (offerSections.length > 0) {
      matchedSelectors.push('section[data-test^="section-"]');
      const descParts = [];
      const htmlParts = [];

      offerSections.forEach((sec) => {
        const testAttr = sec.getAttribute("data-test") || "";
        // Exclude pure advertising, corporate media, benefits or share banners
        if (
          testAttr === "section-benefits" ||
          testAttr === "section-media" ||
          testAttr === "section-sharing" ||
          testAttr === "section-recommendations" ||
          testAttr === "section-about-us"
        ) {
          return;
        }

        const titleEl = sec.querySelector('[data-test="text-offer-section-title"], h2, h3');
        const secTitle = titleEl ? utils.cleanText(titleEl.textContent) : "";

        const cloned = utils.sanitizeDomNode ? utils.sanitizeDomNode(sec) : sec.cloneNode(true);
        htmlParts.push(cloned.outerHTML);

        // Format into readable structured text
        const bullets = cloned.querySelectorAll("li");
        if (bullets.length > 0) {
          const bulletLines = [];
          bullets.forEach((b) => {
            const bText = utils.cleanText(b.textContent);
            if (bText) bulletLines.push(`• ${bText}`);
          });
          if (secTitle) {
            descParts.push(`\n### ${secTitle}\n` + bulletLines.join("\n"));
          } else {
            descParts.push(bulletLines.join("\n"));
          }
        } else {
          const pEls = cloned.querySelectorAll("p");
          if (pEls.length > 0) {
            const pLines = [];
            pEls.forEach((p) => {
              const pText = utils.cleanText(p.textContent);
              if (pText) pLines.push(pText);
            });
            if (secTitle) {
              descParts.push(`\n### ${secTitle}\n` + pLines.join("\n\n"));
            } else {
              descParts.push(pLines.join("\n\n"));
            }
          } else {
            const sText = utils.cleanText(cloned.textContent);
            if (sText && sText.length > 20) {
              if (secTitle && !sText.startsWith(secTitle)) {
                descParts.push(`\n### ${secTitle}\n` + sText);
              } else {
                descParts.push(sText);
              }
            }
          }
        }
      });

      if (descParts.length > 0) {
        descriptionText = utils.cleanText(descParts.join("\n\n"));
        descriptionHtml = `<div>${htmlParts.join("\n")}</div>`;
      }
    }

    // Fallback if no sections matched
    if (!descriptionText) {
      const contentContainer = document.querySelector('[data-test="section-offer-content"], main, article');
      if (contentContainer) {
        const cloned = contentContainer.cloneNode(true);
        const sectionsToRemove = cloned.querySelectorAll(
          'section[data-test="section-benefits"], section[data-test="section-about-us"], section[data-test="section-recommendations"], footer, nav, [data-test="section-sharing"]'
        );
        sectionsToRemove.forEach((el) => el.remove());

        const sanitized = utils.sanitizeDomNode ? utils.sanitizeDomNode(cloned) : cloned;
        descriptionHtml = sanitized.innerHTML;
        descriptionText = utils.elementToStructuredText
          ? utils.elementToStructuredText(sanitized)
          : sanitized.textContent.trim();
      } else {
        descriptionText = document.body ? document.body.innerText.slice(0, 4000) : "";
      }
    }

    return {
      source_url: canonicalUrl,
      source_portal: "pracuj",
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
      requirements_raw: Array.from(new Set(requirements)),
      custom_metadata: {
        page_title: document.title,
        extracted_at: new Date().toISOString(),
        extractor_version: VERSION,
        raw_selectors: matchedSelectors,
        extra_info: "Extracted via Pracuj.pl strategy",
      },
    };
  }

  return extractPracuj;
});
