"""Service for aggregating and computing recruitment analytics metrics."""

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event import RecruitmentEvent
from app.models.job import JobOffer
from app.schemas.analytics import (
    AnalyticsOverviewResponse,
    PortalPerformanceMetric,
    RecruitmentFunnelStage,
    StaleApplicationAlert,
    WorkModelMetric,
)

PORTAL_DISPLAY_NAMES: dict[str, str] = {
    "justjoin": "Just Join IT",
    "pracuj": "Pracuj.pl",
    "nofluffjobs": "No Fluff Jobs",
    "linkedin": "LinkedIn",
    "generic": "Inne źródła",
}

WORK_MODEL_DISPLAY_NAMES: dict[str, str] = {
    "remote": "Zdalnie",
    "hybrid": "Hybrydowo",
    "onsite": "W biurze",
}


class AnalyticsService:
    """Computes consolidated metrics for recruitment pipeline."""

    @staticmethod
    async def get_overview(session: AsyncSession) -> AnalyticsOverviewResponse:
        """Calculate complete analytics breakdown."""
        # Fetch all jobs
        stmt = select(JobOffer)
        res = await session.execute(stmt)
        jobs = res.scalars().all()

        # Fetch all recruitment events
        ev_stmt = select(RecruitmentEvent)
        ev_res = await session.execute(ev_stmt)
        events = ev_res.scalars().all()

        now = datetime.now(UTC)
        total_offers = len(jobs)

        # Status counts
        inbox_count = 0
        ready_count = 0
        applied_count = 0
        interview_count = 0
        offer_count = 0
        rejected_count = 0
        archived_count = 0

        # Portals grouping
        portal_stats: dict[str, dict[str, int]] = {}
        # Work models grouping
        work_model_counts: dict[str, int] = {}
        stale_apps: list[StaleApplicationAlert] = []

        # Job ID -> earliest interview event scheduled_at
        job_first_event: dict[str, datetime] = {}
        for ev in events:
            jid = str(ev.job_offer_id)
            if jid not in job_first_event or ev.scheduled_at < job_first_event[jid]:
                job_first_event[jid] = ev.scheduled_at

        diff_days_list: list[float] = []

        for job in jobs:
            st = job.status
            if st in ("inbox", "parsing", "failed_parsing"):
                inbox_count += 1
            elif st == "ready":
                ready_count += 1
            elif st == "applied":
                applied_count += 1
            elif st == "interview":
                interview_count += 1
            elif st == "offer":
                offer_count += 1
            elif st == "rejected":
                rejected_count += 1
            elif st == "archived":
                archived_count += 1

            # Portals
            p = job.source_portal or "generic"
            if p not in portal_stats:
                portal_stats[p] = {"total": 0, "applied": 0, "interview": 0, "offer": 0}
            portal_stats[p]["total"] += 1
            if st in ("applied", "interview", "offer", "rejected"):
                portal_stats[p]["applied"] += 1
            if st in ("interview", "offer"):
                portal_stats[p]["interview"] += 1
            if st == "offer":
                portal_stats[p]["offer"] += 1

            # Work models
            wm = job.work_model or "nieokreślony"
            work_model_counts[wm] = work_model_counts.get(wm, 0) + 1

            # Response time tracking
            jid = str(job.id)
            if job.applied_at and jid in job_first_event:
                applied_dt = job.applied_at
                ev_dt = job_first_event[jid]
                delta = (ev_dt - applied_dt).total_seconds() / 86400.0
                if delta >= 0:
                    diff_days_list.append(delta)

            # Stale applications (status == applied)
            if st == "applied":
                app_date = job.applied_at or job.updated_at or job.created_at
                days_w = max(0, (now - app_date).days)
                if days_w >= 7:
                    stale_apps.append(
                        StaleApplicationAlert(
                            job_id=str(job.id),
                            role_title=job.role_title or "Nieokreślone stanowisko",
                            company_name=job.company_name or "Nieznana firma",
                            applied_at=app_date.strftime("%d.%m.%Y"),
                            days_waiting=days_w,
                            is_ghosting_risk=days_w >= 14,
                        )
                    )

        # Response rates
        total_applied = applied_count + interview_count + offer_count + rejected_count
        overall_response_rate = (
            round(((interview_count + offer_count) / total_applied) * 100, 1)
            if total_applied > 0
            else 0.0
        )
        avg_response_days = (
            round(sum(diff_days_list) / len(diff_days_list), 1) if diff_days_list else None
        )

        # Funnel
        # Stage 1: Zapisane (All)
        # Stage 2: Gotowe do aplikacji (Ready + Applied + Interview + Offer)
        # Stage 3: Wysłano aplikację (Applied + Interview + Offer)
        # Stage 4: Rozmowy rekrutacyjne (Interview + Offer)
        # Stage 5: Oferta pracy (Offer)
        c_all = total_offers
        c_prepared = ready_count + applied_count + interview_count + offer_count
        c_sent = applied_count + interview_count + offer_count
        c_interview = interview_count + offer_count
        c_offer = offer_count

        def calc_pct(c: int) -> float:
            return round((c / c_all * 100), 1) if c_all > 0 else 0.0

        funnel = [
            RecruitmentFunnelStage(
                stage="all",
                label="Zapisane oferty",
                count=c_all,
                percentage=100.0,
            ),
            RecruitmentFunnelStage(
                stage="ready",
                label="Przygotowane do aplikacji",
                count=c_prepared,
                percentage=calc_pct(c_prepared),
            ),
            RecruitmentFunnelStage(
                stage="applied",
                label="Wysłano aplikację",
                count=c_sent,
                percentage=calc_pct(c_sent),
            ),
            RecruitmentFunnelStage(
                stage="interview",
                label="Rozmowy rekrutacyjne",
                count=c_interview,
                percentage=calc_pct(c_interview),
            ),
            RecruitmentFunnelStage(
                stage="offer",
                label="Oferta zatrudnienia",
                count=c_offer,
                percentage=calc_pct(c_offer),
            ),
        ]

        # Portals list
        portals_list: list[PortalPerformanceMetric] = []
        for p, stats in sorted(portal_stats.items(), key=lambda x: x[1]["total"], reverse=True):
            app_cnt = stats["applied"]
            int_cnt = stats["interview"]
            off_cnt = stats["offer"]
            resp_rate = round(((int_cnt + off_cnt) / app_cnt) * 100, 1) if app_cnt > 0 else 0.0
            portals_list.append(
                PortalPerformanceMetric(
                    portal=p,
                    label=PORTAL_DISPLAY_NAMES.get(p, p.capitalize()),
                    total_offers=stats["total"],
                    applied_count=app_cnt,
                    interview_count=int_cnt,
                    offer_count=off_cnt,
                    response_rate=resp_rate,
                )
            )

        # Work models list
        work_models_list: list[WorkModelMetric] = []
        for wm, count in sorted(work_model_counts.items(), key=lambda x: x[1], reverse=True):
            work_models_list.append(
                WorkModelMetric(
                    work_model=wm,
                    label=WORK_MODEL_DISPLAY_NAMES.get(wm, wm.capitalize()),
                    count=count,
                    percentage=calc_pct(count),
                )
            )

        stale_apps.sort(key=lambda x: x.days_waiting, reverse=True)

        return AnalyticsOverviewResponse(
            total_offers=total_offers,
            inbox_count=inbox_count,
            ready_count=ready_count,
            applied_count=applied_count,
            interview_count=interview_count,
            offer_count=offer_count,
            rejected_count=rejected_count,
            archived_count=archived_count,
            overall_response_rate=overall_response_rate,
            average_response_days=avg_response_days,
            ghosting_alert_count=sum(1 for a in stale_apps if a.is_ghosting_risk),
            funnel=funnel,
            portals=portals_list,
            work_models=work_models_list,
            stale_applications=stale_apps,
        )
