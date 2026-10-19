"""Tests for AI and heuristic work model detection and hybrid adjustment."""

import uuid
from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio

from app.models.job import JobOffer
from app.services.job_parser import (
    COT_MARKERS_REGEX,
    JobParserWorker,
    sanitize_work_model_details,
)
from tests.conftest import test_session_factory as db_session_factory


@pytest_asyncio.fixture
async def cleanup_jobs() -> AsyncGenerator[list[JobOffer], None]:
    """Track created job offers and remove them after each test."""
    created: list[JobOffer] = []
    yield created
    if created:
        async with db_session_factory() as session:
            for job in created:
                db_job = await session.get(JobOffer, job.id)
                if db_job:
                    await session.delete(db_job)
            await session.commit()


@pytest.mark.asyncio
async def test_job_parser_traditional_mode_detects_hybrid(cleanup_jobs: list[JobOffer]):
    """Verify traditional mode detects hybrid attendance in job description and adjusts model."""
    worker = JobParserWorker()
    async with db_session_factory() as session:
        url = f"https://example.com/job-{uuid.uuid4()}"
        portal = "justjoin"
        job = JobOffer(
            source_url=url,
            source_portal=portal,
            company_name="Acme Corp",
            role_title="Backend Developer",
            work_model="remote",
            work_model_details="Oznaczono jako zdalna",
            raw_payload={
                "source_url": url,
                "source_portal": portal,
                "description_text": (
                    "Oferujemy elastyczne warunki. Praca hybrydowa, "
                    "wymagana obecność 1-2 dni w tygodniu w biurze w Warszawie."
                ),
                "requirements_raw": ["Python", "FastAPI"],
            },
        )
        session.add(job)
        await session.commit()
        cleanup_jobs.append(job)

        await worker.parse_job(session, job, mode="traditional")

        assert job.status == "ready"
        assert job.work_model == "hybrid"
        assert job.work_model_details == "Wykryto wymóg pracy hybrydowej w opisie"


@pytest.mark.asyncio
async def test_job_parser_traditional_mode_preserves_remote(cleanup_jobs: list[JobOffer]):
    """Verify traditional mode preserves remote model when no office attendance is mentioned."""
    worker = JobParserWorker()
    async with db_session_factory() as session:
        url = f"https://example.com/job-{uuid.uuid4()}"
        portal = "nofluffjobs"
        job = JobOffer(
            source_url=url,
            source_portal=portal,
            company_name="CloudGlobal",
            role_title="Cloud Engineer",
            work_model="remote",
            work_model_details="100% praca zdalna",
            raw_payload={
                "source_url": url,
                "source_portal": portal,
                "description_text": (
                    "Stabilna praca w zespole rozproszonym. "
                    "100% praca zdalna z dowolnego miejsca w Polsce."
                ),
                "requirements_raw": ["AWS", "Terraform"],
            },
        )
        session.add(job)
        await session.commit()
        cleanup_jobs.append(job)

        await worker.parse_job(session, job, mode="traditional")

        assert job.status == "ready"
        assert job.work_model == "remote"
        assert job.work_model_details is None


