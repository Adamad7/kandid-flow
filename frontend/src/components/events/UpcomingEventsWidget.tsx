import React, { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  ExternalLink,
  MapPin,
  CheckCircle2,
  Circle,
  Video,
  User,
  Plus,
} from "lucide-react";
import { api } from "../../lib/api";
import type { RecruitmentEventRead } from "../../types";
import { EVENT_TYPE_LABELS } from "../../lib/constants";
import { formatDateTime } from "../../lib/formatters";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";

interface UpcomingEventsWidgetProps {
  onSelectJob?: (jobId: string) => void;
  onAddEventClick?: () => void;
  refreshTrigger?: number;
}

export const UpcomingEventsWidget: React.FC<UpcomingEventsWidgetProps> = ({
  onSelectJob,
  onAddEventClick,
  refreshTrigger,
}) => {
  const [events, setEvents] = useState<RecruitmentEventRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUpcomingEvents = async (silent: boolean = false) => {
    try {
      if (!silent) {
        setIsLoading(true);
      }
      setError(null);
      const data = await api.events.list({
        upcoming_only: true,
        limit: 8,
      });
      setEvents(data);
    } catch {
      setError("Nie udało się pobrać nadchodzących wydarzeń");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUpcomingEvents(events.length > 0);
  }, [refreshTrigger]);

  const handleToggleComplete = async (event: RecruitmentEventRead) => {
    try {
      const updated = await api.events.update(event.id, {
        is_completed: !event.is_completed,
      });
      setEvents((prev) =>
        prev.map((e) => (e.id === updated.id ? updated : e))
      );
    } catch (err) {
      alert("Błąd podczas aktualizacji statusu etapu");
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              Nadchodzące etapy i rozmowy
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Zaplanowane spotkania, testy techniczne i terminy zadań
            </p>
          </div>
        </div>
        {onAddEventClick && (
          <Button
            size="sm"
            variant="outline"
            onClick={onAddEventClick}
            className="text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Dodaj etap
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="py-6 text-center text-sm text-slate-400 dark:text-slate-500 animate-pulse">
          Ładowanie nadchodzących wydarzeń...
        </div>
      ) : error ? (
        <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 dark:border dark:border-rose-900">
          {error}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 py-6 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Brak zaplanowanych rozmów rekrutacyjnych w najbliższym czasie.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {events.map((ev) => (
            <div
              key={ev.id}
              className="py-3 flex items-start justify-between gap-3 group hover:bg-slate-50/60 dark:hover:bg-slate-800/60 -mx-2 px-2 rounded-lg transition-colors"
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => handleToggleComplete(ev)}
                  className="mt-0.5 text-slate-400 hover:text-emerald-600 dark:text-slate-500 dark:hover:text-emerald-400 transition-colors"
                  title={
                    ev.is_completed
                      ? "Oznacz jako nieukończone"
                      : "Oznacz jako ukończone"
                  }
                >
                  {ev.is_completed ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-medium text-sm text-slate-900 dark:text-slate-100 ${
                        ev.is_completed ? "line-through text-slate-400 dark:text-slate-600" : ""
                      }`}
                    >
                      {ev.title}
                    </span>
                    <Badge variant="info">
                      {EVENT_TYPE_LABELS[ev.event_type] || ev.event_type}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDateTime(ev.scheduled_at)}
                      {ev.duration_minutes ? ` (${ev.duration_minutes} min)` : ""}
                    </span>

                    {ev.location_or_link && (
                      <span className="flex items-center gap-1">
                        {ev.location_or_link.startsWith("http") ? (
                          <a
                            href={ev.location_or_link}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            <Video className="h-3.5 w-3.5" />
                            Dołącz do spotkania
                          </a>
                        ) : (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {ev.location_or_link}
                          </span>
                        )}
                      </span>
                    )}

                    {ev.interviewers && (
                      <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        <User className="h-3.5 w-3.5" />
                        {ev.interviewers}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {onSelectJob && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onSelectJob(ev.job_offer_id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                >
                  Przejdź do oferty
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
