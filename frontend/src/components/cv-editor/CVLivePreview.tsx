import React, { useEffect, useState, useRef } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  FileText,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { api } from "../../lib/api";
import type { CVLayoutSchema } from "../../types";
import { Button } from "../ui/Button";

interface CVLivePreviewProps {
  layoutSchema: CVLayoutSchema;
  jobOfferId?: string | null;
  language?: string;
  onExportPdf: () => void;
  isExportingPdf?: boolean;
}

export const CVLivePreview: React.FC<CVLivePreviewProps> = ({
  layoutSchema,
  jobOfferId,
  language = "pl",
  onExportPdf,
  isExportingPdf = false,
}) => {
  const [svgPages, setSvgPages] = useState<string[]>([]);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(0.9);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerPreview = async () => {
    try {
      setIsCompiling(true);
      setCompileError(null);

      const res = await api.cv.preview({
        sections: layoutSchema.sections.map((s) => s.id),
        job_offer_id: jobOfferId,
        language: language,
        layout_schema: layoutSchema,
      });

      setSvgPages(res.svg_pages || []);
    } catch (err: unknown) {
      setCompileError(
        "Błąd kompilacji podglądu Typst. Sprawdź poprawność wprowadzonych danych."
      );
    } finally {
      setIsCompiling(false);
    }
  };

  // Debounced 400ms preview compilation
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      triggerPreview();
    }, 400);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [layoutSchema, jobOfferId, language]);

  return (
    <div className="flex flex-col h-full bg-slate-100/90 rounded-xl border border-slate-200 overflow-hidden">
      {/* Top Preview Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <FileText className="h-4 w-4 text-blue-600" />
            <span>Podgląd Typst (Na żywo)</span>
          </div>

          {isCompiling ? (
            <span className="flex items-center gap-1 text-[11px] text-blue-600 font-medium animate-pulse ml-2">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Kompilacja...
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 ml-2">
              {svgPages.length} {svgPages.length === 1 ? "strona" : "strony"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            <button
              type="button"
              onClick={() => setZoomScale((s) => Math.max(0.5, s - 0.1))}
              className="p-1 text-slate-600 hover:text-slate-900 rounded"
              title="Oddal"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="text-[11px] font-mono px-1.5 text-slate-600 min-w-[42px] text-center">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomScale((s) => Math.min(1.5, s + 0.1))}
              className="p-1 text-slate-600 hover:text-slate-900 rounded"
              title="Przybliż"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomScale(0.9)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded border-l border-slate-200 ml-0.5"
              title="Resetuj zoom"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>

          {/* Download PDF Button */}
          <Button
            size="sm"
            variant="primary"
            onClick={onExportPdf}
            isLoading={isExportingPdf}
            className="text-xs h-8 shadow-xs"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Pobierz PDF
          </Button>
        </div>
      </div>

      {/* Pages Canvas */}
      <div className="flex-1 overflow-auto p-6 flex flex-col items-center gap-8">
        {compileError && (
          <div className="w-full max-w-xl rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{compileError}</span>
          </div>
        )}

        {svgPages.length === 0 && isCompiling ? (
          <div className="py-24 text-center text-sm text-slate-400 animate-pulse">
            Inicjalizacja i kompilacja wektorowa Typst...
          </div>
        ) : svgPages.length === 0 ? (
          <div className="py-24 text-center text-sm text-slate-400">
            Brak stron do wyświetlenia. Upewnij się, że wybrano aktywne sekcje.
          </div>
        ) : (
          svgPages.map((pageSvg, idx) => (
            <div
              key={idx}
              className="relative bg-white shadow-2xl rounded-sm transition-transform duration-200"
              style={{
                transform: `scale(${zoomScale})`,
                transformOrigin: "top center",
              }}
            >
              <div
                className="typst-page-svg select-text"
                dangerouslySetInnerHTML={{ __html: pageSvg }}
              />
              <div className="absolute -bottom-6 right-2 text-[10px] text-slate-400 font-mono">
                Strona {idx + 1} z {svgPages.length}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
