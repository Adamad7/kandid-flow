import React, { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Circle,
  Video,
  FileText,
  Send,
  Paperclip,
  Download,
} from "lucide-react";
import { api } from "../../lib/api";
import type {
  EventType,
  JobOfferRead,
  RecruitmentEventCreate,
  RecruitmentEventRead,
  RecruitmentEventUpdate,
} from "../../types";
import { EVENT_TYPE_LABELS } from "../../lib/constants";
import { formatDateTime } from "../../lib/formatters";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import { Select } from "../ui/Select";
import { Modal } from "../ui/Modal";
import { StatusTransitionModal } from "../modals/StatusTransitionModal";

interface RecruitmentTimelineProps {
  jobOfferId: string;
  job?: JobOfferRead | null;
  onEventsCountChange?: (count: number) => void;
  onJobUpdated?: (updatedJob: JobOfferRead) => void;
}

export const RecruitmentTimeline: React.FC<RecruitmentTimelineProps> = ({
  jobOfferId,
  job,
  onEventsCountChange,
  onJobUpdated,
}) => {
  const [events, setEvents] = useState<RecruitmentEventRead[]>([]);
  const [currentJob, setCurrentJob] = useState<JobOfferRead | null>(job || null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<RecruitmentEventRead | null>(null);

  // Application submission modal state for editing "application_submitted" event
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const [editingApplicationEvent, setEditingApplicationEvent] = useState<RecruitmentEventRead | null>(null);

  // Form State for regular meeting stages
  const [formData, setFormData] = useState<{
    event_type: EventType;
    title: string;
    scheduled_at: string;
    duration_minutes: number;
    location_or_link: string;
    interviewers: string;
    notes: string;
    is_completed: boolean;
  }>({
    event_type: "technical_interview",
    title: "",
    scheduled_at: "",
    duration_minutes: 60,
    location_or_link: "",
    interviewers: "",
    notes: "",
    is_completed: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (job) {
      setCurrentJob(job);
    } else if (jobOfferId) {
      api.jobs.get(jobOfferId).then(setCurrentJob).catch(() => {});
    }
  }, [job, jobOfferId]);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const data = await api.events.list({ job_offer_id: jobOfferId });
      setEvents(data);
      if (onEventsCountChange) onEventsCountChange(data.length);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (jobOfferId) {
      fetchEvents();
    }
  }, [jobOfferId]);

  const openAddModal = () => {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 1);
    nextDate.setHours(10, 0, 0, 0);
    // Format to YYYY-MM-DDTHH:mm
    const pad = (n: number) => String(n).padStart(2, "0");
    const defaultDateStr = `${nextDate.getFullYear()}-${pad(
      nextDate.getMonth() + 1
    )}-${pad(nextDate.getDate())}T${pad(nextDate.getHours())}:${pad(
      nextDate.getMinutes()
    )}`;

    setEditingEvent(null);
    setFormData({
      event_type: "technical_interview",
      title: "Rozmowa techniczna",
      scheduled_at: defaultDateStr,
      duration_minutes: 60,
      location_or_link: "",
      interviewers: "",
      notes: "",
      is_completed: false,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (ev: RecruitmentEventRead) => {
    if (ev.event_type === "application_submitted") {
      setEditingApplicationEvent(ev);
      setIsApplicationModalOpen(true);
      return;
    }

    setEditingEvent(ev);
    const dateObj = new Date(ev.scheduled_at);
    const pad = (n: number) => String(n).padStart(2, "0");
    const dateStr = !isNaN(dateObj.getTime())
      ? `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(
          dateObj.getDate()
        )}T${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`
      : "";

    setFormData({
      event_type: ev.event_type,
      title: ev.title,
      scheduled_at: dateStr,
      duration_minutes: ev.duration_minutes || 60,
      location_or_link: ev.location_or_link || "",
      interviewers: ev.interviewers || "",
      notes: ev.notes || "",
      is_completed: ev.is_completed,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.scheduled_at) {
      alert("Proszę podać tytuł etapu oraz datę i godzinę spotkania.");
      return;
    }

    try {
      setIsSubmitting(true);
      const isoScheduledAt = new Date(formData.scheduled_at).toISOString();

      if (editingEvent) {
        const updatePayload: RecruitmentEventUpdate = {
          event_type: formData.event_type,
          title: formData.title,
          scheduled_at: isoScheduledAt,
          duration_minutes: Number(formData.duration_minutes),
          location_or_link: formData.location_or_link || null,
          interviewers: formData.interviewers || null,
          notes: formData.notes || null,
          is_completed: formData.is_completed,
        };
        await api.events.update(editingEvent.id, updatePayload);
      } else {
        const createPayload: RecruitmentEventCreate = {
          job_offer_id: jobOfferId,
          event_type: formData.event_type,
          title: formData.title,
          scheduled_at: isoScheduledAt,
          duration_minutes: Number(formData.duration_minutes),
          location_or_link: formData.location_or_link || null,
          interviewers: formData.interviewers || null,
          notes: formData.notes || null,
          is_completed: formData.is_completed,
        };
        await api.events.create(createPayload);
      }

      setIsModalOpen(false);
      await fetchEvents();
    } catch {
      alert("Błąd podczas zapisywania etapu rekrutacji.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (ev: RecruitmentEventRead) => {
    if (!window.confirm("Czy na pewno chcesz usunąć ten etap rekrutacji?"))
      return;
    try {
      await api.events.delete(ev.id);
      await fetchEvents();
      if (ev.event_type === "application_submitted") {
        const updated = await api.jobs.get(jobOfferId);
        setCurrentJob(updated);
        if (onJobUpdated) onJobUpdated(updated);
      }
    } catch {
      alert("Nie udało się usunąć wydarzenia.");
    }
  };

  const handleToggleComplete = async (ev: RecruitmentEventRead) => {
    try {
      await api.events.update(ev.id, { is_completed: !ev.is_completed });
      await fetchEvents();
    } catch {
      alert("Błąd aktualizacji statusu etapu");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Oś czasu rekrutacji ({events.length})
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Śledź zaplanowane etapy, rozmowy i terminy dla tej oferty
          </p>
        </div>
        <Button size="sm" variant="primary" onClick={openAddModal}>
          <Plus className="h-4 w-4 mr-1.5" />
          Dodaj etap
        </Button>
      </div>

      {isLoading ? (
        <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
          Ładowanie etapów...
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center">
          <Calendar className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Brak zaplanowanych etapów rekrutacji
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 mb-3">
            Dodaj screening HR, rozmowę techniczną lub termin zadania
          </p>
          <Button size="sm" variant="outline" onClick={openAddModal}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Dodaj pierwszy etap
          </Button>
        </div>
      ) : (
        <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 space-y-6 py-2">
          {events.map((ev) => {
            const isAppSubmitted = ev.event_type === "application_submitted";

            return (
              <div key={ev.id} className="relative pl-6 group">
                {/* Dot */}
                <button
                  type="button"
                  onClick={() => handleToggleComplete(ev)}
                  className="absolute -left-2.5 top-0.5 rounded-full bg-white dark:bg-slate-900 transition-transform hover:scale-110"
                  title={
                    ev.is_completed
                      ? "Oznacz jako nieukończone"
                      : "Oznacz jako ukończone"
                  }
                >
                  {isAppSubmitted ? (
                    <div className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center border border-blue-400">
                      <Send className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    </div>
                  ) : ev.is_completed ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Circle className="h-5 w-5 text-slate-400 dark:text-slate-500 hover:text-blue-500" />
                  )}
                </button>

                <div
                  className={`rounded-lg border p-4 shadow-sm transition-colors ${
                    isAppSubmitted
                      ? "border-blue-200 bg-blue-50/20 dark:border-blue-900/60 dark:bg-blue-950/20 hover:border-blue-300"
                      : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h5
                          className={`font-semibold text-sm text-slate-900 dark:text-slate-100 ${
                            ev.is_completed && !isAppSubmitted
                              ? "line-through text-slate-400 dark:text-slate-600"
                              : ""
                          }`}
                        >
                          {ev.title}
                        </h5>
                        <Badge variant={isAppSubmitted ? "default" : "info"}>
                          {EVENT_TYPE_LABELS[ev.event_type] || ev.event_type}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDateTime(ev.scheduled_at)}
                          {ev.duration_minutes && !isAppSubmitted
                            ? ` (${ev.duration_minutes} min)`
                            : ""}
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
                                Link do spotkania
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

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(ev)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-800 rounded-md cursor-pointer"
                        title={isAppSubmitted ? "Edytuj szczegóły i datę aplikacji" : "Edytuj etap"}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(ev)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-500 dark:hover:text-rose-400 dark:hover:bg-rose-950/50 rounded-md cursor-pointer"
                        title="Usuń etap"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Attached Documents */}
                  {ev.attachments && ev.attachments.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {ev.attachments.map((att) => (
                        <a
                          key={att.id}
                          href={att.download_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
                        >
                          <Paperclip className="h-3 w-3 text-slate-400" />
                          <span className="truncate max-w-[220px]">{att.file_name}</span>
                          <Download className="h-3 w-3 text-slate-400 ml-0.5" />
                        </a>
                      ))}
                    </div>
                  )}

                  {ev.notes && (
                    <div className="mt-3 rounded-md bg-slate-50 p-2.5 text-xs text-slate-600 border border-slate-100 dark:bg-slate-800/60 dark:border-slate-800 dark:text-slate-300 flex items-start gap-2">
                      <FileText className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 mt-0.5 shrink-0" />
                      <p className="whitespace-pre-line">{ev.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Application Submission Modal */}
      <StatusTransitionModal
        isOpen={isApplicationModalOpen}
        onClose={() => {
          setIsApplicationModalOpen(false);
          setEditingApplicationEvent(null);
        }}
        job={currentJob}
        existingEvent={editingApplicationEvent}
        onSuccess={(updatedJob) => {
          setCurrentJob(updatedJob);
          fetchEvents();
          if (onJobUpdated) onJobUpdated(updatedJob);
        }}
      />

      {/* Add / Edit General Event Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          editingEvent ? "Edytuj etap rekrutacji" : "Zaplanuj etap rekrutacji"
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Typ etapu"
            value={formData.event_type}
            onChange={(e) =>
              setFormData({
                ...formData,
                event_type: e.target.value as EventType,
              })
            }
          >
            <option value="hr_screening">HR Screening</option>
            <option value="technical_interview">Rozmowa techniczna</option>
            <option value="task_deadline">Zadanie rekrutacyjne (termin)</option>
            <option value="manager_interview">Rozmowa z managerem</option>
            <option value="other">Inne spotkanie</option>
          </Select>

          <Input
            label="Tytuł spotkania / etapu"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            placeholder="np. Rozmowa techniczna z leadem (live coding)"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Data i godzina"
              type="datetime-local"
              value={formData.scheduled_at}
              onChange={(e) =>
                setFormData({ ...formData, scheduled_at: e.target.value })
              }
              required
            />
            <Input
              label="Czas trwania (minuty)"
              type="number"
              min={15}
              step={15}
              value={formData.duration_minutes}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  duration_minutes: Number(e.target.value),
                })
              }
            />
          </div>

          <Input
            label="Link do spotkania lub adres"
            value={formData.location_or_link}
            onChange={(e) =>
              setFormData({ ...formData, location_or_link: e.target.value })
            }
            placeholder="np. https://meet.google.com/xyz lub Biuro Warszawa"
          />

          <Input
            label="Osoby rekrutujące"
            value={formData.interviewers}
            onChange={(e) =>
              setFormData({ ...formData, interviewers: e.target.value })
            }
            placeholder="np. Anna Nowak (HR), Piotr Kowalski (Tech Lead)"
          />

          <Textarea
            label="Notatki / Przygotowanie"
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            placeholder="Pytania do zadania, zagadnienia techniczne, przygotowane projekty..."
            rows={3}
          />

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_completed"
              checked={formData.is_completed}
              onChange={(e) =>
                setFormData({ ...formData, is_completed: e.target.checked })
              }
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <label
              htmlFor="is_completed"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Oznacz ten etap jako ukończony
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Anuluj
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {editingEvent ? "Zapisz zmiany" : "Zaplanuj etap"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
