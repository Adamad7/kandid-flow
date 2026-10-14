"""Unit tests for Typst compiler service."""

import pytest

from app.services.typst_compiler import TypstCompilationError, typst_compiler


def test_compile_to_svg_success():
    """Verify clean Typst compilation to vector SVG markup."""
    sample_data = {
        "full_name": "Test Candidate",
        "language": "pl",
        "contact_info": {
            "email": "test@example.com",
            "phone": "+48 500 000 000",
            "location": "Warszawa, Polska",
        },
        "sections": [
            {
                "id": "summary",
                "type": "summary",
                "title": "Podsumowanie",
                "content": "Inżynier platformowy testowy.",
            },
            {
                "id": "skills",
                "type": "skills",
                "items": [
                    {"category": "Cloud", "skills": ["AWS", "Docker", "Kubernetes"]},
                ],
            },
        ],
    }

    svg_pages = typst_compiler.compile_to_svg(sample_data)
    assert isinstance(svg_pages, list)
    assert len(svg_pages) >= 1
    assert all(isinstance(page, str) for page in svg_pages)
    assert "<svg" in svg_pages[0]
    assert "</svg>" in svg_pages[0]
    assert len(svg_pages[0]) > 1000


def test_compile_to_pdf_success():
    """Verify clean Typst compilation to binary PDF bytes."""
    sample_data = {
        "full_name": "Test Candidate PDF",
        "language": "en",
        "contact_info": {
            "email": "test.pdf@example.com",
            "location": "London, UK",
        },
        "sections": [
            {
                "id": "summary",
                "type": "summary",
                "content": "Platform engineer summary.",
            }
        ],
    }

    pdf = typst_compiler.compile_to_pdf(sample_data)
    assert isinstance(pdf, bytes)
    assert pdf.startswith(b"%PDF")
    assert len(pdf) > 1000


def test_compile_nonexistent_template_error():
    """Verify TypstCompilationError when template path does not exist."""
    with pytest.raises(TypstCompilationError) as exc_info:
        typst_compiler.compile_to_svg({}, template_path="/nonexistent/template.typ")

    assert "not found" in str(exc_info.value)
