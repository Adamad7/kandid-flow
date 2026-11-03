import React, { useState } from "react";
import {
  ArrowLeft,
  Sparkles,
  Search,
  Check,
  Calendar,
  MapPin,
  FileText,
  ChevronRight,
  Clock,
  Send,
  Building2,
  Plus,
  Trash2,
} from "lucide-react";
import { MOCK_JOB_OFFERS } from "./mockData";
import { STATUS_LABELS } from "../../lib/constants";

interface TestPageOneProps {
  onBackToMenu: () => void;
  onSwitchPage: (pageId: "test-page-1" | "test-page-2" | "test-page-3") => void;
}

export const TestPageOne: React.FC<TestPageOneProps> = ({
  onBackToMenu,
  onSwitchPage,
}) => {
  // Local interactive states for preview
  const [toggleActive, setToggleActive] = useState(true);
  const [checkboxState, setCheckboxState] = useState({
    opt1: true,
    opt2: false,
    opt3: true,
  });
  const [selectedRowId, setSelectedRowId] = useState<string>("mock-job-1");
  const [filterText, setFilterText] = useState("");

  const selectedJob =
    MOCK_JOB_OFFERS.find((j) => j.id === selectedRowId) || MOCK_JOB_OFFERS[0];

  return (
    <div className="space-y-10 max-w-6xl mx-auto py-2">
      {/* Top Navigation & Style Meta Header */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBackToMenu}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-none cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Wróć do menu testowego</span>
          </button>

          {/* Quick Page Switcher */}
          <div className="inline-flex items-center gap-1.5 p-1 rounded-lg border-2 border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-xs">
            <span className="text-slate-500 dark:text-slate-400 px-2 font-medium">
              Podstrony:
            </span>
            <button
              type="button"
              onClick={() => onSwitchPage("test-page-1")}
              className="px-3 py-1 rounded-md font-bold bg-blue-600 text-white shadow-none cursor-pointer"
            >
              test-page-1
            </button>
            <button
              type="button"
              onClick={() => onSwitchPage("test-page-2")}
              className="px-3 py-1 rounded-md font-medium text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white cursor-pointer"
            >
              test-page-2
            </button>
            <button
              type="button"
              onClick={() => onSwitchPage("test-page-3")}
              className="px-3 py-1 rounded-md font-medium text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white cursor-pointer"
            >
              test-page-3
            </button>
          </div>
        </div>

        {/* Style Banner Card */}
        <div className="rounded-xl border-2 border-blue-500 bg-white dark:bg-slate-900 p-6 shadow-none">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm bg-blue-600 text-white text-[11px] font-black uppercase tracking-wider">
                <Sparkles className="h-3 w-3" />
                <span>test-page-1</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Styl Płaski z Żywymi Akcentami (Flat & Vibrant Accents)
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
                <strong>Opis stylu:</strong> Brak rozmytych cieni (flat look, <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">shadow-none</code>),
                wyraziste 2px krawędzie oraz jaskrawe, nasycone akcenty kolorystyczne (Electric Blue, Emerald, Vivid Amber, Neon Violet).
                Przyciski typu outline posiadają mocne 2px obramowania z kontrastowym wypełnieniem przy najechaniu.
              </p>
            </div>
            <div className="shrink-0">
              <span className="inline-block px-3 py-1.5 rounded-lg border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold text-xs">
                Wyrazisty kontrast • 2px borders
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: BUTTONS & ACCENTS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b-2 border-slate-200 dark:border-slate-800 pb-2">
          <h2 className="text-base font-black uppercase tracking-wide text-slate-900 dark:text-white flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-600"></span>
            1. Przyciski i akcje (Buttons & Outlines)
          </h2>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Nasycone akcenty + 2px obramowania
          </span>
        </div>

        <div className="rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6 shadow-none">
          {/* Solid Vivid Buttons */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Pełne, żywe przyciski akcji (Solid Vibrant)
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm border-2 border-blue-600 transition-colors shadow-none cursor-pointer flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>Dodaj ofertę (Electric Blue)</span>
              </button>

              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs sm:text-sm border-2 border-emerald-500 transition-colors shadow-none cursor-pointer flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                <span>Generuj CV (Vivid Emerald)</span>
              </button>

              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs sm:text-sm border-2 border-amber-500 transition-colors shadow-none cursor-pointer flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                <span>Zaplanuj etap (Vivid Amber)</span>
              </button>

              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm border-2 border-rose-600 transition-colors shadow-none cursor-pointer flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>Usuń (Rose)</span>
              </button>
            </div>
          </div>

          {/* Bright Outline Buttons */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Jaskrawe przyciski z obrysem (Bright Outlines — z żywym hover)
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="px-4 py-2 rounded-lg border-2 border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white font-bold text-xs sm:text-sm bg-transparent transition-colors shadow-none cursor-pointer flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                <span>Podgląd CV</span>
              </button>

              <button
                type="button"
                className="px-4 py-2 rounded-lg border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white font-bold text-xs sm:text-sm bg-transparent transition-colors shadow-none cursor-pointer flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                <span>Oznacz jako gotowe</span>
              </button>

              <button
                type="button"
                className="px-4 py-2 rounded-lg border-2 border-purple-500 text-purple-600 dark:text-purple-400 hover:bg-purple-500 hover:text-white font-bold text-xs sm:text-sm bg-transparent transition-colors shadow-none cursor-pointer flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                <span>Asystent AI</span>
              </button>

              <button
                type="button"
                className="px-4 py-2 rounded-lg border-2 border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white font-bold text-xs sm:text-sm bg-transparent transition-colors shadow-none cursor-pointer flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                <span>Aplikuj teraz</span>
              </button>

              <button
                type="button"
                className="px-4 py-2 rounded-lg border-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-900 dark:hover:border-white font-bold text-xs sm:text-sm bg-transparent transition-colors shadow-none cursor-pointer"
              >
                Anuluj
              </button>
            </div>
          </div>

          {/* Sizes & States */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Rozmiary i stany (Sizes & States)
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="px-3 py-1 rounded-md bg-blue-600 text-white font-bold text-xs border-2 border-blue-600"
              >
                Mały (sm)
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold text-sm border-2 border-blue-600"
              >
                Standard (md)
              </button>
              <button
                type="button"
                className="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-black text-base border-2 border-blue-600"
              >
                Duży (lg)
              </button>
              <button
                type="button"
                disabled
                className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-400 border-2 border-slate-300 dark:border-slate-700 font-bold text-xs cursor-not-allowed opacity-60"
              >
                Zablokowany (disabled)
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: TOGGLES, CONTROLS & INPUTS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b-2 border-slate-200 dark:border-slate-800 pb-2">
          <h2 className="text-base font-black uppercase tracking-wide text-slate-900 dark:text-white flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            2. Przełączniki, checkboxy i formularze (Toggles & Inputs)
          </h2>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Płaskie kontrolki z wyrazistym zaznaczeniem
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Toggles and Checkboxes */}
          <div className="rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5 shadow-none">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Płaskie przełączniki (Flat Toggles)
            </div>

            {/* Flat Toggle Switch */}
            <div className="flex items-center justify-between p-3 rounded-lg border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Automatyczne parsowanie AI
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Uruchamia lokalny model po zaimportowaniu
                </div>
              </div>
              <button
                type="button"
                onClick={() => setToggleActive(!toggleActive)}
                className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none ${
                  toggleActive
                    ? "border-blue-600 bg-blue-600"
                    : "border-slate-400 dark:border-slate-600 bg-slate-200 dark:bg-slate-800"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 ease-in-out mt-0.5 ml-0.5 ${
                    toggleActive ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Checkboxes */}
            <div className="space-y-3 pt-2">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Płaskie checkboxy (Flat Checkboxes)
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkboxState.opt1}
                  onChange={(e) =>
                    setCheckboxState({ ...checkboxState, opt1: e.target.checked })
                  }
                  className="h-4 w-4 rounded-sm border-2 border-blue-600 text-blue-600 focus:ring-0 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Pokazuj wyłącznie oferty z widełkami płacowymi
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkboxState.opt2}
                  onChange={(e) =>
                    setCheckboxState({ ...checkboxState, opt2: e.target.checked })
                  }
                  className="h-4 w-4 rounded-sm border-2 border-slate-400 dark:border-slate-600 text-blue-600 focus:ring-0 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Ukrywaj wygasłe ogłoszenia rekrutacyjne
                </span>
              </label>
            </div>
          </div>

          {/* Form Inputs */}
          <div className="rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5 shadow-none">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Pola tekstowe i filtry (Inputs with Bright Focus)
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Szukaj ofert:
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-blue-600 dark:text-blue-400" />
                <input
                  type="text"
                  placeholder="np. Python, Kubernetes, Remote..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-lg border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-blue-600 dark:focus:border-blue-400 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Tryb pracy (Select):
              </label>
              <select className="w-full px-3 py-2 text-xs font-bold rounded-lg border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-blue-600 dark:focus:border-blue-400 focus:outline-none transition-colors">
                <option>Wszystkie tryby (Zdalnie / Hybryda / Biuro)</option>
                <option>Tylko praca zdalna (100% remote)</option>
                <option>Hybryda</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: BADGES & STATUSES */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b-2 border-slate-200 dark:border-slate-800 pb-2">
          <h2 className="text-base font-black uppercase tracking-wide text-slate-900 dark:text-white flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500"></span>
            3. Etykiety i statusy rekrutacji (Badges & Tags)
          </h2>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Wyraziste, płaskie pastylki z mocnym obramowaniem
          </span>
        </div>

        <div className="rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-none">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Statusy ofert KandidFlow (Flat High-Contrast Pills)
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold border-2 border-slate-400 bg-slate-100 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-500"></span>
              {STATUS_LABELS.inbox}
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold border-2 border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/60 dark:text-blue-300">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
              {STATUS_LABELS.ready}
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold border-2 border-amber-500 bg-amber-50 text-amber-700 dark:border-amber-500 dark:bg-amber-950/60 dark:text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
              {STATUS_LABELS.applied}
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold border-2 border-purple-500 bg-purple-50 text-purple-700 dark:border-purple-500 dark:bg-purple-950/60 dark:text-purple-300">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500"></span>
              {STATUS_LABELS.interview}
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold border-2 border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              {STATUS_LABELS.offer}
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold border-2 border-rose-500 bg-rose-50 text-rose-700 dark:border-rose-500 dark:bg-rose-950/60 dark:text-rose-300">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
              {STATUS_LABELS.rejected}
            </span>
          </div>

          <div className="pt-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Tagi technologiczne (Bright Tech Tags)
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {["Python 3.12", "React 19", "FastAPI", "TypeScript", "Docker", "AWS", "Kubernetes", "Tailwind"].map(
              (tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 rounded text-xs font-bold border-2 border-blue-400/80 bg-blue-50/50 text-blue-800 dark:border-blue-500/60 dark:bg-blue-950/40 dark:text-blue-300"
                >
                  #{tag}
                </span>
              )
            )}
          </div>
        </div>
      </section>

      {/* SECTION 4: HARDCODED OFFERS LIST ROWS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b-2 border-slate-200 dark:border-slate-800 pb-2">
          <h2 className="text-base font-black uppercase tracking-wide text-slate-900 dark:text-white flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-purple-500"></span>
            4. Wiersze listy ofert pracy (Offer Rows — Hardcoded)
          </h2>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Płaskie wiersze z wyrazistymi obrysami akcji
          </span>
        </div>

        <div className="space-y-3">
          {MOCK_JOB_OFFERS.map((job) => {
            const isSelected = selectedRowId === job.id;
            return (
              <div
                key={job.id}
                onClick={() => setSelectedRowId(job.id)}
                className={`rounded-xl border-2 transition-all p-4 cursor-pointer shadow-none ${
                  isSelected
                    ? "border-blue-600 bg-blue-50/30 dark:border-blue-500 dark:bg-blue-950/20"
                    : "border-slate-200 hover:border-slate-400 bg-white dark:border-slate-800 dark:hover:border-slate-600 dark:bg-slate-900"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Position & Company */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase border-2 border-slate-400 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        {job.source_portal}
                      </span>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                        {job.role_title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-300 flex-wrap">
                      <span className="flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200">
                        <Building2 className="h-3.5 w-3.5 text-blue-600" />
                        {job.company_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        {job.location_raw}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        Termin: {job.application_deadline}
                      </span>
                    </div>
                  </div>

                  {/* Middle: Salary & Status */}
                  <div className="flex items-center gap-3 shrink-0 flex-wrap">
                    {/* Salary badge with bright emerald border */}
                    <div className="px-3 py-1.5 rounded-lg border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-black">
                      {job.salary_min?.toLocaleString()} - {job.salary_max?.toLocaleString()}{" "}
                      {job.salary_currency}
                    </div>

                    {/* Status Pill */}
                    <span
                      className={`px-2.5 py-1 rounded-md text-xs font-bold border-2 ${
                        job.status === "ready"
                          ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                          : job.status === "interview"
                          ? "border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                          : "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                      }`}
                    >
                      {STATUS_LABELS[job.status]}
                    </span>
                  </div>

                  {/* Right: Flat Action Outlines */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        alert(`Generowanie CV dla oferty: ${job.role_title}`);
                      }}
                      className="px-3 py-1.5 rounded-lg border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white font-bold text-xs bg-transparent transition-colors shadow-none cursor-pointer flex items-center gap-1.5"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>CV</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRowId(job.id);
                      }}
                      className="px-3 py-1.5 rounded-lg border-2 border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white font-bold text-xs bg-transparent transition-colors shadow-none cursor-pointer flex items-center gap-1.5"
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

      {/* SECTION 5: OFFER DETAILS CARD PREVIEW */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b-2 border-slate-200 dark:border-slate-800 pb-2">
          <h2 className="text-base font-black uppercase tracking-wide text-slate-900 dark:text-white flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-500"></span>
            5. Karta szczegółów oferty (Offer Details Card Preview)
          </h2>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Szczegółowy widok oferty w stylu płaskim
          </span>
        </div>

        <div className="rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 space-y-6 shadow-none">
          {/* Header of the details */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b-2 border-slate-200 dark:border-slate-800">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-sm bg-blue-600 text-white font-black text-xs uppercase">
                  {selectedJob.source_portal}
                </span>
                <span className="px-2.5 py-0.5 rounded-sm border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                  {STATUS_LABELS[selectedJob.status]}
                </span>
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                {selectedJob.role_title}
              </h3>
              <div className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-300">
                <span className="text-blue-600 dark:text-blue-400">
                  {selectedJob.company_name}
                </span>
                <span>•</span>
                <span>{selectedJob.work_model_details}</span>
              </div>
            </div>

            {/* Salary pill */}
            <div className="text-right space-y-1">
              <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                {selectedJob.salary_min?.toLocaleString()} - {selectedJob.salary_max?.toLocaleString()}{" "}
                {selectedJob.salary_currency}
              </div>
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {selectedJob.contract_type}
              </div>
            </div>
          </div>

          {/* Role Summary */}
          {selectedJob.structured_data?.role_summary && (
            <div className="space-y-2">
              <div className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Podsumowanie roli:
              </div>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border-2 border-slate-200 dark:border-slate-800">
                {selectedJob.structured_data.role_summary}
              </p>
            </div>
          )}

          {/* Must Have Requirements with bright tags */}
          <div className="space-y-2">
            <div className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Wymagania kluczowe (Must-have):
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-medium text-slate-800 dark:text-slate-200">
              {selectedJob.structured_data?.must_have.map((req, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 p-2.5 rounded-lg border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                >
                  <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t-2 border-slate-200 dark:border-slate-800">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Notatki: {selectedJob.notes || "Brak dodatkowych uwag"}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="px-4 py-2 rounded-lg border-2 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-slate-900 font-bold text-xs bg-transparent transition-colors shadow-none cursor-pointer"
              >
                Edytuj ofertę
              </button>
              <button
                type="button"
                className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs border-2 border-emerald-500 transition-colors shadow-none cursor-pointer flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                <span>Generuj dedykowane CV</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
