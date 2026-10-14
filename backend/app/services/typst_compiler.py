"""Typst compilation engine service for CV rendering to multi-page vector SVG and binary PDF."""

import json
import logging
from pathlib import Path
from typing import Any

import typst
from pydantic import BaseModel

logger = logging.getLogger(__name__)

DEFAULT_TEMPLATE_PATH = Path(__file__).resolve().parent.parent / "templates" / "cv_base.typ"


class TypstCompilationError(Exception):
    """Raised when Typst document compilation fails."""

    def __init__(self, message: str, details: str | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details


class TypstCompilerService:
    """Service providing Typst compilation routines for real-time SVG and PDF export."""

    def __init__(self, default_template: Path | str = DEFAULT_TEMPLATE_PATH) -> None:
        self.default_template = Path(default_template)

    def _prepare_payload(self, data: BaseModel | dict[str, Any] | list[Any]) -> str:
        """Normalize and serialize CV payload for Typst sys_inputs."""
        if isinstance(data, BaseModel):
            payload = data.model_dump(mode="json")
        elif isinstance(data, list):
            sections = [s.model_dump(mode="json") if isinstance(s, BaseModel) else s for s in data]
            payload = {"sections": sections}
        elif isinstance(data, dict):
            payload = data
        else:
            payload = {"sections": []}
        return json.dumps(payload, ensure_ascii=False)

    def compile_to_svg(
        self,
        cv_data: BaseModel | dict[str, Any] | list[Any],
        template_path: Path | str | None = None,
    ) -> list[str]:
        """Compile CV data into a list of vector SVG strings (one per page) for live web preview.

        Args:
            cv_data: Pydantic model, dictionary, or list containing resume sections
                and contact information.
            template_path: Optional custom Typst template file path.

        Returns:
            List of vector SVG markup strings (one per page).

        Raises:
            TypstCompilationError: If compilation fails due to template syntax or invalid data.
        """
        tpl = Path(template_path) if template_path else self.default_template
        if not tpl.is_file():
            raise TypstCompilationError(f"Typst template file not found: {tpl}")

        json_input = self._prepare_payload(cv_data)

        try:
            result = typst.compile(
                str(tpl),
                format="svg",
                sys_inputs={"cv_data": json_input},
            )
            if isinstance(result, list):
                return [
                    page.decode("utf-8") if isinstance(page, bytes) else str(page)
                    for page in result
                ]
            if isinstance(result, bytes):
                return [result.decode("utf-8")]
            if isinstance(result, str):
                return [result]
            return [str(result)]
        except typst.TypstError as err:
            logger.error("Typst compilation to SVG failed: %s", err)
            raise TypstCompilationError(
                message=f"Failed to compile CV template to SVG: {err}",
                details=str(err),
            ) from err
        except Exception as exc:
            logger.exception("Unexpected error during Typst SVG compilation: %s", exc)
            raise TypstCompilationError(
                message=f"Unexpected error compiling CV: {exc}",
                details=str(exc),
            ) from exc

    def compile_to_pdf(
        self,
        cv_data: BaseModel | dict[str, Any] | list[Any],
        template_path: Path | str | None = None,
    ) -> bytes:
        """Compile CV data into binary PDF bytes for export.

        Args:
            cv_data: Pydantic model, dictionary, or list containing resume sections
                and contact information.
            template_path: Optional custom Typst template file path.

        Returns:
            Binary PDF content as bytes.

        Raises:
            TypstCompilationError: If compilation fails due to template syntax or invalid data.
        """
        tpl = Path(template_path) if template_path else self.default_template
        if not tpl.is_file():
            raise TypstCompilationError(f"Typst template file not found: {tpl}")

        json_input = self._prepare_payload(cv_data)

        try:
            result = typst.compile(
                str(tpl),
                format="pdf",
                sys_inputs={"cv_data": json_input},
            )
            if isinstance(result, bytes):
                return result
            if isinstance(result, str):
                return result.encode("utf-8")
            return bytes(result)
        except typst.TypstError as err:
            logger.error("Typst compilation to PDF failed: %s", err)
            raise TypstCompilationError(
                message=f"Failed to compile CV template to PDF: {err}",
                details=str(err),
            ) from err
        except Exception as exc:
            logger.exception("Unexpected error during Typst PDF compilation: %s", exc)
            raise TypstCompilationError(
                message=f"Unexpected error compiling CV: {exc}",
                details=str(exc),
            ) from exc


# Global service singleton
typst_compiler = TypstCompilerService()
