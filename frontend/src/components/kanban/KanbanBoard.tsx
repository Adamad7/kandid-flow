import React, { useEffect, useState, useMemo } from "react";
import {
  Search,
  Filter,
  RefreshCw,
  Inbox,
  CheckCircle,
  Send,
  Users,
  Award,
  XCircle,
} from "lucide-react";
import { api } from "../../lib/api";
import type {
  JobOfferRead,
  JobStatusType,
} from "../../types";
import { KanbanCard } from "./KanbanCard";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { StatusTransitionModal } from "../modals/StatusTransitionModal";
import { FollowUpModal } from "../modals/FollowUpModal";

interface KanbanBoardProps {
  onSelectJob: (job: JobOfferRead) => void;
  onGenerateCV: (job: JobOfferRead) => void;
  refreshTrigger?: number;
  onSwitchView?: (view: "kanban" | "list") => void;
}

interface ColumnDef {
  id: string;
  title: string;
  statuses: JobStatusType[];
  icon: React.ReactNode;
  headerColor: string;
}

const COLUMNS: ColumnDef[] = [
  {
    id: "inbox_col",
    title: "Do przetworzenia",
    statuses: ["inbox", "parsing", "failed_parsing"],
    icon: <Inbox className="h-4 w-4 text-slate-500 dark:text-neutral-400" />,
    headerColor: "bg-slate-100 text-slate-700 border-2 border-slate-300 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-600",
  },
  {
    id: "ready_col",
    title: "Gotowe do aplikacji",
    statuses: ["ready"],
    icon: <CheckCircle className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />,
    headerColor: "bg-indigo-50 text-indigo-700 border-2 border-indigo-400 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-600",
  },
  {
    id: "applied_col",
    title: "Zaaplikowano",
    statuses: ["applied"],
    icon: <Send className="h-4 w-4 text-amber-500 dark:text-amber-400" />,
    headerColor: "bg-amber-50 text-amber-700 border-2 border-amber-400 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-600",
  },
  {
    id: "interview_col",
    title: "Rozmowy rekrutacyjne",
    statuses: ["interview"],
    icon: <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />,
    headerColor: "bg-purple-50 text-purple-700 border-2 border-purple-400 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-600",
  },
  {
    id: "offer_col",
    title: "Oferty",
    statuses: ["offer"],
    icon: <Award className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />,
    headerColor: "bg-emerald-50 text-emerald-700 border-2 border-emerald-400 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-600",
  },
  {
    id: "rejected_col",
    title: "Odrzucone",
    statuses: ["rejected"],
    icon: <XCircle className="h-4 w-4 text-rose-500 dark:text-rose-400" />,
    headerColor: "bg-rose-50 text-rose-700 border-2 border-red-400 dark:bg-rose-950/60 dark:text-rose-300 dark:border-red-600",
  },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  onSelectJob,
  onGenerateCV,
  refreshTrigger,
}) => {
  const [jobs, setJobs] = useState<JobOfferRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reparsingIds, setReparsingIds] = useState<Set<string>>(new Set());

  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [workModelFilter, setWorkModelFilter] = useState<string>("all");
  const [portalFilter, setPortalFilter] = useState<string>("all");
  const [minSalaryFilter, setMinSalaryFilter] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  // Status transition & Follow-up modal states
  const [statusTransitionJob, setStatusTransitionJob] = useState<JobOfferRead | null>(null);
  const [followUpJob, setFollowUpJob] = useState<JobOfferRead | null>(null);

  const fetchJobs = async () => {
    try {
      setIsLoading(true);
      const data = await api.jobs.list({
        limit: 150,
      });
      setJobs(data);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [refreshTrigger]);

  const handleStatusChange = async (
    job: JobOfferRead,
    newStatus: JobStatusType
  ) => {
    if (newStatus === "applied" && !job.applied_at) {
      setStatusTransitionJob(job);
      return;
    }
    try {
      const updated = await api.jobs.update(job.id, { status: newStatus });
      setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
    } catch {
      alert("Nie udało się zaktualizować statusu oferty.");
    }
  };

  const handleReparse = async (
    job: JobOfferRead,
    mode: "ai" | "traditional" = "ai"
  ) => {
    try {
      setReparsingIds((prev) => new Set(prev).add(job.id));
      const updated = await api.jobs.reparse(job.id, mode);
      setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
    } catch {
      alert(
        mode === "ai"
          ? "Nie udało się sparsować oferty przez AI. Upewnij się, że Ollama działa lokalnie lub uzupełnij klucz API w pliku .env."
          : "Nie udało się przeprowadzić tradycyjnego parsowania oferty."
      );
    } finally {
      setReparsingIds((prev) => {
        const next = new Set(prev);
        next.delete(job.id);
        return next;
      });
    }
  };

  const handleDelete = async (job: JobOfferRead) => {
    if (
      !window.confirm(
        `Czy na pewno chcesz usunąć ofertę "${
          job.role_title || "Bez tytułu"
        }"? Spowoduje to również usunięcie powiązanych etapów i wersji CV.`
      )
    ) {
      return;
    }
    try {
      await api.jobs.delete(job.id);
      setJobs((prev) => prev.filter((j) => j.id !== job.id));
    } catch {
      alert("Nie udało się usunąć oferty.");
    }
  };

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Search query (company, title, location, tech stack)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const titleMatch = (job.role_title || "").toLowerCase().includes(query);
        const compMatch = (job.company_name || "").toLowerCase().includes(query);
        const matchLocation = (job.locations || []).some((l) =>
          l.toLowerCase().includes(query)
        );
        const matchTech = (
          job.structured_data?.tech_stack || []
        ).some((t) => t.toLowerCase().includes(query));
        if (!titleMatch && !compMatch && !matchLocation && !matchTech) return false;
      }

      // Work model
      if (workModelFilter !== "all" && job.work_model !== workModelFilter) {
        return false;
      }

      // Portal
      if (portalFilter !== "all" && job.source_portal !== portalFilter) {
        return false;
      }

      // Salary min
      if (minSalaryFilter) {
        const minVal = Number(minSalaryFilter);
        if (!isNaN(minVal) && minVal > 0) {
          const maxSalary = job.salary_max || job.salary_min || 0;
          if (maxSalary < minVal) return false;
        }
      }

      return true;
    });
  }, [jobs, searchTerm, workModelFilter, portalFilter, minSalaryFilter]);

  const clearFilters = () => {
    setSearchTerm("");
    setWorkModelFilter("all");
    setPortalFilter("all");
    setMinSalaryFilter("");
  };

  const hasActiveFilters =
    searchTerm ||
    workModelFilter !== "all" ||
    portalFilter !== "all" ||
    minSalaryFilter;

  return (
    <div className="space-y-4">
      {/* Top Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-none dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-3 max-w-xl">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-indigo-500 dark:text-indigo-400" />
              <Input
                placeholder="Szukaj po stanowisku, firmie, technologii..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9.5 text-xs"
              />
            </div>

            <Button
              size="sm"
              variant={showFilters ? "primary" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
              className="text-xs shrink-0 rounded-xl"
            >
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              Filtry
              {hasActiveFilters && (
                <span className="ml-1.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 px-1.5 py-0.2 text-[10px] font-bold">
                  !
                </span>
              )}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={fetchJobs}
              isLoading={isLoading}
              className="text-xs shrink-0 rounded-xl"
              title="Odśwież tablicę ofert"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Collapsible Filters */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-neutral-800/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                Tryb pracy:
              </label>
              <select
                value={workModelFilter}
                onChange={(e) => setWorkModelFilter(e.target.value)}
                className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50/60 dark:bg-neutral-950 px-2.5 py-2 text-slate-800 dark:text-neutral-200 focus:bg-white dark:focus:bg-neutral-900 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all cursor-pointer"
              >
                <option value="all">Wszystkie tryby</option>
                <option value="remote">Tylko zdalnie</option>
                <option value="hybrid">Hybrydowo</option>
                <option value="onsite">W biurze</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                Portal źródłowy:
              </label>
              <select
                value={portalFilter}
                onChange={(e) => setPortalFilter(e.target.value)}
                className="w-full text-xs font-medium rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50/60 dark:bg-neutral-950 px-2.5 py-2 text-slate-800 dark:text-neutral-200 focus:bg-white dark:focus:bg-neutral-900 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all cursor-pointer"
              >
                <option value="all">Wszystkie portale</option>
                <option value="justjoin">Just Join IT</option>
                <option value="pracuj">Pracuj.pl</option>
                <option value="nofluffjobs">No Fluff Jobs</option>
                <option value="linkedin">LinkedIn</option>
                <option value="generic">Inny portal</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                Minimalne zarobki (PLN):
              </label>
              <Input
                type="number"
                placeholder="np. 15000"
                value={minSalaryFilter}
                onChange={(e) => setMinSalaryFilter(e.target.value)}
                className="h-9.5 text-xs"
              />
            </div>

            <div className="flex items-end">
              <Button
                size="sm"
                variant="outline"
                onClick={clearFilters}
                className="text-xs w-full rounded-xl"
              >
                Wyczyść filtry
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Kanban Columns Layout */}
      <div className="flex gap-4 items-start overflow-x-auto pb-6 pt-1 kanban-scrollbar">
        {COLUMNS.map((col) => {
          const colJobs = filteredJobs.filter((job) =>
            col.statuses.includes(job.status)
          );

          return (
            <div
              key={col.id}
              className="flex flex-col rounded-2xl bg-slate-100/70 p-3.5 w-[300px] min-w-[300px] shrink-0 shadow-none dark:bg-neutral-900/50"
            >
              {/* Column Header */}
              <div
                className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 mb-3 shadow-none font-semibold text-xs ${col.headerColor}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {col.icon}
                  <span className="font-semibold truncate">{col.title}</span>
                </div>
                <span className="rounded-full bg-white/95 px-2.5 py-0.5 font-bold shadow-none shrink-0 text-slate-800 dark:bg-neutral-900 dark:text-white ml-2 border border-slate-200/60 dark:border-neutral-700/60">
                  {colJobs.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="space-y-3 min-h-[160px]">
                {colJobs.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200/90 bg-white/40 p-5 text-center flex flex-col items-center justify-center min-h-[120px] dark:border-neutral-800 dark:bg-neutral-900/20">
                    <p className="text-xs text-slate-400 dark:text-neutral-500 font-medium">Brak ofert</p>
                  </div>
                ) : (
                  colJobs.map((job) => (
                    <KanbanCard
                      key={job.id}
                      job={job}
                      onSelect={onSelectJob}
                      onGenerateCV={onGenerateCV}
                      onStatusChange={handleStatusChange}
                      onReparse={handleReparse}
                      onDelete={handleDelete}
                      onOpenFollowUp={(j) => setFollowUpJob(j)}
                      onOpenApplicationDetails={(j) => setStatusTransitionJob(j)}
                      isReparsing={reparsingIds.has(job.id)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Status Transition Modal */}
      {statusTransitionJob && (
        <StatusTransitionModal
          job={statusTransitionJob}
          isOpen={!!statusTransitionJob}
          onClose={() => setStatusTransitionJob(null)}
          onSuccess={(updated) => {
            setStatusTransitionJob(null);
            setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
          }}
        />
      )}

      {/* Follow-up Generator Modal */}
      {followUpJob && (
        <FollowUpModal
          job={followUpJob}
          isOpen={!!followUpJob}
          onClose={() => setFollowUpJob(null)}
        />
      )}
    </div>
  );
};
