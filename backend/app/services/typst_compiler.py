"""Typst compilation engine service for CV rendering to multi-page vector SVG and binary PDF."""

import json
import logging
import re
from pathlib import Path
from typing import Any

import typst
from pydantic import BaseModel

logger = logging.getLogger(__name__)

DEFAULT_TEMPLATE_PATH = Path(__file__).resolve().parent.parent / "templates" / "cv_base.typ"

TARGET_RECT_PATTERN = re.compile(
    r'(<a\b[^>]*\b(?:href|xlink:href)="kf-target:[^"]*"[^>]*>\s*<rect\b)'
    r'([^>]*?)width="([0-9.]+)"\s+height="([0-9.]+)"([^>]*?/>\s*</a>)',
    re.IGNORECASE,
)


def _expand_preview_target_rect(match: re.Match[str]) -> str:
    """Expand interactive preview link target rect with symmetric padding and rounded corners."""
    prefix = match.group(1)
    mid = match.group(2)
    w = float(match.group(3))
    h = float(match.group(4))
    suffix = match.group(5)
    pad_x = 5.0
    pad_y = 3.5
    new_w = w + 2 * pad_x
    new_h = h + 2 * pad_y
    return (
        f'{prefix}{mid}x="{-pad_x}" y="{-pad_y}" '
        f'width="{new_w:.2f}" height="{new_h:.2f}" rx="4" ry="4"{suffix}'
    )


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
                sys_inputs={"cv_data": json_input, "is_preview": "true"},
            )
            if isinstance(result, list):
                raw_pages = [
                    page.decode("utf-8") if isinstance(page, bytes) else str(page)
                    for page in result
                ]
            elif isinstance(result, bytes):
                raw_pages = [result.decode("utf-8")]
            elif isinstance(result, str):
                raw_pages = [result]
            else:
                raw_pages = [str(result)]

            return [
                TARGET_RECT_PATTERN.sub(_expand_preview_target_rect, page) for page in raw_pages
            ]
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
                sys_inputs={"cv_data": json_input, "is_preview": "false"},
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
