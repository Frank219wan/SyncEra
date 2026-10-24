"""Validate and persist versioned MASCO/DOSM/AI catalogue import manifests.

This is an offline operator workflow. The public API never fetches source pages,
calls a model to invent requirements, or modifies the catalogue on a CV request.
"""

from __future__ import annotations

import hashlib
import json
from collections import defaultdict
from datetime import date, datetime
from typing import Literal
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, model_validator

from .quarterly_market import (
    market_signal_from_report_share, quarter_number, select_historical_reference,
)
from .career_import_target import PreviewTargetError, verify_connected_preview, verify_preview_target


def _official_url(value: str, provider: str) -> str:
    parsed = urlparse(value)
    host = (parsed.hostname or "").lower()
    expected = "dosm.gov.my" if provider == "dosm" else "emasco.mohr.gov.my"
    if parsed.scheme != "https" or not (host == expected or host.endswith("." + expected)):
        raise ValueError(f"{provider} source requires an official HTTPS URL")
    return value


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SourceDocument(Strict):
    source_id: str = Field(pattern=r"^src_[A-Za-z0-9_]+$")
    provider: Literal["dosm", "emasco"]
    source_url: str
    source_version: str = Field(min_length=1)
    published_at: date | None = None
    collected_at: datetime
    method_version: str = Field(min_length=1)

    @model_validator(mode="after")
    def official_url_and_date(self):
        _official_url(self.source_url, self.provider)
        if self.collected_at.tzinfo is None:
            raise ValueError("collected_at must include a timezone")
        if self.published_at and self.collected_at.date() < self.published_at:
            raise ValueError("collection cannot precede publication")
        return self


class SkillRecord(Strict):
    skill_id: str = Field(pattern=r"^skill_[A-Za-z0-9_]+$")
    name: str = Field(min_length=1)
    category: Literal["ai_technical", "human_centric", "industry", "general_technical"]
    aliases: list[str] = Field(default_factory=list)


class MascoOccupation(Strict):
    masco_code: str = Field(pattern=r"^[0-9]{4}(-[0-9]{2})?$")
    role_id: str | None = Field(default=None, pattern=r"^role_[A-Za-z0-9_]+$")
    field_id: str | None = Field(default=None, pattern=r"^field_[A-Za-z0-9_]+$")
    name: str = Field(min_length=1)
    description: str = Field(min_length=1)
    tasks: list[str] = Field(default_factory=list)
    official_skill_summary: list[str] = Field(default_factory=list)
    source_id: str
    source_url: str
    is_active: bool = False

    @model_validator(mode="after")
    def group_or_named_role(self):
        if len(self.masco_code) == 4:
            if self.role_id is not None or self.field_id is not None or self.is_active:
                raise ValueError("unit-group rows cannot be active named roles")
        elif self.role_id is None or self.field_id is None:
            raise ValueError("named occupations require role_id and field_id")
        _official_url(self.source_url, "emasco")
        return self


class DemandQuarter(Strict):
    unit_group_code: str = Field(pattern=r"^[0-9]{4}$")
    period: str = Field(pattern=r"^[0-9]{4}-Q[1-4]$")
    region: str = Field(pattern=r"^[A-Z]{2}$")
    job_offerings: int = Field(ge=0)
    total_job_offerings: int = Field(gt=0)
    measurement_series_id: str = Field(pattern=r"^[A-Za-z0-9_-]+$")
    quality_status: Literal["clear", "reviewed_conflict", "conflicted", "method_pending"]
    scenario_eligible: bool = False
    source_id: str
    source_row: str | None = None
    limitation: str = Field(min_length=1)

    @model_validator(mode="after")
    def scenario_quality(self):
        if self.job_offerings > self.total_job_offerings:
            raise ValueError("group offerings cannot exceed total offerings")
        if self.scenario_eligible and self.quality_status not in {"clear", "reviewed_conflict"}:
            raise ValueError("only clear or explicitly reviewed observations may enter scenario selection")
        return self


class ScenarioAnchor(Strict):
    unit_group_code: str = Field(pattern=r"^[0-9]{4}$")
    region: str = Field(pattern=r"^[A-Z]{2}$")
    moderate_period: str = Field(pattern=r"^[0-9]{4}-Q[1-4]$")
    fast_period: str = Field(pattern=r"^[0-9]{4}-Q[1-4]$")
    rationale: str = Field(min_length=1)
    limitation: str = Field(min_length=1)


