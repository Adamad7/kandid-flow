import React from "react";
import {
  RotateCcw,
  Type,
  AlignLeft,
  Maximize2,
  Sliders,
  Sparkles,
} from "lucide-react";
import type { CVStyling, CVElementStyle, FontWeight } from "../../types";
import { Button } from "../ui/Button";

export interface CVStylePanelProps {
  styling: CVStyling;
  onChange: (styling: CVStyling) => void;
}

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
  { value: "regular", label: "Zwykła (Regular)" },
  { value: "medium", label: "Średnia (Medium)" },
  { value: "semibold", label: "Półgruba (Semibold)" },
  { value: "bold", label: "Pogrubiona (Bold)" },
];

export const DEFAULT_CV_STYLING: CVStyling = {
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
    full_name: { ...DEFAULT_CV_STYLING.full_name, ...(styling?.full_name || {}) },
    job_title: { ...DEFAULT_CV_STYLING.job_title, ...(styling?.job_title || {}) },
    contact_info: { ...DEFAULT_CV_STYLING.contact_info, ...(styling?.contact_info || {}) },
    section_headings: { ...DEFAULT_CV_STYLING.section_headings, ...(styling?.section_headings || {}) },
    section_text: { ...DEFAULT_CV_STYLING.section_text, ...(styling?.section_text || {}) },
    clause: { ...DEFAULT_CV_STYLING.clause, ...(styling?.clause || {}) },
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

      {/* 1. Global Document Font Family */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Type className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
              Główny krój czcionki dokumentu
            </span>
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

      {/* 2. Individual Typography Elements */}
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

            return (
              <div
                key={elem.key}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                      {elem.label}
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {elem.description}
                    </p>
                  </div>
                  <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900">
                    {sizeVal.toFixed(1)} pt
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

                  {/* Font Size in pt */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
                        Rozmiar (pt)
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
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
                      <input
                        type="number"
                        min={elem.minPt}
                        max={elem.maxPt}
                        step={elem.stepPt}
                        value={sizeVal}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            handleElementStyleChange(elem.key, { font_size_pt: val });
                          }
                        }}
                        className="w-16 h-8 text-center text-xs font-mono font-medium rounded-md border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Line Height & Section Spacing */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <AlignLeft className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
            Interlinia i odstępy pionowe
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Heading Line Height */}
          <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Wysokość linii nagłówków
              </label>
              <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">
                {currentStyling.heading_line_height_em.toFixed(2)} em
              </span>
            </div>
            <div className="flex items-center gap-2 pt-1">
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
              <input
                type="number"
                min={0.4}
                max={1.5}
                step={0.05}
                value={currentStyling.heading_line_height_em}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    onChange({ ...currentStyling, heading_line_height_em: val });
                  }
                }}
                className="w-16 h-7 text-center text-xs font-mono font-medium rounded border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              Domyślnie 0.65 em (zwarty układ nagłówków)
            </p>
          </div>

          {/* Section Text Line Height */}
          <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Wysokość linii tekstu sekcji
              </label>
              <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">
                {currentStyling.section_text_line_height_em.toFixed(2)} em
              </span>
            </div>
            <div className="flex items-center gap-2 pt-1">
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
              <input
                type="number"
                min={0.4}
                max={1.5}
                step={0.05}
                value={currentStyling.section_text_line_height_em}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    onChange({ ...currentStyling, section_text_line_height_em: val });
                  }
                }}
                className="w-16 h-7 text-center text-xs font-mono font-medium rounded border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              Domyślnie 0.65 em (czytelny układ akapitów)
            </p>
          </div>
        </div>

        {/* Section Spacing */}
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Odstęp między sekcjami
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pionowy dystans oddzielający bloki sekcji CV
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">
              {currentStyling.section_spacing_em.toFixed(2)} em
            </span>
          </div>
          <div className="flex items-center gap-2 pt-1">
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
            <input
              type="number"
              min={0.1}
              max={2.0}
              step={0.05}
              value={currentStyling.section_spacing_em}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) {
                  onChange({ ...currentStyling, section_spacing_em: val });
                }
              }}
              className="w-16 h-7 text-center text-xs font-mono font-medium rounded border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* 4. Document Margins */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <Maximize2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
            Marginesy strony (Typst)
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Horizontal Margin (X) */}
          <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Marginesy boczne (lewy / prawy)
              </label>
              <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">
                {currentStyling.margin_x_cm.toFixed(1)} cm
              </span>
            </div>
            <div className="flex items-center gap-2 pt-1">
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
              <input
                type="number"
                min={0.5}
                max={3.5}
                step={0.1}
                value={currentStyling.margin_x_cm}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    onChange({ ...currentStyling, margin_x_cm: val });
                  }
                }}
                className="w-16 h-7 text-center text-xs font-mono font-medium rounded border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              Domyślnie 1.8 cm
            </p>
          </div>

          {/* Vertical Margin (Y) */}
          <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Marginesy pionowe (górny / dolny)
              </label>
              <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">
                {currentStyling.margin_y_cm.toFixed(1)} cm
              </span>
            </div>
            <div className="flex items-center gap-2 pt-1">
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
              <input
                type="number"
                min={0.5}
                max={3.5}
                step={0.1}
                value={currentStyling.margin_y_cm}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    onChange({ ...currentStyling, margin_y_cm: val });
                  }
                }}
                className="w-16 h-7 text-center text-xs font-mono font-medium rounded border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
