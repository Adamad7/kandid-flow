"""FastAPI endpoints for Job Attachments."""

import os
from uuid import UUID

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db_session
from app.schemas.attachment import (
    JobAttachmentCategory,
    JobAttachmentRead,
)
from app.services.attachment_service import AttachmentService

router = APIRouter(prefix="/jobs/{job_id}/attachments", tags=["Attachments"])


@router.post(
    "",
    response_model=JobAttachmentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a new attachment for a job offer",
)
async def upload_attachment(
    job_id: UUID,
    file: UploadFile,
    category: JobAttachmentCategory = Form("other"),
    event_id: UUID | None = Form(None),
    notes: str | None = Form(None),
    session: AsyncSession = Depends(get_db_session),
) -> JobAttachmentRead:
    """Upload a file (CV, cover letter, task brief, offer document) associated with the job."""
    return await AttachmentService.save_attachment(
        session=session,
        job_id=job_id,
        file=file,
        category=category,
        event_id=event_id,
        notes=notes,
    )


@router.get(
    "",
    response_model=list[JobAttachmentRead],
    summary="List all attachments for a job offer",
)
async def list_attachments(
    job_id: UUID,
    session: AsyncSession = Depends(get_db_session),
) -> list[JobAttachmentRead]:
    """Retrieve all document attachments linked to this job offer."""
    return await AttachmentService.list_attachments(session=session, job_id=job_id)


@router.get(
    "/{attachment_id}/download",
    summary="Download or stream an attachment file",
)
async def download_attachment(
    job_id: UUID,
    attachment_id: UUID,
    session: AsyncSession = Depends(get_db_session),
) -> FileResponse:
    """Stream attachment file with inline viewing support for PDF/images."""
    attachment = await AttachmentService.get_attachment_record(
        session=session, job_id=job_id, attachment_id=attachment_id
    )
    if not os.path.exists(attachment.storage_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File content not found on server disk",
        )

    # Use inline Content-Disposition so PDF opens in browser tab or iframe
    return FileResponse(
        path=attachment.storage_path,
        media_type=attachment.mime_type,
        filename=attachment.file_name,
        content_disposition_type="inline",
    )


@router.delete(
    "/{attachment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an attachment",
)
async def delete_attachment(
    job_id: UUID,
    attachment_id: UUID,
    session: AsyncSession = Depends(get_db_session),
) -> None:
    """Permanently delete attachment metadata and disk file."""
    await AttachmentService.delete_attachment(
        session=session, job_id=job_id, attachment_id=attachment_id
    )
