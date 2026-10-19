"""Resilient database-backed job parsing worker and URL canonicalizer."""

import asyncio
import logging
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory
from app.models.job import JobOffer
from app.schemas.job import StructuredJobData
from app.services.llm_client import llm_client

logger = logging.getLogger(__name__)

# Query parameters to strip for canonical URL normalization
TRACKING_PARAMS = {
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "utm_id",
    "searchid",
    "search_id",
    "trk",
    "trackingid",
    "tracking_id",
    "refid",
    "ref_id",
    "fbclid",
    "gclid",
    "source",
}


def canonicalize_url(url: str) -> str:
    """Canonicalize job offer URL by stripping tracking and analytics parameters.

    Args:
        url: Raw posting URL.

    Returns:
        Clean, normalized canonical URL string.
    """
    if not url:
        return ""

    parsed = urlparse(url.strip())
    # Keep query parameters that are not in the tracking blacklist
    query_items = parse_qsl(parsed.query, keep_blank_values=False)
    filtered_items = [(k, v) for k, v in query_items if k.lower() not in TRACKING_PARAMS]
    new_query = urlencode(filtered_items)

    # Normalize path (remove trailing slash except for root)
    path = parsed.path
    if len(path) > 1 and path.endswith("/"):
        path = path.rstrip("/")

    # Just Join IT: normalize /oferta-pracy/ to /job-offer/
    netloc = parsed.netloc.lower()
    if "justjoin.it" in netloc and path.startswith("/oferta-pracy/"):
        path = "/job-offer/" + path[len("/oferta-pracy/") :]

    # Reconstruct without fragment and with cleaned query
    normalized = urlunparse(
        (
            parsed.scheme.lower(),
            parsed.netloc.lower(),
            path,
            parsed.params,
            new_query,
            "",  # Drop fragment
        )
    )
    return normalized