class SkillAssertion(Strict):
    role_id: str = Field(pattern=r"^role_[A-Za-z0-9_]+$")
    skill_id: str = Field(pattern=r"^skill_[A-Za-z0-9_]+$")
    origin: Literal["emasco_page", "ai_generated"]
    source_id: str | None = None
    source_excerpt: str | None = None
    model_version: str | None = None
    prompt_version: str | None = None
    generated_at: datetime | None = None
    target_level: int | None = Field(default=None, ge=0, le=5)
    target_level_origin: Literal["human_set", "ai_generated"] | None = None
    importance: Literal["high", "medium", "low"] | None = None
    status: Literal["draft", "active", "retired"] = "draft"

    @model_validator(mode="after")
    def provenance(self):
        if self.origin == "emasco_page" and not (self.source_id and self.source_excerpt):
            raise ValueError("official mapping needs source_id and excerpt")
        if self.origin == "emasco_page" and any(
            item is not None for item in (self.model_version, self.prompt_version, self.generated_at)
        ):
            raise ValueError("official mapping cannot carry AI generation metadata")
        if self.origin == "ai_generated" and not (
            self.model_version and self.prompt_version and self.generated_at
        ):
            raise ValueError("AI mapping needs model, prompt and generation timestamp")
        if self.origin == "ai_generated" and (self.source_id is not None or self.source_excerpt is not None):
            raise ValueError("AI mapping cannot masquerade as an official source excerpt")
        if self.generated_at and self.generated_at.tzinfo is None:
            raise ValueError("generated_at must include a timezone")
        if self.status == "active" and (
            self.target_level is None or self.target_level_origin is None or self.importance is None
        ):
            raise ValueError("active requirements need target level, provenance and importance")
        return self


