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


def test_compile_with_job_title():
    """Verify that compiling data with job_title renders the title in both SVG and PDF outputs."""
    sample_data = {
        "full_name": "Anna Nowak",
        "job_title": "Senior Flutter Developer",
        "language": "pl",
        "contact_info": {
            "email": "anna.nowak@example.com",
            "phone": "+48 600 700 800",
            "location": "Kraków, Polska",
        },
        "sections": [
            {
                "id": "summary",
                "type": "summary",
                "title": "O mnie",
                "content": "Doświadczona programistka Flutter z pasją do czystego kodu.",
            }
        ],
    }

    svg_pages = typst_compiler.compile_to_svg(sample_data)
    assert isinstance(svg_pages, list)
    assert len(svg_pages) >= 1
    # Typst renders the job_title with dedicated accent fill (#2563eb)
    assert "#2563eb" in svg_pages[0]

    # Without job_title or sections, the accent fill is absent
    sample_without_title = {
        "full_name": "Anna Nowak",
        "job_title": None,
        "language": "pl",
        "contact_info": sample_data["contact_info"],
        "sections": [],
    }
    svg_without = typst_compiler.compile_to_svg(sample_without_title)
    assert "#2563eb" not in svg_without[0]

    pdf = typst_compiler.compile_to_pdf(sample_data)
    assert isinstance(pdf, bytes)
    assert pdf.startswith(b"%PDF")
    assert len(pdf) > 1000


def test_compile_with_custom_styling():
    """Verify clean Typst compilation to SVG and PDF with fully custom styling configuration."""
    custom_data = {
        "full_name": "Janina Dąbrowska",
        "job_title": "Lead Software Architect",
        "language": "pl",
        "contact_info": {
            "email": "janina.dabrowska@example.com",
            "phone": "+48 555 666 777",
            "location": "Wrocław, Polska",
            "linkedin": "https://linkedin.com/in/jdabrowska",
        },
        "styling": {
            "document_font_family": "DejaVu Sans",
            "margin_x_cm": 2.2,
            "margin_y_cm": 1.5,
            "section_spacing_em": 0.8,
            "heading_line_height_em": 0.7,
            "section_text_line_height_em": 0.7,
            "full_name": {
                "font_family": "DejaVu Sans",
                "font_size_pt": 20.0,
                "font_weight": "bold",
            },
            "job_title": {
                "font_family": "DejaVu Sans",
                "font_size_pt": 12.0,
                "font_weight": "medium",
            },
            "contact_info": {
                "font_family": "DejaVu Sans",
                "font_size_pt": 9.0,
                "font_weight": "regular",
            },
            "section_headings": {
                "font_family": "DejaVu Sans",
                "font_size_pt": 12.0,
                "font_weight": "bold",
            },
            "section_text": {
                "font_family": "DejaVu Sans",
                "font_size_pt": 10.0,
                "font_weight": "regular",
            },
            "clause": {
                "font_family": "DejaVu Sans",
                "font_size_pt": 7.5,
                "font_weight": "regular",
            },
        },
        "sections": [
            {
                "id": "summary",
                "type": "summary",
                "title": "Podsumowanie zawodowe",
                "content": (
                    "Architekt oprogramowania z 10-letnim stażem w projektowaniu systemów."
                ),
            },
            {
                "id": "clause",
                "type": "clause",
                "title": "Klauzula",
                "content": "Wyrażam zgodę na przetwarzanie danych...",
            },
        ],
    }

    svg_pages = typst_compiler.compile_to_svg(custom_data)
    assert isinstance(svg_pages, list)
    assert len(svg_pages) >= 1
    assert "<svg" in svg_pages[0]
    assert "</svg>" in svg_pages[0]
    assert len(svg_pages[0]) > 1000
    assert "#2563eb" in svg_pages[0]

    pdf = typst_compiler.compile_to_pdf(custom_data)
    assert isinstance(pdf, bytes)
    assert pdf.startswith(b"%PDF")
    assert len(pdf) > 1000


