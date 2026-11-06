/**
 * KandidFlow — theprotocol.it Extractor Strategy
 * Targets: theprotocol.it
 */

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.KandidFlow = root.KandidFlow || {};
    root.KandidFlow.extractors = root.KandidFlow.extractors || {};
    root.KandidFlow.extractors.theprotocol = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const VERSION = "1.0.0";

  const DEFAULT_SECTION_TITLES = {
    "about-project": "O projekcie",
    "responsibilities": "Twój zakres obowiązków",
    "offered": "To oferujemy",
    "about-us-description": "O firmie",
    "additional-module": "Informacje dodatkowe",
  };

  /**
   * Builds a title lookup map from Next.js jsonSections.
   *
   * @param {Array} jsonSections - offer.jsonSections array
   * @returns {{ titles: Record<string, string>, additionalModuleTitles: string[] }}
   */
  function extractJsonSectionTitles(jsonSections) {
    const titles = {};
    const additionalModuleTitles = [];
    if (!Array.isArray(jsonSections)) {
      return { titles, additionalModuleTitles };
    }

    for (const sec of jsonSections) {
      if (!sec) continue;
      if (sec.sectionType === "additional-module" && sec.title) {
        additionalModuleTitles.push(sec.title);
      } else if (sec.sectionType && sec.title) {
        titles[sec.sectionType] = sec.title;
      }

      if (Array.isArray(sec.subSections)) {
        for (const sub of sec.subSections) {
          if (sub && sub.sectionType && sub.title) {
            titles[sub.sectionType] = sub.title;
          }
        }
      }
    }

    return { titles, additionalModuleTitles };
  }

  function extractTheprotocol() {
    const utils = (window.KandidFlow && window.KandidFlow.utils) || {};
    const matchedSelectors = [];

    // 0. Primary: Next.js __NEXT_DATA__ offer inspection
    let nextOffer = null;
    try {
      const nextScript = document.getElementById("__NEXT_DATA__");
      if (nextScript && nextScript.textContent) {
        const parsed = JSON.parse(nextScript.textContent);
        if (
          parsed &&
          parsed.props &&
          parsed.props.pageProps &&
          parsed.props.pageProps.offer
        ) {
          nextOffer = parsed.props.pageProps.offer;
          matchedSelectors.push("#__NEXT_DATA__[offer]");
        }
      }
    } catch {
      // Non-blocking fallback
    }

    // JSON-LD fallback context
    const ldData = utils.getJobPostingJsonLd ? utils.getJobPostingJsonLd(document) : null;
    if (ldData) {
      matchedSelectors.push('script[type="application/ld+json"]');
    }

    // Canonical URL
    let canonicalUrl = "";
    if (nextOffer && nextOffer.offerUrl) {
      canonicalUrl = utils.canonicalizeUrl
        ? utils.canonicalizeUrl(nextOffer.offerUrl)
        : nextOffer.offerUrl;
    } else if (utils.getCanonicalUrl) {
      canonicalUrl = utils.getCanonicalUrl(document, window.location.href);
    } else {
      canonicalUrl = utils.canonicalizeUrl
        ? utils.canonicalizeUrl(window.location.href)
        : window.location.href;
    }

    // 1. Role Title
    let title = null;
    if (
      nextOffer &&
      nextOffer.attributes &&
      nextOffer.attributes.title &&
      nextOffer.attributes.title.value
    ) {
      title = utils.cleanText(nextOffer.attributes.title.value);
    }

    if (!title) {
      const titleCandidates = [
        'h1[data-test="text-offerTitle"]',
        '[data-test="text-offerTitle"]',
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
    }

    if (!title && ldData && ldData.title) {
      title = utils.cleanText(ldData.title);
    }

    if (!title && document.title) {
      const cleanTitle = document.title.split("-")[0].replace(/^Praca\s+/i, "");
      title = utils.cleanText(cleanTitle.split(",")[0]);
    }

    // 2. Company Name
    let company = null;
    if (
      nextOffer &&
      nextOffer.attributes &&
      nextOffer.attributes.employer &&
      nextOffer.attributes.employer.name
    ) {
      company = utils.cleanText(nextOffer.attributes.employer.name);
    }

    if (!company) {
      const companyCandidates = [
        '[data-test="anchor-company-link"]',
        'h2[data-test="text-offerEmployer"]',
        '[data-test="text-offerEmployer"]',
      ];
      for (const sel of companyCandidates) {
        const el = document.querySelector(sel);
        if (el && el.textContent.trim()) {
          const clone = el.cloneNode(true);
          const helperSpans = clone.querySelectorAll("span");
          helperSpans.forEach((sp) => {
            if (/^firma/i.test(sp.textContent.trim())) sp.remove();
          });
          const text = utils.cleanText(clone.textContent).replace(/^Firma\s*:\s*/i, "").trim();
          if (text) {
            company = text;
            matchedSelectors.push(sel);
            break;
          }
        }
      }
    }

    if (!company && ldData && ldData.hiringOrganization) {
      const org = ldData.hiringOrganization;
      company = utils.cleanText(typeof org === "string" ? org : org.name);
    }

    // 3. Workplaces & Locations
    let locationRaw = null;
    const locations = [];

    if (
      nextOffer &&
      nextOffer.attributes &&
      Array.isArray(nextOffer.attributes.workplaces)
    ) {
      for (const wp of nextOffer.attributes.workplaces) {
        if (!wp) continue;
        if (wp.city && !locations.includes(wp.city)) {
          locations.push(wp.city);
        }
        if (wp.location) {
          const cityPart = wp.location.split(",")[0].trim();
          if (cityPart && !locations.includes(cityPart)) {
            locations.push(cityPart);
          }
        }
        if (!locationRaw) {
          if (wp.address && (wp.location || wp.city)) {
            locationRaw = `${wp.address}, ${wp.location || wp.city}`;
          } else {
            locationRaw = wp.location || wp.city || wp.address || null;
          }
        }
      }
    }

    if (!locationRaw) {
      const locCandidates = [
        '[data-test="text-primaryLocation"]',
        '[data-test="text-workplaceAddress"]',
        '[data-test="section-workplace"]',
      ];
      for (const sel of locCandidates) {
        const el = document.querySelector(sel);
        if (el && el.textContent.trim()) {
          const clone = el.cloneNode(true);
          const buttons = clone.querySelectorAll("button, svg");
          buttons.forEach((b) => b.remove());
          const text = utils.cleanText(clone.textContent);
          if (text) {
            locationRaw = text;
            matchedSelectors.push(sel);
            break;
          }
        }
      }
    }

    if (!locationRaw && ldData && ldData.jobLocation) {
      const loc = ldData.jobLocation;
      const addr = loc.address || {};
      const city = addr.addressLocality || loc.name;
      const street = addr.streetAddress;
      if (street && city) locationRaw = `${street}, ${city}`;
      else if (city) locationRaw = city;
    }

    if (locations.length === 0 && locationRaw) {
      const parts = locationRaw
        .split(/[,;/+]+/)
        .map((s) => (utils.cleanLocationText ? utils.cleanLocationText(s) : s.trim()))
        .filter((s) => s.length > 1 && !/^\d+/.test(s));
      for (const p of parts) {
        if (!locations.includes(p)) locations.push(p);
      }
    }

    // 4. Work Model & Details
    let workModel = null;
    let workModelDetails = null;

    if (
      nextOffer &&
      nextOffer.attributes &&
      nextOffer.attributes.employment
    ) {
      const detailedModes =
        nextOffer.attributes.employment.detailedWorkModes || [];
      for (const m of detailedModes) {
        if (!m) continue;
        const code = (m.code || "").toLowerCase();
        if (code === "full-remote" || code.includes("remote")) {
          workModel = "remote";
        } else if (code === "hybrid" || code.includes("hybrid")) {
          workModel = "hybrid";
        } else if (
          code === "full-office" ||
          code.includes("office") ||
          code.includes("onsite")
        ) {
          workModel = "onsite";
        } else if (m.name && utils.detectWorkModel) {
          workModel = utils.detectWorkModel(m.name);
        }

        if (m.description && m.description.trim()) {
          workModelDetails = utils.cleanText(m.description);
        } else if (
          m.name &&
          utils.hasWorkModelDetails &&
          utils.hasWorkModelDetails(m.name)
        ) {
          workModelDetails = utils.cleanText(m.name);
        }

        if (workModel) break;
      }
    }

    if (!workModel) {
      const workModeCandidates = [
        '[data-test="content-workModes"]',
        '[data-test="section-workModes"]',
        '[data-test="text-workModes"]',
      ];
      for (const sel of workModeCandidates) {
        const el = document.querySelector(sel);
        if (el && el.textContent.trim()) {
          const text = utils.cleanText(el.textContent);
          const detected = utils.detectWorkModel
            ? utils.detectWorkModel(text)
            : null;
          if (detected) {
            workModel = detected;
            matchedSelectors.push(sel);
            if (
              utils.hasWorkModelDetails &&
              utils.hasWorkModelDetails(text)
            ) {
              workModelDetails = text;
            }
            break;
          }
        }
      }
    }

    if (!workModel && locationRaw && utils.detectWorkModel) {
      workModel = utils.detectWorkModel(locationRaw);
    }

    // 5. Salary
    let salaryRaw = null;
    let salaryMin = null;
    let salaryMax = null;
    let salaryCurrency = "PLN";
    let salaryPeriod = "month";

    if (
      nextOffer &&
      nextOffer.attributes &&
      nextOffer.attributes.employment
    ) {
      const contracts =
        nextOffer.attributes.employment.typesOfContracts || [];
      for (const c of contracts) {
        if (c && c.salary && typeof c.salary === "object") {
          salaryMin =
            typeof c.salary.from === "number"
              ? Math.round(c.salary.from)
              : null;
          salaryMax =
            typeof c.salary.to === "number"
              ? Math.round(c.salary.to)
              : null;

          const rawCurr = c.salary.currencyCode || "PLN";
          if (rawCurr === "zł" || rawCurr === "PLN") salaryCurrency = "PLN";
          else if (rawCurr === "€" || rawCurr === "EUR") salaryCurrency = "EUR";
          else if (rawCurr === "$" || rawCurr === "USD") salaryCurrency = "USD";
          else if (rawCurr === "£" || rawCurr === "GBP") salaryCurrency = "GBP";
          else if (rawCurr === "CHF") salaryCurrency = "CHF";
          else salaryCurrency = rawCurr;

          const timeUnitShort =
            c.salary.timeUnit && c.salary.timeUnit.shortForm
              ? c.salary.timeUnit.shortForm.toLowerCase()
              : "";
          if (
            timeUnitShort.includes("godz") ||
            timeUnitShort.includes("hr") ||
            timeUnitShort.includes("h")
          ) {
            salaryPeriod = "hour";
          } else if (
            timeUnitShort.includes("dzie") ||
            timeUnitShort.includes("day")
          ) {
            salaryPeriod = "day";
          } else {
            salaryPeriod = "month";
          }

          const kind = c.salary.kindCode ? ` ${c.salary.kindCode}` : "";
          const unit =
            c.salary.timeUnit && c.salary.timeUnit.shortForm
              ? ` / ${c.salary.timeUnit.shortForm}`
              : "";
          const curr = c.salary.currencyCode || salaryCurrency;

          if (salaryMin && salaryMax && salaryMin !== salaryMax) {
            salaryRaw = `${salaryMin} - ${salaryMax} ${curr}${kind}${unit}`;
          } else if (salaryMin) {
            salaryRaw = `${salaryMin} ${curr}${kind}${unit}`;
          } else if (salaryMax) {
            salaryRaw = `${salaryMax} ${curr}${kind}${unit}`;
          }
          break;
        }
      }
    }

    if (!salaryRaw && !salaryMin && !salaryMax) {
      const salaryCandidates = [
        '[data-test="text-contractSalary"]',
        '[data-test="text-salary-value"]',
        '[data-test="section-contract"]',
      ];
      for (const sel of salaryCandidates) {
        const el = document.querySelector(sel);
        if (el && el.textContent.trim()) {
          const text = el.textContent.trim();
          if (!/brak\s*widełek/i.test(text)) {
            const parsed = utils.parseSalary ? utils.parseSalary(text) : null;
            if (parsed && (parsed.min != null || parsed.max != null)) {
              salaryRaw = parsed.raw;
              salaryMin = parsed.min;
              salaryMax = parsed.max;
              salaryCurrency = parsed.currency || "PLN";
              salaryPeriod = parsed.period || "month";
              matchedSelectors.push(sel);
              break;
            }
          }
        }
      }
    }

    // 6. Technologies (tech_stack_raw)
    const techStack = [];
    if (nextOffer && nextOffer.technologies) {
      const groups = [
        nextOffer.technologies.expected,
        nextOffer.technologies.optional,
        nextOffer.technologies.os,
      ];
      for (const grp of groups) {
        if (Array.isArray(grp)) {
          for (const item of grp) {
            const name =
              typeof item === "string" ? item : (item && item.name);
            const cleanName = name ? utils.cleanText(name) : "";
            if (cleanName && !techStack.includes(cleanName)) {
              techStack.push(cleanName);
            }
          }
        }
      }
    }

    if (techStack.length === 0) {
      const techChips = document.querySelectorAll(
        '[data-test="chip-technology"]'
      );
      if (techChips.length > 0) {
        matchedSelectors.push('[data-test="chip-technology"]');
        techChips.forEach((chip) => {
          const cleanName = utils.cleanText(
            chip.textContent || chip.getAttribute("title") || ""
          );
          if (cleanName && !techStack.includes(cleanName)) {
            techStack.push(cleanName);
          }
        });
      }
    }

    // 7. Requirements (requirements_raw)
    const requirements = [];
    if (nextOffer && Array.isArray(nextOffer.textSections)) {
      for (const sec of nextOffer.textSections) {
        if (
          sec.type === "requirements-expected" ||
          sec.type === "requirements-optional"
        ) {
          if (Array.isArray(sec.elements)) {
            for (const el of sec.elements) {
              const cleanReq = utils.cleanText(el);
              if (
                cleanReq &&
                cleanReq.length > 1 &&
                !requirements.includes(cleanReq)
              ) {
                requirements.push(cleanReq);
              }
            }
          }
        }
      }
    }

    if (requirements.length === 0) {
      const reqSelectors = [
        '[data-test="section-requirements-expected"] li',
        '[data-test="section-requirements-optional"] li',
        '[data-test="section-requirements"] li',
      ];
      for (const sel of reqSelectors) {
        const items = document.querySelectorAll(sel);
        if (items.length > 0) {
          matchedSelectors.push(sel);
          items.forEach((item) => {
            const cleanReq = utils.cleanText(item.textContent);
            if (
              cleanReq &&
              cleanReq.length > 1 &&
              !requirements.includes(cleanReq)
            ) {
              requirements.push(cleanReq);
            }
          });
        }
      }
    }

    // 8. Description (description_text & description_html)
    let descriptionText = "";
    let descriptionHtml = null;

    if (nextOffer && Array.isArray(nextOffer.textSections)) {
      const { titles: jsonTitles, additionalModuleTitles } =
        extractJsonSectionTitles(nextOffer.jsonSections);

      let addModuleIdx = 0;
      const descTextParts = [];
      const descHtmlParts = [];

      const allowedTypes = new Set([
        "about-project",
        "responsibilities",
        "offered",
        "about-us-description",
        "additional-module",
      ]);

      for (const sec of nextOffer.textSections) {
        if (!sec || !allowedTypes.has(sec.type)) continue;

        let sectionTitle = "";
        if (sec.type === "additional-module") {
          if (addModuleIdx < additionalModuleTitles.length) {
            sectionTitle = additionalModuleTitles[addModuleIdx++];
          } else if (sec.plainText) {
            sectionTitle = sec.plainText.split(",")[0].trim();
          }
          if (!sectionTitle) {
            sectionTitle = DEFAULT_SECTION_TITLES["additional-module"];
          }
        } else if (sec.type === "about-us-description") {
          sectionTitle =
            jsonTitles["about-us-description"] ||
            company ||
            DEFAULT_SECTION_TITLES["about-us-description"];
        } else {
          sectionTitle =
            jsonTitles[sec.type] ||
            DEFAULT_SECTION_TITLES[sec.type] ||
            "";
        }

        const elements = (sec.elements || [])
          .map((e) => utils.cleanText(e))
          .filter((e) => e.length > 0);

        if (elements.length === 0) continue;

        const isBulleted =
          sec.type === "responsibilities" || sec.type === "offered";

        // Plain text / markdown lines
        const textLines = [];
        if (sectionTitle) textLines.push(`### ${sectionTitle}`);

        if (isBulleted) {
          for (const item of elements) {
            textLines.push(`• ${item}`);
          }
        } else {
          for (const item of elements) {
            textLines.push(item);
          }
        }
        descTextParts.push(textLines.join("\n"));

        // Semantic HTML lines
        let secHtml = "<section>";
        if (sectionTitle) secHtml += `<h3>${sectionTitle}</h3>`;
        if (isBulleted) {
          secHtml +=
            "<ul>" +
            elements.map((e) => `<li>${e}</li>`).join("") +
            "</ul>";
        } else {
          secHtml += elements.map((e) => `<p>${e}</p>`).join("");
        }
        secHtml += "</section>";
        descHtmlParts.push(secHtml);
      }

      if (descTextParts.length > 0) {
        descriptionText = descTextParts.join("\n\n");
        descriptionHtml = `<div>${descHtmlParts.join("\n")}</div>`;
      }
    }

    // Fallback: DOM offer sections
    if (!descriptionText) {
      const offerDomSections = document.querySelectorAll(
        '[data-test="section-about-project"], [data-test="section-responsibilities"], [data-test="section-offered"], [data-test="section-additional-module"], [data-test="section-about-us-description"]'
      );

      if (offerDomSections.length > 0) {
        matchedSelectors.push('section[data-test^="section-"]');
        const descParts = [];
        const htmlParts = [];

        offerDomSections.forEach((sec) => {
          const titleEl = sec.querySelector(
            '[data-test="text-offer-section-title"], h2, h3'
          );
          const secTitle = titleEl ? utils.cleanText(titleEl.textContent) : "";

          const cloned = utils.sanitizeDomNode
            ? utils.sanitizeDomNode(sec)
            : sec.cloneNode(true);
          htmlParts.push(cloned.outerHTML);

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
            const pEls = cloned.querySelectorAll(
              '[data-test="text-sectionItem"], p'
            );
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
    }

    if (!descriptionText) {
      const contentContainer = document.querySelector(
        '[data-test="section-offer-content"], main, article'
      );
      if (contentContainer) {
        const cloned = contentContainer.cloneNode(true);
        const sectionsToRemove = cloned.querySelectorAll(
          '[data-test="section-benefits"], [data-test="section-seo"], footer, nav, [data-test="section-sharing"], [data-test="section-cookieModal"]'
        );
        sectionsToRemove.forEach((el) => el.remove());

        const sanitized = utils.sanitizeDomNode
          ? utils.sanitizeDomNode(cloned)
          : cloned;
        descriptionHtml = sanitized.innerHTML;
        descriptionText = utils.elementToStructuredText
          ? utils.elementToStructuredText(sanitized)
          : sanitized.textContent.trim();
      } else {
        descriptionText = document.body
          ? document.body.innerText.slice(0, 4000)
          : "";
      }
    }

    // 9. Application Deadline
    let applicationDeadline = null;
    if (
      nextOffer &&
      nextOffer.publicationDetails &&
      nextOffer.publicationDetails.archivizationDateUtc
    ) {
      applicationDeadline = utils.normalizeDateToIso
        ? utils.normalizeDateToIso(
            nextOffer.publicationDetails.archivizationDateUtc
          )
        : nextOffer.publicationDetails.archivizationDateUtc.split("T")[0];
      if (applicationDeadline) {
        matchedSelectors.push("publicationDetails.archivizationDateUtc");
      }
    }

    if (!applicationDeadline) {
      const expEl = document.querySelector('[data-test="text-expirationDate"]');
      if (expEl && expEl.textContent.trim()) {
        const norm = utils.normalizeDateToIso
          ? utils.normalizeDateToIso(expEl.textContent)
          : null;
        if (norm) {
          applicationDeadline = norm;
          matchedSelectors.push('[data-test="text-expirationDate"]');
        }
      }
    }

    if (!applicationDeadline) {
      applicationDeadline = utils.extractDeadline
        ? utils.extractDeadline(document, ldData)
        : null;
      if (applicationDeadline) {
        matchedSelectors.push("deadline");
      }
    }

    return {
      source_url: canonicalUrl,
      source_portal: "theprotocol",
      title:
        title ||
        (document.title ? document.title.split("-")[0].trim() : "Oferta pracy"),
      company: company,
      location_raw: locationRaw,
      locations:
        locations.length > 0
          ? Array.from(new Set(locations))
          : locationRaw
          ? [locationRaw]
          : [],
      work_model: workModel,
      work_model_details: workModelDetails,
      salary_raw: salaryRaw,
      salary_min: salaryMin,
      salary_max: salaryMax,
      salary_currency: salaryCurrency,
      salary_period: salaryPeriod,
      description_html: descriptionHtml,
      description_text: descriptionText,
      requirements_raw: Array.from(new Set(requirements)),
      tech_stack_raw: Array.from(new Set(techStack)),
      application_deadline: applicationDeadline,
      custom_metadata: {
        page_title: document.title,
        extracted_at: new Date().toISOString(),
        extractor_version: VERSION,
        raw_selectors: matchedSelectors,
        extra_info: "Extracted via theprotocol.it strategy",
      },
    };
  }

  return extractTheprotocol;
});