class CareerImportManifest(Strict):
    catalogue_version: str = Field(min_length=1)
    sources: list[SourceDocument] = Field(min_length=1)
    skills: list[SkillRecord] = Field(default_factory=list)
    occupations: list[MascoOccupation] = Field(default_factory=list)
    demand_quarters: list[DemandQuarter] = Field(default_factory=list)
    scenario_anchors: list[ScenarioAnchor] = Field(default_factory=list)
    skill_assertions: list[SkillAssertion] = Field(default_factory=list)

    @model_validator(mode="after")
    def references_and_granularity(self):
        source_by_id = {row.source_id: row for row in self.sources}
        occupation_by_code = {row.masco_code: row for row in self.occupations}
        roles = {row.role_id: row for row in self.occupations if row.role_id}
        skills = {row.skill_id for row in self.skills}
        if len(source_by_id) != len(self.sources) or len(occupation_by_code) != len(self.occupations):
            raise ValueError("duplicate source_id or MASCO code")
        if len(roles) != sum(row.role_id is not None for row in self.occupations):
            raise ValueError("duplicate role_id")
        if len(skills) != len(self.skills):
            raise ValueError("duplicate skill_id")
        for row in self.occupations:
            source = source_by_id.get(row.source_id)
            if source is None or source.provider != "emasco" or row.source_url != source.source_url:
                raise ValueError("occupation must reference its exact eMASCO source")
            if len(row.masco_code) > 4:
                parent = occupation_by_code.get(row.masco_code[:4])
                if parent is None or parent.role_id is not None:
                    raise ValueError("named occupation needs its parent unit group in the manifest")
        seen_demand = set()
        for row in self.demand_quarters:
            key = (row.unit_group_code, row.period, row.region)
            if key in seen_demand:
                raise ValueError("duplicate unit-group quarter")
            seen_demand.add(key)
            source = source_by_id.get(row.source_id)
            if source is None or source.provider != "dosm":
                raise ValueError("demand must reference a DOSM source")
            if row.unit_group_code not in occupation_by_code:
                raise ValueError("demand group needs a MASCO unit-group row")
            year, quarter = int(row.period[:4]), int(row.period[-1])
            if source.published_at and (source.published_at.year, (source.published_at.month - 1) // 3 + 1) < (year, quarter):
                raise ValueError("DOSM publication cannot precede the observed quarter")
        demand_by_key = {
            (row.unit_group_code, row.region, row.period): row for row in self.demand_quarters
        }
        seen_anchors = set()
        for anchor in self.scenario_anchors:
            key = (anchor.unit_group_code, anchor.region)
            if key in seen_anchors:
                raise ValueError("duplicate scenario anchor for group and region")
            seen_anchors.add(key)
            if quarter_number(anchor.moderate_period) >= quarter_number(anchor.fast_period):
                raise ValueError("Moderate must use an earlier quarter than Fast")
            for period in (anchor.moderate_period, anchor.fast_period):
                if (anchor.unit_group_code, anchor.region, period) not in demand_by_key:
                    raise ValueError("scenario anchor must reference an observed DOSM quarter")
                if demand_by_key[(anchor.unit_group_code, anchor.region, period)].quality_status == "conflicted":
                    raise ValueError("unresolved conflicting observation cannot be a scenario anchor")
        seen_active = set()
        for row in self.skill_assertions:
            if row.role_id not in roles or row.skill_id not in skills:
                raise ValueError("skill assertion references an unknown named role or skill")
            if row.source_id and row.source_id not in source_by_id:
                raise ValueError("skill assertion references an unknown source")
            if row.origin == "emasco_page":
                if source_by_id[row.source_id].provider != "emasco":
                    raise ValueError("official skill assertion needs an eMASCO source")
                if row.source_id != roles[row.role_id].source_id:
                    raise ValueError("official skill assertion must cite the named role page")
            if row.status == "active":
                key = (row.role_id, row.skill_id)
                if key in seen_active:
                    raise ValueError("one active requirement per role and skill")
                seen_active.add(key)
        for role_id, occupation in roles.items():
            if occupation.is_active and not any(key[0] == role_id for key in seen_active):
                raise ValueError("active named role needs an active skill requirement")
        return self


def extracted_hash(manifest: CareerImportManifest, source_id: str) -> str:
    """Hash curated extraction, not inaccessible or potentially changing HTML bytes."""
    payload = {
        "occupations": [row.model_dump(mode="json") for row in sorted(
            (row for row in manifest.occupations if row.source_id == source_id),
            key=lambda row: row.masco_code,
        )],
        "demand": [row.model_dump(mode="json") for row in sorted(
            (row for row in manifest.demand_quarters if row.source_id == source_id),
            key=lambda row: (row.unit_group_code, row.period, row.region),
        )],
        "official_skill_assertions": [
            {
                "role_id": row.role_id,
                "skill_id": row.skill_id,
                "source_excerpt": row.source_excerpt,
            }
            for row in sorted(
                (row for row in manifest.skill_assertions if row.source_id == source_id),
                key=lambda row: (row.role_id, row.skill_id, row.source_excerpt or ""),
            )
        ],
    }
    canonical = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def reference_windows(manifest: CareerImportManifest) -> list[dict[str, object]]:
    if manifest.scenario_anchors:
        return [
            {
                "unit_group_code": anchor.unit_group_code,
                "region": anchor.region,
                "moderate": anchor.moderate_period,
                "fast": anchor.fast_period,
                "available_periods": [anchor.moderate_period, anchor.fast_period],
                "selection": "fixed_product_anchors",
                "limitation": anchor.limitation,
            }
            for anchor in manifest.scenario_anchors
        ]
    groups: dict[tuple[str, str, str], set[str]] = defaultdict(set)
    for row in manifest.demand_quarters:
        if row.scenario_eligible:
            groups[(row.unit_group_code, row.region, row.measurement_series_id)].add(row.period)
    return [
        {
            "unit_group_code": group,
            "region": region,
            "measurement_series_id": series,
            "moderate": select_historical_reference(periods, speed_percent=0).selected_period,
            "fast": select_historical_reference(periods, speed_percent=100).selected_period,
            "available_periods": sorted(periods),
        }
        for (group, region, series), periods in sorted(groups.items())
    ]


def select_fixed_scenario(
    manifest: CareerImportManifest, *, unit_group_code: str, region: str, scenario: str,
) -> dict[str, object]:
    """Resolve the existing moderate/fast enum to a dated, sourced DOSM row."""

    if scenario not in {"moderate", "fast"}:
        raise ValueError("scenario must be moderate or fast")
    anchor = next(
        (item for item in manifest.scenario_anchors
         if item.unit_group_code == unit_group_code and item.region == region), None,
    )
    if anchor is None:
        raise ValueError("no fixed scenario anchors for this group and region")
    period = anchor.moderate_period if scenario == "moderate" else anchor.fast_period
    row = next(item for item in manifest.demand_quarters
               if item.unit_group_code == unit_group_code and item.region == region
               and item.period == period)
    source = next(item for item in manifest.sources if item.source_id == row.source_id)
    return {
        "scenario": scenario, "selected_period": period,
        "unit_group_code": unit_group_code, "region": region,
        "market_granularity": "masco_unit_group_4_digit",
        "job_offerings": row.job_offerings,
        "total_job_offerings": row.total_job_offerings,
        **market_signal_from_report_share(row.job_offerings, row.total_job_offerings),
        "measurement_series_id": row.measurement_series_id,
        "quality_status": row.quality_status,
        "source_id": source.source_id, "source_url": source.source_url,
        "published_at": source.published_at.isoformat() if source.published_at else None,
        "collected_at": source.collected_at.isoformat(),
        "limitation": f"{row.limitation} {anchor.limitation}",
    }


def select_market_observation(
    manifest: CareerImportManifest,
    *,
    unit_group_code: str,
    region: str,
    measurement_series_id: str,
    speed_percent: int,
    moderate_period: str | None = None,
    fast_period: str | None = None,
) -> dict[str, object]:
    """Return the actual DOSM row behind one slider position, with provenance."""

    rows = {
        row.period: row for row in manifest.demand_quarters
        if row.unit_group_code == unit_group_code and row.region == region
        and row.measurement_series_id == measurement_series_id and row.scenario_eligible
    }
    reference = select_historical_reference(
        rows, speed_percent=speed_percent,
        moderate_period=moderate_period, fast_period=fast_period,
    )
    row = rows[reference.selected_period]
    source = next(source for source in manifest.sources if source.source_id == row.source_id)
    return {
        "speed_percent": speed_percent,
        "selected_period": row.period,
        "moderate_period": reference.moderate_period,
        "fast_period": reference.fast_period,
        "unit_group_code": row.unit_group_code,
        "market_granularity": "masco_unit_group_4_digit",
        "region": row.region,
        "job_offerings": row.job_offerings,
        "total_job_offerings": row.total_job_offerings,
        **market_signal_from_report_share(row.job_offerings, row.total_job_offerings),
        "measurement_series_id": row.measurement_series_id,
        "quality_status": row.quality_status,
        "source_id": source.source_id,
        "source_url": source.source_url,
        "published_at": source.published_at.isoformat() if source.published_at else None,
        "collected_at": source.collected_at.isoformat(),
        "limitation": f"{row.limitation} {reference.limitation}",
    }


def assertion_id(row: SkillAssertion, catalogue_version: str) -> str:
    raw = json.dumps({"catalogue_version": catalogue_version, **row.model_dump(mode="json")}, sort_keys=True)
    return "assert_" + hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]