@pytest.mark.asyncio
async def test_job_parser_ai_mode_overrides_remote_to_hybrid_and_guards_none(
    cleanup_jobs: list[JobOffer],
):
    """Verify AI mode updates work_model from remote to hybrid and guards against None in lists."""
    worker = JobParserWorker()
    ai_mock_response = {
        "role_summary": "Rola Python Developera w Warszawie.",
        "must_have": None,  # Test guarding against None
        "nice_to_have": None,
        "tech_stack": ["Python", "PostgreSQL"],
        "benefits": None,
        "experience_level": "Senior",
        "work_model": "hybrid",
        "work_model_details": "Hybrydowo: 1-2 dni w tygodniu w biurze w Warszawie",
        "application_deadline": None,
        "company_name": "ModernTech",
        "role_title": "Senior Python Developer",
    }

    async with db_session_factory() as session:
        url = f"https://example.com/job-{uuid.uuid4()}"
        portal = "justjoin"
        job = JobOffer(
            source_url=url,
            source_portal=portal,
            company_name="ModernTech",
            role_title="Python Developer",
            work_model="remote",
            work_model_details="Zdalna (tag portalowy)",
            raw_payload={
                "source_url": url,
                "source_portal": portal,
                "description_text": (
                    "Ogłoszenie ma tag zdalna, lecz na końcu opisu: "
                    "Wymagamy obecności w biurze 1-2 dni w tygodniu."
                ),
                "requirements_raw": ["Python"],
            },
        )
        session.add(job)
        await session.commit()
        cleanup_jobs.append(job)

        with patch(
            "app.services.job_parser.llm_client.generate_json",
            new_callable=AsyncMock,
        ) as mock_generate_json:
            mock_generate_json.return_value = ai_mock_response

            await worker.parse_job(session, job, mode="ai")

            assert mock_generate_json.called
            call_kwargs = mock_generate_json.call_args.kwargs
            assert "CRITICAL WORK MODEL & ATTENDANCE RULE" in call_kwargs["system_prompt"]
            assert "CRITICAL WORK MODEL & ATTENDANCE RULE" in call_kwargs["user_prompt"]
            assert "Initial Work Model Tag: remote" in call_kwargs["user_prompt"]

        assert job.status == "ready"
        assert job.work_model == "hybrid"
        assert job.work_model_details == "Hybrydowo: 1-2 dni w tygodniu w biurze w Warszawie"
        assert job.structured_data["must_have"] == []
        assert job.structured_data["nice_to_have"] == []
        assert job.structured_data["benefits"] == []
        assert job.structured_data["tech_stack"] == ["Python", "PostgreSQL"]


@pytest.mark.asyncio
async def test_job_parser_ai_mode_preserves_remote(cleanup_jobs: list[JobOffer]):
    """Verify AI mode retains remote work model when AI confirms 100% remote role."""
    worker = JobParserWorker()
    ai_mock_response = {
        "role_summary": "Rola w 100% zdalna.",
        "must_have": ["Go"],
        "nice_to_have": [],
        "tech_stack": ["Go", "Docker"],
        "benefits": ["B2B"],
        "experience_level": "Mid",
        "work_model": "remote",
        "work_model_details": None,
        "application_deadline": None,
    }

    async with db_session_factory() as session:
        url = f"https://example.com/job-{uuid.uuid4()}"
        portal = "pracuj"
        job = JobOffer(
            source_url=url,
            source_portal=portal,
            company_name="GoHub",
            role_title="Go Engineer",
            work_model="remote",
            work_model_details="Zdalna",
            raw_payload={
                "source_url": url,
                "source_portal": portal,
                "description_text": "Pełna praca zdalna dla programisty Go z dowolnego miejsca.",
                "requirements_raw": ["Go"],
            },
        )
        session.add(job)
        await session.commit()
        cleanup_jobs.append(job)

        with patch(
            "app.services.job_parser.llm_client.generate_json",
            new_callable=AsyncMock,
        ) as mock_generate_json:
            mock_generate_json.return_value = ai_mock_response

            await worker.parse_job(session, job, mode="ai")

        assert job.status == "ready"
        assert job.work_model == "remote"
        assert job.work_model_details is None


@pytest.mark.asyncio
async def test_job_parser_prompt_expands_raw_text_to_8000_chars(
    cleanup_jobs: list[JobOffer],
):
    """Verify raw_text up to 8000 chars is included in user_prompt."""
    worker = JobParserWorker()
    padding = "X" * 3000
    description = (
        f"Początek oferty. {padding} Środek oferty. {padding} Klauzula na końcu 6000 znaków."
    )
    ai_mock_response = {
        "role_summary": "Summary",
        "must_have": [],
        "nice_to_have": [],
        "tech_stack": [],
        "benefits": [],
        "experience_level": "Mid",
        "work_model": "remote",
    }

    async with db_session_factory() as session:
        url = f"https://example.com/job-{uuid.uuid4()}"
        portal = "pracuj"
        job = JobOffer(
            source_url=url,
            source_portal=portal,
            raw_payload={
                "source_url": url,
                "source_portal": portal,
                "description_text": description,
            },
        )
        session.add(job)
        await session.commit()
        cleanup_jobs.append(job)

        with patch(
            "app.services.job_parser.llm_client.generate_json",
            new_callable=AsyncMock,
        ) as mock_generate_json:
            mock_generate_json.return_value = ai_mock_response

            await worker.parse_job(session, job, mode="ai")

            call_kwargs = mock_generate_json.call_args.kwargs
            user_prompt = call_kwargs["user_prompt"]
            assert "Klauzula na końcu 6000 znaków." in user_prompt


