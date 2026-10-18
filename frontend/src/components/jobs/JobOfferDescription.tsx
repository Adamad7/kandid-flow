import React, { useState, useMemo } from "react";
import {
  FileText,
  Copy,
  Check,
  ExternalLink,
  Code,
  Eye,
  Building,
} from "lucide-react";
import type { JobOfferRead } from "../../types";
import { PORTAL_LABELS } from "../../lib/constants";
import { normalizeJobOfferUrl } from "../../lib/formatters";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

interface JobOfferDescriptionProps {
  job: JobOfferRead;
}

// Recognized section title patterns in plain text descriptions
const KNOWN_SECTION_KEYWORDS = [
  "o nas",
  "o firmie",
  "o kliencie",
  "kim jesteśmy",
  "about us",
  "about the company",
  "about the client",
  "role overview",
  "opis stanowiska",
  "twoje zadania",
  "twoje obowiązki",
  "zakres obowiązków",
  "odpowiedzialności",
  "responsibilities",
  "duties",
  "key responsibilities",
  "wymagania",
  "nasze wymagania",
  "wymagania konieczne",
  "wymagania mile widziane",
  "czego oczekujemy",
  "kogo szukamy",
  "requirements",
  "our requirements",
  "must have",
  "nice to have",
  "what we offer",
  "co oferujemy",
  "oferujemy",
  "benefity",
  "twoje korzyści",
  "perks and benefits",
  "benefits",
  "warunki współpracy",
  "model współpracy",
  "stos technologiczny",
  "technologie",
  "tech stack",
  "proces rekrutacyjny",
  "etapy rekrutacji",
  "recruitment process",
  "growth opportunities",
  "flexibility at work",
  "time to recharge",
  "making an impact",
  "why fujitsu?",
  "health and well-being",
];

// Helper to convert plain text with URLs into React nodes
const linkifyText = (text: string): React.ReactNode => {
  const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;
  const parts = text.split(urlRegex);

  if (parts.length === 1) {
    return text;
  }

  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 underline decoration-blue-300 dark:decoration-blue-700 hover:text-blue-800 dark:hover:text-blue-200 inline-flex items-center gap-0.5"
        >
          {part}
          <ExternalLink className="h-3 w-3 inline shrink-0" />
        </a>
      );
    }
    return part;
  });
};

// Safe DOM node to React element converter
function domNodeToReact(node: Node, key: string | number): React.ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || "";
    return text;
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement;
    const tagName = el.tagName.toLowerCase();

    // Drop unsafe or noisy elements completely
    const forbiddenTags = [
      "script",
      "style",
      "iframe",
      "object",
      "embed",
      "form",
      "input",
      "button",
      "textarea",
      "select",
      "noscript",
      "svg",
      "canvas",
      "meta",
      "link",
    ];
    if (forbiddenTags.includes(tagName)) {
      return null;
    }

    const children = Array.from(el.childNodes)
      .map((child, idx) => domNodeToReact(child, `${key}-${idx}`))
      .filter((child) => child !== null && child !== "");

    // Ignore empty paragraphs that only contained stripped elements or whitespace
    if (
      (tagName === "p" || tagName === "div") &&
      children.length === 0 &&
      !el.textContent?.trim()
    ) {
      return null;
    }

    switch (tagName) {
      case "h1":
        return (
          <h2
            key={key}
            className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mt-6 mb-3 pb-1.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2"
          >
            {children}
          </h2>
        );
      case "h2":
        return (
          <h3
            key={key}
            className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mt-5 mb-2.5 pb-1 border-b border-slate-100 dark:border-slate-800/60"
          >
            {children}
          </h3>
        );
      case "h3":
        return (
          <h4
            key={key}
            className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 mt-4 mb-2 flex items-center gap-2"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
            {children}
          </h4>
        );
      case "h4":
      case "h5":
      case "h6":
        return (
          <h5
            key={key}
            className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200 mt-3.5 mb-1.5"
          >
            {children}
          </h5>
        );
      case "p":
        return (
          <p
            key={key}
            className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-3.5 last:mb-0"
          >
            {children}
          </p>
        );
      case "ul":
        return (
          <ul key={key} className="space-y-1.5 my-3 pl-1">
            {children}
          </ul>
        );
      case "ol":
        return (
          <ol
            key={key}
            className="list-decimal space-y-1.5 my-3 pl-5 text-sm text-slate-700 dark:text-slate-300"
          >
            {children}
          </ol>
        );
      case "li":
        return (
          <li
            key={key}
            className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed"
          >
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-500 dark:bg-blue-400 shrink-0" />
            <div className="flex-1 min-w-0">{children}</div>
          </li>
        );
      case "strong":
      case "b":
        return (
          <strong
            key={key}
            className="font-semibold text-slate-900 dark:text-slate-100"
          >
            {children}
          </strong>
        );
      case "em":
      case "i":
        return (
          <em key={key} className="italic text-slate-800 dark:text-slate-200">
            {children}
          </em>
        );
      case "a": {
        const rawHref = el.getAttribute("href") || "";
        const isSafe = /^https?:\/\//i.test(rawHref) || /^mailto:/i.test(rawHref);
        if (!isSafe) {
          return <span key={key}>{children}</span>;
        }
        return (
          <a
            key={key}
            href={rawHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 underline decoration-blue-300 hover:text-blue-800 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-0.5"
          >
            {children}
            <ExternalLink className="h-3 w-3 inline shrink-0" />
          </a>
        );
      }
      case "blockquote":
        return (
          <blockquote
            key={key}
            className="border-l-3 border-blue-500/80 bg-blue-50/50 dark:bg-blue-950/20 pl-4 py-2 my-3 rounded-r text-sm text-slate-700 dark:text-slate-300 italic"
          >
            {children}
          </blockquote>
        );
      case "code":
        return (
          <code
            key={key}
            className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
          >
            {children}
          </code>
        );
      case "pre":
        return (
          <pre
            key={key}
            className="font-mono text-xs bg-slate-100 dark:bg-slate-900 p-3 rounded-lg overflow-x-auto my-3 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800"
          >
            {children}
          </pre>
        );
      case "hr":
        return (
          <hr
            key={key}
            className="my-5 border-slate-200 dark:border-slate-800"
          />
        );
      case "br":
        return <br key={key} />;
      default:
        // Generic wrapper (div, span, section, article)
        return <React.Fragment key={key}>{children}</React.Fragment>;
    }
  }

  return null;
}

