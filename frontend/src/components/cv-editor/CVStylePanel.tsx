import React from "react";
import {
  RotateCcw,
  Type,
  AlignLeft,
  Maximize2,
  Sliders,
  Sparkles,
  Palette,
  Check,
  Plus,
  Minus,
} from "lucide-react";
import type { CVStyling, CVElementStyle, FontWeight } from "../../types";
import { Button } from "../ui/Button";
import { cn } from "../../lib/utils";

export interface CVStylePanelProps {
  styling: CVStyling;
  onChange: (styling: CVStyling) => void;
}

export const ACCENT_COLOR_PRESETS = [
  { name: "Niebieski (domyślny)", label: "Niebieski", hex: "#2563eb" },
  { name: "Indygo", label: "Indygo", hex: "#4f46e5" },
  { name: "Szmaragdowy", label: "Szmaragdowy", hex: "#059669" },
  { name: "Morski / Teal", label: "Morski", hex: "#0d9488" },
  { name: "Karminowy / Czerwony", label: "Karminowy", hex: "#dc2626" },
  { name: "Bursztynowy", label: "Bursztynowy", hex: "#d97706" },
  { name: "Grafitowy", label: "Grafitowy", hex: "#334155" },
  { name: "Ciemny / Czarny", label: "Ciemny", hex: "#111827" },
];

const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

const isValidHex = (hex?: string): boolean => {
  return typeof hex === "string" && HEX_COLOR_REGEX.test(hex);
};