def test_cv_layout_schema_styling_serialization():
    """Verify CVLayoutSchema with CVStyling integrates seamlessly into typst compiler."""
    from app.schemas.cv import CVElementStyle, CVLayoutSchema, CVStyling

    # Schema with default styling
    layout_default = CVLayoutSchema(full_name="Adam Nowak")
    assert isinstance(layout_default.styling, CVStyling)
    assert layout_default.styling.document_font_family == "Liberation Sans"
    assert layout_default.styling.margin_x_cm == 1.8

    # Schema with explicit styling
    custom_styling = CVStyling(
        document_font_family="DejaVu Sans",
        margin_x_cm=2.5,
        margin_y_cm=2.0,
        full_name=CVElementStyle(font_family="DejaVu Sans", font_size_pt=22.0, font_weight="bold"),
    )
    layout_custom = CVLayoutSchema(
        full_name="Zofia Wiśniewska",
        styling=custom_styling,
    )
    assert layout_custom.styling.margin_x_cm == 2.5
    assert layout_custom.styling.full_name.font_size_pt == 22.0

    # Ensure None styling safely defaults to CVStyling
    layout_none = CVLayoutSchema.model_validate({"full_name": "Test", "styling": None})
    assert isinstance(layout_none.styling, CVStyling)

    # Compile Pydantic model directly to SVG
    svg_pages = typst_compiler.compile_to_svg(layout_custom)
    assert len(svg_pages) >= 1
    assert "<svg" in svg_pages[0]
    assert "</svg>" in svg_pages[0]
    assert len(svg_pages[0]) > 500

    pdf = typst_compiler.compile_to_pdf(layout_custom)
    assert isinstance(pdf, bytes)
    assert pdf.startswith(b"%PDF")


def test_compile_with_custom_accent_color():
    """Verify clean Typst compilation to SVG and PDF with custom accent color (#059669)."""
    emerald_accent = "#059669"
    sample_data = {
        "full_name": "Katarzyna Zielińska",
        "job_title": "Lead Software Engineer",
        "language": "pl",
        "styling": {
            "accent_color": emerald_accent,
        },
        "contact_info": {
            "email": "katarzyna.zielinska@example.com",
            "phone": "+48 501 234 567",
            "location": "Wrocław, Polska",
        },
        "sections": [
            {
                "id": "summary",
                "type": "summary",
                "title": "Podsumowanie",
                "content": "Architekt systemów chmurowych.",
            },
            {
                "id": "skills",
                "type": "skills",
                "title": "Umiejętności",
                "items": [
                    {"category": "Backend", "skills": ["Python", "FastAPI", "PostgreSQL"]},
                ],
            },
        ],
    }

    svg_pages = typst_compiler.compile_to_svg(sample_data)
    assert isinstance(svg_pages, list)
    assert len(svg_pages) >= 1
    assert "<svg" in svg_pages[0]
    assert "</svg>" in svg_pages[0]
    # Check that custom accent color is present in vector SVG markup
    assert emerald_accent in svg_pages[0]

    pdf = typst_compiler.compile_to_pdf(sample_data)
    assert isinstance(pdf, bytes)
    assert pdf.startswith(b"%PDF")
    assert len(pdf) > 1000


def test_cv_styling_accent_color_validation():
    """Verify CVStyling accent_color validation and fallback logic."""
    from app.schemas.cv import CVStyling

    # Default accent color
    default_style = CVStyling()
    assert default_style.accent_color == "#2563eb"

    # Valid hex colors
    assert CVStyling(accent_color="#059669").accent_color == "#059669"
    assert CVStyling(accent_color="#fff").accent_color == "#fff"
    assert CVStyling(accent_color="#123456").accent_color == "#123456"
    assert CVStyling(accent_color="#AABBCC").accent_color == "#AABBCC"
    assert CVStyling(accent_color="#05966980").accent_color == "#05966980"

    # Fallbacks for empty, None, or invalid values
    assert CVStyling.model_validate({"accent_color": None}).accent_color == "#2563eb"
    assert CVStyling.model_validate({"accent_color": ""}).accent_color == "#2563eb"
    assert CVStyling.model_validate({"accent_color": "   "}).accent_color == "#2563eb"
    assert CVStyling.model_validate({"accent_color": "invalid"}).accent_color == "#2563eb"
    assert CVStyling.model_validate({"accent_color": "#12"}).accent_color == "#2563eb"
    assert CVStyling.model_validate({"accent_color": "#12345"}).accent_color == "#2563eb"
    assert CVStyling.model_validate({"accent_color": 12345}).accent_color == "#2563eb"