// Plain text semantic block parser
interface TextBlock {
  type: "heading" | "bullet_list" | "paragraph";
  headingLevel?: 2 | 3;
  content?: string;
  items?: string[];
}

function parsePlainTextToBlocks(rawText: string): TextBlock[] {
  if (!rawText.trim()) return [];

  const rawLines = rawText.split(/\r?\n/);
  const blocks: TextBlock[] = [];

  let currentBullets: string[] = [];
  let currentParagraphLines: string[] = [];

  const flushBullets = () => {
    if (currentBullets.length > 0) {
      blocks.push({
        type: "bullet_list",
        items: [...currentBullets],
      });
      currentBullets = [];
    }
  };

  const flushParagraph = () => {
    if (currentParagraphLines.length > 0) {
      const joined = currentParagraphLines.join(" ").trim();
      if (joined) {
        blocks.push({
          type: "paragraph",
          content: joined,
        });
      }
      currentParagraphLines = [];
    }
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();

    // Empty line: boundary between blocks
    if (!line) {
      flushBullets();
      flushParagraph();
      continue;
    }

    // Check for Markdown headings (### or ## or #)
    const mdHeadingMatch = line.match(/^#{1,4}\s+(.+)$/);
    if (mdHeadingMatch) {
      flushBullets();
      flushParagraph();
      blocks.push({
        type: "heading",
        headingLevel: 2,
        content: mdHeadingMatch[1].trim(),
      });
      continue;
    }

    // Check for inline bullet lists (e.g. "• Item 1 • Item 2 • Item 3")
    if (line.includes("•")) {
      const parts = line
        .split(/(?:^|\s+)•\s*/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      if (parts.length > 0) {
        // If line started with non-bullet text before first bullet, flush as paragraph
        const firstPart = line.split("•")[0].trim();
        if (firstPart && !line.startsWith("•")) {
          flushParagraph();
          blocks.push({
            type: "heading",
            headingLevel: 3,
            content: firstPart,
          });
        }

        flushParagraph();
        for (const p of parts) {
          if (p !== firstPart || line.startsWith("•")) {
            currentBullets.push(p);
          }
        }
        continue;
      }
    }

    // Check for lines starting with bullet symbols: -, *, +, –
    const bulletMatch = line.match(/^[-*+–]\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      currentBullets.push(bulletMatch[1].trim());
      continue;
    }

    // Check for known heading keywords or lines ending with ':'
    const lower = line.toLowerCase().replace(/[:\s]+$/, "");
    const isKnownHeader =
      KNOWN_SECTION_KEYWORDS.includes(lower) ||
      (line.endsWith(":") && line.length < 65) ||
      (line.length < 40 &&
        !line.endsWith(".") &&
        /^[A-ZĄĆĘŁŃÓŚŹŻ0-9\s/&()-]+$/.test(line) &&
        line.length > 3);

    if (isKnownHeader) {
      flushBullets();
      flushParagraph();
      blocks.push({
        type: "heading",
        headingLevel: line.endsWith(":") ? 3 : 2,
        content: line.replace(/[:\s]+$/, ""),
      });
      continue;
    }

    // Regular text line: collect into current paragraph
    flushBullets();
    currentParagraphLines.push(line);
  }

  flushBullets();
  flushParagraph();

  return blocks;
}

export const JobOfferDescription: React.FC<JobOfferDescriptionProps> = ({
  job,
}) => {
  const [viewMode, setViewMode] = useState<"formatted" | "raw">("formatted");
  const [copied, setCopied] = useState(false);

  const rawPayload = job.raw_payload;
  const descriptionHtml = rawPayload?.description_html?.trim();
  const descriptionText = (rawPayload?.description_text || "").trim();

  // Parse HTML into React elements if available
  const parsedHtmlContent = useMemo(() => {
    if (!descriptionHtml) return null;
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(descriptionHtml, "text/html");
      const body = doc.body;

      // Extract all top-level child elements
      const elements = Array.from(body.childNodes)
        .map((node, idx) => domNodeToReact(node, `html-node-${idx}`))
        .filter((el) => el !== null && el !== "");

      return elements.length > 0 ? elements : null;
    } catch {
      return null;
    }
  }, [descriptionHtml]);

  // Parse plain text blocks as fallback or primary text representation
  const plainTextBlocks = useMemo(() => {
    return parsePlainTextToBlocks(descriptionText);
  }, [descriptionText]);

  // Copy offer description text to clipboard
  const handleCopy = async () => {
    const textToCopy = descriptionText || descriptionHtml || "";
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Word count calculation
  const wordCount = useMemo(() => {
    if (!descriptionText) return 0;
    return descriptionText.split(/\s+/).filter(Boolean).length;
  }, [descriptionText]);

  const hasContent = Boolean(descriptionHtml || descriptionText);

  if (!hasContent) {
    return (
      <div className="py-12 px-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center bg-slate-50/50 dark:bg-slate-900/40">
        <FileText className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Brak oryginalnej treści ogłoszenia
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          Dla tej oferty nie zarejestrowano jeszcze pełnego tekstu ogłoszenia z
          portalu źródłowego.
        </p>
        {job.source_url && (
          <div className="mt-4">
            <a
              href={normalizeJobOfferUrl(job.source_url)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Przejdź do oferty na stronie źródłowej
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Action Bar / Info Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl shadow-xs">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {PORTAL_LABELS[job.source_portal] || job.source_portal}
          </Badge>
          {wordCount > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {wordCount.toLocaleString("pl-PL")} słów
            </span>
          )}
          {job.company_name && (
            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 font-medium">
              <Building className="h-3.5 w-3.5 text-slate-400" />
              {job.company_name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Formatted vs Raw View Switcher */}
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setViewMode("formatted")}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                viewMode === "formatted"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
              title="Widok z czytelnym formatowaniem tekstu"
            >
              <Eye className="h-3.5 w-3.5" />
              Sformatowany
            </button>
            <button
              type="button"
              onClick={() => setViewMode("raw")}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                viewMode === "raw"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
              title="Widok surowego tekstu"
            >
              <Code className="h-3.5 w-3.5" />
              Czysty tekst
            </button>
          </div>

          {/* Copy Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            className="text-xs h-7 px-2.5"
            title="Kopiuj całą treść ogłoszenia do schowka"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                Skopiowano!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 mr-1 text-slate-500" />
                Kopiuj
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content View */}
      {viewMode === "formatted" ? (
        <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 sm:p-8 shadow-xs">
          {parsedHtmlContent ? (
            // Render rich sanitized HTML structure
            <div className="space-y-1 text-slate-800 dark:text-slate-200">
              {parsedHtmlContent}
            </div>
          ) : plainTextBlocks.length > 0 ? (
            // Render smart structured plain text blocks
            <div className="space-y-4 text-slate-800 dark:text-slate-200">
              {plainTextBlocks.map((block, idx) => {
                if (block.type === "heading") {
                  if (block.headingLevel === 2) {
                    return (
                      <h3
                        key={idx}
                        className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mt-5 first:mt-0 pb-1 border-b border-slate-100 dark:border-slate-800/60"
                      >
                        {block.content}
                      </h3>
                    );
                  }
                  return (
                    <h4
                      key={idx}
                      className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-4 first:mt-0 flex items-center gap-2"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                      {block.content}
                    </h4>
                  );
                }

                if (block.type === "bullet_list" && block.items) {
                  return (
                    <ul key={idx} className="space-y-1.5 my-2.5 pl-1">
                      {block.items.map((item, bIdx) => (
                        <li
                          key={bIdx}
                          className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed"
                        >
                          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-500 dark:bg-blue-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            {linkifyText(item)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  );
                }

                if (block.type === "paragraph" && block.content) {
                  return (
                    <p
                      key={idx}
                      className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed"
                    >
                      {linkifyText(block.content)}
                    </p>
                  );
                }

                return null;
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400 italic">
              Brak sformatowanej treści opisu.
            </p>
          )}
        </div>
      ) : (
        // Raw Text View
        <div className="relative">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 p-5 text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed max-h-[650px] overflow-y-auto">
            {descriptionText || descriptionHtml || "Brak treści"}
          </div>
        </div>
      )}
    </div>
  );
};
