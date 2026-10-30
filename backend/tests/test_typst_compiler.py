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
                "title": "O mnie",
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


def test_compile_with_extended_sections():
    """Verify clean Typst compilation with languages, trainings, achievements, and interests."""
    extended_data = {
        "full_name": "Jan Kowalski",
        "language": "pl",
        "contact_info": {
            "email": "jan@example.com",
            "phone": "+48 111 222 333",
            "location": "Gdańsk, Polska",
        },
        "sections": [
            {
                "id": "languages",
                "type": "languages",
                "title": "Znajomość języków",
                "items": [
                    {"name": "Angielski", "level": "C1"},
                    {"name": "Niemiecki", "level": "B2"},
                ],
            },
            {
                "id": "trainings",
                "type": "trainings",
                "title": "Szkolenia",
                "items": [
                    {
                        "name": "Docker & Kubernetes Deep Dive",
                        "organizer": "Linux Academy",
                        "date": "2023",
                        "description": "Zaawansowana konfiguracja klastrów i sieci CNI.",
                    }
                ],
            },
            {
                "id": "achievements",
                "type": "achievements",
                "title": "Osiągnięcia",
                "items": [
                    {
                        "title": "Laureat Hackathonu 2024",
                        "issuer": "Tech Summit",
                        "date": "2024",
                        "description": "1. miejsce w kategorii Cloud Computing.",
                    }
                ],
            },
            {
                "id": "interests",
                "type": "interests",
                "title": "Zainteresowania",
                "items": ["Kolarstwo", "Fotografia analogowa", "Elektronika"],
                "content": "Pasjonat fotografii ulicznej i wycieczek górskich.",
            },
        ],
    }

    svgs = typst_compiler.compile_to_svg(extended_data)
    assert len(svgs) >= 1
    assert "<svg" in svgs[0]

    pdf = typst_compiler.compile_to_pdf(extended_data)
    assert pdf.startswith(b"%PDF")
