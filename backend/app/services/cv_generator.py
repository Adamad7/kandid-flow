import copy
import logging
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.candidate import CandidateProfile
from app.models.cv import CVVersion
from app.models.job import JobOffer
from app.models.preset import BaseCVPreset
from app.schemas.candidate import CandidateSectionBlock
from app.schemas.cv import CVGenerateRequest
from app.services.llm_client import llm_client

logger = logging.getLogger(__name__)


class CVGeneratorService:
    """Service handling AI resume synthesis, archetype baseline resolution, and versioning."""

    async def _resolve_baseline(
        self,
        request: CVGenerateRequest,
        db: AsyncSession,
    ) -> tuple[dict[str, Any], str, dict[str, Any]]:
        """Resolve baseline layout schema and candidate contact info from preset or profile."""
        # 1. Fetch Candidate Profile for contact info
        stmt_cand = select(CandidateProfile).limit(1)
        res_cand = await db.execute(stmt_cand)
        candidate = res_cand.scalar_one_or_none()

        full_name = candidate.full_name if candidate else "Jan Kowalski"
        contact_info = candidate.contact_info if candidate else {}

        # 2. Resolve baseline sections: from BaseCVPreset if specified, else from CandidateProfile
        if request.preset_id:
            stmt_preset = select(BaseCVPreset).where(BaseCVPreset.id == request.preset_id)
            res_preset = await db.execute(stmt_preset)
            preset = res_preset.scalar_one_or_none()
            if not preset:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Base CV Preset with ID '{request.preset_id}' not found",
                )
            raw_sections = (
                preset.layout_schema
                if isinstance(preset.layout_schema, list)
                else preset.layout_schema.get("sections", [])
            )
        else:
            raw_sections = candidate.sections if candidate else []

        # 3. Filter sections if specified
        active_sections: list[dict[str, Any]] = []
        if request.sections:
            for sec in raw_sections:
                sec_id = sec.get("id") or sec.get("type")
                if sec_id in request.sections:
                    active_sections.append(copy.deepcopy(sec))
        else:
            active_sections = [copy.deepcopy(s) for s in raw_sections]

        baseline_payload = {
            "full_name": full_name,
            "contact_info": contact_info,
            "language": request.language,
            "sections": active_sections,
        }
        return baseline_payload, full_name, contact_info

    def _apply_deterministic_tailoring(
        self,
        baseline: dict[str, Any],
        job: JobOffer,
        tailoring_mode: str,
    ) -> dict[str, Any]:
        """Deterministic tailoring fallback for offline execution and fast responses."""
        result = copy.deepcopy(baseline)
        sections = result.get("sections", [])
        company = job.company_name or "Pracodawca"
        role = job.role_title or "Specjalista"

        # Extract requirements/skills keywords from job
        reqs: list[str] = []
        if job.structured_data and isinstance(job.structured_data, dict):
            reqs = job.structured_data.get("must_have", []) + job.structured_data.get(
                "nice_to_have", []
            )

        has_clause = False
        for sec in sections:
            sec_type = sec.get("type") or sec.get("id")

            # 1. Summary adaptation
            if sec_type == "summary":
                orig_summary = sec.get("content", sec.get("text", ""))
                sec["content"] = (
                    f"{orig_summary.rstrip('. ')}. Zmotywowany do wniesienia wartości jako {role} "
                    f"w zespole {company}."
                )

            # 2. Inject keywords into skills block
            elif sec_type == "skills" and reqs:
                items = sec.get("items", [])
                if isinstance(items, list) and items:
                    matching_cat = items[0]
                    if isinstance(matching_cat, dict) and "skills" in matching_cat:
                        existing_skills = set(matching_cat["skills"])
                        for r in reqs[:4]:
                            if r not in existing_skills:
                                matching_cat["skills"].append(r)

            # 3. Company-specific GDPR clause
            elif sec_type == "clause":
                has_clause = True
                if result.get("language") == "en":
                    sec["content"] = (
                        f"I hereby consent to my personal data being processed by {company} "
                        "for the recruitment process in accordance with GDPR."
                    )
                else:
                    sec["content"] = (
                        f"Wyrażam zgodę na przetwarzanie moich danych osobowych przez {company} "
                        "dla potrzeb niezbędnych do realizacji procesu rekrutacji zgodnie z RODO."
                    )

        # Ensure customized clause exists
        if not has_clause:
            sections.append(
                {
                    "id": "clause",
                    "type": "clause",
                    "title": "Klauzula RODO",
                    "content": (
                        f"Wyrażam zgodę na przetwarzanie moich danych osobowych przez {company} "
                        "dla potrzeb niezbędnych do realizacji procesu rekrutacji zgodnie z RODO."
                    ),
                }
            )

        result["sections"] = sections
        return result

    async def generate_tailored_cv(
        self,
        request: CVGenerateRequest,
        db: AsyncSession,
    ) -> CVVersion:
        """Synthesize job-tailored CV version from preset or candidate profile and persist it."""
        # 1. Fetch Target Job Offer
        stmt_job = select(JobOffer).where(JobOffer.id == request.job_offer_id)
        res_job = await db.execute(stmt_job)
        job = res_job.scalar_one_or_none()
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job offer with ID '{request.job_offer_id}' not found",
            )

        # 2. Resolve baseline from Preset or Knowledge Base
        baseline_payload, full_name, contact_info = await self._resolve_baseline(request, db)

        # 3. Formulate tailoring prompts based on tailoring_mode
        company = job.company_name or "Target Company"
        role = job.role_title or "Target Role"
        raw_desc = job.raw_payload.get("description_text", "") if job.raw_payload else ""

        if request.tailoring_mode == "targeted_summary_keywords":
            system_prompt = (
                "You are an ATS-focused Resume Tailoring Assistant. "
                "Tailor ONLY the 'summary', 'skills', and 'clause' blocks. "
                "Keep all 'experience', 'projects', 'education', and 'certificates' "
                "blocks strictly UNCHANGED."
            )
            user_prompt = (
                f"Target Role: {role}\nTarget Company: {company}\n"
                f"Job Requirements: {job.structured_data}\nJob Description:\n{raw_desc[:1200]}\n\n"
                f"Custom Candidate Directives: {request.custom_instructions or 'None'}\n\n"
                f"Baseline Resume JSON:\n{baseline_payload}"
            )
        else:
            system_prompt = (
                "You are an ATS-focused Resume Tailoring Assistant. "
                "Fully tailor the resume to emphasize alignment with the target role. "
                "Customize the professional summary, highlight relevant experiences and projects, "
                f"align skills, and set the GDPR clause specifically for {company}."
            )
            user_prompt = (
                f"Target Role: {role}\nTarget Company: {company}\n"
                f"Job Requirements: {job.structured_data}\nJob Description:\n{raw_desc[:2000]}\n\n"
                f"Custom Directives: {request.custom_instructions or 'None'}\n\n"
                f"Baseline Resume JSON:\n{baseline_payload}"
            )

        # 4. Tailor schema with LLM or deterministic fallback
        deterministic_fallback = self._apply_deterministic_tailoring(
            baseline_payload, job, request.tailoring_mode
        )
        tailored_data = await llm_client.generate_json(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            fallback_data=deterministic_fallback,
        )

        if not isinstance(tailored_data, dict) or "sections" not in tailored_data:
            tailored_data = deterministic_fallback

        # Ensure name and contact are preserved
        tailored_data["full_name"] = full_name
        tailored_data["contact_info"] = contact_info
        tailored_data["language"] = request.language

        # 5. Determine next version number for this job offer
        stmt_ver = select(func.coalesce(func.max(CVVersion.version_number), 0)).where(
            CVVersion.job_offer_id == job.id
        )
        max_ver = (await db.execute(stmt_ver)).scalar_one()
        next_ver = max_ver + 1

        # 6. Deactivate older versions
        await db.execute(
            update(CVVersion).where(CVVersion.job_offer_id == job.id).values(is_active=False)
        )

        # 7. Commit new CV version
        change_summary = (
            f"Tailored from preset '{request.preset_id}' ({request.tailoring_mode})"
            if request.preset_id
            else f"Generated v{next_ver} ({request.tailoring_mode})"
        )

        cv_version = CVVersion(
            job_offer_id=job.id,
            parent_preset_id=request.preset_id,
            version_number=next_ver,
            is_active=True,
            language=request.language,
            layout_schema=tailored_data,
            change_summary=change_summary,
        )

        db.add(cv_version)
        await db.commit()
        await db.refresh(cv_version)

        logger.info(
            "Synthesized CV version %d for job %s (preset: %s)",
            cv_version.version_number,
            job.id,
            request.preset_id,
        )
        return cv_version

    async def refine_block(
        self,
        cv_version_id: UUID,
        block_id: str,
        instruction: str,
        db: AsyncSession,
        current_block: CandidateSectionBlock | None = None,
    ) -> tuple[dict[str, Any], CVVersion]:
        """Use LLM to refine an individual block in a CV version and persist the update."""
        stmt = select(CVVersion).where(CVVersion.id == cv_version_id)
        result = await db.execute(stmt)
        cv_version = result.scalar_one_or_none()
        if not cv_version:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"CV Version with ID '{cv_version_id}' not found",
            )

        if isinstance(cv_version.layout_schema, dict):
            layout = cv_version.layout_schema
        elif isinstance(cv_version.layout_schema, list):
            layout = {"sections": cv_version.layout_schema}
        else:
            layout = {"sections": []}

        sections = layout.get("sections", [])
        target_idx = -1
        target_block = None

        for idx, sec in enumerate(sections):
            sec_id = sec.get("id") or sec.get("type")
            if sec_id == block_id:
                target_idx = idx
                target_block = sec
                break

        if target_block is None and current_block is not None:
            target_block = current_block.model_dump(mode="json")
        elif target_block is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Section block with ID '{block_id}' not found in CV version",
            )

        # Call LLM for block refinement
        system_prompt = (
            "You are an ATS Resume Editor. Refine a single resume section block "
            "according to candidate instructions. Maintain the exact JSON structure. "
            "Return only the refined JSON block object."
        )
        user_prompt = (
            f"Block JSON to refine:\n{target_block}\n\nCandidate Instruction: {instruction}"
        )

        fallback_block = copy.deepcopy(target_block)
        if "content" in fallback_block and isinstance(fallback_block["content"], str):
            fallback_block["content"] = f"{fallback_block['content'].rstrip('. ')}. ({instruction})"

        refined = await llm_client.generate_json(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            fallback_data=fallback_block,
        )

        if not isinstance(refined, dict) or ("type" not in refined and "id" not in refined):
            refined = fallback_block

        # Ensure id and type are preserved
        if "id" not in refined:
            refined["id"] = block_id
        if "type" not in refined and "type" in target_block:
            refined["type"] = target_block["type"]

        if target_idx >= 0:
            sections[target_idx] = refined
            layout["sections"] = sections
            cv_version.layout_schema = layout
            cv_version.change_summary = f"Refined block '{block_id}'"
            await db.commit()
            await db.refresh(cv_version)

        return refined, cv_version


cv_generator = CVGeneratorService()
