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
} from "lucide-react";
import { MOCK_JOB_OFFERS } from "./mockData";
import { STATUS_LABELS } from "../../lib/constants";

interface TestPageTwoProps {
  onBackToMenu: () => void;
  onSwitchPage: (pageId: "test-page-1" | "test-page-2" | "test-page-3") => void;
}

export const TestPageTwo: React.FC<TestPageTwoProps> = ({
  onBackToMenu,
  onSwitchPage,
}) => {
  const [toggleActive, setToggleActive] = useState(true);
  const [checkboxState, setCheckboxState] = useState({
    opt1: true,
    opt2: false,
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
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-xs cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Wróć do menu testowego</span>
          </button>

          {/* Quick Page Switcher */}
          <div className="inline-flex items-center gap-1.5 p-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs">
            <span className="text-slate-500 dark:text-slate-400 px-2 font-medium">
              Podstrony:
            </span>
            <button
              type="button"
              onClick={() => onSwitchPage("test-page-1")}
              className="px-3 py-1 rounded-lg font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              test-page-1
            </button>
            <button
              type="button"
              onClick={() => onSwitchPage("test-page-2")}
              className="px-3 py-1 rounded-lg font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs cursor-pointer"
            >
              test-page-2
            </button>
            <button
              type="button"
              onClick={() => onSwitchPage("test-page-3")}
              className="px-3 py-1 rounded-lg font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              test-page-3
            </button>
          </div>
        </div>

        {/* Style Banner Card */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-linear-to-b from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-950 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold">
                <Sparkles className="h-3 w-3 text-indigo-500" />
                <span>test-page-2</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Styl Nowoczesny Soft Minimalizm (Subtle Shadows & Smooth Curves)
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
                <strong>Opis stylu:</strong> Delikatne mikro-cienie, zaokrąglone narożniki (rounded-xl/2xl),
                stonowana paleta szarości i indygo, miękkie przejścia i pastelowe odznaki statusów.
                Wariant przeznaczony do bezpośredniego porównania z surowym, płaskim stylem test-page-1.
              </p>
            </div>
            <div className="shrink-0">
              <span className="inline-block px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium text-xs">
                Wariant referencyjny
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: BUTTONS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
            1. Przyciski i akcje (Soft Buttons)
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Zaokrąglone krawędzie i miękkie cienie
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6 shadow-xs">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Przyciski pełne (Solid Soft)
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm shadow-xs transition-all cursor-pointer flex items-center gap-2 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                <Plus className="h-4 w-4" />
                <span>Dodaj ofertę</span>
              </button>

              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-all cursor-pointer flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                <span>Generuj CV</span>
              </button>

              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-all cursor-pointer flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                <span>Zaplanuj etap</span>
              </button>

              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 dark:bg-rose-950/40 dark:text-rose-300"
              >
                <Trash2 className="h-4 w-4" />
                <span>Usuń</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Przyciski z obrysem (Soft Outline)
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-xs sm:text-sm transition-all shadow-2xs cursor-pointer flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                <span>Podgląd CV</span>
              </button>

              <button
                type="button"
                className="px-4 py-2 rounded-xl border border-indigo-200 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 font-semibold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                <span>Asystent AI</span>
              </button>

              <button
                type="button"
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs sm:text-sm transition-all cursor-pointer"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: TOGGLES & INPUTS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-slate-500"></span>
            2. Przełączniki i formularze (Soft Controls)
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Zaokrąglone pastylki i łagodne ringi
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                  Automatyczne parsowanie AI
                </div>
                <div className="text-[11px] text-slate-500">
                  Uruchamia lokalny model po zaimportowaniu
                </div>
              </div>
              <button
                type="button"
                onClick={() => setToggleActive(!toggleActive)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                  toggleActive ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out mt-0.5 ml-0.5 ${
                    toggleActive ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="space-y-3 pt-1">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkboxState.opt1}
                  onChange={(e) =>
                    setCheckboxState({ ...checkboxState, opt1: e.target.checked })
                  }
                  className="h-4 w-4 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300">
                  Pokazuj wyłącznie oferty z widełkami płacowymi
                </span>
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-xs">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Szukaj ofert:
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="np. Python, Kubernetes, Remote..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 focus:outline-none transition-all shadow-2xs"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: BADGES */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            3. Etykiety i statusy (Soft Pastel Badges)
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Pastelowe tła i miękkie pille
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {STATUS_LABELS.inbox}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              {STATUS_LABELS.ready}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              {STATUS_LABELS.applied}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
              {STATUS_LABELS.interview}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              {STATUS_LABELS.offer}
            </span>
          </div>
        </div>
      </section>

      {/* SECTION 4: HARDCODED ROWS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500"></span>
            4. Wiersze listy ofert pracy (Soft Rows — Hardcoded)
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Wiersze z miękkim cieniem i zaokrągleniami
          </span>
        </div>

        <div className="space-y-3">
          {MOCK_JOB_OFFERS.map((job) => {
            const isSelected = selectedRowId === job.id;
            return (
              <div
                key={job.id}
                onClick={() => setSelectedRowId(job.id)}
                className={`rounded-2xl border transition-all p-4 cursor-pointer ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-50/20 shadow-md dark:border-indigo-500 dark:bg-indigo-950/20"
                    : "border-slate-200/80 hover:border-slate-300 bg-white dark:border-slate-800 dark:hover:border-slate-700 dark:bg-slate-900 shadow-xs"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {job.source_portal}
                      </span>
                      <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white truncate">
                        {job.role_title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        {job.company_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        {job.location_raw}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 flex-wrap">
                    <div className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                      {job.salary_min?.toLocaleString()} - {job.salary_max?.toLocaleString()}{" "}
                      {job.salary_currency}
                    </div>

                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {STATUS_LABELS[job.status]}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-xs transition-colors cursor-pointer flex items-center gap-1"
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

      {/* SECTION 5: DETAILS CARD PREVIEW */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-purple-500"></span>
            5. Karta szczegółów oferty (Soft Detail Card Preview)
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Podgląd oferty w stylu soft
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium">
                  {selectedJob.source_portal}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                  {STATUS_LABELS[selectedJob.status]}
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {selectedJob.role_title}
              </h3>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>{selectedJob.company_name}</span>
                <span>•</span>
                <span>{selectedJob.work_model_details}</span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {selectedJob.salary_min?.toLocaleString()} - {selectedJob.salary_max?.toLocaleString()}{" "}
                {selectedJob.salary_currency}
              </div>
              <div className="text-xs text-slate-400">{selectedJob.contract_type}</div>
            </div>
          </div>

          {selectedJob.structured_data?.role_summary && (
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50/60 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              {selectedJob.structured_data.role_summary}
            </p>
          )}

          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Wymagania:
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300">
              {selectedJob.structured_data?.must_have.map((req, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800"
                >
                  <Check className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};
