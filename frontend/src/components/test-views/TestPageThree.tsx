import React, { useState } from "react";
import {
  ArrowLeft,
  Sparkles,
  Search,
  Check,
  MapPin,
  FileText,
  ChevronRight,
  Clock,
  Building2,
  Plus,
  Trash2,
  Send,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { MOCK_JOB_OFFERS } from "./mockData";
import { STATUS_LABELS } from "../../lib/constants";
import type { TestSubPage } from "./TestViewsContainer";

interface TestPageThreeProps {
  onBackToMenu: () => void;
  onSwitchPage: (pageId: TestSubPage) => void;
}

export const TestPageThree: React.FC<TestPageThreeProps> = ({
  onBackToMenu,
  onSwitchPage,
}) => {
  const [toggleActive, setToggleActive] = useState(true);
  const [checkboxState, setCheckboxState] = useState({
    opt1: true,
    opt2: false,
    opt3: true,
  });
  const [selectedRowId, setSelectedRowId] = useState<string>("mock-job-1");
  const [filterText, setFilterText] = useState("");
  const [selectedWorkModel, setSelectedWorkModel] = useState("all");

  const selectedJob =
    MOCK_JOB_OFFERS.find((j) => j.id === selectedRowId) || MOCK_JOB_OFFERS[0];

  return (
    <div className="-mx-4 sm:-mx-6 -my-6 px-4 sm:px-6 py-6 min-h-[calc(100vh-4rem)] dark:bg-neutral-950 transition-colors">
      <div className="space-y-10 max-w-6xl mx-auto py-2">
        {/* SECTION 1: Top Navigation & Style Meta Header */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={onBackToMenu}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-slate-700 dark:text-neutral-300 hover:border-indigo-500 hover:text-indigo-600 dark:hover:border-indigo-400 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Wróć do menu testowego</span>
            </button>

            {/* Quick Page Switcher */}
            <div className="inline-flex items-center gap-1.5 p-1 rounded-full border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900/60 text-xs">
              <span className="text-slate-500 dark:text-neutral-400 px-3 font-medium">
                Podstrony:
              </span>
              <button
                type="button"
                onClick={() => onSwitchPage("test-page-1")}
                className="px-3.5 py-1 rounded-full font-medium text-slate-600 dark:text-neutral-400 hover:text-slate-950 dark:hover:text-white cursor-pointer transition-colors"
              >
                test-page-1
              </button>
              <button
                type="button"
                onClick={() => onSwitchPage("test-page-2")}
                className="px-3.5 py-1 rounded-full font-medium text-slate-600 dark:text-neutral-400 hover:text-slate-950 dark:hover:text-white cursor-pointer transition-colors"
              >
                test-page-2
              </button>
              <button
                type="button"
                onClick={() => onSwitchPage("test-page-3")}
                className="px-3.5 py-1 rounded-full font-bold bg-indigo-600 text-white shadow-sm shadow-indigo-500/20 cursor-pointer"
              >
                test-page-3
              </button>
            </div>
          </div>

          {/* Style Banner Card - Flat Curves, No Heavy Shadows, Open & Breathable */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-neutral-800 bg-linear-to-r from-indigo-50/60 via-purple-50/30 to-white dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-950 p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 text-xs font-semibold">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>test-page-3</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Nowoczesny Minimalizm z Żywymi Akcentami (Flat Curves & Vivid Accents)
                </h1>
                <p className="text-sm text-slate-600 dark:text-neutral-300 max-w-3xl leading-relaxed">
                  <strong>Opis stylu:</strong> Płaski, lekki minimalizm pozbawiony rozmytych cieni
                  i przeładowanych poziomów zagłębień (de-nesting). Wyróżnia się eleganckimi,
                  płynnymi zaokrągleniami (<code className="text-xs bg-slate-200/60 dark:bg-neutral-800 px-1 py-0.5 rounded font-mono">rounded-2xl</code>, <code className="text-xs bg-slate-200/60 dark:bg-neutral-800 px-1 py-0.5 rounded font-mono">rounded-full</code>)
                  oraz nasyconymi, energetycznymi kolorami akcji (bogaty indygo, elektryczny szmaragd i wyrazisty fiolet).
                </p>
              </div>
              <div className="shrink-0 flex md:flex-col items-start md:items-end gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600/10 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold text-xs">
                  Wariant zoptymalizowany
                </span>
                <span className="text-xs text-slate-500 dark:text-neutral-400 hidden md:inline">
                  Czysta hierarchia wizualna
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Buttons & Actions Showcase */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
              1. Przyciski i akcje (Vibrant Actions & Flat Curves)
            </h2>
            <span className="text-xs font-medium text-slate-500 dark:text-neutral-400">
              Nasycone barwy, gładkie zaokrąglenia, brak rozmytych cieni
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-8 space-y-6">
            {/* Solid Vivid Actions */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
              Przyciski pełne (Solid Vivid — wyraziste kolory akcji)
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-indigo-600/20 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>Dodaj ofertę (Electric Indigo)</span>
              </button>

              <button
                type="button"
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-xs sm:text-sm active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                <span>Generuj CV (Vivid Emerald)</span>
              </button>

              <button
                type="button"
                className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs sm:text-sm active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                <span>Zaplanuj etap (Electric Violet)</span>
              </button>

              <button
                type="button"
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-semibold text-xs sm:text-sm active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                <span>Aplikuj teraz (Vivid Amber)</span>
              </button>

              <button
                type="button"
                className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-semibold text-xs sm:text-sm active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>Usuń (Rose)</span>
              </button>
            </div>
          </div>

          {/* Crisp Colorful Outlines */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
              Przyciski z obrysem (Crisp Outlines — z płynnym, żywym wypełnieniem hover)
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="px-4 py-2 rounded-xl border-2 border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 dark:hover:text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                <span>Podgląd CV</span>
              </button>

              <button
                type="button"
                className="px-4 py-2 rounded-xl border-2 border-emerald-500 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-400 dark:hover:text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                <span>Oznacz jako gotowe</span>
              </button>

              <button
                type="button"
                className="px-4 py-2 rounded-xl border-2 border-violet-500 text-violet-600 dark:border-violet-400 dark:text-violet-400 hover:bg-violet-500 hover:text-white dark:hover:bg-violet-400 dark:hover:text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                <span>Asystent AI</span>
              </button>

              <button
                type="button"
                className="px-4 py-2 rounded-xl border-2 border-slate-300 dark:border-neutral-700 text-slate-700 dark:text-neutral-300 hover:border-slate-900 hover:bg-slate-900 hover:text-white dark:hover:border-white dark:hover:bg-white dark:hover:text-neutral-900 font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Anuluj
              </button>

              <button
                type="button"
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800 font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Działanie neutralne (Ghost)
              </button>
            </div>
          </div>

          {/* Sizes and Loading/Disabled States */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
              Rozmiary i stany interakcji (Sizes & States)
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Mały (sm)
              </button>

              <button
                type="button"
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors cursor-pointer"
              >
                Standardowy (md)
              </button>

              <button
                type="button"
                className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base transition-colors cursor-pointer"
              >
                Duży (lg)
              </button>

              <button
                type="button"
                className="px-4 py-2.5 rounded-xl bg-indigo-600/80 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 cursor-wait"
              >
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Generowanie...</span>
              </button>

              <button
                type="button"
                disabled
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-neutral-800 text-slate-400 dark:text-neutral-500 font-semibold text-xs sm:text-sm cursor-not-allowed border border-slate-200/60 dark:border-neutral-800"
              >
                Zablokowany (disabled)
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: Toggles, Checkboxes & Form Controls (De-nested!) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            2. Przełączniki, checkboxy i formularze (De-nested Controls)
          </h2>
          <span className="text-xs font-medium text-slate-500 dark:text-neutral-400">
            Płaskie ułożenie bez zagnieżdżonych sub-paneli
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Toggles and Checkboxes */}
            <div className="space-y-5">
              <div className="text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                Przełączniki i opcje (Clean Toggles)
              </div>

              {/* Flat Clean Toggle Row */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    Automatyczne parsowanie AI
                  </div>
                  <div className="text-xs text-slate-500 dark:text-neutral-400">
                    Brak obramowania i sub-paneli — bezpośrednio na karcie głównej
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setToggleActive(!toggleActive)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
                    toggleActive ? "bg-indigo-600" : "bg-slate-200 dark:bg-neutral-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 ease-in-out mt-0.5 ml-0.5 shadow-xs ${
                      toggleActive ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Checkboxes List */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-neutral-800/80">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={checkboxState.opt1}
                    onChange={(e) =>
                      setCheckboxState({ ...checkboxState, opt1: e.target.checked })
                    }
                    className="h-4 w-4 rounded-md border-slate-300 dark:border-neutral-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="text-xs font-medium text-slate-700 dark:text-neutral-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                    Pokazuj wyłącznie oferty z jawnymi widełkami płacowymi
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={checkboxState.opt2}
                    onChange={(e) =>
                      setCheckboxState({ ...checkboxState, opt2: e.target.checked })
                    }
                    className="h-4 w-4 rounded-md border-slate-300 dark:border-neutral-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="text-xs font-medium text-slate-700 dark:text-neutral-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                    Uwzględniaj tylko pozycje z pracą w pełni zdalną (100% remote)
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={checkboxState.opt3}
                    onChange={(e) =>
                      setCheckboxState({ ...checkboxState, opt3: e.target.checked })
                    }
                    className="h-4 w-4 rounded-md border-slate-300 dark:border-neutral-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="text-xs font-medium text-slate-700 dark:text-neutral-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                    Automatycznie generuj draft dopasowanego CV
                  </span>
                </label>
              </div>
            </div>

            {/* Inputs & Select */}
            <div className="space-y-4">
              <div className="text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                Wyszukiwanie i filtry (Smooth Border Inputs)
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                  Szukaj ofert:
                </label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                  <input
                    type="text"
                    placeholder="np. Python, Kubernetes, Fullstack..."
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50/60 dark:bg-neutral-950 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-neutral-900 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                  Model pracy:
                </label>
                <div className="relative">
                  <select
                    value={selectedWorkModel}
                    onChange={(e) => setSelectedWorkModel(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50/60 dark:bg-neutral-950 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-neutral-900 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="all">Wszystkie modele (Zdalnie / Hybryda / Biuro)</option>
                    <option value="remote">Tylko praca zdalna (Remote)</option>
                    <option value="hybrid">Hybryda (Kraków / Warszawa)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: Recruitment Status Badges & Tech Stack Tags */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-violet-600"></span>
            3. Etykiety i statusy rekrutacji (Pill Badges & Tech Tags)
          </h2>
          <span className="text-xs font-medium text-slate-500 dark:text-neutral-400">
            Gładkie pastylki (rounded-full) z nasyconymi akcentami
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
              Statusy pipeline rekrutacyjnego (Vibrant Pill Badges)
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300 border border-slate-200 dark:border-neutral-700">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                {STATUS_LABELS.inbox}
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"></span>
                {STATUS_LABELS.ready}
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                {STATUS_LABELS.applied}
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-600"></span>
                {STATUS_LABELS.interview}
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                {STATUS_LABELS.offer}
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                {STATUS_LABELS.rejected}
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-neutral-800/80">
            <div className="text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
              Tagi technologiczne (Interactive Tech Chips)
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[
                "Python 3.12",
                "FastAPI",
                "React 19",
                "TypeScript",
                "PostgreSQL",
                "Docker",
                "Kubernetes",
                "Tailwind CSS",
                "AWS",
              ].map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-neutral-800/80 text-slate-700 dark:text-neutral-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-300 hover:border-indigo-300 dark:hover:border-indigo-700 border border-transparent transition-colors cursor-default"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: Hardcoded Offer Rows (min. 3 rows) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
            4. Wiersze listy ofert pracy (Flat Curves — Hardcoded)
          </h2>
          <span className="text-xs font-medium text-slate-500 dark:text-neutral-400">
            Płaskie wiersze, selektywny cień tylko przy zaznaczeniu
          </span>
        </div>

        <div className="space-y-3">
          {MOCK_JOB_OFFERS.map((job) => {
            const isSelected = selectedRowId === job.id;
            return (
              <div
                key={job.id}
                onClick={() => setSelectedRowId(job.id)}
                className={`rounded-2xl border transition-all p-4 sm:p-5 cursor-pointer ${
                  isSelected
                    ? "border-2 border-indigo-600 bg-indigo-50/20 dark:border-indigo-500 dark:bg-neutral-900 shadow-md shadow-indigo-500/10"
                    : "border border-slate-200/80 hover:border-indigo-300 dark:border-neutral-800 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 border border-slate-200/60 dark:border-neutral-700/60">
                        {job.source_portal}
                      </span>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                        {job.role_title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-neutral-400 flex-wrap">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-neutral-300">
                        <Building2 className="h-3.5 w-3.5 text-indigo-500" />
                        {job.company_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        {job.location_raw}
                      </span>
                      <span className="hidden sm:inline text-slate-400">•</span>
                      <span className="text-slate-600 dark:text-neutral-300">
                        {job.work_model_details}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 flex-wrap">
                    <div className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 text-xs font-bold">
                      {job.salary_min?.toLocaleString()} - {job.salary_max?.toLocaleString()}{" "}
                      {job.salary_currency}
                    </div>

                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300">
                      {STATUS_LABELS[job.status]}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-300 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 dark:hover:bg-indigo-600 dark:hover:text-white dark:hover:border-indigo-600 font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>Szczegóły</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 6: Offer Details Card Preview (De-nested!) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-purple-600"></span>
            5. Karta szczegółów oferty (De-nested Clean Preview)
          </h2>
          <span className="text-xs font-medium text-slate-500 dark:text-neutral-400">
            Płaska struktura bez wielopoziomowych skrzynek
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-8 space-y-6">
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-5 border-b border-slate-100 dark:border-neutral-800">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 text-xs font-bold uppercase tracking-wider">
                  {selectedJob.source_portal}
                </span>
                <span className="px-3 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
                  {STATUS_LABELS[selectedJob.status]}
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                {selectedJob.role_title}
              </h3>
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-neutral-400">
                <span className="font-semibold text-slate-800 dark:text-neutral-200">
                  {selectedJob.company_name}
                </span>
                <span>•</span>
                <span>{selectedJob.work_model_details}</span>
              </div>
            </div>

            <div className="text-left md:text-right">
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {selectedJob.salary_min?.toLocaleString()} - {selectedJob.salary_max?.toLocaleString()}{" "}
                {selectedJob.salary_currency}
              </div>
              <div className="text-xs font-medium text-slate-500 dark:text-neutral-400 mt-0.5">
                {selectedJob.contract_type}
              </div>
            </div>
          </div>

          {/* AI Role Summary - Clean typography block without nested box */}
          {selectedJob.structured_data?.role_summary && (
            <div className="space-y-1.5 border-l-2 border-indigo-500 pl-4 py-0.5">
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Podsumowanie stanowiska (AI Summary)</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-neutral-300 leading-relaxed">
                {selectedJob.structured_data.role_summary}
              </p>
            </div>
          )}

          {/* Requirements - Clean unboxed list */}
          <div className="space-y-3 pt-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-400">
              Kluczowe wymagania (Must-have):
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-700 dark:text-neutral-300">
              {selectedJob.structured_data?.must_have.map((req, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 py-1"
                >
                  <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{req}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Footer */}
          <div className="pt-6 border-t border-slate-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800 font-semibold text-xs transition-colors cursor-pointer"
              >
                Edytuj ofertę
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800 font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>Otwórz źródło</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>

            <button
              type="button"
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs sm:text-sm shadow-sm shadow-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              <span>Generuj dedykowane CV</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
);
};