class JobParserWorker:
    """Background worker processing inbox offers with DB-backed locking."""

    def __init__(self, poll_interval_seconds: float = 3.0) -> None:
        self.poll_interval = poll_interval_seconds
        self.is_running = False
        self._task: asyncio.Task[None] | None = None

    def start(self) -> None:
        """Start worker background task loop."""
        if self._task is None or self._task.done():
            self.is_running = True
            self._task = asyncio.create_task(self._run_loop())
            logger.info("JobParserWorker background queue started")

    async def stop(self) -> None:
        """Stop worker background task gracefully."""
        self.is_running = False
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            logger.info("JobParserWorker background queue stopped")

    async def _run_loop(self) -> None:
        """Continuous polling loop fetching offers with FOR UPDATE SKIP LOCKED."""
        while self.is_running:
            try:
                processed = await self._process_next_job()
                if not processed:
                    await asyncio.sleep(self.poll_interval)
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.exception("Unexpected error in JobParserWorker loop: %s", exc)
                await asyncio.sleep(self.poll_interval)

    async def _process_next_job(self) -> bool:
        """Lock and parse a single 'inbox' job offer atomically."""
        async with async_session_factory() as session:
            # 1. Fetch next offer using SELECT ... FOR UPDATE SKIP LOCKED
            stmt = (
                select(JobOffer)
                .where(JobOffer.status == "inbox")
                .order_by(JobOffer.created_at.asc())
                .limit(1)
                .with_for_update(skip_locked=True)
            )
            result = await session.execute(stmt)
            job = result.scalar_one_or_none()

            if not job:
                return False

            logger.info("Acquired job offer %s for parsing", job.id)
            job.status = "parsing"
            job.error_message = None
            await session.commit()

            # 2. Parse job offer
            await self.parse_job(session, job)
            return True

    async def parse_job(
        self,
        session: AsyncSession,
        job: JobOffer,
        mode: str = "ai",
    ) -> None:
        """Extract structured data and transition offer status to ready or failed_parsing.

        Args:
            session: Active database session.
            job: Target JobOffer record.
            mode: 'ai' for LLM analysis, 'traditional' for heuristic extraction without LLM.
        """
        try:
            raw_payload = job.raw_payload or {}
            raw_text = raw_payload.get("description_text", "")
            title = job.role_title or raw_payload.get("title", "")
            company = job.company_name or raw_payload.get("company", "")
            requirements = raw_payload.get("requirements_raw", [])
            company_label = company or "zespole IT"
            role_label = title or "Specjalisty"

            if mode == "traditional":
                # Heuristic / traditional rule-based normalization without calling LLM
                logger.info("Executing traditional (rule-based) parsing for job %s", job.id)
                structured = StructuredJobData(
                    role_summary=f"Rola {role_label} w firmie {company_label}.",
                    must_have=requirements[:8] if requirements else ["Znajomość technologii IT"],
                    nice_to_have=requirements[8:16] if len(requirements) > 8 else [],
                    tech_stack=[r for r in requirements if len(r) < 30][:8],
                    benefits=[],
                    experience_level="Mid",
                )
            else:
                # Strict AI normalization via local Ollama or Cloud API
                language_rule = (
                    "CRITICAL LANGUAGE PRESERVATION RULE: Detect the primary language "
                    "of the original job posting. If the job posting is in Polish, "
                    "write 'role_summary', 'must_have', 'nice_to_have', 'benefits', "
                    "'work_model_details', and all descriptive fields STRICTLY IN POLISH. "
                    "If the posting is in English, write them in English. "
                    "NEVER translate Polish job postings into English or vice versa. "
                    "Keep standard technical keywords and tool names "
                    "(e.g. Python, Docker, Kubernetes) in their standard professional notation."
                )

                system_prompt = (
                    "You are an ATS Recruitment Assistant. Extract structured information from "
                    "the job posting description and return a JSON object with: "
                    "role_summary (concise 2-sentence summary), "
                    "must_have (list of required skills/technologies), "
                    "nice_to_have (list of preferred skills), "
                    "tech_stack (list of specific tools/languages), "
                    "benefits (key employment benefits), "
                    "experience_level (Junior/Mid/Senior/Lead), "
                    "work_model (remote/hybrid/onsite), "
                    "work_model_details (specifics e.g. 2 days office/mo), "
                    "application_deadline (date in YYYY-MM-DD format if explicitly stated, "
                    "or null), "
                    "company_name (if not evident, infer or leave as is), "
                    "role_title (cleaned title).\n\n"
                    f"{language_rule}"
                )

                user_prompt = (
                    f"Title: {title}\nCompany: {company}\nRequirements:\n"
                    + "\n".join(f"- {r}" for r in requirements[:15])
                    + f"\n\nDescription:\n{raw_text[:2500]}\n\n"
                    + f"{language_rule}"
                )

                # Passing fallback_data=None forces error if no AI is available
                parsed_data = await llm_client.generate_json(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    fallback_data=None,
                    enable_thinking=False,
                )

                if not isinstance(parsed_data, dict):
                    raise RuntimeError("Model AI zwrócił pustą lub niepoprawną odpowiedź")

                # Normalize structured data with Pydantic
                structured = StructuredJobData(
                    role_summary=parsed_data.get("role_summary"),
                    must_have=parsed_data.get("must_have", []),
                    nice_to_have=parsed_data.get("nice_to_have", []),
                    tech_stack=parsed_data.get("tech_stack", []),
                    benefits=parsed_data.get("benefits", []),
                    experience_level=parsed_data.get("experience_level"),
                )

                # Update job offer attributes if extracted by LLM
                if not job.company_name and parsed_data.get("company_name"):
                    job.company_name = parsed_data.get("company_name")
                if not job.role_title and parsed_data.get("role_title"):
                    job.role_title = parsed_data.get("role_title")
                if not job.work_model and parsed_data.get("work_model"):
                    model_val = parsed_data.get("work_model", "").lower()
                    if model_val in ("remote", "hybrid", "onsite"):
                        job.work_model = model_val
                if not job.work_model_details and parsed_data.get("work_model_details"):
                    job.work_model_details = parsed_data.get("work_model_details")
                if not job.application_deadline and parsed_data.get("application_deadline"):
                    try:
                        from datetime import datetime

                        d_str = str(parsed_data["application_deadline"]).strip()
                        job.application_deadline = datetime.strptime(d_str[:10], "%Y-%m-%d").date()
                    except (ValueError, TypeError):
                        pass

            # Fallback deadline extraction from raw_payload or description if not already set
            if not job.application_deadline:
                if raw_payload.get("application_deadline"):
                    try:
                        from datetime import datetime

                        d_str = str(raw_payload["application_deadline"]).strip()
                        job.application_deadline = datetime.strptime(d_str[:10], "%Y-%m-%d").date()
                    except (ValueError, TypeError):
                        pass

            job.structured_data = structured.model_dump(mode="json")
            job.status = "ready"
            job.error_message = None

            await session.commit()
            await session.refresh(job)
            logger.info(
                "Successfully normalized job offer %s to status 'ready' via %s mode",
                job.id,
                mode,
            )

        except Exception as err:
            logger.warning("Parsing job offer %s failed: %s", job.id, err)
            job.status = "failed_parsing"
            job.error_message = str(err)
            try:
                await session.commit()
                await session.refresh(job)
            except Exception as commit_err:
                logger.error(
                    "Failed to commit failed_parsing status for job %s: %s",
                    job.id,
                    commit_err,
                )


async def reparse_job_by_id(
    job_id: UUID,
    session: AsyncSession,
    mode: str = "ai",
) -> JobOffer:
    """Trigger manual re-parsing for a specific job offer by ID.

    Args:
        job_id: Target JobOffer UUID.
        session: Active database session.
        mode: 'ai' for LLM analysis, 'traditional' for heuristic extraction.
    """
    stmt = select(JobOffer).where(JobOffer.id == job_id)
    result = await session.execute(stmt)
    job = result.scalar_one_or_none()

    if not job:
        raise ValueError(f"Job offer {job_id} not found")

    job.status = "parsing"
    job.error_message = None
    await session.commit()

    worker = JobParserWorker()
    await worker.parse_job(session, job, mode=mode)
    return job


# Singleton background queue worker instance
job_parser_worker = JobParserWorker()
