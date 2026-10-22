"""Unit tests for truncated JSON repair and CandidateAIFillRequest context_window validation."""

from unittest.mock import AsyncMock, patch

import pytest
from pydantic import ValidationError

from app.schemas.candidate import CandidateAIFillRequest
from app.services.llm_client import _extract_json_data, repair_truncated_json


def test_candidate_ai_fill_request_context_window_defaults():
    """Verify default context_window and validation constraints in CandidateAIFillRequest."""
    req = CandidateAIFillRequest(text="Valid candidate text exceeding 5 characters")
    assert req.context_window == 32768

    custom_req = CandidateAIFillRequest(
        text="Valid candidate text exceeding 5 characters",
        context_window=65536,
    )
    assert custom_req.context_window == 65536

    # Minimum limit is 2048
    with pytest.raises(ValidationError):
        CandidateAIFillRequest(
            text="Valid candidate text exceeding 5 characters",
            context_window=1024,
        )

    # Maximum limit is 262144
    with pytest.raises(ValidationError):
        CandidateAIFillRequest(
            text="Valid candidate text exceeding 5 characters",
            context_window=300000,
        )


def test_repair_truncated_json_string_value():
    """Verify repairing JSON truncated in the middle of a string value."""
    truncated = '{"full_name": "Jan Kowal'
    repaired = repair_truncated_json(truncated)
    parsed = _extract_json_data(repaired)
    assert parsed == {"full_name": "Jan Kowal"}


def test_repair_truncated_json_escaped_string():
    """Verify repairing JSON truncated inside an escaped quote sequence."""
    truncated = '{"bio": "Software developer \\"coding'
    repaired = repair_truncated_json(truncated)
    parsed = _extract_json_data(repaired)
    assert parsed == {"bio": 'Software developer "coding'}


def test_repair_truncated_json_dangling_key():
    """Verify repairing JSON truncated in the middle of an incomplete object key."""
    truncated = '{"full_name": "Jan", "exper'
    repaired = repair_truncated_json(truncated)
    parsed = _extract_json_data(repaired)
    assert parsed == {"full_name": "Jan"}


def test_repair_truncated_json_dangling_colon():
    """Verify repairing JSON truncated after key and colon without value."""
    truncated = '{"full_name": "Jan", "experience": '
    repaired = repair_truncated_json(truncated)
    parsed = _extract_json_data(repaired)
    assert parsed == {"full_name": "Jan"}


def test_repair_truncated_json_trailing_comma_in_object():
    """Verify repairing JSON truncated after a trailing comma in an object."""
    truncated = '{"full_name": "Jan", "age": 30, '
    repaired = repair_truncated_json(truncated)
    parsed = _extract_json_data(repaired)
    assert parsed == {"full_name": "Jan", "age": 30}


def test_repair_truncated_json_trailing_comma_in_array():
    """Verify repairing JSON truncated after a trailing comma in an array."""
    truncated = '{"skills": ["Python", "FastAPI", '
    repaired = repair_truncated_json(truncated)
    parsed = _extract_json_data(repaired)
    assert parsed == {"skills": ["Python", "FastAPI"]}


def test_repair_truncated_json_array_unclosed_string():
    """Verify repairing array truncated inside a string element."""
    truncated = '["Docker", "Kubern'
    repaired = repair_truncated_json(truncated)
    parsed = _extract_json_data(repaired)
    assert parsed == ["Docker", "Kubern"]


def test_repair_truncated_json_nested_deep_structure():
    """Verify repairing deeply nested structures truncated midway."""
    truncated = (
        '{"profile": {"name": "Jan", "sections": [{"id": "projects", '
        '"items": [{"title": "KandidFlow", "tech": ["Python", "Docker"'
    )
    repaired = repair_truncated_json(truncated)
    parsed = _extract_json_data(repaired)
    assert parsed["profile"]["name"] == "Jan"
    assert parsed["profile"]["sections"][0]["id"] == "projects"
    assert parsed["profile"]["sections"][0]["items"][0]["title"] == "KandidFlow"
    assert parsed["profile"]["sections"][0]["items"][0]["tech"] == ["Python", "Docker"]


def test_repair_truncated_json_with_markdown_fences():
    """Verify extracting and repairing truncated JSON wrapped in opening markdown fence."""
    truncated = '```json\n{"summary": "Experienced engineer with passion for cloud'
    parsed = _extract_json_data(truncated)
    assert "Experienced engineer with passion" in parsed["summary"]


@pytest.mark.asyncio
async def test_candidate_parser_passes_context_window(async_client):
    """Verify that /api/v1/candidate/ai-fill forwards context_window to generate_json."""
    mock_llm_output = {
        "full_name": "Test User",
        "contact_info": {},
        "sections": [],
    }

    with patch(
        "app.services.candidate_parser.llm_client.generate_json", new_callable=AsyncMock
    ) as mock_gen:
        mock_gen.return_value = mock_llm_output
        resp = await async_client.post(
            "/api/v1/candidate/ai-fill",
            json={
                "text": "Sample candidate CV text here",
                "context_window": 65536,
                "mode": "replace",
            },
        )
        assert resp.status_code == 200

        mock_gen.assert_called_once()
        _, kwargs = mock_gen.call_args
        assert kwargs.get("context_window") == 65536