def apply_manifest(manifest: CareerImportManifest, database_url: str) -> dict[str, int]:
    """Apply one validated batch atomically to a migrated PostgreSQL Preview.

    Re-importing identical source IDs is safe. Changed source extractions must
    receive new IDs so a past source/snapshot cannot silently change meaning.
    """

    if any(row.is_active for row in manifest.occupations) or any(
        row.status == "active" for row in manifest.skill_assertions
    ):
        raise PreviewTargetError("Activation requires a separate reviewed release workflow")
    verify_preview_target(database_url)
    from psycopg import connect  # Optional batch-import dependency, not an API import.

    sources = {row.source_id: row for row in manifest.sources}
    try:
        connection = connect(database_url, connect_timeout=10, sslrootcert="system")
    except Exception:
        raise PreviewTargetError("Verified Preview database connection failed") from None
    with connection:
        verify_connected_preview(connection)
        with connection.cursor() as cursor:
            # Lock each observed quarter before reading it. PostgreSQL releases
            # these transaction locks at commit/rollback. Sorted keys prevent
            # opposite-order batches from deadlocking each other.
            for key in sorted({(row.unit_group_code, row.period, row.region)
                               for row in manifest.demand_quarters}):
                lock_id = int.from_bytes(
                    hashlib.sha256("\x1f".join(key).encode()).digest()[:8],
                    byteorder="big", signed=True,
                )
                cursor.execute("SELECT pg_advisory_xact_lock(%s)", (lock_id,))
            for row in manifest.sources:
                digest = extracted_hash(manifest, row.source_id)
                cursor.execute(
                    """SELECT extracted_content_sha256,provider,source_url,source_version,
                       published_at,collected_at,method_version
                       FROM futureproof.source_documents WHERE source_id=%s""",
                    (row.source_id,),
                )
                existing = cursor.fetchone()
                expected = (digest, row.provider, row.source_url, row.source_version,
                            row.published_at, row.collected_at, row.method_version)
                if existing and existing != expected:
                    raise ValueError(f"source_id {row.source_id} already has different provenance or content")
                cursor.execute(
                    """INSERT INTO futureproof.source_documents
                       (source_id,provider,source_url,source_version,published_at,
                        collected_at,extracted_content_sha256,method_version)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT (source_id) DO NOTHING""",
                    (row.source_id, row.provider, row.source_url, row.source_version,
                     row.published_at, row.collected_at, digest, row.method_version),
                )

            for row in manifest.skills:
                cursor.execute(
                    "SELECT name,category FROM futureproof.skills WHERE skill_id=%s",
                    (row.skill_id,),
                )
                existing = cursor.fetchone()
                if existing and existing != (row.name, row.category):
                    raise ValueError(f"skill_id {row.skill_id} conflicts with existing catalogue")
                cursor.execute(
                    """INSERT INTO futureproof.skills
                       (skill_id,name,category,aliases,catalogue_version,is_active)
                       VALUES (%s,%s,%s,%s,%s,FALSE) ON CONFLICT (skill_id) DO NOTHING""",
                    (row.skill_id, row.name, row.category, row.aliases, manifest.catalogue_version),
                )

            for row in manifest.occupations:
                if row.role_id:
                    cursor.execute(
                        """SELECT masco_code,field_id,name,summary,is_active
                           FROM futureproof.career_roles WHERE role_id=%s""",
                        (row.role_id,),
                    )
                    existing = cursor.fetchone()
                    expected = (row.masco_code, row.field_id, row.name,
                                row.description, row.is_active)
                    if existing and existing != expected:
                        raise ValueError(f"role_id {row.role_id} conflicts with existing catalogue")
                    cursor.execute(
                        """INSERT INTO futureproof.career_roles
                           (role_id,field_id,name,summary,aliases,interests,sdg_links,tasks,
                            catalogue_version,is_active,masco_code)
                           VALUES (%s,%s,%s,%s,'{}','{}','[]'::jsonb,%s::jsonb,%s,%s,%s)
                           ON CONFLICT (role_id) DO NOTHING""",
                        (row.role_id, row.field_id, row.name, row.description,
                         json.dumps(row.tasks, ensure_ascii=False), manifest.catalogue_version,
                         row.is_active, row.masco_code),
                    )

            for row in manifest.occupations:
                parent = row.masco_code[:4] if row.role_id else None
                cursor.execute(
                    "SELECT role_id,source_id FROM futureproof.masco_occupations WHERE masco_code=%s",
                    (row.masco_code,),
                )
                existing = cursor.fetchone()
                if existing and existing != (row.role_id, row.source_id):
                    raise ValueError(f"MASCO code {row.masco_code} already has a different source or role")
                cursor.execute(
                    """INSERT INTO futureproof.masco_occupations
                       (masco_code,parent_unit_group_code,role_id,name,description,tasks,
                        official_skill_text,source_id,source_url,is_active)
                       VALUES (%s,%s,%s,%s,%s,%s::jsonb,%s::jsonb,%s,%s,%s)
                       ON CONFLICT (masco_code) DO NOTHING""",
                    (row.masco_code, parent, row.role_id, row.name, row.description,
                     json.dumps(row.tasks, ensure_ascii=False),
                     json.dumps(row.official_skill_summary, ensure_ascii=False),
                     row.source_id, row.source_url, row.is_active),
                )

            for row in manifest.demand_quarters:
                cursor.execute(
                    """SELECT DISTINCT job_offerings,total_job_offerings,measurement_series_id
                       FROM futureproof.dosm_demand_quarters
                       WHERE unit_group_code=%s AND period=%s AND region=%s""",
                    (row.unit_group_code, row.period, row.region),
                )
                observed = {tuple(item) for item in cursor.fetchall()}
                expected = (row.job_offerings, row.total_job_offerings,
                            row.measurement_series_id)
                if observed and observed != {expected}:
                    raise ValueError("conflicting DOSM observations need an explicit reconciliation")
                cursor.execute(
                    """INSERT INTO futureproof.dosm_demand_quarters
                       (unit_group_code,period,region,job_offerings,total_job_offerings,measurement_series_id,
                        quality_status,scenario_eligible,source_id,source_row,limitation)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                       ON CONFLICT (unit_group_code,period,region,source_id) DO NOTHING""",
                    (row.unit_group_code, row.period, row.region, row.job_offerings,
                     row.total_job_offerings,
                     row.measurement_series_id, row.quality_status, row.scenario_eligible,
                     row.source_id, row.source_row, row.limitation),
                )

            demand_lookup = {
                (row.unit_group_code, row.region, row.period): row
                for row in manifest.demand_quarters
            }
            for anchor in manifest.scenario_anchors:
                moderate = demand_lookup[(anchor.unit_group_code, anchor.region, anchor.moderate_period)]
                fast = demand_lookup[(anchor.unit_group_code, anchor.region, anchor.fast_period)]
                cursor.execute(
                    """SELECT moderate_period,moderate_source_id,fast_period,fast_source_id,
                       rationale,limitation FROM futureproof.scenario_reference_anchors
                       WHERE catalogue_version=%s AND unit_group_code=%s AND region=%s""",
                    (manifest.catalogue_version, anchor.unit_group_code, anchor.region),
                )
                expected = (anchor.moderate_period, moderate.source_id, anchor.fast_period,
                            fast.source_id, anchor.rationale, anchor.limitation)
                existing = cursor.fetchone()
                if existing and existing != expected:
                    raise ValueError("scenario anchor version conflicts with existing configuration")
                cursor.execute(
                    """INSERT INTO futureproof.scenario_reference_anchors
                       (catalogue_version,unit_group_code,region,moderate_period,
                        moderate_source_id,fast_period,fast_source_id,rationale,limitation)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                       ON CONFLICT (catalogue_version,unit_group_code,region) DO NOTHING""",
                    (manifest.catalogue_version, anchor.unit_group_code, anchor.region,
                     *expected),
                )

            for row in manifest.skill_assertions:
                item_id = assertion_id(row, manifest.catalogue_version)
                cursor.execute(
                    """INSERT INTO futureproof.role_skill_assertions
                       (assertion_id,role_id,skill_id,origin,source_id,source_excerpt,
                        model_version,prompt_version,generated_at,target_level,
                        target_level_origin,importance,status)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                       ON CONFLICT (assertion_id) DO NOTHING""",
                    (item_id, row.role_id, row.skill_id, row.origin, row.source_id,
                     row.source_excerpt, row.model_version, row.prompt_version,
                     row.generated_at, row.target_level, row.target_level_origin,
                     row.importance, row.status),
                )
                if row.status == "active":
                    cursor.execute(
                        "SELECT target_level,importance FROM futureproof.role_skills WHERE role_id=%s AND skill_id=%s",
                        (row.role_id, row.skill_id),
                    )
                    existing = cursor.fetchone()
                    if existing and existing != (row.target_level, row.importance):
                        raise ValueError("active role-skill requirement conflicts with catalogue projection")
                    cursor.execute(
                        """INSERT INTO futureproof.role_skills
                           (role_id,skill_id,target_level,importance) VALUES (%s,%s,%s,%s)
                           ON CONFLICT (role_id,skill_id) DO NOTHING""",
                        (row.role_id, row.skill_id, row.target_level, row.importance),
                    )

    return {
        "sources": len(sources), "skills": len(manifest.skills),
        "occupations": len(manifest.occupations), "demand_quarters": len(manifest.demand_quarters),
        "scenario_anchors": len(manifest.scenario_anchors),
        "skill_assertions": len(manifest.skill_assertions),
    }