def test_sanitize_work_model_details_user_reported_essay():
    """Verify sanitization cleans the exact user-reported LLM reasoning essay."""
    user_essay = (
        "Hybryda (Work model not explicitly defined in the description; per the "
        "Critical Attendance Rule, any mention of office requirements would mandate "
        "'hybrid'. Since no explicit office days are listed in the provided text but "
        "the initial tag was 'Not specified', we cannot assume full remote. However, "
        "without specific details, I will mark it as hybrid with a note that specifics "
        "need clarification or default to remote if truly no office time is mentioned. "
        "Given the ambiguity and strict rule: since no office days are stated, I must "
        "assume 'remote' unless office is mentioned. Wait, re-reading the provided text: "
        "'Initial Work Model Tag: Not specified'. There is NO mention of office days "
        "in the description provided. Therefore, based strictly on the provided text "
        "which does not mention any office requirements, I must set it to remote.)"
    )
    result = sanitize_work_model_details(user_essay)
    assert result == "Hybryda"
    assert len(result) <= 80
    assert not COT_MARKERS_REGEX.search(result)


def test_sanitize_work_model_details_pure_reasoning():
    """Verify pure reasoning / chain-of-thought returns None."""
    pure_reasoning = (
        "Work model not explicitly defined in the description; per the Critical Attendance "
        "Rule, since no office days are stated, I must assume remote."
    )
    assert sanitize_work_model_details(pure_reasoning) is None


def test_sanitize_work_model_details_valid_schedules():
    """Verify valid factual concise schedules are preserved unmodified."""
    assert (
        sanitize_work_model_details("1-2 dni w tygodniu w biurze") == "1-2 dni w tygodniu w biurze"
    )
    assert (
        sanitize_work_model_details(
            "Początkowo praca w pełni z warszawskiego biura - następnie hybrydowo"
        )
        == "Początkowo praca w pełni z warszawskiego biura - następnie hybrydowo"
    )
    assert (
        sanitize_work_model_details("Hybrydowo: 1-2 dni w tygodniu w biurze w Warszawie")
        == "Hybrydowo: 1-2 dni w tygodniu w biurze w Warszawie"
    )
    assert sanitize_work_model_details("2 dni w miesiącu w biurze") == "2 dni w miesiącu w biurze"


def test_sanitize_work_model_details_generic_labels_and_reasoning():
    """Verify generic labels and reasoning strings are nullified to None."""
    assert (
        sanitize_work_model_details(
            "Zdalnie (There is NO mention of office days in the description provided)"
        )
        is None
    )
    assert sanitize_work_model_details("Zdalnie") is None
    assert sanitize_work_model_details("Remote") is None
    assert sanitize_work_model_details("100% zdalnie") is None
    assert sanitize_work_model_details("Stacjonarnie") is None
    assert sanitize_work_model_details("Onsite") is None
    assert sanitize_work_model_details("brak informacji") is None


def test_sanitize_work_model_details_edge_cases():
    """Verify nulls, empties, placeholders, and excessive length (>80 chars) return None."""
    assert sanitize_work_model_details(None) is None
    assert sanitize_work_model_details("") is None
    assert sanitize_work_model_details("   ") is None
    assert sanitize_work_model_details("null") is None
    assert sanitize_work_model_details("None") is None
    assert sanitize_work_model_details("N/A") is None
    assert sanitize_work_model_details("-") is None
    assert sanitize_work_model_details("X" * 81) is None


@pytest.mark.asyncio
async def test_job_parser_traditional_mode_detects_transitional_hybrid(
    cleanup_jobs: list[JobOffer],
):
    """Verify heuristic mode detects transitional hybrid and populates work_model_details."""
    worker = JobParserWorker()
    async with db_session_factory() as session:
        url = f"https://example.com/job-{uuid.uuid4()}"
        portal = "pracuj"
        job = JobOffer(
            source_url=url,
            source_portal=portal,
            company_name="TransitTech",
            role_title="Backend Engineer",
            work_model="remote",
            raw_payload={
                "source_url": url,
                "source_portal": portal,
                "description_text": (
                    "Oferujemy rozwój. Początkowo praca w pełni z warszawskiego "
                    "biura - następnie hybrydowo. Zapraszamy!"
                ),
            },
        )
        session.add(job)
        await session.commit()
        cleanup_jobs.append(job)

        await worker.parse_job(session, job, mode="traditional")

        assert job.status == "ready"
        assert job.work_model == "hybrid"
        assert (
            job.work_model_details
            == "Początkowo praca w pełni z warszawskiego biura - następnie hybrydowo"
        )


