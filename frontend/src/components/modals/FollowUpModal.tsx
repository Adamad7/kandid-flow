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
        <div className="rounded-lg bg-indigo-50/70 border border-indigo-100 p-3.5 dark:bg-indigo-950/40 dark:border-indigo-900 flex items-start gap-3">
          <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700 dark:text-slate-300">
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              {job.role_title} @ {job.company_name}
            </p>
            <p className="mt-0.5 text-slate-600 dark:text-slate-400">
              Przygotuj uprzejme przypomnienie o swojej kandydaturze dostosowane do wybranego kanału.
            </p>
          </div>
        </div>

        {/* Configuration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Kanał kontaktu:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPlatform("linkedin")}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-medium transition-colors ${
                  platform === "linkedin"
                    ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300 font-semibold"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                <Linkedin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                LinkedIn
              </button>
              <button
                type="button"
                onClick={() => setPlatform("email")}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-medium transition-colors ${
                  platform === "email"
                    ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300 font-semibold"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                <Mail className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                E-mail
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
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
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
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
            size="sm"
            onClick={handleGenerate}
            isLoading={isGenerating}
            className="w-full sm:w-auto"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            {generatedContent ? "Wygeneruj inną wersję" : "Generuj wiadomość (AI)"}
          </Button>
        </div>

        {/* Output area */}
        {generatedContent && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            {platform === "email" && generatedSubject && (
              <div>
                <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Temat e-mail:
                </span>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {generatedSubject}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Treść wiadomości:
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  {isCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Skopiowano!</span>
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

        <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Zamknij
          </Button>
        </div>
      </div>
    </Modal>
  );
};