const getValidPickerHex = (hex?: string): string => {
  if (!hex || typeof hex !== "string") return "#2563eb";
  if (/^#[0-9a-fA-F]{6}$/i.test(hex)) {
    return hex;
  }
  if (/^#[0-9a-fA-F]{3}$/i.test(hex)) {
    const r = hex[1];
    const g = hex[2];
    const b = hex[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return "#2563eb";
};

export const AVAILABLE_FONTS = [
  { value: "Liberation Sans", label: "Liberation Sans (Bezszeryfowa)" },
  { value: "Roboto", label: "Roboto (Nowoczesna bezszeryfowa)" },
  { value: "Open Sans", label: "Open Sans (Czytelna bezszeryfowa)" },
  { value: "Inter", label: "Inter (Neutralna bezszeryfowa)" },
  { value: "Lato", label: "Lato (Elegancka bezszeryfowa)" },
  { value: "Arial", label: "Arial (Standardowa bezszeryfowa)" },
  { value: "DejaVu Sans", label: "DejaVu Sans (Techniczna bezszeryfowa)" },
  { value: "Times New Roman", label: "Times New Roman (Klasyczna szeryfowa)" },
  { value: "Georgia", label: "Georgia (Elegancka szeryfowa)" },
  { value: "Liberation Serif", label: "Liberation Serif (Szeryfowa)" },
  { value: "Courier New", label: "Courier New (Monospace)" },
];

export const FONT_WEIGHTS: { value: FontWeight; label: string }[] = [
  { value: "regular", label: "Zwykła" },
  { value: "medium", label: "Średnia" },
  { value: "semibold", label: "Półgruba" },
  { value: "bold", label: "Pogrubiona" },
];

export const DEFAULT_CV_STYLING: CVStyling = {
  accent_color: "#2563eb",
  document_font_family: "Liberation Sans",
  full_name: { font_family: "Liberation Sans", font_size_pt: 18.0, font_weight: "bold" },
  job_title: { font_family: "Liberation Sans", font_size_pt: 11.0, font_weight: "semibold" },
  contact_info: { font_family: "Liberation Sans", font_size_pt: 8.5, font_weight: "regular" },
  section_headings: { font_family: "Liberation Sans", font_size_pt: 11.0, font_weight: "bold" },
  section_text: { font_family: "Liberation Sans", font_size_pt: 9.5, font_weight: "regular" },
  clause: { font_family: "Liberation Sans", font_size_pt: 7.0, font_weight: "regular" },
  heading_line_height_em: 0.65,
  section_text_line_height_em: 0.65,
  margin_x_cm: 1.8,
  margin_y_cm: 1.8,
  section_spacing_em: 0.6,
};

interface ElementConfigItem {
  key: keyof Pick<
    CVStyling,
    "full_name" | "job_title" | "contact_info" | "section_headings" | "section_text" | "clause"
  >;
  label: string;
  description: string;
  minPt: number;
  maxPt: number;
  stepPt: number;
}

const ELEMENT_CONFIGS: ElementConfigItem[] = [
  {
    key: "full_name",
    label: "Imię i nazwisko",
    description: "Główny nagłówek dokumentu",
    minPt: 12,
    maxPt: 32,
    stepPt: 0.5,
  },
  {
    key: "job_title",
    label: "Stanowisko / Nagłówek zawodowy",
    description: "Tytuł profesjonalny pod nazwiskiem",
    minPt: 8,
    maxPt: 18,
    stepPt: 0.5,
  },
  {
    key: "contact_info",
    label: "Dane kontaktowe",
    description: "E-mail, telefon, lokalizacja, linki",
    minPt: 6,
    maxPt: 12,
    stepPt: 0.5,
  },
  {
    key: "section_headings",
    label: "Nagłówki sekcji",
    description: "Tytuły bloków: Doświadczenie, Umiejętności itp.",
    minPt: 8,
    maxPt: 16,
    stepPt: 0.5,
  },
  {
    key: "section_text",
    label: "Treść sekcji",
    description: "Podstawowy tekst wpisów, opisów i punktów",
    minPt: 7,
    maxPt: 14,
    stepPt: 0.5,
  },
  {
    key: "clause",
    label: "Klauzula RODO",
    description: "Zgoda na przetwarzanie danych na dole strony",
    minPt: 5,
    maxPt: 10,
    stepPt: 0.5,
  },
];

export const CVStylePanel: React.FC<CVStylePanelProps> = ({
  styling,
  onChange,
}) => {
  // Ensure we have complete values even if some were omitted
  const currentStyling: CVStyling = {
    ...DEFAULT_CV_STYLING,
    ...styling,
    accent_color: styling?.accent_color || DEFAULT_CV_STYLING.accent_color,
    full_name: { ...DEFAULT_CV_STYLING.full_name, ...(styling?.full_name || {}) },
    job_title: { ...DEFAULT_CV_STYLING.job_title, ...(styling?.job_title || {}) },
    contact_info: { ...DEFAULT_CV_STYLING.contact_info, ...(styling?.contact_info || {}) },
    section_headings: { ...DEFAULT_CV_STYLING.section_headings, ...(styling?.section_headings || {}) },
    section_text: { ...DEFAULT_CV_STYLING.section_text, ...(styling?.section_text || {}) },
    clause: { ...DEFAULT_CV_STYLING.clause, ...(styling?.clause || {}) },
  };

  const handleAccentColorChange = (newColor: string) => {
    onChange({
      ...currentStyling,
      accent_color: newColor,
    });
  };

  // Handler for global document font change: updates all 6 elements
  const handleDocumentFontChange = (newFont: string) => {
    onChange({
      ...currentStyling,
      document_font_family: newFont,
      full_name: { ...currentStyling.full_name, font_family: newFont },
      job_title: { ...currentStyling.job_title, font_family: newFont },
      contact_info: { ...currentStyling.contact_info, font_family: newFont },
      section_headings: { ...currentStyling.section_headings, font_family: newFont },
      section_text: { ...currentStyling.section_text, font_family: newFont },
      clause: { ...currentStyling.clause, font_family: newFont },
    });
  };

  // Handler for individual element styling change
  const handleElementStyleChange = (
    elementKey: keyof Pick<
      CVStyling,
      "full_name" | "job_title" | "contact_info" | "section_headings" | "section_text" | "clause"
    >,
    patch: Partial<CVElementStyle>
  ) => {
    onChange({
      ...currentStyling,
      [elementKey]: {
        ...currentStyling[elementKey],
        ...patch,
      },
    });
  };

  // Resetting an individual element sets font_family to current active doc font,
  // and font_size_pt and font_weight to element defaults.
  const handleElementReset = (
    elementKey: keyof Pick<
      CVStyling,
      "full_name" | "job_title" | "contact_info" | "section_headings" | "section_text" | "clause"
    >
  ) => {
    const activeDocFont =
      currentStyling.document_font_family || DEFAULT_CV_STYLING.document_font_family;
    const defaultElem = DEFAULT_CV_STYLING[elementKey];
    onChange({
      ...currentStyling,
      [elementKey]: {
        font_family: activeDocFont,
        font_size_pt: defaultElem.font_size_pt,
        font_weight: defaultElem.font_weight,
      },
    });
  };

  const handleResetToDefaults = () => {
    onChange({ ...DEFAULT_CV_STYLING });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Reset button */}
      <div className="flex items-center justify-between pb-1">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Sliders className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span>Stylizowanie dokumentu CV</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Dostosuj czcionki, rozmiary, interlinię oraz marginesy z natychmiastowym podglądem na żywo.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleResetToDefaults}
          className="text-xs h-8 shrink-0 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Przywróć wartości domyślne dla stylu"
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          Domyślny styl
        </Button>
      </div>

      {/* 1. Kolor akcentu CV */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
              Kolor akcentu CV
            </span>
            <button
              type="button"
              onClick={() => handleAccentColorChange(DEFAULT_CV_STYLING.accent_color)}
              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Przywróć domyślny kolor akcentu"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
          <span className="text-[11px] font-mono font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full border border-black/10 dark:border-white/10"
              style={{
                backgroundColor: isValidHex(currentStyling.accent_color)
                  ? currentStyling.accent_color
                  : "#2563eb",
              }}
            />
            <span>{currentStyling.accent_color}</span>
          </span>
        </div>

        {/* Paleta gotowych próbek kolorów - kwadratowe kafelki */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Paleta gotowych próbek
          </label>
          <div className="flex flex-wrap gap-2 sm:gap-2.5">
            {ACCENT_COLOR_PRESETS.map((swatch) => {
              const isSelected =
                currentStyling.accent_color.toLowerCase() === swatch.hex.toLowerCase();
              return (
                <button
                  key={swatch.hex}
                  type="button"
                  onClick={() => handleAccentColorChange(swatch.hex)}
                  title={`${swatch.name} (${swatch.hex})`}
                  aria-label={`${swatch.name} (${swatch.hex})`}
                  className={cn(
                    "aspect-square h-8 w-8 sm:h-9 sm:w-9 rounded-md flex items-center justify-center transition-all cursor-pointer shadow-xs border",
                    isSelected
                      ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900 border-white/50 scale-105"
                      : "border-black/10 dark:border-white/10 hover:scale-105 hover:border-slate-400"
                  )}
                  style={{ backgroundColor: swatch.hex }}
                >
                  {isSelected && (
                    <Check className="h-4 w-4 text-white drop-shadow-md" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Próbnik koloru HTML + pole tekstowe HEX */}
        <div className="space-y-1.5">
          <label
            htmlFor="accent-color-hex"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
          >
            Własny kolor akcentu (HEX)
          </label>
          <div className="flex items-center gap-3">
            <div className="relative flex items-center">
              <input
                type="color"
                id="cv-accent-color-picker"
                aria-label="Próbnik koloru akcentu"
                value={getValidPickerHex(currentStyling.accent_color)}
                onChange={(e) =>
                  handleAccentColorChange(e.target.value.toLowerCase())
                }
                className="h-9 w-12 cursor-pointer rounded-md border border-slate-300 bg-white p-0.5 shadow-xs transition-colors dark:border-slate-700 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="relative flex-1">
              <input
                type="text"
                id="accent-color-hex"
                value={currentStyling.accent_color}
                onChange={(e) => {
                  let val = e.target.value.trim();
                  if (val.length > 0 && !val.startsWith("#")) {
                    val = `#${val}`;
                  }
                  handleAccentColorChange(val);
                }}
                placeholder="#2563eb"
                maxLength={9}
                className="block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-mono text-slate-900 shadow-xs placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder-slate-500"
              />
            </div>
          </div>
        </div>

        {/* Pomocniczy opis */}
        <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-1.5 pt-0.5">
          <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
          <span>
            Wybrany kolor akcentu zostanie zastosowany do nazwy stanowiska, nagłówków sekcji oraz linii oddzielających sekcje.
          </span>
        </p>
      </div>

      {/* 2. Global Document Font Family */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Type className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
              Główny krój czcionki dokumentu
            </span>
            <button
              type="button"
              onClick={() => handleDocumentFontChange(DEFAULT_CV_STYLING.document_font_family)}
              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Przywróć domyślny krój czcionki dokumentu"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
          <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900">
            Kaskadowa zmiana
          </span>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="global-font-select"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
          >
            Wybierz czcionkę bazową
          </label>
          <select
            id="global-font-select"
            value={currentStyling.document_font_family || "Liberation Sans"}
            onChange={(e) => handleDocumentFontChange(e.target.value)}
            className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm text-slate-900 shadow-xs transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            {AVAILABLE_FONTS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 pt-1">
            <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
            <span>
              Wybór czcionki w tym polu automatycznie zaktualizuje krój dla wszystkich elementów dokumentu.
            </span>
          </p>
        </div>
      </div>

      {/* 3. Individual Typography Elements */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <AlignLeft className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
            Typografia poszczególnych elementów
          </h4>
        </div>

        <div className="space-y-3">
          {ELEMENT_CONFIGS.map((elem) => {
            const elStyle = currentStyling[elem.key] || {};
            const fontVal = elStyle.font_family || currentStyling.document_font_family || "Liberation Sans";
            const weightVal = (elStyle.font_weight || "regular") as FontWeight;
            const sizeVal = elStyle.font_size_pt ?? elem.minPt;

            const stepDown = () => {
              const nextVal = Math.max(elem.minPt, Math.round((sizeVal - elem.stepPt) * 10) / 10);
              handleElementStyleChange(elem.key, { font_size_pt: nextVal });
            };

            const stepUp = () => {
              const nextVal = Math.min(elem.maxPt, Math.round((sizeVal + elem.stepPt) * 10) / 10);
              handleElementStyleChange(elem.key, { font_size_pt: nextVal });
            };

            return (
              <div
                key={elem.key}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3"
              >
                {/* Header: title, description & reset button (size badge removed) */}
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                      {elem.label}
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {elem.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleElementReset(elem.key)}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Przywróć domyślne dla tego elementu"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Line 1: Font Family and Font Weight side-by-side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Font Family */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      Krój czcionki
                    </label>
                    <select
                      value={fontVal}
                      onChange={(e) =>
                        handleElementStyleChange(elem.key, { font_family: e.target.value })
                      }
                      className="flex h-8 w-full rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-900 shadow-xs transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    >
                      {AVAILABLE_FONTS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Font Weight */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      Grubość (Weight)
                    </label>
                    <select
                      value={weightVal}
                      onChange={(e) =>
                        handleElementStyleChange(elem.key, { font_weight: e.target.value as FontWeight })
                      }
                      className="flex h-8 w-full rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-900 shadow-xs transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    >
                      {FONT_WEIGHTS.map((w) => (
                        <option key={w.value} value={w.value}>
                          {w.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Line 2: Full width slider with +, -, and numeric input */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      Rozmiar czcionki (pt)
                    </label>
                    <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
                      {sizeVal.toFixed(1)} pt
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={stepDown}
                      disabled={sizeVal <= elem.minPt}
                      className="h-8 w-8 flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                      title="Zmniejsz rozmiar czcionki"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <input
                      type="range"
                      min={elem.minPt}
                      max={elem.maxPt}
                      step={elem.stepPt}
                      value={sizeVal}
                      onChange={(e) =>
                        handleElementStyleChange(elem.key, {
                          font_size_pt: parseFloat(e.target.value),
                        })
                      }
                      className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <button
                      type="button"
                      onClick={stepUp}
                      disabled={sizeVal >= elem.maxPt}
                      className="h-8 w-8 flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                      title="Zwiększ rozmiar czcionki"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <input
                      type="number"
                      min={elem.minPt}
                      max={elem.maxPt}
                      step={elem.stepPt}
                      value={sizeVal}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          handleElementStyleChange(elem.key, {
                            font_size_pt: Math.min(elem.maxPt, Math.max(elem.minPt, val)),
                          });
                        }
                      }}
                      className="w-16 h-8 text-center text-xs font-mono font-medium rounded-md border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Spacing, Line Height & Margins - Arranged Strictly ONE UNDER ANOTHER */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <Maximize2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
            Interlinia, odstępy i marginesy
          </h4>
        </div>

        <div className="space-y-4">
          {/* 1. Wysokość linii nagłówków */}
          <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Wysokość linii nagłówków
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900">
                  {currentStyling.heading_line_height_em.toFixed(2)} em
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...currentStyling,
                      heading_line_height_em: DEFAULT_CV_STYLING.heading_line_height_em,
                    })
                  }
                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Przywróć domyślną wysokość linii nagłówków"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const nextVal = Math.max(0.4, Math.round((currentStyling.heading_line_height_em - 0.05) * 100) / 100);
                  onChange({ ...currentStyling, heading_line_height_em: nextVal });
                }}
                disabled={currentStyling.heading_line_height_em <= 0.4}
                className="h-8 w-8 flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                title="Zmniejsz wysokość linii nagłówków"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <input
                type="range"
                min={0.4}
                max={1.5}
                step={0.05}
                value={currentStyling.heading_line_height_em}
                onChange={(e) =>
                  onChange({
                    ...currentStyling,
                    heading_line_height_em: parseFloat(e.target.value),
                  })
                }
                className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <button
                type="button"
                onClick={() => {
                  const nextVal = Math.min(1.5, Math.round((currentStyling.heading_line_height_em + 0.05) * 100) / 100);
                  onChange({ ...currentStyling, heading_line_height_em: nextVal });
                }}
                disabled={currentStyling.heading_line_height_em >= 1.5}
                className="h-8 w-8 flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                title="Zwiększ wysokość linii nagłówków"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <input
                type="number"
                min={0.4}
                max={1.5}
                step={0.05}
                value={currentStyling.heading_line_height_em}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    onChange({
                      ...currentStyling,
                      heading_line_height_em: Math.min(1.5, Math.max(0.4, val)),
                    });
                  }
                }}
                className="w-16 h-8 text-center text-xs font-mono font-medium rounded-md border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              Domyślnie 0.65 em (zwarty układ nagłówków)
            </p>
          </div>

          {/* 2. Wysokość linii tekstu sekcji */}
          <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Wysokość linii tekstu sekcji
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900">
                  {currentStyling.section_text_line_height_em.toFixed(2)} em
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...currentStyling,
                      section_text_line_height_em: DEFAULT_CV_STYLING.section_text_line_height_em,
                    })
                  }
                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Przywróć domyślną wysokość linii tekstu sekcji"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const nextVal = Math.max(0.4, Math.round((currentStyling.section_text_line_height_em - 0.05) * 100) / 100);
                  onChange({ ...currentStyling, section_text_line_height_em: nextVal });
                }}
                disabled={currentStyling.section_text_line_height_em <= 0.4}
                className="h-8 w-8 flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                title="Zmniejsz wysokość linii tekstu"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <input
                type="range"
                min={0.4}
                max={1.5}
                step={0.05}
                value={currentStyling.section_text_line_height_em}
                onChange={(e) =>
                  onChange({
                    ...currentStyling,
                    section_text_line_height_em: parseFloat(e.target.value),
                  })
                }
                className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <button
                type="button"
                onClick={() => {
                  const nextVal = Math.min(1.5, Math.round((currentStyling.section_text_line_height_em + 0.05) * 100) / 100);
                  onChange({ ...currentStyling, section_text_line_height_em: nextVal });
                }}
                disabled={currentStyling.section_text_line_height_em >= 1.5}
                className="h-8 w-8 flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                title="Zwiększ wysokość linii tekstu"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <input
                type="number"
                min={0.4}
                max={1.5}
                step={0.05}
                value={currentStyling.section_text_line_height_em}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    onChange({
                      ...currentStyling,
                      section_text_line_height_em: Math.min(1.5, Math.max(0.4, val)),
                    });
                  }
                }}
                className="w-16 h-8 text-center text-xs font-mono font-medium rounded-md border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              Domyślnie 0.65 em (czytelny układ akapitów)
            </p>
          </div>

          {/* 3. Odstęp między sekcjami */}
          <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Odstęp między sekcjami
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Pionowy dystans oddzielający bloki sekcji CV
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900">
                  {currentStyling.section_spacing_em.toFixed(2)} em
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...currentStyling,
                      section_spacing_em: DEFAULT_CV_STYLING.section_spacing_em,
                    })
                  }
                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Przywróć domyślny odstęp między sekcjami"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const nextVal = Math.max(0.1, Math.round((currentStyling.section_spacing_em - 0.05) * 100) / 100);
                  onChange({ ...currentStyling, section_spacing_em: nextVal });
                }}
                disabled={currentStyling.section_spacing_em <= 0.1}
                className="h-8 w-8 flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                title="Zmniejsz odstęp między sekcjami"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <input
                type="range"
                min={0.1}
                max={2.0}
                step={0.05}
                value={currentStyling.section_spacing_em}
                onChange={(e) =>
                  onChange({
                    ...currentStyling,
                    section_spacing_em: parseFloat(e.target.value),
                  })
                }
                className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <button
                type="button"
                onClick={() => {
                  const nextVal = Math.min(2.0, Math.round((currentStyling.section_spacing_em + 0.05) * 100) / 100);
                  onChange({ ...currentStyling, section_spacing_em: nextVal });
                }}
                disabled={currentStyling.section_spacing_em >= 2.0}
                className="h-8 w-8 flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                title="Zwiększ odstęp między sekcjami"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <input
                type="number"
                min={0.1}
                max={2.0}
                step={0.05}
                value={currentStyling.section_spacing_em}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    onChange({
                      ...currentStyling,
                      section_spacing_em: Math.min(2.0, Math.max(0.1, val)),
                    });
                  }
                }}
                className="w-16 h-8 text-center text-xs font-mono font-medium rounded-md border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              Domyślnie 0.60 em
            </p>
          </div>

          {/* 4. Marginesy boczne (lewy / prawy) */}
          <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Marginesy boczne (lewy / prawy)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900">
                  {currentStyling.margin_x_cm.toFixed(1)} cm
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...currentStyling,
                      margin_x_cm: DEFAULT_CV_STYLING.margin_x_cm,
                    })
                  }
                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Przywróć domyślne marginesy boczne"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const nextVal = Math.max(0.5, Math.round((currentStyling.margin_x_cm - 0.1) * 10) / 10);
                  onChange({ ...currentStyling, margin_x_cm: nextVal });
                }}
                disabled={currentStyling.margin_x_cm <= 0.5}
                className="h-8 w-8 flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                title="Zmniejsz marginesy boczne"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <input
                type="range"
                min={0.5}
                max={3.5}
                step={0.1}
                value={currentStyling.margin_x_cm}
                onChange={(e) =>
                  onChange({
                    ...currentStyling,
                    margin_x_cm: parseFloat(e.target.value),
                  })
                }
                className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <button
                type="button"
                onClick={() => {
                  const nextVal = Math.min(3.5, Math.round((currentStyling.margin_x_cm + 0.1) * 10) / 10);
                  onChange({ ...currentStyling, margin_x_cm: nextVal });
                }}
                disabled={currentStyling.margin_x_cm >= 3.5}
                className="h-8 w-8 flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                title="Zwiększ marginesy boczne"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <input
                type="number"
                min={0.5}
                max={3.5}
                step={0.1}
                value={currentStyling.margin_x_cm}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    onChange({
                      ...currentStyling,
                      margin_x_cm: Math.min(3.5, Math.max(0.5, val)),
                    });
                  }
                }}
                className="w-16 h-8 text-center text-xs font-mono font-medium rounded-md border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              Domyślnie 1.8 cm
            </p>
          </div>

          {/* 5. Marginesy pionowe (górny / dolny) */}
          <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Marginesy pionowe (górny / dolny)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900">
                  {currentStyling.margin_y_cm.toFixed(1)} cm
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...currentStyling,
                      margin_y_cm: DEFAULT_CV_STYLING.margin_y_cm,
                    })
                  }
                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Przywróć domyślne marginesy pionowe"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const nextVal = Math.max(0.5, Math.round((currentStyling.margin_y_cm - 0.1) * 10) / 10);
                  onChange({ ...currentStyling, margin_y_cm: nextVal });
                }}
                disabled={currentStyling.margin_y_cm <= 0.5}
                className="h-8 w-8 flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                title="Zmniejsz marginesy pionowe"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <input
                type="range"
                min={0.5}
                max={3.5}
                step={0.1}
                value={currentStyling.margin_y_cm}
                onChange={(e) =>
                  onChange({
                    ...currentStyling,
                    margin_y_cm: parseFloat(e.target.value),
                  })
                }
                className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <button
                type="button"
                onClick={() => {
                  const nextVal = Math.min(3.5, Math.round((currentStyling.margin_y_cm + 0.1) * 10) / 10);
                  onChange({ ...currentStyling, margin_y_cm: nextVal });
                }}
                disabled={currentStyling.margin_y_cm >= 3.5}
                className="h-8 w-8 flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                title="Zwiększ marginesy pionowe"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <input
                type="number"
                min={0.5}
                max={3.5}
                step={0.1}
                value={currentStyling.margin_y_cm}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    onChange({
                      ...currentStyling,
                      margin_y_cm: Math.min(3.5, Math.max(0.5, val)),
                    });
                  }
                }}
                className="w-16 h-8 text-center text-xs font-mono font-medium rounded-md border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              Domyślnie 1.8 cm
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
