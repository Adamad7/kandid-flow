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
    icon: <Inbox className="h-4 w-4 text-slate-500 dark:text-slate-400" />,
    headerColor: "bg-slate-100/80 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-200 dark:border-slate-700",
  },
  {
    id: "ready_col",
    title: "Gotowe do aplikacji",
    statuses: ["ready"],
    icon: <CheckCircle className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />,
    headerColor: "bg-indigo-50/80 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800",
  },
  {
    id: "applied_col",
    title: "Zaaplikowano",
    statuses: ["applied"],
    icon: <Send className="h-4 w-4 text-amber-500 dark:text-amber-400" />,
    headerColor: "bg-amber-50/80 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
  },
  {
    id: "interview_col",
    title: "Rozmowy rekrutacyjne",
    statuses: ["interview"],
    icon: <Users className="h-4 w-4 text-purple-500 dark:text-purple-400" />,
    headerColor: "bg-purple-50/80 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
  },
  {
    id: "offer_col",
    title: "Oferty",
    statuses: ["offer"],
    icon: <Award className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />,
    headerColor: "bg-emerald-50/80 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
  },
  {
    id: "rejected_col",
    title: "Odrzucone",
    statuses: ["rejected"],
    icon: <XCircle className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />,
    headerColor: "bg-zinc-100/80 text-zinc-600 border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700",
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
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-3 max-w-xl">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <Input
                placeholder="Szukaj po stanowisku, firmie, technologii..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <Button
              size="sm"
              variant={showFilters ? "primary" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
              className="text-xs shrink-0"
            >
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              Filtry
              {hasActiveFilters && (
                <span className="ml-1.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-1.5 py-0.2 text-[10px] font-bold">
                  !
                </span>
              )}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={fetchJobs}
              isLoading={isLoading}
              className="text-xs shrink-0"
              title="Odśwież tablicę ofert"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Collapsible Filters */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tryb pracy:
              </label>
              <select
                value={workModelFilter}
                onChange={(e) => setWorkModelFilter(e.target.value)}
                className="w-full text-xs rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="all">Wszystkie tryby</option>
                <option value="remote">Tylko zdalnie</option>
                <option value="hybrid">Hybrydowo</option>
                <option value="onsite">W biurze</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Portal źródłowy:
              </label>
              <select
                value={portalFilter}
                onChange={(e) => setPortalFilter(e.target.value)}
                className="w-full text-xs rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Minimalne zarobki (PLN):
              </label>
              <Input
                type="number"
                placeholder="np. 15000"
                value={minSalaryFilter}
                onChange={(e) => setMinSalaryFilter(e.target.value)}
                className="h-[34px] text-xs"
              />
            </div>

            <div className="flex items-end">
              <Button
                size="sm"
                variant="outline"
                onClick={clearFilters}
                className="text-xs w-full"
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
              className="flex flex-col rounded-xl border border-slate-200/90 bg-slate-50/80 p-3 w-[295px] min-w-[295px] shrink-0 shadow-xs dark:border-slate-800 dark:bg-slate-900/60"
            >
              {/* Column Header */}
              <div
                className={`flex items-center justify-between rounded-lg border px-3 py-2.5 mb-3 shadow-xs font-medium text-xs ${col.headerColor}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {col.icon}
                  <span className="font-semibold truncate">{col.title}</span>
                </div>
                <span className="rounded-full bg-white/90 px-2 py-0.5 font-bold shadow-xs shrink-0 text-slate-700 dark:bg-slate-800 dark:text-slate-200 ml-2">
                  {colJobs.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="space-y-3 min-h-[160px]">
                {colJobs.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200/90 bg-white/40 p-5 text-center flex flex-col items-center justify-center min-h-[120px] dark:border-slate-800 dark:bg-slate-900/20">
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Brak ofert</p>
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
                      isReparsing={reparsingIds.has(job.id)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
