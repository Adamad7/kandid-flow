import React, { useState } from "react";
import {
  MapPin,
  Building,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Trash2,
  Clock,
  MoreVertical,
  Cpu,
} from "lucide-react";
import type { JobOfferRead, JobStatusType } from "../../types";
import {
  PORTAL_LABELS,
  WORK_MODEL_LABELS,
} from "../../lib/constants";
import { formatDeadline, formatSalary } from "../../lib/formatters";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

interface KanbanCardProps {
  job: JobOfferRead;
  onSelect: (job: JobOfferRead) => void;
  onGenerateCV: (job: JobOfferRead) => void;
  onStatusChange: (job: JobOfferRead, newStatus: JobStatusType) => void;
  onReparse: (job: JobOfferRead, mode: "ai" | "traditional") => void;
  onDelete: (job: JobOfferRead) => void;
  isReparsing?: boolean;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
  job,
  onSelect,
  onGenerateCV,
  onStatusChange,
  onReparse,
  onDelete,
  isReparsing = false,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const salaryText = formatSalary(
    job.salary_min,
    job.salary_max,
    job.salary_currency
  );
  const deadlineInfo = formatDeadline(job.application_deadline);
  const isParsing = job.status === "parsing" || isReparsing;
  const isFailed = job.status === "failed_parsing";

  const handleCardClick = (e: React.MouseEvent) => {
    // Avoid opening modal if clicking interactive controls
    if ((e.target as HTMLElement).closest("button, select, a")) {
      return;
    }
    onSelect(job);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group relative rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md cursor-pointer ${
        isFailed
          ? "border-rose-300 bg-rose-50/20"
          : isParsing
          ? "border-blue-300 bg-blue-50/20 animate-pulse"
          : "border-slate-200/90 hover:border-slate-300"
      }`}
    >
      {/* Top Header: Portal & Status */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="text-[11px] font-medium">
            {PORTAL_LABELS[job.source_portal] || job.source_portal}
          </Badge>

          {job.work_model && (
            <Badge
              variant="outline"
              className="text-[11px]"
              title={job.work_model_details || undefined}
            >
              {WORK_MODEL_LABELS[job.work_model] || job.work_model}
            </Badge>
          )}
        </div>

        {/* Quick Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            title="Opcje oferty"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {showMenu && (
            <div
              className="absolute right-0 top-7 z-20 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onSelect(job);
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                Szczegóły oferty
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onGenerateCV(job);
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-blue-600 hover:bg-blue-50 flex items-center gap-2"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Generuj CV
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onReparse(job, "ai");
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                Parsuj przez AI
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onReparse(job, "traditional");
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <Cpu className="h-3.5 w-3.5 text-slate-600" />
                Auto-parsuj tradycyjne
              </button>
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onDelete(job);
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Usuń ofertę
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Role Title & Company */}
      <div className="mb-2.5">
        <h4 className="font-semibold text-slate-900 text-sm leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors">
          {job.role_title || "Nieokreślone stanowisko"}
        </h4>
        <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-600 font-medium">
          <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{job.company_name || "Nieznana firma"}</span>
        </div>
      </div>

      {/* Salary & Locations */}
      <div className="space-y-1 text-xs mb-3">
        {salaryText ? (
          <div className="font-semibold text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-md inline-block">
            {salaryText}
          </div>
        ) : (
          <div className="text-slate-400 italic">Wynagrodzenie: brak danych</div>
        )}

        {job.locations && job.locations.length > 0 && (
          <div className="flex items-center gap-1 text-slate-500 truncate">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{job.locations.join(", ")}</span>
          </div>
        )}
      </div>

      {/* Deadline Info */}
      {deadlineInfo && (
        <div className="mb-3">
          <Badge
            variant={
              deadlineInfo.isExpired
                ? "danger"
                : deadlineInfo.isUrgent
                ? "warning"
                : "secondary"
            }
            className="text-[11px]"
          >
            <Clock className="h-3 w-3" />
            {deadlineInfo.text}
          </Badge>
        </div>
      )}

      {/* Status Warning / Parsing Indicator */}
      {isParsing && (
        <div className="mb-3 flex items-center gap-2 rounded-md bg-blue-50 px-2.5 py-1.5 text-xs text-blue-700 font-medium">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          <span>Parsowanie AI w toku...</span>
        </div>
      )}

      {isFailed && (
        <div className="mb-3 rounded-md bg-rose-50 p-2.5 text-xs text-rose-700 border border-rose-200">
          <div className="flex items-start gap-1.5 mb-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <span className="font-medium line-clamp-2">
              {job.error_message || "Błąd podczas automatycznego parsowania oferty."}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onReparse(job, "ai");
              }}
              className="w-full text-xs h-7 bg-white hover:bg-blue-50 text-blue-700 border-blue-200 justify-center font-medium"
            >
              <Sparkles className="h-3 w-3 mr-1 text-blue-600" />
              Parsuj przez AI
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onReparse(job, "traditional");
              }}
              className="w-full text-xs h-7 bg-white hover:bg-slate-100 text-slate-700 border-slate-300 justify-center font-medium"
            >
              <Cpu className="h-3 w-3 mr-1 text-slate-600" />
              Auto-parsuj tradycyjne
            </Button>
          </div>
        </div>
      )}

      {/* Tech Stack Pills (if structured data parsed) */}
      {job.structured_data?.tech_stack && job.structured_data.tech_stack.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {job.structured_data.tech_stack.slice(0, 4).map((tech, idx) => (
            <span
              key={idx}
              className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 font-mono"
            >
              {tech}
            </span>
          ))}
          {job.structured_data.tech_stack.length > 4 && (
            <span className="text-[10px] text-slate-400 self-center">
              +{job.structured_data.tech_stack.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Card Footer: Quick Status Switcher & CV Action */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
        <select
          value={job.status}
          onChange={(e) => {
            e.stopPropagation();
            onStatusChange(job, e.target.value as JobStatusType);
          }}
          onClick={(e) => e.stopPropagation()}
          className="text-xs rounded border border-slate-200 bg-slate-50 py-1 px-1.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[130px] truncate"
        >
          <option value="inbox">Do przetworzenia</option>
          <option value="ready">Gotowe</option>
          <option value="applied">Zaaplikowano</option>
          <option value="interview">Rozmowy</option>
          <option value="offer">Oferta</option>
          <option value="rejected">Odrzucone</option>
        </select>

        <Button
          size="sm"
          variant="primary"
          onClick={(e) => {
            e.stopPropagation();
            onGenerateCV(job);
          }}
          className="text-xs h-7 px-2.5"
          title="Generuj dopasowane CV"
        >
          <Sparkles className="h-3.5 w-3.5 mr-1" />
          CV
        </Button>
      </div>
    </div>
  );
};
