import React, { useState, useEffect } from "react";
import { Send, FileText, Calendar, CheckCircle, Download, Paperclip } from "lucide-react";
import { api } from "../../lib/api";
import type {
  CVVersionRead,
  JobAttachmentRead,
  JobOfferRead,
  RecruitmentEventRead,
} from "../../types";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";

interface StatusTransitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: JobOfferRead | null;
  existingEvent?: RecruitmentEventRead | null;
  onSuccess: (updatedJob: JobOfferRead) => void;
}

export const StatusTransitionModal: React.FC<StatusTransitionModalProps> = ({
  isOpen,
  onClose,
  job,
  existingEvent,
  onSuccess,
}) => {
  const [appliedAt, setAppliedAt] = useState<string>("");
  const [cvOption, setCvOption] = useState<"generated" | "external" | "none">("none");
  const [cvVersions, setCvVersions] = useState<CVVersionRead[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>("");
  const [externalFile, setExternalFile] = useState<File | null>(null);
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeEvent, setActiveEvent] = useState<RecruitmentEventRead | null>(null);
  const [existingAttachments, setExistingAttachments] = useState<JobAttachmentRead[]>([]);

  const formatToLocalInput = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  };

  useEffect(() => {
    if (!isOpen || !job) return;

    setExternalFile(null);

    // Load available generated CV versions
    api.cv
      .listVersions(job.id)
      .then((versions) => {
        setCvVersions(versions);
        if (versions.length > 0 && !existingEvent && !job.applied_at) {
          setSelectedVersionId(versions[0].id);
          setCvOption("generated");
        }
      })
      .catch(() => {
        // ignore
      });

    // Populate data depending on whether an event or applied_at exists
    if (existingEvent) {
      setActiveEvent(existingEvent);
      setAppliedAt(formatToLocalInput(existingEvent.scheduled_at));
      setNotes(existingEvent.notes || "");
      setExistingAttachments(existingEvent.attachments || []);
      setCvOption("none");
    } else if (job.applied_at) {
      setAppliedAt(formatToLocalInput(job.applied_at));
      // Fetch the timeline event for this job offer
      api.events
        .list({ job_offer_id: job.id, event_type: "application_submitted" })
        .then((events) => {
          if (events.length > 0) {
            const ev = events[0];
            setActiveEvent(ev);
            setNotes(ev.notes || "");
            setExistingAttachments(ev.attachments || []);
          } else {
            setActiveEvent(null);
            setNotes("");
            setExistingAttachments([]);
          }
        })
        .catch(() => {
          setActiveEvent(null);
        });
      setCvOption("none");
    } else {
      // Brand new application submission
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const localNow = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
        now.getDate()
      )}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
      setAppliedAt(localNow);
      setNotes("");
      setActiveEvent(null);
      setExistingAttachments([]);
    }
  }, [isOpen, job, existingEvent]);

  if (!job) return null;

  const isEditMode = Boolean(activeEvent || existingEvent || job.applied_at);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appliedAt) {
      alert("Proszę podać datę wysłania aplikacji.");
      return;
    }

    try {
      setIsSubmitting(true);
      const isoAppliedAt = new Date(appliedAt).toISOString();

      // 1. Prepare event notes
      let eventNote = notes ? `${notes.trim()}` : "";
      if (cvOption === "generated") {
        const chosen = cvVersions.find((v) => v.id === selectedVersionId);
        const cvTag = `Wysłano wersję CV: v${chosen?.version_number || 1} (${chosen?.language.toUpperCase()})`;
        eventNote = eventNote ? `${eventNote}\n\n${cvTag}` : cvTag;
      } else if (cvOption === "external" && externalFile) {
        const fileTag = `Wysłano zewnętrzne CV: ${externalFile.name}`;
        eventNote = eventNote ? `${eventNote}\n\n${fileTag}` : fileTag;
      }

      // 2. Create or update event on recruitment timeline
      let targetEventId: string;
      if (activeEvent) {
        const updatedEv = await api.events.update(activeEvent.id, {
          scheduled_at: isoAppliedAt,
          notes: eventNote.trim() || null,
        });
        targetEventId = updatedEv.id;
      } else {
        const createdEv = await api.events.create({
          job_offer_id: job.id,
          event_type: "application_submitted",
          title: "Wysłano aplikację",
          scheduled_at: isoAppliedAt,
          duration_minutes: 0,
          notes: eventNote.trim() || null,
          is_completed: true,
        });
        targetEventId = createdEv.id;
      }

      // 3. If external file selected, upload it as an attachment linked to the event
      if (cvOption === "external" && externalFile) {
        await api.attachments.upload(
          job.id,
          externalFile,
          "cv_external",
          targetEventId,
          `Zewnętrzne CV wysłane ${appliedAt}`
        );
      }

      // 4. Update job status and applied_at date
      const updated = await api.jobs.update(job.id, {
        status: "applied",
        applied_at: isoAppliedAt,
      });

      onSuccess(updated);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Wystąpił błąd podczas zapisywania szczegółów aplikacji.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? "Szczegóły i edycja aplikacji" : "Rejestracja wysłania aplikacji"}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-lg bg-blue-50/70 border border-blue-100 p-3.5 dark:bg-blue-950/40 dark:border-blue-900 flex items-start gap-3">
          <Send className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700 dark:text-slate-300">
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              Stanowisko: {job.role_title || "Nieokreślone"} w {job.company_name || "Nieznana firma"}
            </p>
            <p className="mt-0.5 text-slate-600 dark:text-slate-400">
              {isEditMode
                ? "Edytuj dokładną datę wysłania, notatki oraz dokumenty powiązane z tym zgłoszeniem na osi czasu."
                : "Zarejestruj dokładną datę oraz opcjonalnie powiąż dokument CV, który trafił do rekrutera."}
            </p>
          </div>
        </div>

        {/* Date & Time Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            Dokładna data i godzina wysłania aplikacji:
          </label>
          <Input
            type="datetime-local"
            value={appliedAt}
            onChange={(e) => setAppliedAt(e.target.value)}
            required
            className="text-xs"
          />
        </div>

        {/* Existing Attachments Display (if in edit mode) */}
        {existingAttachments.length > 0 && (
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Paperclip className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              Dołączone dokumenty do tej aplikacji:
            </label>
            <div className="space-y-1.5">
              {existingAttachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between text-xs bg-white dark:bg-slate-800 p-2 rounded-md border border-slate-200 dark:border-slate-700"
                >
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate mr-2">
                    {att.file_name} ({(att.file_size_bytes / 1024).toFixed(1)} KB)
                  </span>
                  <a
                    href={att.download_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Pobierz
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CV Association Option */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            {isEditMode ? "Dodaj lub zmień dokument CV:" : "Które CV zostało wysłane?"}
          </label>

          <div className="space-y-2">
            {cvVersions.length > 0 && (
              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer">
                <input
                  type="radio"
                  name="cvOption"
                  value="generated"
                  checked={cvOption === "generated"}
                  onChange={() => setCvOption("generated")}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                  Powiąż wersję wygenerowaną w KandidFlow
                </span>
              </label>
            )}

            {cvOption === "generated" && cvVersions.length > 0 && (
              <div className="pl-6 pt-1">
                <select
                  value={selectedVersionId}
                  onChange={(e) => setSelectedVersionId(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  {cvVersions.map((v) => (
                    <option key={v.id} value={v.id}>
                      Wersja v{v.version_number} ({v.language.toUpperCase()})
                      {v.change_summary ? ` — ${v.change_summary}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer">
              <input
                type="radio"
                name="cvOption"
                value="external"
                checked={cvOption === "external"}
                onChange={() => setCvOption("external")}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                Wgraj nowe zewnętrzne CV (PDF / DOCX przygotowane poza aplikacją)
              </span>
            </label>

            {cvOption === "external" && (
              <div className="pl-6 pt-1">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setExternalFile(e.target.files[0]);
                    }
                  }}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-950/60 dark:file:text-blue-300"
                />
                {externalFile && (
                  <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle className="h-3 w-3" />
                    Wybrano plik: {externalFile.name} ({(externalFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
            )}

            <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer">
              <input
                type="radio"
                name="cvOption"
                value="none"
                checked={cvOption === "none"}
                onChange={() => setCvOption("none")}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                {isEditMode ? "Nie zmieniaj załączonych dokumentów" : "Nie przypisuj dokumentu CV teraz"}
              </span>
            </label>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Notatka do zgłoszenia / aplikacji:
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="np. Wysłano przez formularz na stronie kariery, podano stawkę 22k B2B..."
            rows={3}
            className="text-xs"
          />
        </div>

        <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Anuluj
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
            <Send className="h-3.5 w-3.5 mr-1.5" />
            {isEditMode ? "Zapisz zmiany w aplikacji" : "Zapisz i oznacz jako Zaaplikowano"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
