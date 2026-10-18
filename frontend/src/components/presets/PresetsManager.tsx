import React, { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  Eye,
  Layers,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { api } from "../../lib/api";
import type {
  BaseCVPresetCreate,
  BaseCVPresetRead,
  CandidateSectionBlock,
  CVLayoutSchema,
  CVPreviewResponse,
} from "../../types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Modal } from "../ui/Modal";
import { Badge } from "../ui/Badge";
import { PresetEditor } from "./PresetEditor";

export const PresetsManager: React.FC = () => {
  const [presets, setPresets] = useState<BaseCVPresetRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active full split-view editor preset
  const [activeEditingPreset, setActiveEditingPreset] =
    useState<BaseCVPresetRead | null>(null);

  // Quick Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formLanguage, setFormLanguage] = useState<"pl" | "en">("pl");
  const [formSections, setFormSections] = useState<CandidateSectionBlock[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Preview Modal State
  const [previewPreset, setPreviewPreset] = useState<BaseCVPresetRead | null>(
    null
  );
  const [previewResult, setPreviewResult] = useState<CVPreviewResponse | null>(
    null
  );
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);

  const fetchPresets = async () => {
    try {
      setIsLoading(true);
      const data = await api.presets.list();
      setPresets(data);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPresets();
  }, []);

  const openCreateModal = () => {
    setFormTitle("");
    setFormLanguage("pl");
    setFormSections([
      {
        id: "summary",
        type: "summary",
        title: "O mnie",
        content:
          "Doświadczony specjalista skupiony na dostarczaniu wartości biznesowej i czystej architektury oprogramowania.",
      },
      {
        id: "skills",
        type: "skills",
        title: "Umiejętności",
        items: [
          { category: "Języki i Frameworki", skills: ["TypeScript", "Python", "Docker"] },
          { category: "Narzędzia i Chmura", skills: ["Git", "CI/CD", "PostgreSQL", "AWS"] },
        ],
      },
      {
        id: "experience",
        type: "experience",
        title: "Doświadczenie zawodowe",
        items: [
          {
            position: "Senior Specialist",
            company: "Firma IT",
            location: "Warszawa",
            start_date: "2021",
            end_date: "present",
            highlights: [
              "Rozwój i skalowanie architektury aplikacji produkcyjnych",
              "Automatyzacja procesów wdrożeniowych i optymalizacja systemów",
            ],
          },
        ],
      },
      {
        id: "projects",
        type: "projects",
        title: "Kluczowe projekty",
        items: [
          {
            name: "Główny Projekt",
            role: "Architekt / Lead Developer",
            url: "https://github.com",
            start_date: "2023",
            end_date: "present",
            description: "Wdrożenie nowej architektury modularnej o wysokiej skalowalności.",
            technologies: ["React", "TypeScript", "FastAPI"],
          },
        ],
      },
      {
        id: "education",
        type: "education",
        title: "Edukacja",
        items: [
          {
            institution: "Politechnika",
            degree: "Inżynier",
            field_of_study: "Informatyka",
            start_date: "2016",
            end_date: "2020",
          },
        ],
      },
      {
        id: "clause",
        type: "clause",
        title: "Klauzula RODO",
        content:
          "Wyrażam zgodę na przetwarzanie moich danych osobowych dla potrzeb niezbędnych do realizacji procesu rekrutacji zgodnie z RODO.",
      },
    ]);
    setIsCreateModalOpen(true);
  };

  const handleCreatePreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert("Proszę podać nazwę szablonu.");
      return;
    }

    try {
      setIsSubmitting(true);
      const layout_schema: CVLayoutSchema = {
        language: formLanguage,
        sections: formSections,
      };

      const createData: BaseCVPresetCreate = {
        title: formTitle.trim(),
        language: formLanguage,
        layout_schema,
      };
      const created = await api.presets.create(createData);

      setIsCreateModalOpen(false);
      await fetchPresets();
      // Immediately open detailed split-view editor for the newly created preset!
      setActiveEditingPreset(created);
    } catch {
      alert("Błąd podczas tworzenia nowego szablonu bazowego.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePreset = async (preset: BaseCVPresetRead) => {
    if (
      !window.confirm(
        `Czy na pewno chcesz usunąć szablon bazowy "${preset.title}"?`
      )
    ) {
      return;
    }
    try {
      await api.presets.delete(preset.id);
      await fetchPresets();
    } catch {
      alert("Nie udało się usunąć szablonu.");
    }
  };

  const handleOpenPreview = async (preset: BaseCVPresetRead) => {
    setPreviewPreset(preset);
    setPreviewResult(null);
    setPreviewError(null);
    setIsPreviewLoading(true);

    try {
      const res = await api.presets.preview(preset.id);
      setPreviewResult(res);
    } catch {
      setPreviewError("Błąd kompilacji szablonu w silniku Typst.");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // If a preset is currently being edited in split-view:
  if (activeEditingPreset) {
    return (
      <PresetEditor
        preset={activeEditingPreset}
        onBack={() => {
          setActiveEditingPreset(null);
          fetchPresets();
        }}
        onSaved={(updated) => {
          setActiveEditingPreset(updated);
          setPresets((prev) =>
            prev.map((p) => (p.id === updated.id ? updated : p))
          );
        }}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Szablony bazowe CV (Archetypy ról)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Zdefiniuj gotowe profile stanowiskowe (np. Flutter Developer, DevOps, Fullstack) do natychmiastowego generowania i dopasowywania CV ze split-view podglądu Typst
          </p>
        </div>

        <Button variant="primary" onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-1.5" />
          Nowy szablon bazowy
        </Button>
      </div>

      {/* Grid of Presets */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-slate-400 dark:text-slate-500 animate-pulse">
          Ładowanie szablonów bazowych...
        </div>
      ) : presets.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-300 dark:border-slate-800 dark:bg-slate-900">
          <Layers className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Brak szablonów bazowych
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            Stwórz pierwszy szablon stanowiskowy, aby AI mogło sprofilować Twoje CV bezpośrednio pod konkretne domeny technologiczne.
          </p>
          <Button variant="primary" onClick={openCreateModal}>
            <Plus className="h-4 w-4 mr-1" />
            Utwórz pierwszy szablon
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {presets.map((p) => {
            const layout = p.layout_schema;
            const sections = Array.isArray(layout)
              ? layout
              : layout?.sections || [];
            const sectionCount = sections.length;

            return (
              <div
                key={p.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base line-clamp-1">
                      {p.title}
                    </h3>
                    <Badge variant={p.language === "pl" ? "default" : "secondary"}>
                      {p.language.toUpperCase()}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    Zmodyfikowano: {new Date(p.updated_at).toLocaleDateString("pl-PL")}
                  </p>

                  {/* Badges of sections */}
                  <div className="flex flex-wrap gap-1.5">
                    {sections.slice(0, 4).map((s, idx) => (
                      <span
                        key={idx}
                        className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                      >
                        {s.title || s.type}
                      </span>
                    ))}
                    {sectionCount > 4 && (
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 self-center">
                        +{sectionCount - 4}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setActiveEditingPreset(p)}
                    className="text-xs flex-1"
                  >
                    <Edit2 className="h-3.5 w-3.5 mr-1" />
                    Edytuj szablon (Split View)
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenPreview(p)}
                    className="text-xs px-2.5"
                    title="Szybki podgląd Typst"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>

                  <button
                    type="button"
                    onClick={() => handleDeletePreset(p)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-500 dark:hover:text-rose-400 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                    title="Usuń szablon"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Create Preset Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Nowy szablon bazowy CV"
        maxWidth="xl"
      >
        <form onSubmit={handleCreatePreset} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="Nazwa szablonu / Stanowisko"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="np. Senior Flutter Developer"
                required
              />
            </div>
            <Select
              label="Język szablonu"
              value={formLanguage}
              onChange={(e) => setFormLanguage(e.target.value as "pl" | "en")}
            >
              <option value="pl">Polski (PL)</option>
              <option value="en">Angielski (EN)</option>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Początkowe sekcje ({formSections.length})
              </label>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {formSections.map((sec, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 flex items-center justify-between gap-3 text-xs dark:border-slate-800 dark:bg-slate-800/60"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {sec.title || sec.type}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {sec.type}
                    </Badge>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setFormSections((prev) =>
                        prev.filter((_, sIdx) => sIdx !== idx)
                      )
                    }
                    className="text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 p-1"
                    title="Usuń sekcję"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Po utworzeniu szablonu zostaniesz automatycznie przeniesiony do pełnego edytora split-view z podglądem na żywo.
          </p>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Anuluj
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Utwórz i przejdź do edycji
            </Button>
          </div>
        </form>
      </Modal>

      {/* Live SVG Preview Modal for Quick Preview */}
      {previewPreset && (
        <Modal
          isOpen={!!previewPreset}
          onClose={() => setPreviewPreset(null)}
          title={`Podgląd Typst: ${previewPreset.title}`}
          maxWidth="4xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg">
              <span className="text-xs text-slate-600 dark:text-slate-300">
                Silnik Typst kompiluje layout do wektorów SVG dla każdej strony.
              </span>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    const toEdit = previewPreset;
                    setPreviewPreset(null);
                    setActiveEditingPreset(toEdit);
                  }}
                  className="text-xs h-7"
                >
                  <Edit2 className="h-3 w-3 mr-1" />
                  Otwórz w edytorze
                </Button>
                <div className="flex items-center bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setZoomScale((s) => Math.max(0.5, s - 0.1))}
                    className="p-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-xs px-2 font-mono dark:text-slate-200">
                    {Math.round(zoomScale * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomScale((s) => Math.min(1.5, s + 0.1))}
                    className="p-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {isPreviewLoading ? (
              <div className="py-24 text-center text-sm text-slate-400 dark:text-slate-500 animate-pulse">
                Kompilacja Typst w toku...
              </div>
            ) : previewError ? (
              <div className="p-4 bg-rose-50 text-rose-700 rounded-lg text-sm border border-rose-200 dark:bg-rose-950/50 dark:border-rose-900 dark:text-rose-300">
                {previewError}
              </div>
            ) : (
              <div className="max-h-[70vh] overflow-auto flex flex-col items-center gap-6 p-4 bg-slate-200/50 dark:bg-slate-950 rounded-lg">
                {previewResult?.svg_pages.map((svg, idx) => (
                  <div
                    key={idx}
                    className="bg-white shadow-xl rounded-sm transition-transform duration-200"
                    style={{
                      transform: `scale(${zoomScale})`,
                      transformOrigin: "top center",
                    }}
                  >
                    <div
                      className="typst-page-svg select-text"
                      dangerouslySetInnerHTML={{ __html: svg }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
