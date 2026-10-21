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
        section_mode_map: dict[str, str] = {}
        for s in request.sections:
            if hasattr(s, "id"):
                section_mode_map[s.id] = getattr(s, "mode", "ai")
            elif isinstance(s, dict):
                section_mode_map[s.get("id", "")] = s.get("mode", "ai")
            elif isinstance(s, str):
                section_mode_map[s] = "ai"

        active_sections: list[dict[str, Any]] = []
        if request.sections:
            for sec in raw_sections:
                sec_id = sec.get("id") or sec.get("type")
                mode = section_mode_map.get(sec_id)
                # If mode is explicitly 'off', do not include in CV
                if mode == "off":
                    continue
                # If section specified in request or unmentioned, keep it
                if mode is not None or not section_mode_map:
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

    def _sanitize_and_ground_tailored_sections(
        self,
        baseline_sections: list[dict[str, Any]],
        tailored_sections: list[dict[str, Any]],
        job: JobOffer,
        tailoring_mode: str,
        section_mode_map: dict[str, str] | None = None,
        target_language: str = "pl",
    ) -> list[dict[str, Any]]:
        """Ground tailored sections in baseline factual data to eliminate hallucinations."""
        sanitized_sections: list[dict[str, Any]] = []

        for base_sec in baseline_sections:
            sec_id = base_sec.get("id") or base_sec.get("type")
            sec_type = base_sec.get("type") or sec_id
            mode = (section_mode_map or {}).get(sec_id, "ai")

            # If section was marked as 'raw' (z bazy wiedzy), strictly preserve baseline data
            if mode == "raw":
                sanitized_sections.append(copy.deepcopy(base_sec))
                continue

            # Find matching tailored block if produced by LLM
            matching_tailored = None
            for t_sec in tailored_sections:
                if isinstance(t_sec, dict) and (t_sec.get("id") or t_sec.get("type")) == sec_id:
                    matching_tailored = t_sec
                    break

            if not matching_tailored:
                sanitized_sections.append(copy.deepcopy(base_sec))
                continue

            # In targeted mode, experience, projects, education, certificates are 100% baseline
            if tailoring_mode == "targeted_summary_keywords" and sec_type in (
                "experience",
                "projects",
                "education",
                "certificates",
            ):
                sanitized_sections.append(copy.deepcopy(base_sec))
                continue

            if sec_type == "experience":
                base_items = base_sec.get("items", [])
                t_items = matching_tailored.get("items", [])
                target_company_lower = (job.company_name or "").strip().lower()

                grounded_items = []
                for idx, base_item in enumerate(base_items):
                    grounded_item = copy.deepcopy(base_item)
                    base_comp_lower = base_item.get("company", "").strip().lower()
                    base_pos_lower = base_item.get("position", "").strip().lower()

                    # Find matching tailored item
                    matched_t = None
                    for candidate_t in t_items:
                        cand_comp = candidate_t.get("company", "").strip().lower()
                        # Reject if company matches the target employer (clear hallucination)
                        if target_company_lower and cand_comp == target_company_lower:
                            continue
                        if (
                            cand_comp == base_comp_lower
                            or candidate_t.get("position", "").strip().lower() == base_pos_lower
                        ):
                            matched_t = candidate_t
                            break

                    if not matched_t and idx < len(t_items):
                        cand = t_items[idx]
                        if not (
                            target_company_lower
                            and cand.get("company", "").strip().lower() == target_company_lower
                        ):
                            matched_t = cand

                    # If tailored highlights are provided, apply them,
                    # but strictly preserve factual company, position, dates, location
                    if (
                        matched_t
                        and "highlights" in matched_t
                        and isinstance(matched_t["highlights"], list)
                        and matched_t["highlights"]
                    ):
                        grounded_item["highlights"] = matched_t["highlights"]

                    grounded_items.append(grounded_item)

                tailored_block = copy.deepcopy(base_sec)
                tailored_block["items"] = grounded_items
                sanitized_sections.append(tailored_block)

            elif sec_type == "projects":
                base_items = base_sec.get("items", [])
                t_items = matching_tailored.get("items", [])
                grounded_projects = []

                if isinstance(t_items, list) and t_items:
                    # Ground only the subset of projects selected by LLM as relevant to job offer
                    for candidate_t in t_items:
                        if not isinstance(candidate_t, dict):
                            continue
                        cand_name_lower = candidate_t.get("name", "").strip().lower()
                        # Match against baseline projects (reject hallucinated project names)
                        matched_base = None
                        for base_item in base_items:
                            if base_item.get("name", "").strip().lower() == cand_name_lower:
                                matched_base = base_item
                                break
                        if matched_base:
                            grounded_proj = copy.deepcopy(matched_base)
                            if (
                                "description" in candidate_t
                                and isinstance(candidate_t["description"], str)
                                and candidate_t["description"].strip()
                            ):
                                grounded_proj["description"] = candidate_t["description"]
                            if (
                                "technologies" in candidate_t
                                and isinstance(candidate_t["technologies"], list)
                                and candidate_t["technologies"]
                            ):
                                grounded_proj["technologies"] = candidate_t["technologies"]
                            grounded_projects.append(grounded_proj)

                # Fallback to base_items if no valid baseline projects matched
                if not grounded_projects:
                    grounded_projects = copy.deepcopy(base_items)

                tailored_block = copy.deepcopy(base_sec)
                tailored_block["items"] = grounded_projects
                sanitized_sections.append(tailored_block)

            elif sec_type == "education":
                base_items = base_sec.get("items", [])
                t_items = matching_tailored.get("items", [])
                if target_language == "en" and isinstance(t_items, list) and t_items:
                    grounded_edu = []
                    for idx, base_item in enumerate(base_items):
                        item = copy.deepcopy(base_item)
                        matched_t = t_items[idx] if idx < len(t_items) else None
                        if matched_t and isinstance(matched_t, dict):
                            if matched_t.get("degree"):
                                item["degree"] = matched_t["degree"]
                            if matched_t.get("field_of_study"):
                                item["field_of_study"] = matched_t["field_of_study"]
                            if matched_t.get("institution"):
                                item["institution"] = matched_t["institution"]
                        grounded_edu.append(item)
                    tailored_block = copy.deepcopy(base_sec)
                    tailored_block["items"] = grounded_edu
                    sanitized_sections.append(tailored_block)
                else:
                    # Education is strictly factual from baseline in Polish
                    sanitized_sections.append(copy.deepcopy(base_sec))

            elif sec_type == "certificates":
                base_items = base_sec.get("items", [])
                t_items = matching_tailored.get("items", [])
                if target_language == "en" and isinstance(t_items, list) and t_items:
                    grounded_certs = []
                    for idx, base_item in enumerate(base_items):
                        item = copy.deepcopy(base_item)
                        matched_t = t_items[idx] if idx < len(t_items) else None
                        if matched_t and isinstance(matched_t, dict):
                            if matched_t.get("name"):
                                item["name"] = matched_t["name"]
                            if matched_t.get("issuer"):
                                item["issuer"] = matched_t["issuer"]
                        grounded_certs.append(item)
                    tailored_block = copy.deepcopy(base_sec)
                    tailored_block["items"] = grounded_certs
                    sanitized_sections.append(tailored_block)
                else:
                    # Certificates are strictly factual from baseline in Polish
                    sanitized_sections.append(copy.deepcopy(base_sec))

            else:
                # summary, skills, clause, etc.
                sanitized_sections.append(matching_tailored)

        return sanitized_sections

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
                "You are an expert ATS-focused Resume Tailoring Assistant.\n"
                "CRITICAL GROUNDING RULES:\n"
                "1. STRICT FACTUAL INTEGRITY: NEVER add information, facts, or claims that are not "
                "in the candidate's knowledge base or do not directly result from "
                "candidate database entries.\n"
                "2. Tailor ONLY the 'summary', 'skills', and 'clause' blocks.\n"
                "3. Keep all 'experience', 'projects', 'education', and 'certificates' "
                "blocks strictly UNCHANGED.\n"
                "4. NEVER invent fake companies, fake job titles, fake dates, or fake projects.\n"
                "5. Return the complete updated resume JSON."
            )
            user_prompt = (
                f"Target Role: {role}\nTarget Company: {company}\n"
                f"Job Requirements: {job.structured_data}\nJob Description:\n{raw_desc[:1200]}\n\n"
                f"Custom Candidate Directives: {request.custom_instructions or 'None'}\n\n"
                f"Baseline Resume JSON:\n{baseline_payload}"
            )
        else:
            system_prompt = (
                "You are an expert ATS-focused Resume Tailoring Assistant.\n"
                "CRITICAL INVIOLABLE RULES FOR FACTUAL INTEGRITY:\n"
                "1. NEVER INVENT FAKE COMPANIES, JOBS, DATES, OR WORK EXPERIENCES. "
                "The candidate's past work experience entries (companies, job titles, dates) "
                "must match EXACTLY the baseline. Do NOT add information not present in the "
                "candidate database or not directly resulting from candidate database entries.\n"
                "2. RELEVANT PROJECTS ONLY: When generating the 'projects' section, select and "
                "include ONLY those projects from 'Baseline Resume JSON' that are relevant to "
                "this specific job offer. Omit irrelevant projects. NEVER invent or fabricate "
                "projects not present in the baseline.\n"
                "3. EDUCATION AND CERTIFICATES INTEGRITY: Do NOT change the original names of "
                "schools, institutions, degrees, fields of study, or certificates. "
                "(Exception: if the resume is being translated to English, translate standard "
                "degree and institution terms such as 'Inżynier' -> 'Bachelor of Engineering "
                "(B.Eng.)', 'Magister' -> 'Master of Science (M.Sc.)', and general field names "
                "into English, while keeping specific certificate names intact).\n"
                "4. FOR 'experience' SECTIONS: Keep existing company names, job titles, "
                "and dates. You may ONLY reword existing bullet points (highlights) to "
                "emphasize transferable skills that align with the target role.\n"
                "5. FOR 'summary': Rewrite the professional summary to present the candidate's "
                "genuine background as enthusiastic and well-suited for the target role.\n"
                "6. FOR 'skills': Reorder and highlight existing relevant skills, or add "
                "relevant technical keywords from the candidate's tech domain.\n"
                "7. FOR 'clause': Set the GDPR clause specifically for the target company.\n"
                "8. Return the full resume in valid JSON matching the exact input structure."
            )
            user_prompt = (
                f"Target Role: {role}\nTarget Company: {company}\n"
                f"Target Language: {request.language}\n"
                f"Job Requirements: {job.structured_data}\nJob Description:\n{raw_desc[:2000]}\n\n"
                f"Custom Directives: {request.custom_instructions or 'None'}\n\n"
                f"Baseline Resume JSON:\n{baseline_payload}"
            )

        # 4. Tailor schema with LLM or deterministic fallback
        section_mode_map: dict[str, str] = {}
        for s in request.sections:
            if hasattr(s, "id"):
                section_mode_map[s.id] = getattr(s, "mode", "ai")
            elif isinstance(s, dict):
                section_mode_map[s.get("id", "")] = s.get("mode", "ai")
            elif isinstance(s, str):
                section_mode_map[s] = "ai"

        has_ai_sections = any(
            section_mode_map.get(sec.get("id") or sec.get("type"), "ai") == "ai"
            for sec in baseline_payload.get("sections", [])
        )

        deterministic_fallback = self._apply_deterministic_tailoring(
            baseline_payload, job, request.tailoring_mode
        )
        provider = request.llm_provider if request.llm_provider != "default" else None

        if has_ai_sections:
            tailored_data = await llm_client.generate_json(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                fallback_data=deterministic_fallback,
                provider=provider,
                model=request.llm_model,
                enable_thinking=request.enable_thinking,
                timeout=120.0,
                api_key=request.api_key,
            )
        else:
            tailored_data = deterministic_fallback

        if not isinstance(tailored_data, dict) or "sections" not in tailored_data:
            tailored_data = deterministic_fallback

        # Programmatic Grounding Guardrail: eliminate any hallucinated jobs or fake projects
        tailored_data["sections"] = self._sanitize_and_ground_tailored_sections(
            baseline_payload.get("sections", []),
            tailored_data.get("sections", []),
            job,
            request.tailoring_mode,
            section_mode_map=section_mode_map,
            target_language=request.language,
        )

        # Ensure name, contact and language are strictly preserved
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
        llm_provider: str = "default",
        llm_model: str | None = None,
        enable_thinking: bool = True,
    ) -> tuple[dict[str, Any], CVVersion]:
        """Use LLM to refine an individual block in a CV version with full context and persist."""
        stmt = select(CVVersion).where(CVVersion.id == cv_version_id)
        result = await db.execute(stmt)
        cv_version = result.scalar_one_or_none()
        if not cv_version:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"CV Version with ID '{cv_version_id}' not found",
            )

        # 1. Fetch associated JobOffer
        job: JobOffer | None = None
        if cv_version.job_offer_id:
            stmt_job = select(JobOffer).where(JobOffer.id == cv_version.job_offer_id)
            res_job = await db.execute(stmt_job)
            job = res_job.scalar_one_or_none()

        # 2. Fetch candidate profile (Knowledge Base)
        stmt_cand = select(CandidateProfile).limit(1)
        res_cand = await db.execute(stmt_cand)
        candidate = res_cand.scalar_one_or_none()

        # Extract Job Offer data
        job_role = (job.role_title if job else None) or "Target Role"
        job_company = (job.company_name if job else None) or "Target Company"
        job_structured = job.structured_data if job and job.structured_data else {}
        job_desc = (
            job.raw_payload.get("description_text", "")
            if job and isinstance(job.raw_payload, dict)
            else ""
        )[:1500]

        # Extract Candidate Knowledge Base data
        cand_name = (candidate.full_name if candidate else None) or "Candidate"
        cand_sections = candidate.sections if candidate and candidate.sections else []

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

        # Call LLM for block refinement with full ATS context and strict factual grounding
        system_prompt = (
            "You are an ATS Resume Editor and Expert Career Strategist. Refine a single resume "
            "section block according to the candidate's instructions, tailored specifically "
            "for the target job offer.\n\n"
            "CRITICAL FACTUAL INTEGRITY & GROUNDING RULES:\n"
            "1. STRICT FACTUAL FIDELITY: The Candidate Knowledge Base is your sole source of truth "
            "(ground truth). NEVER invent fake companies, fake job titles, fake dates, "
            "fake projects, or technical skills not possessed by the candidate.\n"
            "2. DO NOT HALLUCINATE: Never attribute work at the target hiring company to the "
            "candidate's past history unless explicitly in their knowledge base.\n"
            "3. STRATEGIC ATS TAILORING: Emphasize genuine candidate skills, achievements, and "
            "keywords that match the job requirements (must-have, nice-to-have, tech stack).\n"
            "4. SCHEMA INTEGRITY: Maintain the exact JSON structure and fields of the target block "
            "(id, type, title, and its internal fields like items, content, etc.).\n"
            "5. Return ONLY a valid JSON object representing the refined section block."
        )

        user_prompt = (
            "=== TARGET JOB OFFER ===\n"
            f"Role: {job_role}\n"
            f"Company: {job_company}\n"
            f"Structured Requirements: {job_structured}\n"
            f"Description Excerpt:\n{job_desc}\n\n"
            "=== CANDIDATE KNOWLEDGE BASE (GROUND TRUTH) ===\n"
            f"Candidate: {cand_name}\n"
            f"Sections & Profile:\n{cand_sections}\n\n"
            "=== CURRENT CV SECTION BLOCK TO REFINE ===\n"
            f"{target_block}\n\n"
            "=== CANDIDATE INSTRUCTION ===\n"
            f"{instruction}\n\n"
            "Refine the above section block JSON following all factual grounding rules."
        )

        fallback_block = copy.deepcopy(target_block)
        if "content" in fallback_block and isinstance(fallback_block["content"], str):
            fallback_block["content"] = f"{fallback_block['content'].rstrip('. ')}. ({instruction})"

        provider = llm_provider if llm_provider != "default" else None

        try:
            refined = await llm_client.generate_json(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                fallback_data=fallback_block,
                provider=provider,
                model=llm_model,
                enable_thinking=enable_thinking,
                timeout=60.0,
            )
        except Exception as e:
            logger.warning("LLM block refinement failed, falling back to deterministic: %s", e)
            refined = fallback_block

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
