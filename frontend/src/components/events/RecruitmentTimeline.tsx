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
} from "lucide-react";
import { api } from "../../lib/api";
import type {
  EventType,
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

interface RecruitmentTimelineProps {
  jobOfferId: string;
  onEventsCountChange?: (count: number) => void;
}

export const RecruitmentTimeline: React.FC<RecruitmentTimelineProps> = ({
  jobOfferId,
  onEventsCountChange,
}) => {
  const [events, setEvents] = useState<RecruitmentEventRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<RecruitmentEventRead | null>(
    null
  );

  // Form State
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
    } catch (err) {
      alert("Błąd podczas zapisywania etapu rekrutacji.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Czy na pewno chcesz usunąć ten etap rekrutacji?"))
      return;
    try {
      await api.events.delete(id);
      await fetchEvents();
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
          <h4 className="text-sm font-semibold text-slate-900">
            Oś czasu rekrutacji ({events.length})
          </h4>
          <p className="text-xs text-slate-500">
            Śledź zaplanowane etapy, rozmowy i terminy dla tej oferty
          </p>
        </div>
        <Button size="sm" variant="primary" onClick={openAddModal}>
          <Plus className="h-4 w-4 mr-1.5" />
          Dodaj etap
        </Button>
      </div>

      {isLoading ? (
        <div className="py-6 text-center text-xs text-slate-400">
          Ładowanie etapów...
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
          <Calendar className="mx-auto h-8 w-8 text-slate-300 mb-2" />
          <p className="text-sm font-medium text-slate-600">
            Brak zaplanowanych etapów rekrutacji
          </p>
          <p className="text-xs text-slate-400 mt-1 mb-3">
            Dodaj screening HR, rozmowę techniczną lub termin zadania
          </p>
          <Button size="sm" variant="outline" onClick={openAddModal}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Dodaj pierwszy etap
          </Button>
        </div>
      ) : (
        <div className="relative border-l-2 border-slate-200 ml-4 space-y-6 py-2">
          {events.map((ev) => (
            <div key={ev.id} className="relative pl-6 group">
              {/* Dot */}
              <button
                type="button"
                onClick={() => handleToggleComplete(ev)}
                className="absolute -left-2.5 top-0.5 rounded-full bg-white transition-transform hover:scale-110"
                title={
                  ev.is_completed
                    ? "Oznacz jako nieukończone"
                    : "Oznacz jako ukończone"
                }
              >
                {ev.is_completed ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Circle className="h-5 w-5 text-slate-400 hover:text-blue-500" />
                )}
              </button>

              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h5
                        className={`font-semibold text-sm text-slate-900 ${
                          ev.is_completed ? "line-through text-slate-400" : ""
                        }`}
                      >
                        {ev.title}
                      </h5>
                      <Badge variant="info">
                        {EVENT_TYPE_LABELS[ev.event_type] || ev.event_type}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1 font-medium text-blue-600">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDateTime(ev.scheduled_at)}
                        {ev.duration_minutes
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
                              className="flex items-center gap-1 text-blue-600 hover:underline"
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
                        <span className="flex items-center gap-1">
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
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md"
                      title="Edytuj etap"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(ev.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                      title="Usuń etap"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {ev.notes && (
                  <div className="mt-3 rounded-md bg-slate-50 p-2.5 text-xs text-slate-600 border border-slate-100 flex items-start gap-2">
                    <FileText className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <p className="whitespace-pre-line">{ev.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Event Modal */}
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
              className="text-sm font-medium text-slate-700"
            >
              Oznacz ten etap jako ukończony
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
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
