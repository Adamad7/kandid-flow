import React, { useEffect, useState, useRef } from "react";
import {
  Upload,
  FileText,
  Trash2,
  Download,
  Eye,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import { api } from "../../lib/api";
import type { JobAttachmentRead } from "../../types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";

interface JobAttachmentsTabProps {
  jobOfferId: string;
  onAttachmentsCountChange?: (count: number) => void;
}

export const JobAttachmentsTab: React.FC<JobAttachmentsTabProps> = ({
  jobOfferId,
  onAttachmentsCountChange,
}) => {
  const [attachments, setAttachments] = useState<JobAttachmentRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // Form states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Preview modal state
  const [previewAttachment, setPreviewAttachment] = useState<JobAttachmentRead | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAttachments = async () => {
    try {
      setIsLoading(true);
      const data = await api.attachments.list(jobOfferId);
      setAttachments(data);
      if (onAttachmentsCountChange) onAttachmentsCountChange(data.length);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (jobOfferId) {
      fetchAttachments();
    }
  }, [jobOfferId]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert("Wybierz plik do wgrania.");
      return;
    }

    try {
      setIsUploading(true);
      await api.attachments.upload(
        jobOfferId,
        selectedFile,
        "other",
        null,
        notes.trim() || null
      );
      setSelectedFile(null);
      setNotes("");
      setIsFormOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchAttachments();
    } catch {
      alert("Błąd podczas wgrywania pliku.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (attachment: JobAttachmentRead) => {
    if (!confirm(`Czy na pewno chcesz usunąć plik "${attachment.file_name}"?`)) {
      return;
    }
    try {
      await api.attachments.delete(jobOfferId, attachment.id);
      await fetchAttachments();
    } catch {
      alert("Nie udało się usunąć załącznika.");
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Załączniki i dokumenty ({attachments.length})
          </h4>
          <p className="text-xs text-slate-500 dark:text-neutral-400">
            Zewnętrzne CV, list motywacyjny, pliki zadań rekrutacyjnych oraz oferty pracy
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="rounded-xl"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Dodaj plik
        </Button>
      </div>

      {/* Upload Form (Collapsible) */}
      {isFormOpen && (
        <form
          onSubmit={handleUpload}
          className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-900/60 dark:bg-neutral-900 space-y-3 shadow-none animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
              Wgraj nowy dokument do oferty
            </span>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 rounded-lg p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
              Wybierz plik (PDF, DOCX, ZIP, obrazy):
            </label>
            <input
              ref={fileInputRef}
              type="file"
              required
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setSelectedFile(e.target.files[0]);
                }
              }}
              className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-100 file:text-indigo-800 hover:file:bg-indigo-200 dark:file:bg-indigo-950 dark:file:text-indigo-200"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
              Opis / Notatka (opcjonalnie):
            </label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="np. Wersja wysłana z polecenia Marcina, treść zadania z terminem do piątku..."
              className="text-xs h-9 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFormOpen(false)}
              disabled={isUploading}
              className="rounded-xl"
            >
              Anuluj
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isUploading}
              className="rounded-xl"
            >
              <Upload className="h-3.5 w-3.5 mr-1" />
              Wgraj plik
            </Button>
          </div>
        </form>
      )}

      {/* Attachments List */}
      {isLoading ? (
        <div className="py-8 text-center text-xs text-slate-400 dark:text-neutral-500">
          <RefreshCw className="h-5 w-5 animate-spin mx-auto text-indigo-600 mb-2" />
          Ładowanie załączników...
        </div>
      ) : attachments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200/90 dark:border-neutral-800 p-8 text-center bg-slate-50/40 dark:bg-neutral-900/40">
          <FileText className="mx-auto h-8 w-8 text-slate-300 dark:text-neutral-600 mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
            Brak załączonych plików dla tej oferty
          </p>
          <p className="text-xs text-slate-400 dark:text-neutral-500 mt-1 mb-3">
            Możesz dołączyć zewnętrzne CV, dokument zadania rekrutacyjnego lub inne materiały
          </p>
          <Button size="sm" variant="outline" onClick={() => setIsFormOpen(true)} className="rounded-xl">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Dodaj pierwszy załącznik
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((att) => {
            const isPdf = att.mime_type.toLowerCase().includes("pdf");
            const downloadUrl = api.attachments.getDownloadUrl(jobOfferId, att.id);

            return (
              <div
                key={att.id}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 border border-slate-200/80 rounded-xl dark:bg-neutral-950/60 dark:border-neutral-800 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 shrink-0 mt-0.5">
                    <FileText className="h-4 w-4" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                        {att.file_name}
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-neutral-500 font-mono">
                        {formatFileSize(att.file_size_bytes)}
                      </span>
                    </div>

                    {att.notes && (
                      <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                        {att.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                  {isPdf && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPreviewAttachment(att)}
                      className="text-xs h-7.5 px-2.5 rounded-xl border-slate-200 dark:border-neutral-700"
                      title="Podgląd dokumentu PDF w aplikacji"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1 text-slate-600 dark:text-neutral-400" />
                      Podgląd
                    </Button>
                  )}

                  <a
                    href={downloadUrl}
                    download={att.file_name}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center text-xs h-7.5 px-2.5 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors font-medium shadow-none"
                    title="Pobierz plik"
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Pobierz
                  </a>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(att)}
                    className="h-7.5 w-7.5 p-0 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    title="Usuń plik"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PDF In-App Preview Modal */}
      {previewAttachment && (
        <Modal
          isOpen={Boolean(previewAttachment)}
          onClose={() => setPreviewAttachment(null)}
          title={`Podgląd dokumentu: ${previewAttachment.file_name}`}
          maxWidth="4xl"
          className="p-0 overflow-hidden w-full max-w-4xl h-[85vh] flex flex-col"
          contentClassName="p-0 flex flex-col flex-1 overflow-hidden h-full"
        >
          <div className="flex-1 w-full h-full bg-slate-100 dark:bg-neutral-950 p-2 overflow-hidden flex flex-col">
            <iframe
              src={api.attachments.getDownloadUrl(jobOfferId, previewAttachment.id)}
              className="w-full h-full rounded-xl border-0"
              title={previewAttachment.file_name}
            />
          </div>
          <div className="p-3 bg-slate-50/80 dark:bg-neutral-900/90 border-t border-slate-200/80 dark:border-neutral-800 flex justify-between items-center text-xs">
            <span className="text-slate-500 dark:text-neutral-400 font-mono">
              {formatFileSize(previewAttachment.file_size_bytes)}
            </span>
            <div className="flex items-center gap-2">
              <a
                href={api.attachments.getDownloadUrl(jobOfferId, previewAttachment.id)}
                download={previewAttachment.file_name}
                className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
              >
                <Download className="h-3.5 w-3.5" />
                Pobierz kopię
              </a>
              <Button size="sm" variant="outline" onClick={() => setPreviewAttachment(null)} className="rounded-xl">
                Zamknij
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
