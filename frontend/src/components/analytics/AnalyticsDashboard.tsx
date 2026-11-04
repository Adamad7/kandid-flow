import React, { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Clock,
  Send,
  Users,
  Award,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Building,
  Archive,
} from "lucide-react";
import { api } from "../../lib/api";
import type { AnalyticsOverviewResponse, JobOfferRead } from "../../types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { FollowUpModal } from "../modals/FollowUpModal";

interface AnalyticsDashboardProps {
  onSelectJob?: (job: JobOfferRead) => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  onSelectJob,
}) => {
  const [data, setData] = useState<AnalyticsOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [followUpJob, setFollowUpJob] = useState<JobOfferRead | null>(null);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const res = await api.analytics.getOverview();
      setData(res);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleOpenFollowUp = async (jobId: string) => {
    try {
      const job = await api.jobs.get(jobId);
      setFollowUpJob(job);
    } catch {
      alert("Nie udało się pobrać szczegółów oferty.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-none dark:border-transparent dark:bg-neutral-900">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-neutral-100">
                Analityka i Skuteczność Rekrutacji
              </h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Śledź konwersję w lejku, skuteczność portali i czas oczekiwania na odpowiedź
              </p>
            </div>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={fetchAnalytics}
          isLoading={isLoading}
          className="text-xs self-start sm:self-auto rounded-xl shadow-none font-semibold border-2 border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Odśwież statystyki
        </Button>
      </div>

      {isLoading && !data ? (
        <div className="p-16 text-center text-sm text-slate-500 dark:text-neutral-400">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-600 mb-2" />
          Obliczanie wskaźników rekrutacyjnych...
        </div>
      ) : !data ? (
        <div className="p-12 text-center text-xs text-slate-500 dark:text-neutral-500">
          Brak danych analitycznych.
        </div>
      ) : (
        <>
          {/* Top KPI Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            <Card className="p-4 border-slate-200/80 dark:border-transparent dark:bg-neutral-900 shadow-none">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                Wszystkie oferty
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-neutral-100 mt-1">
                {data.total_offers}
              </div>
              <span className="text-[10px] text-slate-400 dark:text-neutral-500">
                W bazie danych
              </span>
            </Card>

            <Card className="p-4 border-slate-200/80 dark:border-transparent bg-amber-50/20 dark:bg-amber-950/10 shadow-none">
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <Send className="h-3 w-3" />
                Zaaplikowano
              </span>
              <div className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">
                {data.applied_count}
              </div>
              <span className="text-[10px] text-slate-400 dark:text-neutral-500">
                Oczekuje na kontakt
              </span>
            </Card>

            <Card className="p-4 border-slate-200/80 dark:border-transparent bg-purple-50/20 dark:bg-purple-950/10 shadow-none">
              <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1">
                <Users className="h-3 w-3" />
                Rozmowy
              </span>
              <div className="text-2xl font-black text-purple-700 dark:text-purple-300 mt-1">
                {data.interview_count}
              </div>
              <span className="text-[10px] text-slate-400 dark:text-neutral-500">
                Etapy rekrutacji
              </span>
            </Card>

            <Card className="p-4 border-slate-200/80 dark:border-transparent bg-emerald-50/20 dark:bg-emerald-950/10 shadow-none">
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <Award className="h-3 w-3" />
                Oferty pracy
              </span>
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
                {data.offer_count}
              </div>
              <span className="text-[10px] text-slate-400 dark:text-neutral-500">
                Sukcesy
              </span>
            </Card>

            <Card className="p-4 border-slate-200/80 dark:border-transparent bg-indigo-50/20 dark:bg-indigo-950/10 shadow-none">
              <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Odpowiedzi
              </span>
              <div className="text-2xl font-black text-indigo-700 dark:text-indigo-300 mt-1">
                {data.overall_response_rate}%
              </div>
              <span className="text-[10px] text-slate-400 dark:text-neutral-500">
                Konwersja z aplikacji
              </span>
            </Card>

            <Card className="p-4 border-slate-200/80 dark:border-transparent dark:bg-neutral-900 shadow-none">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Czas do kontaktu
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-neutral-100 mt-1">
                {data.average_response_days !== null ? `${data.average_response_days} d.` : "—"}
              </div>
              <span className="text-[10px] text-slate-400 dark:text-neutral-500">
                Średnia dni do rozmowy
              </span>
            </Card>

            <Card className="p-4 border-slate-200/80 dark:border-transparent bg-stone-50/20 dark:bg-stone-950/10 shadow-none">
              <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider flex items-center gap-1">
                <Archive className="h-3 w-3" />
                Zarchiwizowane
              </span>
              <div className="text-2xl font-black text-stone-700 dark:text-stone-300 mt-1">
                {data.archived_count ?? 0}
              </div>
              <span className="text-[10px] text-slate-400 dark:text-neutral-500">
                Wygasłe lub w archiwum
              </span>
            </Card>
          </div>

          {/* Stale Applications / Ghosting Alert Box */}
          {data.stale_applications.length > 0 && (
            <div className="rounded-2xl border-2 border-amber-300 dark:border-amber-700/60 bg-amber-50/60 p-5 dark:bg-amber-950/20 shadow-none">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-neutral-100">
                    Aplikacje oczekujące na kontakt (Wymagany follow-up)
                  </h3>
                  <Badge variant="warning" className="text-[10px]">
                    {data.stale_applications.length}
                  </Badge>
                </div>
                <span className="text-xs text-slate-500 dark:text-neutral-400">
                  Aplikacje wysłane ponad 7 dni temu bez zaplanowanego etapu
                </span>
              </div>

              <div className="divide-y divide-amber-200/60 dark:divide-amber-900/40">
                {data.stale_applications.slice(0, 5).map((app) => (
                  <div
                    key={app.job_id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900 dark:text-neutral-100">
                          {app.role_title}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-neutral-400 flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {app.company_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-neutral-400">
                        <span>Wysłano: {app.applied_at}</span>
                        <span>•</span>
                        <span
                          className={
                            app.is_ghosting_risk
                              ? "font-semibold text-rose-600 dark:text-rose-400"
                              : "font-semibold text-amber-600 dark:text-amber-400"
                          }
                        >
                          {app.days_waiting} dni bez odpowiedzi
                          {app.is_ghosting_risk ? " (ryzyko ghostingu)" : ""}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {onSelectJob && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              const job = await api.jobs.get(app.job_id);
                              onSelectJob(job);
                            } catch {
                              // ignore
                            }
                          }}
                          className="text-xs h-7.5 bg-white dark:bg-neutral-900 rounded-xl font-semibold shadow-none border border-slate-200 dark:border-neutral-700"
                        >
                          Zobacz ofertę
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenFollowUp(app.job_id)}
                        className="text-xs h-7.5 bg-white dark:bg-neutral-900 text-indigo-700 dark:text-indigo-400 border-2 border-indigo-200 dark:border-indigo-900/60 rounded-xl font-semibold shadow-none"
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        Generuj follow-up
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recruitment Funnel & Work Models Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Funnel Card (2 cols) */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-none dark:border-transparent dark:bg-neutral-900 space-y-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-neutral-100">
                  Lejek konwersji procesu rekrutacyjnego
                </h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Progresja kandydatur od zrzucenia ogłoszenia do otrzymania oferty
                </p>
              </div>

              <div className="space-y-3 pt-2">
                {data.funnel.map((stage, idx) => (
                  <div key={stage.stage} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800 dark:text-neutral-200">
                        {idx + 1}. {stage.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-neutral-100">
                          {stage.count}
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-neutral-500 w-12 text-right">
                          ({stage.percentage}%)
                        </span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-2 w-full bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-600 to-violet-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(stage.percentage, 2)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Work Model Distribution (1 col) */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-none dark:border-transparent dark:bg-neutral-900 space-y-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-neutral-100">
                  Tryb pracy
                </h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Rozkład poszukiwanych stanowisk
                </p>
              </div>

              <div className="space-y-3 pt-2">
                {data.work_models.map((wm) => (
                  <div key={wm.work_model} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-neutral-300">
                        {wm.label}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-neutral-100">
                        {wm.count} ({wm.percentage}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${wm.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Portals Comparison Table */}
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-none dark:border-transparent dark:bg-neutral-900 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-neutral-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-neutral-100">
                Skuteczność portali ogłoszeniowych
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Porównanie liczby ofert, wysłanych aplikacji i wskaźnika odpowiedzi
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-neutral-950 border-b border-slate-200/80 dark:border-neutral-800 font-semibold text-slate-600 dark:text-neutral-300">
                  <tr>
                    <th className="px-5 py-3">Portal źródłowy</th>
                    <th className="px-5 py-3 text-center">Zapisane</th>
                    <th className="px-5 py-3 text-center">Zaaplikowano</th>
                    <th className="px-5 py-3 text-center">Rozmowy</th>
                    <th className="px-5 py-3 text-center">Oferty</th>
                    <th className="px-5 py-3 text-right">Wskaźnik odpowiedzi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-neutral-800 text-slate-800 dark:text-neutral-200">
                  {data.portals.map((p) => (
                    <tr
                      key={p.portal}
                      className="hover:bg-slate-50/60 dark:hover:bg-neutral-850/60 transition-colors"
                    >
                      <td className="px-5 py-3 font-semibold text-slate-900 dark:text-neutral-100">
                        {p.label}
                      </td>
                      <td className="px-5 py-3 text-center">{p.total_offers}</td>
                      <td className="px-5 py-3 text-center font-medium text-amber-700 dark:text-amber-400">
                        {p.applied_count}
                      </td>
                      <td className="px-5 py-3 text-center font-medium text-purple-700 dark:text-purple-400">
                        {p.interview_count}
                      </td>
                      <td className="px-5 py-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {p.offer_count}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span
                          className={`inline-block font-semibold px-2.5 py-0.5 rounded-full border-2 text-xs shadow-none ${
                            p.response_rate >= 20
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                              : p.response_rate >= 10
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800"
                              : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700"
                          }`}
                        >
                          {p.response_rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Follow-up modal if triggered from stale list */}
      <FollowUpModal
        isOpen={Boolean(followUpJob)}
        onClose={() => setFollowUpJob(null)}
        job={followUpJob}
      />
    </div>
  );
};
