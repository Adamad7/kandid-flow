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
  BaseCVPresetUpdate,
  CandidateSectionBlock,
  CVLayoutSchema,
  CVPreviewResponse,
} from "../../types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Modal } from "../ui/Modal";
import { Badge } from "../ui/Badge";

export const PresetsManager: React.FC = () => {
  const [presets, setPresets] = useState<BaseCVPresetRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Editor Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<BaseCVPresetRead | null>(
    null
  );
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
    setEditingPreset(null);
    setFormTitle("");
    setFormLanguage("pl");
    setFormSections([
      {
        id: "summary",
        type: "summary",
        title: "Podsumowanie zawodowe",
        content:
          "Doświadczony specjalista skupiony na dostarczaniu wartości biznesowej i czystej architektury oprogramowania.",
      },
      {
        id: "skills",
        type: "skills",
        title: "Umiejętności techniczne",
        items: [
          { category: "Języki i Frameworki", skills: ["Flutter", "Dart", "TypeScript"] },
          { category: "Architektura i Narzędzia", skills: ["Bloc", "Git", "CI/CD", "Docker"] },
        ],
      },
      {
        id: "experience",
        type: "experience",
        title: "Doświadczenie zawodowe",
        items: [
          {
            position: "Senior Developer",
            company: "Przykładowa Firma",
            location: "Warszawa",
            start_date: "2021",
            end_date: "present",
            highlights: [
              "Rozwój i skalowanie aplikacji mobilnych i webowych",
              "Prowadzenie code review i mentoring zespołu programistów",
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
            name: "Platforma Mobilna",
            role: "Architekt Rozwiązania",
            url: "https://github.com",
            start_date: "2023",
            end_date: "2024",
            description: "Wdrożenie nowej architektury modularnej w aplikacji produkcyjnej.",
            technologies: ["Flutter", "Dart", "Firebase"],
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
    setIsEditModalOpen(true);
  };

  const openEditModal = (preset: BaseCVPresetRead) => {
    setEditingPreset(preset);
    setFormTitle(preset.title);
    setFormLanguage((preset.language as "pl" | "en") || "pl");

    const layout = preset.layout_schema;
    setFormSections(layout?.sections || []);
    setIsEditModalOpen(true);
  };

  const handleSavePreset = async (e: React.FormEvent) => {
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

      if (editingPreset) {
        const updateData: BaseCVPresetUpdate = {
          title: formTitle,
          language: formLanguage,
          layout_schema,
        };
        await api.presets.update(editingPreset.id, updateData);
      } else {
        const createData: BaseCVPresetCreate = {
          title: formTitle,
          language: formLanguage,
          layout_schema,
        };
        await api.presets.create(createData);
      }

      setIsEditModalOpen(false);
      await fetchPresets();
    } catch {
      alert("Błąd podczas zapisywania szablonu bazowego.");
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
    } catch (err: unknown) {
      setPreviewError("Błąd kompilacji szablonu w silniku Typst.");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Szablony bazowe CV (Archetypy ról)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Zdefiniuj gotowe profile stanowiskowe (np. Flutter Developer, DevOps, Fullstack) do natychmiastowego generowania i dopasowywania CV
          </p>
        </div>

        <Button variant="primary" onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-1.5" />
          Nowy szablon bazowy
        </Button>
      </div>

      {/* Grid of Presets */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-slate-400 animate-pulse">
          Ładowanie szablonów bazowych...
        </div>
      ) : presets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <Layers className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-800">
            Brak szablonów bazowych
          </h3>
          <p className="text-xs text-slate-500 mt-1 mb-4 max-w-sm mx-auto">
            Stwórz swój pierwszy archetyp stanowiskowy, aby móc błyskawicznie generować dopasowane CV pod konkretne role IT.
          </p>
          <Button variant="primary" onClick={openCreateModal}>
            <Plus className="h-4 w-4 mr-1.5" />
            Utwórz pierwszy szablon
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {presets.map((p) => {
            const sectionCount = p.layout_schema?.sections?.length || 0;
            return (
              <div
                key={p.id}
                className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Badge variant="info" className="uppercase font-mono">
                      {p.language}
                    </Badge>
                    <span className="text-xs text-slate-400">
                      {sectionCount} sekcji
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors">
                    {p.title}
                  </h3>

                  {/* Sections Preview List */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.layout_schema?.sections?.slice(0, 4).map((sec, idx) => (
                      <span
                        key={idx}
                        className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                      >
                        {sec.title || sec.type}
                      </span>
                    ))}
                    {sectionCount > 4 && (
                      <span className="text-[11px] text-slate-400 self-center">
                        +{sectionCount - 4}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenPreview(p)}
                    className="text-xs flex-1"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    Podgląd Typst
                  </Button>

                  <button
                    type="button"
                    onClick={() => openEditModal(p)}
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                    title="Edytuj szablon"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeletePreset(p)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
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

      {/* Edit / Create Preset Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={editingPreset ? `Edycja szablonu: ${editingPreset.title}` : "Nowy szablon bazowy CV"}
        maxWidth="2xl"
      >
        <form onSubmit={handleSavePreset} className="space-y-5">
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
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Zawarte sekcje ({formSections.length})
              </label>
            </div>

            <div className="space-y-3">
              {formSections.map((sec, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 flex items-center justify-between gap-3 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">
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
                    className="text-slate-400 hover:text-rose-600 p-1"
                    title="Usuń tę sekcję z szablonu"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
            >
              Anuluj
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {editingPreset ? "Zapisz zmiany" : "Utwórz szablon"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Live SVG Preview Modal */}
      {previewPreset && (
        <Modal
          isOpen={!!previewPreset}
          onClose={() => setPreviewPreset(null)}
          title={`Podgląd wektorowy Typst: ${previewPreset.title}`}
          maxWidth="4xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-100 px-4 py-2 rounded-lg">
              <span className="text-xs text-slate-600">
                Silnik Typst kompiluje layout do natywnych wektorów SVG dla każdej strony.
              </span>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setZoomScale((s) => Math.max(0.6, s - 0.1))}
                  className="h-7 w-7 p-0"
                  title="Oddal"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs font-mono font-medium text-slate-700 w-12 text-center">
                  {Math.round(zoomScale * 100)}%
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setZoomScale((s) => Math.min(1.6, s + 0.1))}
                  className="h-7 w-7 p-0"
                  title="Przybliż"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {isPreviewLoading ? (
              <div className="py-20 text-center text-sm text-slate-400 animate-pulse">
                Kompilacja szablonu za pomocą Typst...
              </div>
            ) : previewError ? (
              <div className="rounded-lg bg-rose-50 p-4 text-xs text-rose-700">
                {previewError}
              </div>
            ) : previewResult ? (
              <div className="bg-slate-200/80 p-6 rounded-xl overflow-auto max-h-[70vh] flex flex-col items-center gap-6">
                {previewResult.svg_pages.map((svgString, pIndex) => (
                  <div
                    key={pIndex}
                    className="relative bg-white shadow-xl rounded transition-transform"
                    style={{ transform: `scale(${zoomScale})`, transformOrigin: "top center" }}
                  >
                    <div
                      className="typst-page-svg"
                      dangerouslySetInnerHTML={{ __html: svgString }}
                    />
                    <div className="absolute bottom-2 right-4 text-[10px] text-slate-400 font-mono">
                      Strona {pIndex + 1} z {previewResult.svg_pages.length}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </Modal>
      )}
    </div>
  );
};
