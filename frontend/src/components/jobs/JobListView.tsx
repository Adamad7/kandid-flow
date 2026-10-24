import React, { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  Filter,
  RefreshCw,
  Building,
  Clock,
  Sparkles,
  MoreVertical,
  Trash2,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Cpu,
  MessageSquare,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";
import { api } from "../../lib/api";
import type {
  JobOfferRead,
  JobStatusType,
} from "../../types";
import { FollowUpModal } from "../modals/FollowUpModal";
import {
  PORTAL_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  WORK_MODEL_LABELS,
} from "../../lib/constants";
import {
  DEADLINE_BADGE_CLASSES,
  formatDeadline,
  formatRelativeCreatedDate,
  formatSalary,
  normalizeJobOfferUrl,
} from "../../lib/formatters";
import { cn } from "../../lib/utils";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

export type SortField =
  | "role_title"
  | "status"
  | "created_at"
  | "work_model"
  | "salary"
  | "deadline";
export type SortDirection = "asc" | "desc";

const GENERIC_DETAILS_REGEX =
  /^(?:(?:w\s+)?100%|pełna|w\s+pełni|fully)?\s*(?:praca\s+)?(?:zdalna|zdalnie|remote)(?:\s+praca)?$|^(?:w\s+pełni\s+)?(?:praca\s+)?(?:stacjonarna|stacjonarnie|onsite|on-site|biuro|w\s+biurze)(?:\s+praca)?$|^(?:praca\s+)?(?:hybryda|hybrydowo|hybrid)$|^home\s+office(?:\s+work)?$/i;

function hasMeaningfulWorkModelDetails(
  workModel?: string | null,
  details?: string | null
): boolean {
  if (!details || !details.trim()) return false;
  const clean = details.trim();
  if (GENERIC_DETAILS_REGEX.test(clean)) return false;
  if (workModel) {
    const label = WORK_MODEL_LABELS[workModel as keyof typeof WORK_MODEL_LABELS];
    if (label && clean.toLowerCase() === label.toLowerCase()) return false;
    if (clean.toLowerCase() === workModel.toLowerCase()) return false;
  }
  return true;
}

interface JobListViewProps {
  onSelectJob: (job: JobOfferRead) => void;
  onGenerateCV: (job: JobOfferRead) => void;
  refreshTrigger?: number;
  onSwitchView?: (view: "kanban" | "list") => void;
}

export const JobListView: React.FC<JobListViewProps> = ({
  onSelectJob,
  onGenerateCV,
  refreshTrigger,
}) => {
  const [jobs, setJobs] = useState<JobOfferRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reparsingIds, setReparsingIds] = useState<Set<string>>(new Set());

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState("");
  const [workModelFilter, setWorkModelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Sorting states
  const [sortField, setSortField] = useState<SortField>("deadline");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Selection & Bulk actions states
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<JobStatusType>("ready");
  const masterCheckboxRef = useRef<HTMLInputElement>(null);

  // Follow-up modal state
  const [followUpJob, setFollowUpJob] = useState<JobOfferRead | null>(null);

  // Context menu portal state
  const [activeMenu, setActiveMenu] = useState<{
    job: JobOfferRead;
    rect: DOMRect;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Work model tooltip portal state
  const [workModelTooltip, setWorkModelTooltip] = useState<{
    text: string;
    rect: DOMRect;
  } | null>(null);

  // Close context menu & work model tooltip on scroll, resize, or outside click
  useEffect(() => {
    if (!activeMenu && !workModelTooltip) return;

    const handleDismiss = () => {
      if (activeMenu) setActiveMenu(null);
      if (workModelTooltip) setWorkModelTooltip(null);
    };

    const handlePointerDown = (e: MouseEvent) => {
      if (
        activeMenu &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest(`[data-menu-trigger="${activeMenu.job.id}"]`)
      ) {
        setActiveMenu(null);
      }
    };

    window.addEventListener("scroll", handleDismiss, { capture: true, passive: true });
    window.addEventListener("resize", handleDismiss, { passive: true });
    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("scroll", handleDismiss, { capture: true });
      window.removeEventListener("resize", handleDismiss);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [activeMenu, workModelTooltip]);

  const fetchJobs = async () => {
    try {
      setIsLoading(true);
      const [jobsData, tagsData] = await Promise.all([
        api.jobs.list({ limit: 150 }),
        api.jobs.listTags().catch(() => []),
      ]);
      setJobs(jobsData);
      setAvailableTags(tagsData);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [refreshTrigger]);


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
          ? "Błąd podczas parsowania oferty przez AI."
          : "Błąd podczas tradycyjnego parsowania oferty."
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
      !confirm(
        `Czy na pewno chcesz usunąć ofertę "${job.role_title || "Nieokreślone stanowisko"}" z firmy ${job.company_name || ""}?`
      )
    ) {
      return;
    }
    try {
      await api.jobs.delete(job.id);
      setJobs((prev) => prev.filter((j) => j.id !== job.id));
      setSelectedJobIds((prev) => {
        if (prev.has(job.id)) {
          const next = new Set(prev);
          next.delete(job.id);
          return next;
        }
        return prev;
      });
    } catch {
      alert("Nie udało się usunąć oferty.");
    }
  };

  const handleBatchStatusUpdate = async () => {
    if (selectedJobIds.size === 0) return;
    try {
      setIsBatchProcessing(true);
      const ids = Array.from(selectedJobIds);
      await api.jobs.batchUpdateStatus(ids, bulkStatus);
      setJobs((prev) =>
        prev.map((j) => (selectedJobIds.has(j.id) ? { ...j, status: bulkStatus } : j))
      );
      setSelectedJobIds(new Set());
    } catch {
      alert("Nie udało się zaktualizować statusu zaznaczonych ofert.");
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedJobIds.size === 0) return;
    const count = selectedJobIds.size;
    if (
      !confirm(
        `Czy na pewno chcesz usunąć ${count} ${
          count === 1
            ? "zaznaczoną ofertę"
            : count < 5
            ? "zaznaczone oferty"
            : "zaznaczonych ofert"
        }? Ta operacja jest nieodwracalna.`
      )
    ) {
      return;
    }
    try {
      setIsBatchProcessing(true);
      const ids = Array.from(selectedJobIds);
      await api.jobs.batchDelete(ids);
      setJobs((prev) => prev.filter((j) => !selectedJobIds.has(j.id)));
      setSelectedJobIds(new Set());
    } catch {
      alert("Nie udało się usunąć zaznaczonych ofert.");
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleToggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Helper for deadline timestamp
  const getDeadlineTimeDiff = (job: JobOfferRead): number => {
    if (!job.application_deadline) return Infinity;
    const trimmed = job.application_deadline.trim();
    let deadlineDate: Date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split("-").map(Number);
      deadlineDate = new Date(y, m - 1, d, 23, 59, 59, 999);
    } else {
      deadlineDate = new Date(trimmed);
    }
    const time = deadlineDate.getTime();
    if (isNaN(time)) return Infinity;
    return time - Date.now();
  };

  // Helper for numeric salary for comparison
  const getSalaryValue = (job: JobOfferRead): number => {
    if (job.salary_max !== null && job.salary_max !== undefined) {
      return job.salary_max;
    }
    if (job.salary_min !== null && job.salary_min !== undefined) {
      return job.salary_min;
    }
    return -1;
  };

  const filteredAndSortedJobs = useMemo(() => {
    return jobs
      .filter((job) => {
        // Search filter
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchTitle = (job.role_title || "").toLowerCase().includes(q);
          const matchCompany = (job.company_name || "").toLowerCase().includes(q);
          const matchLocation = (job.locations || []).some((l) =>
            l.toLowerCase().includes(q)
          );
          const matchTech = (
            job.structured_data?.tech_stack || []
          ).some((t) => t.toLowerCase().includes(q));
          if (!matchTitle && !matchCompany && !matchLocation && !matchTech) {
            return false;
          }
        }

        // Work model filter
        if (workModelFilter !== "all" && job.work_model !== workModelFilter) {
          return false;
        }

        // Status filter
        if (statusFilter !== "all" && job.status !== statusFilter) {
          return false;
        }

        // Tag filter
        if (tagFilter !== "all" && !(job.tags || []).includes(tagFilter)) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        let result = 0;

        switch (sortField) {
          case "role_title": {
            const titleA = a.role_title || "";
            const titleB = b.role_title || "";
            result = titleA.localeCompare(titleB, "pl", { sensitivity: "base" });
            break;
          }

          case "status": {
            const labelA = STATUS_LABELS[a.status] || a.status;
            const labelB = STATUS_LABELS[b.status] || b.status;
            result = labelA.localeCompare(labelB, "pl", { sensitivity: "base" });
            break;
          }

          case "created_at": {
            const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
            result = timeA - timeB;
            break;
          }

          case "work_model": {
            const labelA = a.work_model
              ? WORK_MODEL_LABELS[a.work_model] || a.work_model
              : "";
            const labelB = b.work_model
              ? WORK_MODEL_LABELS[b.work_model] || b.work_model
              : "";
            if (!labelA && !labelB) result = 0;
            else if (!labelA) result = 1;
            else if (!labelB) result = -1;
            else result = labelA.localeCompare(labelB, "pl");
            break;
          }

          case "salary": {
            const salA = getSalaryValue(a);
            const salB = getSalaryValue(b);
            if (salA === -1 && salB === -1) result = 0;
            else if (salA === -1) result = 1;
            else if (salB === -1) result = -1;
            else result = salA - salB;
            break;
          }

          case "deadline": {
            const diffA = getDeadlineTimeDiff(a);
            const diffB = getDeadlineTimeDiff(b);
            if (diffA === Infinity && diffB === Infinity) result = 0;
            else if (diffA === Infinity) result = 1;
            else if (diffB === Infinity) result = -1;
            else result = diffA - diffB;
            break;
          }

          default:
            result = 0;
        }

        return sortDirection === "asc" ? result : -result;
      });
  }, [jobs, searchTerm, workModelFilter, statusFilter, tagFilter, sortField, sortDirection]);

  const visibleJobIds = useMemo(
    () => filteredAndSortedJobs.map((j) => j.id),
    [filteredAndSortedJobs]
  );

  const allVisibleSelected =
    visibleJobIds.length > 0 && visibleJobIds.every((id) => selectedJobIds.has(id));
  const someVisibleSelected =
    visibleJobIds.some((id) => selectedJobIds.has(id)) && !allVisibleSelected;

  useEffect(() => {
    if (masterCheckboxRef.current) {
      masterCheckboxRef.current.indeterminate = someVisibleSelected;
    }
  }, [someVisibleSelected]);

  const handleToggleSelectAll = () => {
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleJobIds.forEach((id) => next.delete(id));
      } else {
        visibleJobIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleToggleSelectJob = (
    jobId: string,
    e: React.MouseEvent | React.ChangeEvent
  ) => {
    e.stopPropagation();
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 text-blue-600 font-bold" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-blue-600 font-bold" />
    );
  };

  return (
    <div className="space-y-4">
      {/* Control Bar: Search & Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-3 max-w-xl">
            <div className="relative flex-1">
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
              {(workModelFilter !== "all" || statusFilter !== "all" || tagFilter !== "all") && (
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
              title="Odśwież listę ofert"
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
                <option value="onsite">Biuro</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Status oferty:
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full text-xs rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="all">Wszystkie statusy</option>
                <option value="inbox">Do przetworzenia</option>
                <option value="ready">Gotowe do aplikacji</option>
                <option value="applied">Zaaplikowano</option>
                <option value="interview">Rozmowy rekrutacyjne</option>
                <option value="offer">Oferty</option>
                <option value="rejected">Odrzucone</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tag:
              </label>
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="w-full text-xs rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="all">Wszystkie tagi</option>
                {availableTags.map((t) => (
                  <option key={t} value={t}>
                    #{t}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setWorkModelFilter("all");
                  setStatusFilter("all");
                  setTagFilter("all");
                }}
                className="text-xs w-full"
              >
                Wyczyść filtry
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {selectedJobIds.size > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/90 p-3 shadow-xs dark:border-blue-900/60 dark:bg-blue-950/40 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-xs">
              {selectedJobIds.size}
            </span>
            <span className="text-xs font-semibold text-blue-950 dark:text-blue-100">
              Zaznaczono: {selectedJobIds.size}{" "}
              {selectedJobIds.size === 1
                ? "ofertę"
                : selectedJobIds.size < 5
                ? "oferty"
                : "ofert"}
              {visibleJobIds.length > 0 && (
                <span className="font-normal text-blue-700 dark:text-blue-300 ml-1">
                  (z {visibleJobIds.length} widocznych)
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={() => setSelectedJobIds(new Set())}
              disabled={isBatchProcessing}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium ml-2 disabled:opacity-50 cursor-pointer"
            >
              Odznacz wszystkie
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 hidden sm:inline">
                Zmień status:
              </span>
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value as JobStatusType)}
                disabled={isBatchProcessing}
                className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-800 shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value="inbox">Do przetworzenia</option>
                <option value="ready">Gotowe do aplikacji</option>
                <option value="applied">Zaaplikowano</option>
                <option value="interview">Rozmowy</option>
                <option value="offer">Oferta</option>
                <option value="rejected">Odrzucone</option>
              </select>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBatchStatusUpdate}
                isLoading={isBatchProcessing}
                disabled={isBatchProcessing}
                className="h-8 text-xs bg-white dark:bg-slate-800"
              >
                Zastosuj status
              </Button>
            </div>

            <div className="h-4 w-px bg-blue-200 dark:bg-blue-800/80 mx-1 hidden sm:block" />

            <Button
              size="sm"
              variant="destructive"
              onClick={handleBatchDelete}
              isLoading={isBatchProcessing}
              disabled={isBatchProcessing}
              className="h-8 text-xs gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Usuń zaznaczone ({selectedJobIds.size})
            </Button>
          </div>
        </div>
      )}

      {/* Main List Container */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto min-w-full">
          <div className="md:min-w-[960px]">
            {/* Table / List Header */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-3.5 hidden md:grid md:grid-cols-[40px_minmax(50px,0.5fr)_minmax(180px,2.5fr)_minmax(110px,1.4fr)_minmax(120px,1.4fr)_minmax(95px,1.1fr)_minmax(110px,1.3fr)_minmax(130px,1.6fr)] gap-4 text-xs font-semibold text-slate-600 select-none dark:bg-slate-800/80 dark:border-slate-800 dark:text-slate-300">
              {/* Checkbox (zaznacz wszystkie) */}
              <div className="flex items-center justify-center">
                <input
                  ref={masterCheckboxRef}
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={handleToggleSelectAll}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:ring-offset-slate-900 cursor-pointer"
                  aria-label="Zaznacz wszystkie widoczne oferty"
                  title="Zaznacz wszystkie widoczne oferty"
                />
              </div>

              {/* Dodano (Sortable, narrow, on the far left) */}
              <div
                onClick={() => handleToggleSort("created_at")}
                className="flex items-center justify-center gap-1 cursor-pointer hover:text-slate-900 dark:hover:text-white group text-center"
              >
                <span>Dodano</span>
                {renderSortIndicator("created_at")}
              </div>

              {/* Stanowisko (Sortable) */}
              <div
                onClick={() => handleToggleSort("role_title")}
                className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 dark:hover:text-white group"
              >
                <span>Stanowisko</span>
                {renderSortIndicator("role_title")}
              </div>

              {/* Firma (NON-SORTABLE by user requirement: "poza nazwą firmy") */}
              <div className="flex items-center text-slate-500 dark:text-slate-400 font-medium">
                <span>Firma</span>
              </div>

              {/* Status (Sortable) */}
              <div
                onClick={() => handleToggleSort("status")}
                className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 dark:hover:text-white group"
              >
                <span>Status</span>
                {renderSortIndicator("status")}
              </div>

              {/* Tryb pracy (Sortable) */}
              <div
                onClick={() => handleToggleSort("work_model")}
                className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 dark:hover:text-white group"
              >
                <span>Tryb pracy</span>
                {renderSortIndicator("work_model")}
              </div>

              {/* Zarobki (Sortable) */}
              <div
                onClick={() => handleToggleSort("salary")}
                className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 dark:hover:text-white group"
              >
                <span>Zarobki</span>
                {renderSortIndicator("salary")}
              </div>

              {/* Koniec aplikacji (Sortable) */}
              <div
                onClick={() => handleToggleSort("deadline")}
                className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 dark:hover:text-white group"
              >
                <span>Koniec aplikacji</span>
                {renderSortIndicator("deadline")}
              </div>
            </div>

            {/* List Content */}
            {isLoading && jobs.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500 dark:text-slate-400">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto text-blue-600 mb-2" />
                Ładowanie ofert pracy...
              </div>
            ) : filteredAndSortedJobs.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Brak ofert spełniających podane kryteria
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Zmień filtry wyszukiwania lub dodaj nowe ogłoszenia za pomocą wtyczki przeglądarki.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAndSortedJobs.map((job) => {
                  const salaryText = formatSalary(
                    job.salary_min,
                    job.salary_max,
                    job.salary_currency
                  );
                  const deadlineInfo = formatDeadline(job.application_deadline);
                  const createdDateInfo = formatRelativeCreatedDate(job.created_at);
                  const isReparsing = reparsingIds.has(job.id);
                  const isSelected = selectedJobIds.has(job.id);
                  const isMenuOpen = activeMenu?.job.id === job.id;

                  return (
                    <div
                      key={job.id}
                      onClick={() => onSelectJob(job)}
                      className={cn(
                        "group px-6 py-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors cursor-pointer grid grid-cols-1 md:grid-cols-[40px_minmax(50px,0.5fr)_minmax(180px,2.5fr)_minmax(110px,1.4fr)_minmax(120px,1.4fr)_minmax(95px,1.1fr)_minmax(110px,1.3fr)_minmax(130px,1.6fr)] gap-3 md:gap-4 items-center",
                        isSelected && "bg-blue-50/40 dark:bg-blue-950/20"
                      )}
                    >
                      {/* Checkbox (Kolumna 1) */}
                      <div
                        className="flex items-center justify-start md:justify-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleToggleSelectJob(job.id, e)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:ring-offset-slate-900 cursor-pointer"
                            aria-label={`Wybierz ofertę ${job.role_title || ""}`}
                          />
                          <span className="md:hidden text-xs font-medium text-slate-600 dark:text-slate-400">
                            Zaznacz ofertę
                          </span>
                        </label>
                      </div>

                      {/* Dodano (narrow) - po lewej stronie */}
                      <div className="flex items-center justify-center text-center text-xs text-slate-500 dark:text-slate-400">
                        {createdDateInfo ? (
                          <span
                            className="cursor-help font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                            title={`Dodano: ${createdDateInfo.fullDate}`}
                          >
                            <span className="md:hidden text-slate-400 dark:text-slate-500 mr-1.5 font-normal">
                              Dodano:
                            </span>
                            {createdDateInfo.text}
                          </span>
                        ) : (
                          <span className="italic text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </div>

                      {/* Stanowisko */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                            {job.role_title || "Nieokreślone stanowisko"}
                          </span>

                          {job.source_portal && (
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                              {PORTAL_LABELS[job.source_portal] || job.source_portal}
                            </Badge>
                          )}
                        </div>

                        {/* Tags */}
                        {job.tags && job.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {job.tags.map((t) => (
                              <span
                                key={t}
                                className="inline-flex items-center text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 font-mono"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Mobile-only company view */}
                        <div className="md:hidden flex items-center gap-1.5 mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                          <Building className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                          <span>{job.company_name || "Nieznana firma"}</span>
                        </div>
                      </div>

                      {/* Firma */}
                      <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium min-w-0">
                        <Building className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span className="truncate" title={job.company_name || undefined}>
                          {job.company_name || "Nieznana firma"}
                        </span>
                      </div>

                      {/* Status */}
                      <div className="flex flex-col items-start gap-1">
                        {isReparsing ? (
                          <span className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800 animate-pulse font-medium">
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            Parsowanie...
                          </span>
                        ) : (
                          <span
                            className={cn(
                              "inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full border",
                              STATUS_COLORS[job.status]?.bg || "bg-slate-100 dark:bg-slate-800",
                              STATUS_COLORS[job.status]?.text || "text-slate-700 dark:text-slate-200",
                              STATUS_COLORS[job.status]?.border || "border-slate-300 dark:border-slate-700"
                            )}
                          >
                            {STATUS_LABELS[job.status] || job.status}
                          </span>
                        )}

                        {job.status === "applied" && job.applied_at && (() => {
                          const days = Math.floor(
                            (Date.now() - new Date(job.applied_at).getTime()) / (1000 * 60 * 60 * 24)
                          );
                          const isGhosting = days >= 14;
                          return (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded",
                                isGhosting
                                  ? "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/60 font-semibold border border-amber-200 dark:border-amber-800"
                                  : "text-slate-500 dark:text-slate-400"
                              )}
                              title={
                                isGhosting
                                  ? `Brak odpowiedzi od ${days} dni. Zalecane wysłanie wiadomości follow-up!`
                                  : `Aplikacja wysłana: ${new Date(job.applied_at).toLocaleDateString("pl-PL")}`
                              }
                            >
                              {isGhosting && <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />}
                              <span>{days === 0 ? "Dzisiaj" : `${days} d. temu`}</span>
                            </span>
                          );
                        })()}
                      </div>

                      {/* Tryb pracy */}
                      <div className="flex items-center">
                        {job.work_model ? (
                          (() => {
                            const hasDetails = hasMeaningfulWorkModelDetails(
                              job.work_model,
                              job.work_model_details
                            );
                            if (!hasDetails) {
                              return (
                                <Badge variant="outline" className="text-xs">
                                  <span>{WORK_MODEL_LABELS[job.work_model] || job.work_model}</span>
                                </Badge>
                              );
                            }
                            return (
                              <Badge
                                variant="outline"
                                className="text-xs cursor-help"
                                onMouseEnter={(e) =>
                                  setWorkModelTooltip({
                                    text: job.work_model_details!,
                                    rect: e.currentTarget.getBoundingClientRect(),
                                  })
                                }
                                onMouseLeave={() => setWorkModelTooltip(null)}
                              >
                                <span>{WORK_MODEL_LABELS[job.work_model] || job.work_model}</span>
                                <HelpCircle className="h-3 w-3 inline-block shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors" />
                              </Badge>
                            );
                          })()
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500 italic">Brak danych</span>
                        )}
                      </div>

                      {/* Zarobki */}
                      <div className="flex items-center">
                        {salaryText ? (
                          <span className="font-semibold text-xs text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/60 px-2.5 py-1 rounded-md">
                            {salaryText}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500 italic">Brak danych</span>
                        )}
                      </div>

                      {/* Czas pozostały do końca zbierania aplikacji & Akcje */}
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          {deadlineInfo ? (
                            <Badge
                              className={cn(
                                "text-xs",
                                DEADLINE_BADGE_CLASSES[deadlineInfo.deadlineColor]
                              )}
                              title={deadlineInfo.detailText}
                            >
                              <Clock className="h-3 w-3 mr-1 shrink-0" />
                              <span>{deadlineInfo.text}</span>
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500 italic">Brak terminu</span>
                          )}
                        </div>

                        {/* Actions Menu Trigger */}
                        <div
                          className="flex items-center gap-1.5 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            data-menu-trigger={job.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (activeMenu?.job.id === job.id) {
                                setActiveMenu(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setActiveMenu({ job, rect });
                              }
                            }}
                            className={cn(
                              "p-1.5 rounded-lg transition-colors cursor-pointer",
                              isMenuOpen
                                ? "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-slate-800"
                                : "text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-800"
                            )}
                            title="Opcje oferty"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer info banner */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between text-xs text-slate-500 rounded-b-xl dark:bg-slate-800/80 dark:border-slate-800 dark:text-slate-400">
          <span>
            Wyświetlono {filteredAndSortedJobs.length} z {jobs.length} ofert
          </span>
          <span className="hidden sm:inline">
            Kliknij nagłówek kolumny, aby zmienić porządek sortowania
          </span>
        </div>
      </div>

      {/* Context Menu Portal (Rendered to document.body outside scroll container) */}
      {activeMenu &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              right: `${Math.max(8, window.innerWidth - activeMenu.rect.right)}px`,
              ...(window.innerHeight - activeMenu.rect.bottom < 280
                ? { bottom: `${window.innerHeight - activeMenu.rect.top + 4}px` }
                : { top: `${activeMenu.rect.bottom + 4}px` }),
              zIndex: 9999,
            }}
            className="w-48 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-800 animate-in fade-in zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                const currentJob = activeMenu.job;
                setActiveMenu(null);
                onSelectJob(currentJob);
              }}
              className="w-full px-3.5 py-2 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
            >
              Szczegóły oferty
            </button>


            <button
              type="button"
              onClick={() => {
                const currentJob = activeMenu.job;
                setActiveMenu(null);
                onGenerateCV(currentJob);
              }}
              className="w-full px-3.5 py-2 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              Generuj CV
            </button>

            {activeMenu.job.status === "applied" && (
              <button
                type="button"
                onClick={() => {
                  const currentJob = activeMenu.job;
                  setActiveMenu(null);
                  setFollowUpJob(currentJob);
                }}
                className="w-full px-3.5 py-2 text-left text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 flex items-center gap-2 font-medium cursor-pointer"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Generuj follow-up
              </button>
            )}

            {(activeMenu.job.status === "inbox" || activeMenu.job.status === "failed_parsing") && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const currentJob = activeMenu.job;
                    setActiveMenu(null);
                    handleReparse(currentJob, "ai");
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  Parsuj przez AI
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const currentJob = activeMenu.job;
                    setActiveMenu(null);
                    handleReparse(currentJob, "traditional");
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  <Cpu className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                  Auto-parsuj tradycyjne
                </button>
              </>
            )}

            {activeMenu.job.source_url && (
              <a
                href={normalizeJobOfferUrl(activeMenu.job.source_url)}
                target="_blank"
                rel="noreferrer"
                className="w-full px-3.5 py-2 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                onClick={() => setActiveMenu(null)}
              >
                <ExternalLink className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                Otwórz ogłoszenie
              </a>
            )}

            <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

            <button
              type="button"
              onClick={() => {
                const currentJob = activeMenu.job;
                setActiveMenu(null);
                handleDelete(currentJob);
              }}
              className="w-full px-3.5 py-2 text-left text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Usuń ofertę
            </button>
          </div>,
          document.body
        )}

      {/* Work Model Details Tooltip Portal */}
      {workModelTooltip &&
        createPortal(
          (() => {
            const rect = workModelTooltip.rect;
            const tooltipWidth = 260;
            const badgeCenter = rect.left + rect.width / 2;
            let left = badgeCenter - tooltipWidth / 2;
            if (left < 12) left = 12;
            if (left + tooltipWidth > window.innerWidth - 12) {
              left = Math.max(12, window.innerWidth - tooltipWidth - 12);
            }

            const fitsAbove = rect.top >= 90;

            return (
              <div
                style={{
                  position: "fixed",
                  left: `${left}px`,
                  width: `${tooltipWidth}px`,
                  zIndex: 9999,
                  ...(fitsAbove
                    ? { bottom: `${window.innerHeight - rect.top + 6}px` }
                    : { top: `${rect.bottom + 6}px` }),
                }}
                className="pointer-events-none rounded-lg border border-slate-200 bg-white p-2.5 text-xs shadow-xl dark:border-slate-700 dark:bg-slate-800 animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  <HelpCircle className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>Szczegóły trybu pracy</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed break-words whitespace-pre-wrap">
                  {workModelTooltip.text}
                </p>
              </div>
            );
          })(),
          document.body
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
