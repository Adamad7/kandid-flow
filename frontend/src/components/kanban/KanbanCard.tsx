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
  MessageSquare,
  AlertTriangle,
  Send,
  Users,
  Award,
  CheckCircle,
  Archive,
  HelpCircle,
  XCircle,
  Inbox,
} from "lucide-react";
import type { JobOfferRead, JobStatusType } from "../../types";
import {
  PORTAL_LABELS,
  WORK_MODEL_LABELS,
} from "../../lib/constants";
import {
  formatSalary,
  getSalaryPeriodLabel,
  getUnifiedJobStatus,
} from "../../lib/formatters";
import { cn } from "../../lib/utils";
import { Button } from "../ui/Button";
import { RatingStars } from "../ui/RatingStars";

interface KanbanCardProps {
  job: JobOfferRead;
  onSelect: (job: JobOfferRead) => void;
  onGenerateCV: (job: JobOfferRead) => void;
  onStatusChange: (job: JobOfferRead, newStatus: JobStatusType) => void;
  onRatingChange?: (job: JobOfferRead, newRating: number) => void;
  onReparse: (job: JobOfferRead, mode: "ai" | "traditional") => void;
  onDelete: (job: JobOfferRead) => void;
  onOpenFollowUp?: (job: JobOfferRead) => void;
  onOpenApplicationDetails?: (job: JobOfferRead) => void;
  isReparsing?: boolean;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
  job,
  onSelect,
  onGenerateCV,
  onStatusChange,
  onRatingChange,
  onReparse,
  onDelete,
  onOpenFollowUp,
  onOpenApplicationDetails,
  isReparsing = false,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const salaryText = formatSalary(
    job.salary_min,
    job.salary_max,
    job.salary_currency
  );
  const isParsing = job.status === "parsing" || isReparsing;
  const isFailed = job.status === "failed_parsing";
  const locationText =
    job.locations && job.locations.length > 0
      ? job.locations.join(", ")
      : job.location_raw?.trim() || null;

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
      className={`group relative rounded-2xl bg-white p-4 shadow-none border transition-all cursor-pointer dark:bg-neutral-900 ${
        isFailed
          ? "border-2 border-rose-400 bg-rose-50/20 dark:border-rose-800 dark:bg-rose-950/20"
          : isParsing
          ? "border-2 border-indigo-400 bg-indigo-50/20 dark:border-indigo-600 dark:bg-indigo-950/20 animate-pulse"
          : "border-slate-200/80 hover:border-indigo-400 hover:bg-slate-50/60 dark:border-neutral-800 dark:hover:border-neutral-700 dark:hover:bg-neutral-850"
      }`}
    >
      {/* Top Header: Portal, Badges & Rating */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] py-0.5 px-2.5 rounded-full font-bold uppercase tracking-wider bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 border border-slate-200/60 dark:border-neutral-700/60">
            {PORTAL_LABELS[job.source_portal] || job.source_portal}
          </span>

          {job.work_model && (
            <span
              className="text-[10px] py-0.5 px-2.5 rounded-full font-semibold border-2 border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800/60 text-slate-600 dark:text-neutral-300"
              title={job.work_model_details || undefined}
            >
              {WORK_MODEL_LABELS[job.work_model] || job.work_model}
            </span>
          )}

          <div
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center ml-0.5"
            title="Ranga oferty"
          >
            <RatingStars
              rating={job.rating || 1}
              size="xs"
              interactive={!!onRatingChange}
              onChange={(newRating) => onRatingChange?.(job, newRating)}
            />
          </div>
        </div>