@pytest.mark.asyncio
async def test_job_parser_ai_mode_detects_transitional_hybrid(
    cleanup_jobs: list[JobOffer],
):
    """Verify AI mode detects transitional hybrid schedule."""
    worker = JobParserWorker()
    ai_mock_response = {
        "role_summary": "Rola inżyniera.",
        "must_have": ["Python"],
        "nice_to_have": [],
        "tech_stack": ["Python"],
        "benefits": [],
        "experience_level": "Mid",
        "work_model": "hybrid",
        "work_model_details": "Początkowo praca z biura, następnie hybrydowo",
    }
    async with db_session_factory() as session:
        url = f"https://example.com/job-{uuid.uuid4()}"
        portal = "justjoin"
        job = JobOffer(
            source_url=url,
            source_portal=portal,
            work_model="remote",
            raw_payload={
                "source_url": url,
                "source_portal": portal,
                "description_text": (
                    "Początkowo praca w pełni z warszawskiego biura - następnie hybrydowo."
                ),
            },
        )
        session.add(job)
        await session.commit()
        cleanup_jobs.append(job)

        with patch(
            "app.services.job_parser.llm_client.generate_json",
            new_callable=AsyncMock,
        ) as mock_generate_json:
            mock_generate_json.return_value = ai_mock_response
            await worker.parse_job(session, job, mode="ai")

        assert job.status == "ready"
        assert job.work_model == "hybrid"
        assert job.work_model_details == "Początkowo praca z biura, następnie hybrydowo"


@pytest.mark.asyncio
async def test_job_parser_ai_mode_sanitizes_essay_in_work_model_details(
    cleanup_jobs: list[JobOffer],
):
    """Verify parse_job strips LLM deliberations and preserves only concise factual schedule."""
    worker = JobParserWorker()
    user_essay = (
        "Hybryda (Work model not explicitly defined in the description; per the "
        "Critical Attendance Rule, any mention of office requirements would mandate "
        "'hybrid'. Since no explicit office days are listed in the provided text but "
        "the initial tag was 'Not specified', we cannot assume full remote. However, "
        "without specific details, I will mark it as hybrid with a note that specifics "
        "need clarification or default to remote if truly no office time is mentioned. "
        "Given the ambiguity and strict rule: since no office days are stated, I must "
        "assume 'remote' unless office is mentioned. Wait, re-reading the provided text: "
        "'Initial Work Model Tag: Not specified'. There is NO mention of office days "
        "in the description provided. Therefore, based strictly on the provided text "
        "which does not mention any office requirements, I must set it to remote.)"
    )
    ai_mock_response = {
        "role_summary": "Rola Software Developera.",
        "must_have": ["Python"],
        "nice_to_have": [],
        "tech_stack": ["Python"],
        "benefits": [],
        "experience_level": "Mid",
        "work_model": "hybrid",
        "work_model_details": user_essay,
    }

    async with db_session_factory() as session:
        url = f"https://example.com/job-{uuid.uuid4()}"
        portal = "justjoin"
        job = JobOffer(
            source_url=url,
            source_portal=portal,
            raw_payload={
                "source_url": url,
                "source_portal": portal,
                "description_text": "Praca hybrydowa w biurze w Warszawie.",
            },
        )
        session.add(job)
        await session.commit()
        cleanup_jobs.append(job)

        with patch(
            "app.services.job_parser.llm_client.generate_json",
            new_callable=AsyncMock,
        ) as mock_generate_json:
            mock_generate_json.return_value = ai_mock_response

            await worker.parse_job(session, job, mode="ai")

        assert job.status == "ready"
        assert job.work_model == "hybrid"
        assert job.work_model_details == "Hybryda"
        assert len(job.work_model_details) <= 80
        assert not COT_MARKERS_REGEX.search(job.work_model_details)
