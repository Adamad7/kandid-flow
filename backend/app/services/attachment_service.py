"""Service for storing, retrieving, and managing job file attachments."""

import os
import re
import uuid
from pathlib import Path
from uuid import UUID

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attachment import JobAttachment
from app.models.event import RecruitmentEvent
from app.models.job import JobOffer
from app.schemas.attachment import (
    JobAttachmentCategory,
    JobAttachmentRead,
)

STORAGE_ROOT = Path("/app/storage/attachments")
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB


def _sanitize_filename(name: str) -> str:
    """Sanitize original filename to prevent path traversal or filesystem issues."""
    clean = re.sub(r"[^\w\-.]", "_", name)
    return clean[:120] if len(clean) > 120 else clean


def _to_read_dto(attachment: JobAttachment) -> JobAttachmentRead:
    """Convert ORM model to Pydantic read schema with dynamic download URL."""
    return JobAttachmentRead(
        id=attachment.id,
        job_offer_id=attachment.job_offer_id,
        event_id=attachment.event_id,
        file_name=attachment.file_name,
        mime_type=attachment.mime_type,
        file_size_bytes=attachment.file_size_bytes,
        category=attachment.category,  # type: ignore[arg-type]
        notes=attachment.notes,
        created_at=attachment.created_at,
        download_url=f"/api/v1/jobs/{attachment.job_offer_id}/attachments/{attachment.id}/download",
    )


class AttachmentService:
    """Manages file attachments on disk and in database."""

    @staticmethod
    async def save_attachment(
        session: AsyncSession,
        job_id: UUID,
        file: UploadFile,
        category: JobAttachmentCategory = "other",
        event_id: UUID | None = None,
        notes: str | None = None,
    ) -> JobAttachmentRead:
        """Save uploaded file to disk and record attachment in PostgreSQL."""
        # 1. Verify job exists
        job = await session.get(JobOffer, job_id)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job offer {job_id} not found",
            )

        # 2. Verify event exists if event_id provided
        if event_id:
            event = await session.get(RecruitmentEvent, event_id)
            if not event or event.job_offer_id != job_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid recruitment event ID for this job offer",
                )

        # 3. Read content and enforce size limit
        file_bytes = await file.read()
        file_size = len(file_bytes)
        max_mb = MAX_FILE_SIZE_BYTES // (1024 * 1024)
        if file_size > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds maximum allowed size of {max_mb} MB",
            )
        if file_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty",
            )

        # 4. Prepare disk storage destination
        attachment_id = uuid.uuid4()
        original_name = file.filename or "attachment"
        safe_name = _sanitize_filename(original_name)
        disk_filename = f"{attachment_id}_{safe_name}"

        job_dir = STORAGE_ROOT / str(job_id)
        job_dir.mkdir(parents=True, exist_ok=True)
        dest_path = job_dir / disk_filename

        with open(dest_path, "wb") as f:
            f.write(file_bytes)

        # 5. Insert DB record
        attachment = JobAttachment(
            id=attachment_id,
            job_offer_id=job_id,
            event_id=event_id,
            file_name=original_name,
            mime_type=file.content_type or "application/octet-stream",
            file_size_bytes=file_size,
            storage_path=str(dest_path),
            category=category,
            notes=notes,
        )
        session.add(attachment)
        await session.commit()
        await session.refresh(attachment)

        return _to_read_dto(attachment)

    @staticmethod
    async def list_attachments(
        session: AsyncSession,
        job_id: UUID,
    ) -> list[JobAttachmentRead]:
        """List all attachments associated with a job offer."""
        stmt = (
            select(JobAttachment)
            .where(JobAttachment.job_offer_id == job_id)
            .order_by(JobAttachment.created_at.desc())
        )
        res = await session.execute(stmt)
        attachments = res.scalars().all()
        return [_to_read_dto(a) for a in attachments]

    @staticmethod
    async def get_attachment_record(
        session: AsyncSession,
        job_id: UUID,
        attachment_id: UUID,
    ) -> JobAttachment:
        """Fetch attachment record and verify ownership."""
        attachment = await session.get(JobAttachment, attachment_id)
        if not attachment or attachment.job_offer_id != job_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attachment not found for this job offer",
            )
        return attachment

    @staticmethod
    async def delete_attachment(
        session: AsyncSession,
        job_id: UUID,
        attachment_id: UUID,
    ) -> bool:
        """Delete attachment record and unlink from disk storage."""
        attachment = await AttachmentService.get_attachment_record(session, job_id, attachment_id)
        file_path = Path(attachment.storage_path)

        await session.delete(attachment)
        await session.commit()

        if file_path.exists():
            try:
                os.remove(file_path)
            except OSError:
                pass

        return True