        {/* Quick Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-neutral-500 dark:hover:text-neutral-300 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
            title="Opcje oferty"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {showMenu && (
            <div
              className="absolute right-0 top-8 z-20 w-48 rounded-2xl border border-slate-200/80 bg-white py-2 shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onSelect(job);
                }}
                className="w-full px-3.5 py-1.5 text-left text-xs text-slate-700 dark:text-neutral-200 hover:bg-slate-50 dark:hover:bg-neutral-800 flex items-center gap-2 cursor-pointer font-medium"
              >
                Szczegóły oferty
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onGenerateCV(job);
                }}
                className="w-full px-3.5 py-1.5 text-left text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-neutral-800 flex items-center gap-2 cursor-pointer font-medium"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Generuj CV
              </button>

              {job.status === "applied" && onOpenApplicationDetails && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onOpenApplicationDetails(job);
                  }}
                  className="w-full px-3.5 py-1.5 text-left text-xs text-slate-700 dark:text-neutral-200 hover:bg-slate-50 dark:hover:bg-neutral-800 flex items-center gap-2 font-medium cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  Szczegóły aplikacji
                </button>
              )}

              {job.status === "applied" && onOpenFollowUp && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onOpenFollowUp(job);
                  }}
                  className="w-full px-3.5 py-1.5 text-left text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-neutral-800 flex items-center gap-2 font-medium cursor-pointer"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Generuj follow-up
                </button>
              )}

              {(job.status === "inbox" || job.status === "failed_parsing") && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onReparse(job, "ai");
                    }}
                    className="w-full px-3.5 py-1.5 text-left text-xs text-slate-700 dark:text-neutral-200 hover:bg-slate-50 dark:hover:bg-neutral-800 flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    Parsuj przez AI
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onReparse(job, "traditional");
                    }}
                    className="w-full px-3.5 py-1.5 text-left text-xs text-slate-700 dark:text-neutral-200 hover:bg-slate-50 dark:hover:bg-neutral-800 flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <Cpu className="h-3.5 w-3.5 text-slate-600 dark:text-neutral-400" />
                    Auto-parsuj tradycyjne
                  </button>
                </>
              )}
              <div className="my-1.5 border-t border-slate-100 dark:border-neutral-800" />
              <div className="px-3.5 py-1 text-[10px] text-slate-400 dark:text-neutral-500 font-semibold uppercase tracking-wider">Zmień status ręcznie:</div>
              <div className="px-3.5 pb-1">
                <select
                  value={job.status}
                  onChange={(e) => {
                    setShowMenu(false);
                    onStatusChange(job, e.target.value as JobStatusType);
                  }}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-white py-1.5 px-2 text-slate-700 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white cursor-pointer"
                >
                  <option value="inbox">Do przetworzenia</option>
                  <option value="ready">Gotowe</option>
                  <option value="applied">Zaaplikowano</option>
                  <option value="interview">Rozmowy</option>
                  <option value="offer">Oferta</option>
                  <option value="rejected">Odrzucone</option>
                  <option value="archived">Zarchiwizowane</option>
                </select>
              </div>

              {onRatingChange && (
                <div className="px-3.5 py-1.5 border-t border-slate-100 dark:border-neutral-800">
                  <div className="text-[10px] text-slate-400 dark:text-neutral-500 font-semibold uppercase tracking-wider mb-1">
                    Ranga:
                  </div>
                  <RatingStars
                    rating={job.rating || 1}
                    interactive
                    size="xs"
                    onChange={(newRating) => {
                      onRatingChange(job, newRating);
                      setShowMenu(false);
                    }}
                  />
                </div>
              )}

              <div className="my-1.5 border-t border-slate-100 dark:border-neutral-800" />
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onStatusChange(job, "rejected");
                }}
                className="w-full px-3.5 py-1.5 text-left text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-neutral-800 flex items-center gap-2 cursor-pointer font-medium"
              >
                <XCircle className="h-3.5 w-3.5 text-rose-500" />
                Odrzuć ofertę
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onStatusChange(job, "archived");
                }}
                className="w-full px-3.5 py-1.5 text-left text-xs text-stone-600 dark:text-neutral-300 hover:bg-stone-50 dark:hover:bg-neutral-800 flex items-center gap-2 cursor-pointer font-medium"
              >
                <Archive className="h-3.5 w-3.5 text-stone-500" />
                Zarchiwizuj
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onDelete(job);
                }}
                className="w-full px-3.5 py-1.5 text-left text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer font-medium"
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
        <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-tight line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {job.role_title || "Nieokreślone stanowisko"}
        </h4>
        <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-600 dark:text-neutral-400 font-medium">
          <Building className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
          <span className="truncate">{job.company_name || "Nieznana firma"}</span>
        </div>

        {locationText && (
          <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 dark:text-neutral-400 truncate">
            <MapPin className="h-3.5 w-3.5 text-slate-400 dark:text-neutral-500 shrink-0" />
            <span className="truncate">{locationText}</span>
          </div>
        )}

        {/* Tags */}
        {job.tags && job.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {job.tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center text-[10px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-neutral-800 dark:text-neutral-300 font-mono"
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Unified Status Badge */}
      {(() => {
        const statusInfo = getUnifiedJobStatus(job, isParsing);
        const isClickable = job.status === "applied" && Boolean(onOpenApplicationDetails);
        const badgeContent = (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border-2 shadow-none transition-colors",
              statusInfo.badgeClass,
              isClickable && "cursor-pointer hover:opacity-80"
            )}
            title={statusInfo.detailText}
          >
            {statusInfo.iconType === "clock" && <Clock className="h-3 w-3 shrink-0" />}
            {statusInfo.iconType === "send" && <Send className="h-3 w-3 shrink-0" />}
            {statusInfo.iconType === "users" && <Users className="h-3 w-3 shrink-0" />}
            {statusInfo.iconType === "award" && <Award className="h-3 w-3 shrink-0" />}
            {statusInfo.iconType === "x-circle" && <XCircle className="h-3 w-3 shrink-0" />}
            {statusInfo.iconType === "archive" && <Archive className="h-3 w-3 shrink-0" />}
            {statusInfo.iconType === "inbox" && <Inbox className="h-3 w-3 shrink-0" />}
            {statusInfo.iconType === "alert" && <AlertTriangle className="h-3 w-3 shrink-0" />}
            {statusInfo.iconType === "refresh" && <RefreshCw className="h-3 w-3 animate-spin shrink-0" />}
            <span>{statusInfo.label}</span>
          </span>
        );

        return (
          <div className="mb-2.5">
            {isClickable ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenApplicationDetails?.(job);
                }}
                className="inline-flex text-left"
              >
                {badgeContent}
              </button>
            ) : (
              badgeContent
            )}
          </div>
        );
      })()}

      {/* Salary */}
      <div className="text-xs mb-3">
        {salaryText ? (
          <div className="font-bold text-xs text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/50 px-3 py-1 rounded-full border border-emerald-200/60 dark:border-emerald-800/60 inline-flex items-center gap-1.5">
            <span>{salaryText}</span>
            {job.salary_period && job.salary_period !== "month" && (
              <span
                title={getSalaryPeriodLabel(job.salary_period)}
                className="inline-flex items-center cursor-help"
              >
                <HelpCircle className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
              </span>
            )}
          </div>
        ) : (
          <div className="text-slate-400 dark:text-neutral-500 italic">Wynagrodzenie: brak danych</div>
        )}
      </div>

      {/* Status Warning / Parsing Indicator */}
      {isParsing && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 font-medium">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          <span>Parsowanie AI w toku...</span>
        </div>
      )}

      {isFailed && (
        <div className="mb-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900">
          <div className="flex items-start gap-1.5 mb-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
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
              className="w-full text-xs h-7.5 rounded-xl justify-center font-medium"
            >
              <Sparkles className="h-3 w-3 mr-1 text-indigo-600 dark:text-indigo-400" />
              Parsuj przez AI
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onReparse(job, "traditional");
              }}
              className="w-full text-xs h-7.5 rounded-xl justify-center font-medium"
            >
              <Cpu className="h-3 w-3 mr-1 text-slate-600 dark:text-neutral-400" />
              Auto-parsuj tradycyjne
            </Button>
          </div>
        </div>
      )}

      {/* Card Footer: Next Stage Progression & CV Action */}
      <div className="pt-2.5 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between gap-2">
        {job.status === "ready" ? (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onGenerateCV(job);
            }}
            className="text-xs h-9.5 px-2.5 shrink-0 rounded-xl"
            title="Generuj dopasowane CV"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1 text-indigo-600 dark:text-indigo-400" />
            CV
          </Button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-1.5 min-w-0">
          {(job.status === "inbox" || job.status === "failed_parsing") && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(job, "ready");
              }}
              className="text-xs h-9.5 px-2.5 rounded-xl"
              title="Przenieś do gotowych do aplikacji"
            >
              <CheckCircle className="h-3 w-3 mr-1 text-indigo-600 dark:text-indigo-400" />
              Do aplikacji
            </Button>
          )}

          {job.status === "ready" && (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(job, "applied");
              }}
              className="text-xs h-9.5 px-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold shadow-none"
              title="Oznacz, że wysłałeś aplikację na tę ofertę"
            >
              <Send className="h-3 w-3 mr-1" />
              Zaaplikowano
            </Button>
          )}

          {job.status === "applied" && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(job, "interview");
              }}
              className="text-xs h-9.5 px-2.5 rounded-xl border-2 border-purple-500 text-purple-600 hover:bg-purple-500 hover:text-white dark:border-purple-400 dark:text-purple-400 dark:hover:bg-purple-500 font-semibold"
              title="Zaproszenie na rozmowę rekrutacyjną"
            >
              <Users className="h-3 w-3 mr-1" />
              Rozmowa
            </Button>
          )}

          {job.status === "interview" && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(job, "offer");
              }}
              className="text-xs h-9.5 px-2.5 rounded-xl border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-500 hover:text-white dark:border-emerald-400 dark:text-emerald-400 dark:hover:bg-emerald-500 font-semibold"
              title="Otrzymano ofertę pracy"
            >
              <Award className="h-3 w-3 mr-1" />
              Oferta
            </Button>
          )}

          {job.status === "offer" && (
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              🎉 Oferta
            </span>
          )}

          {job.status === "rejected" && (
            <span className="text-[11px] text-slate-400 dark:text-neutral-500 italic">
              Zakończono
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
