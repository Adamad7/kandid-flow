import React, { useState } from "react";
import { Sparkles, Copy, Check, Mail, Linkedin, Clock } from "lucide-react";
import { api } from "../../lib/api";
import type { FollowUpPlatform, FollowUpTone, JobOfferRead } from "../../types";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";

interface FollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: JobOfferRead | null;
}

export const FollowUpModal: React.FC<FollowUpModalProps> = ({
  isOpen,
  onClose,
  job,
}) => {
  const [platform, setPlatform] = useState<FollowUpPlatform>("linkedin");
  const [tone, setTone] = useState<FollowUpTone>("polite_inquiry");
  const [customNotes, setCustomNotes] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSubject, setGeneratedSubject] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string>("");
  const [isCopied, setIsCopied] = useState(false);

  if (!job) return null;

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setIsCopied(false);
      const res = await api.jobs.generateFollowUp(job.id, {
        platform,
        tone,
        custom_notes: customNotes.trim() || null,
      });
      setGeneratedSubject(res.subject || null);
      setGeneratedContent(res.content);
    } catch {
      alert("Nie udało się wygenerować wiadomości follow-up.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      const textToCopy =
        platform === "email" && generatedSubject
          ? `Temat: ${generatedSubject}\n\n${generatedContent}`
          : generatedContent;
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      alert("Nie udało się skopiować do schowka.");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generator wiadomości Follow-up (AI)"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Context banner */}
        <div className="rounded-2xl bg-indigo-50/60 border-2 border-indigo-200/80 p-4 dark:bg-indigo-950/30 dark:border-indigo-800 flex items-start gap-3.5">
          <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700 dark:text-neutral-300">
            <p className="font-bold text-slate-900 dark:text-neutral-100 text-sm">
              {job.role_title} @ {job.company_name}
            </p>
            <p className="mt-1 text-slate-600 dark:text-neutral-400 leading-relaxed">
              Przygotuj uprzejme przypomnienie o swojej kandydaturze dostosowane do wybranego kanału.
            </p>
          </div>
        </div>

        {/* Configuration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">
              Kanał kontaktu:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPlatform("linkedin")}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 text-xs font-semibold transition-all duration-150 ${
                  platform === "linkedin"
                    ? "border-sky-600 bg-sky-50/80 text-sky-700 dark:border-sky-500 dark:bg-sky-950/50 dark:text-sky-300 shadow-none"
                    : "border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-slate-300 dark:hover:border-neutral-700 text-slate-600 dark:text-neutral-400 shadow-none"
                }`}
              >
                <Linkedin className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                LinkedIn
              </button>
              <button
                type="button"
                onClick={() => setPlatform("email")}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 text-xs font-semibold transition-all duration-150 ${
                  platform === "email"
                    ? "border-indigo-600 bg-indigo-50/80 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/50 dark:text-indigo-300 shadow-none"
                    : "border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-slate-300 dark:hover:border-neutral-700 text-slate-600 dark:text-neutral-400 shadow-none"
                }`}
              >
                <Mail className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                E-mail
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">
              Ton wypowiedzi:
            </label>
            <Select
              value={tone}
              onChange={(e) => setTone(e.target.value as FollowUpTone)}
              className="text-xs"
            >
              <option value="polite_inquiry">Uprzejmy i wyważony</option>
              <option value="enthusiastic">Entuzjastyczny i zmotywowany</option>
              <option value="short_checkin">Krótki check-in (2-3 zdania)</option>
            </Select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">
            Wskazówki dla AI (opcjonalnie):
          </label>
          <Textarea
            value={customNotes}
            onChange={(e) => setCustomNotes(e.target.value)}
            placeholder="np. Wspomnij o moim ostatnim projekcie w React, albo że rozmawiałem wcześniej z Kasią na targach..."
            rows={2}
            className="text-xs"
          />
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleGenerate}
            isLoading={isGenerating}
            className="w-full sm:w-auto font-semibold"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {generatedContent ? "Wygeneruj inną wersję" : "Generuj wiadomość (AI)"}
          </Button>
        </div>

        {/* Output area */}
        {generatedContent && (
          <div className="mt-4 pt-4 border-t border-slate-200/80 dark:border-neutral-800 space-y-3">
            {platform === "email" && generatedSubject && (
              <div>
                <span className="block text-[11px] font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
                  Temat e-mail:
                </span>
                <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-neutral-950 border border-slate-200/80 dark:border-neutral-800 text-xs font-semibold text-slate-900 dark:text-neutral-100">
                  {generatedSubject}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                  Treść wiadomości:
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border-2 text-xs font-semibold transition-all duration-150 ${
                    isCopied
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "border-indigo-200 bg-indigo-50/60 text-indigo-600 dark:border-indigo-800/80 dark:bg-indigo-950/40 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60"
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Skopiowano!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Kopiuj do schowka
                    </>
                  )}
                </button>
              </div>

              <Textarea
                value={generatedContent}
                onChange={(e) => setGeneratedContent(e.target.value)}
                rows={6}
                className="text-xs font-sans leading-relaxed"
              />
            </div>
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-slate-200/80 dark:border-neutral-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Zamknij
          </Button>
        </div>
      </div>
    </Modal>
  );
};
