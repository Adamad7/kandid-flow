import React from "react";
import {
  Palette,
  Sparkles,
  ArrowRight,
  Sliders,
  CheckCircle2,
  Layout,
} from "lucide-react";

interface TestMenuProps {
  onSelectPage: (pageId: "test-page-1" | "test-page-2") => void;
}

export const TestMenu: React.FC<TestMenuProps> = ({ onSelectPage }) => {
  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2">
      {/* Hero / Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-linear-to-r from-blue-50/60 via-indigo-50/40 to-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Sandbox Wizualny KandidFlow</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Menu Testowe Stylów Interfejsu (UI Styles)
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              Przestrzeń do weryfikacji i porównywania nowych kierunków wizualnych aplikacji.
              Każda podstrona prezentuje ten sam zestaw powtarzalnych elementów KandidFlow
              (przyciski, przełączniki, odznaki, wiersze ofert, karty szczegółów) w odmiennej estetyce.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs dark:bg-slate-800 dark:border-slate-700 text-blue-600 dark:text-blue-400">
              <Palette className="h-8 w-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Pages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card: Test Page 1 (Requested by User) */}
        <div className="relative group rounded-2xl border-2 border-blue-500/40 hover:border-blue-500 bg-white dark:bg-slate-900 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm shadow-xs">
                  1
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    test-page-1
                  </h2>
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                    Styl Płaski z Żywymi Akcentami
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                Główny test
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Nowoczesna, płaska estetyka (brak ciężkich cieni, ostre i zdefiniowane granice)
              połączona z <strong>jaskrawymi, żywymi elementami akcentującymi</strong> — nasycone
              przyciski, wyraziste neonowe obrysy (outlines), mocne indygo, szmaragd i bursztyn
              oraz wysoki kontrast.
            </p>

            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Elementy demonstracyjne:
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  Żywe przyciski i akcenty
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  Wyraziste obrysy (outlines)
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  Płaskie wiersze ofert (3 oferty)
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  Płaska karta szczegółów oferty
                </span>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button
              type="button"
              onClick={() => onSelectPage("test-page-1")}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors shadow-xs active:scale-[0.99] cursor-pointer"
            >
              <span>Otwórz test-page-1 (Styl Płaski)</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Card: Test Page 2 (Comparative Variant) */}
        <div className="relative group rounded-2xl border border-slate-200 hover:border-slate-400 bg-white dark:bg-slate-900 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 dark:bg-slate-700 text-white font-bold text-sm shadow-xs">
                  2
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                    test-page-2
                  </h2>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Nowoczesny Soft Minimalizm
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Wariant porównawczy
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Łagodny styl z subtelnymi cieniami, zaokrąglonymi kształtami oraz spokojniejszą,
              elegancką paletą barw (stonowane indygo, łagodne pastele, miękki podział sekcji).
              Pozwala na bezpośrednie porównanie z ostrym stylem płaskim.
            </p>

            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Elementy demonstracyjne:
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  Subtelne cienie i miękkie zaokrąglenia
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  Pastelowe badge statusów
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  Wiersze ofert z efektem hover
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  Karta detali z miękkim cieniem
                </span>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button
              type="button"
              onClick={() => onSelectPage("test-page-2")}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-colors shadow-xs active:scale-[0.99] cursor-pointer dark:bg-slate-700 dark:hover:bg-slate-600"
            >
              <span>Otwórz test-page-2 (Styl Soft)</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Guidelines / Info Section */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Wskazówki dotyczące testowania
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              <strong>Izolacja danych:</strong> Wszystkie dane na stronach testowych są bezpiecznie zmockowane (brak wpływu na bazę PostgreSQL).
            </span>
          </div>
          <div className="flex items-start gap-2">
            <Sliders className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <span>
              <strong>Sprawdź tryb ciemny:</strong> Użyj przełącznika motywu w prawym górnym rogu paska, aby ocenić kontrast obu stylów.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <Layout className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
            <span>
              <strong>Spójność komponentów:</strong> Obie strony prezentują dokładnie te same kontrolki i oferty w celu ułatwienia oceny.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
