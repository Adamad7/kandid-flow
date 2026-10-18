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
  LayoutDashboard,
  List,
} from "lucide-react";
import { api } from "../../lib/api";
import type {
  JobOfferRead,
  JobStatusType,
} from "../../types";
import { KanbanCard } from "./KanbanCard";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";

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
  onSwitchView,
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
      // Search query (company or title)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const titleMatch = (job.role_title || "").toLowerCase().includes(query);
        const compMatch = (job.company_name || "").toLowerCase().includes(query);
        if (!titleMatch && !compMatch) return false;
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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Szukaj po stanowisku lub firmie..."
            className="w-full pl-9 pr-4 py-1.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={showFilters ? "secondary" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className="text-xs"
          >
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            Filtry
            {hasActiveFilters && (
              <span className="ml-1.5 rounded-full bg-blue-600 px-1.5 py-0.2 text-[10px] text-white">
                !
              </span>
            )}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={fetchJobs}
            isLoading={isLoading}
            className="text-xs"
            title="Odśwież tablicę"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>

          {onSwitchView && (
            <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50 dark:border-slate-800 dark:bg-slate-800 ml-1">
              <button
                type="button"
                onClick={() => onSwitchView("kanban")}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                title="Widok tablicy Kanban"
              >
                <LayoutDashboard className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span className="hidden sm:inline">Tablica</span>
              </button>
              <button
                type="button"
                onClick={() => onSwitchView("list")}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                title="Widok listy ofert"
              >
                <List className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Lista</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Filter Panel */}
      {showFilters && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-4 dark:bg-slate-900/60 dark:border-slate-800">
          <Select
            label="Tryb pracy"
            value={workModelFilter}
            onChange={(e) => setWorkModelFilter(e.target.value)}
          >
            <option value="all">Wszystkie tryby</option>
            <option value="remote">Zdalnie</option>
            <option value="hybrid">Hybrydowo</option>
            <option value="onsite">W biurze</option>
          </Select>

          <Select
            label="Portal źródłowy"
            value={portalFilter}
            onChange={(e) => setPortalFilter(e.target.value)}
          >
            <option value="all">Wszystkie portale</option>
            <option value="justjoin">Just Join IT</option>
            <option value="pracuj">Pracuj.pl</option>
            <option value="nofluffjobs">No Fluff Jobs</option>
            <option value="linkedin">LinkedIn</option>
            <option value="generic">Inny portal</option>
          </Select>

          <Input
            label="Minimalne wynagrodzenie (PLN)"
            type="number"
            placeholder="np. 15000"
            value={minSalaryFilter}
            onChange={(e) => setMinSalaryFilter(e.target.value)}
          />

          {hasActiveFilters && (
            <div className="sm:col-span-3 flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={clearFilters}
                className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
              >
                Wyczyść wszystkie filtry
              </Button>
            </div>
          )}
        </div>
      )}

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
