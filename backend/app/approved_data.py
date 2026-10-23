"""Server-side import boundary for reviewed market evidence and learning links.

No public HTTP route writes this store. A separate reviewer-owned approval manifest must
match every original URL exactly; a structurally valid payload alone cannot be public.
"""
from __future__ import annotations
import ipaddress
import json
import os
import re
from dataclasses import dataclass, field
from datetime import date, datetime, timezone, timedelta
from pathlib import Path
from urllib.parse import urlparse
from pydantic import BaseModel, ConfigDict, Field, model_validator
from .models import Evidence, Resource
from .catalogue import ACTIVE_SNAPSHOT, EVIDENCE, ROLES, SKILLS, SNAPSHOTS

class ImportRejected(ValueError):
    pass

class Strict(BaseModel):
    model_config = ConfigDict(extra='forbid')

ID_RE = re.compile(r'^[A-Za-z0-9_-]{1,128}$')

class SourceApproval(Strict):
    evidence_id: str
    source_url: str
    reviewed_by: str = Field(min_length=1)
    reviewed_at: datetime

class ResourceApproval(Strict):
    resource_id: str
    url: str
    reviewed_by: str = Field(min_length=1)
    reviewed_at: datetime

class PublicRoleSignal(Strict):
    role_id: str
    trend_score: float | None = Field(default=None, ge=0, le=100)
    signal_label: str = 'current_snapshot'
    evidence_ids: list[str] = Field(min_length=1)
    observed_metrics: dict[str, int | float | None] = Field(default_factory=dict)
    score_basis: str = Field(min_length=10)

class PublicSkillSignal(Strict):
    skill_id: str
    trend_score: float | None = Field(default=None, ge=0, le=100)
    signal_label: str = 'current_snapshot'
    evidence_ids: list[str] = Field(min_length=1)
    observed_metrics: dict[str, int | float | None] = Field(default_factory=dict)
    score_basis: str = Field(min_length=10)

class PublicSnapshotPackage(Strict):
    snapshot_id: str = Field(min_length=1)
    region: str
    window_start: date
    window_end: date
    collected_at: datetime
    method_version: str = Field(min_length=1)
    data_label: str
    evidence: list[Evidence] = Field(min_length=1)
    role_signals: list[PublicRoleSignal] = Field(min_length=1)
    skill_signals: list[PublicSkillSignal] = Field(min_length=1)
    scenario_assumptions: dict[str, dict[str, float]]
    assumption_basis: str = Field(min_length=10)
    uncertainty: str = Field(min_length=10)
    @model_validator(mode='after')
    def dates(self):
        if self.window_start > self.window_end or self.window_end > self.collected_at.date():
            raise ValueError('observation window is inconsistent with collection time')
        if self.collected_at.tzinfo is None:
            raise ValueError('collected_at must be timezone-aware')
        return self

class ApprovedResourceEntry(Strict):
    resource: Resource
    skill_ids: list[str] = Field(min_length=1)

@dataclass(frozen=True)
class MarketSnapshot:
    snapshot_id: str
    region: str
    window_start: str
    window_end: str
    collected_at: datetime
    method_version: str
    evidence_ids: list[str]
    role_scores: dict[str, float | None]
    skill_scores: dict[str, float | None]
    scenario_assumptions: dict[str, dict[str, float]]
    uncertainty: str
    data_label: str
    is_mock: bool
    evidence: dict[str, Evidence]
    role_evidence_ids: dict[str, list[str]]
    skill_evidence_ids: dict[str, list[str]]
    role_metrics: dict[str, dict] = field(default_factory=dict)
    skill_metrics: dict[str, dict] = field(default_factory=dict)
    role_labels: dict[str, str] = field(default_factory=dict)
    skill_labels: dict[str, str] = field(default_factory=dict)
    role_score_basis: dict[str, str] = field(default_factory=dict)
    skill_score_basis: dict[str, str] = field(default_factory=dict)
    size_basis: str = 'equal_area_no_verified_demand'


def _public_https_url(value: str | None) -> bool:
    if not value or any(c.isspace() for c in value): return False
    u = urlparse(value)
    if u.scheme != 'https' or not u.hostname or u.username or u.password or u.fragment:
        return False
    host = u.hostname.lower()
    if host == 'localhost' or host.endswith(('.local', '.internal', '.test', '.example')):
        return False
    try:
        ip = ipaddress.ip_address(host)
        if not ip.is_global: return False
    except ValueError:
        if '.' not in host: return False
    return True


def _unique(values):
    return len(values) == len(set(values))

class MarketRepository:
    def __init__(self, active_snapshot_id: str | None = None):
        self.snapshots: dict[str, MarketSnapshot] = {}
        self.evidence: dict[str, Evidence] = dict(EVIDENCE)
        for source in SNAPSHOTS.values():
            self.snapshots[source.snapshot_id] = MarketSnapshot(
                snapshot_id=source.snapshot_id,region=source.region,window_start=source.window_start,
                window_end=source.window_end,collected_at=source.collected_at,method_version=source.method_version,
                evidence_ids=source.evidence_ids,role_scores=source.role_scores,skill_scores=source.skill_scores,
                scenario_assumptions=source.scenario_assumptions,uncertainty=source.uncertainty,
                data_label='synthetic_demo',is_mock=True,evidence={i:EVIDENCE[i] for i in source.evidence_ids},
                role_evidence_ids={i:ROLES[i].evidence_ids for i in source.role_scores},
                skill_evidence_ids={i:source.evidence_ids for i in source.skill_scores})
        self.active_snapshot_id = active_snapshot_id or os.getenv('ACTIVE_SNAPSHOT_ID') or ACTIVE_SNAPSHOT

    def validate_active(self):
        if self.active_snapshot_id not in self.snapshots:
            raise ImportRejected('ACTIVE_SNAPSHOT_ID is not a loaded approved snapshot')

    def get_snapshot(self, snapshot_id: str | None = None):
        return self.snapshots.get(snapshot_id or self.active_snapshot_id)

    def get_evidence(self, evidence_id: str):
        return self.evidence.get(evidence_id)

    def import_public(self, raw: dict, raw_approvals: list[dict]):
        """Validate and stage one reviewed package. No activation or HTTP publication occurs here."""
        try:
            package = PublicSnapshotPackage.model_validate(raw)
            approvals = [SourceApproval.model_validate(a) for a in raw_approvals]
        except Exception as exc:
            raise ImportRejected(f'invalid package schema: {exc}') from exc
        if not ID_RE.fullmatch(package.snapshot_id):
            raise ImportRejected('snapshot_id must be a stable opaque identifier')
        if package.collected_at > datetime.now(timezone.utc) + timedelta(minutes=5):
            raise ImportRejected('collection timestamp cannot be in the future')
        if package.data_label != 'public_open' or package.region != 'MY':
            raise ImportRejected('public import must declare public_open and MY')
        if package.snapshot_id in self.snapshots:
            raise ImportRejected('snapshot_id already exists')
        evidence_ids = [e.evidence_id for e in package.evidence]
        if any(not ID_RE.fullmatch(eid) for eid in evidence_ids):
            raise ImportRejected('evidence_id must be a stable opaque identifier')
        if not _unique(evidence_ids) or set(evidence_ids) & set(self.evidence):
            raise ImportRejected('duplicate or conflicting evidence_id')
        approval_map = {a.evidence_id:a for a in approvals}
        if not _unique([a.evidence_id for a in approvals]) or set(approval_map) != set(evidence_ids):
            raise ImportRejected('approval manifest must match every evidence_id exactly')
        for evidence in package.evidence:
            approval = approval_map[evidence.evidence_id]
            if not _public_https_url(evidence.source_url) or approval.source_url != evidence.source_url:
                raise ImportRejected('source URL missing, unsafe or not exactly approved')
            if evidence.region != package.region or evidence.retrieved_at.tzinfo is None:
                raise ImportRejected('evidence region or retrieval timestamp invalid')
            if evidence.retrieved_at > package.collected_at or evidence.retrieved_at > datetime.now(timezone.utc) + timedelta(minutes=5):
                raise ImportRejected('retrieval must precede snapshot collection')
            try:
                source_date=date.fromisoformat(evidence.published_or_collected_at)
            except ValueError as exc:
                raise ImportRejected('evidence source date must be ISO 8601') from exc
            if source_date > evidence.retrieved_at.date():
                raise ImportRejected('evidence source date is after retrieval')
            if approval.reviewed_at.tzinfo is None or approval.reviewed_at < evidence.retrieved_at or approval.reviewed_at > datetime.now(timezone.utc) + timedelta(minutes=5):
                raise ImportRejected('approval must follow retrieval, be current, and use a timezone')
        roles = [s.role_id for s in package.role_signals]
        skills = [s.skill_id for s in package.skill_signals]
        if not _unique(roles) or not _unique(skills) or set(roles) - set(ROLES) or set(skills) - set(SKILLS):
            raise ImportRejected('role or skill mapping is not catalogue-valid and unique')
        used_evidence=set()
        for signal in [*package.role_signals,*package.skill_signals]:
            used_evidence.update(signal.evidence_ids)
            if signal.signal_label not in ('current_snapshot','insufficient_evidence'):
                raise ImportRejected('historical movement requires a validated comparable snapshot')
            if not _unique(signal.evidence_ids) or not set(signal.evidence_ids) <= set(evidence_ids):
                raise ImportRejected('signal evidence references are invalid')
            if any(v is not None and v < 0 for v in signal.observed_metrics.values()):
                raise ImportRejected('observed metrics cannot be negative')
        if used_evidence != set(evidence_ids):
            raise ImportRejected('every approved evidence record must support a signal')
        for signal in package.role_signals:
            if set(signal.observed_metrics) - {'valid_postings','delta_percent'} or signal.observed_metrics.get('delta_percent') is not None:
                raise ImportRejected('role metrics unsupported or historical comparator absent')
            postings=signal.observed_metrics.get('valid_postings')
            if postings is not None and (isinstance(postings,bool) or not isinstance(postings,int)):
                raise ImportRejected('valid_postings must be an integer')
        for signal in package.skill_signals:
            if set(signal.observed_metrics) - {'mention_rate','change_pp','coverage'} or signal.observed_metrics.get('change_pp') is not None:
                raise ImportRejected('skill metrics unsupported or historical comparator absent')
        if not any(x.trend_score is not None for x in package.role_signals) or not any(x.trend_score is not None for x in package.skill_signals):
            raise ImportRejected('public snapshot needs at least one scored role and skill signal')
        if set(package.scenario_assumptions) != {'moderate','fast'}:
            raise ImportRejected('moderate and fast assumptions are required')
        for assumptions in package.scenario_assumptions.values():
            if set(assumptions) != set(roles) or any(not .5 <= x <= 1.5 for x in assumptions.values()):
                raise ImportRejected('scenario assumptions must cover roles with bounded multipliers')
        snap = MarketSnapshot(
            snapshot_id=package.snapshot_id,region=package.region,window_start=package.window_start.isoformat(),
            window_end=package.window_end.isoformat(),collected_at=package.collected_at,
            method_version=package.method_version,evidence_ids=evidence_ids,
            role_scores={s.role_id:s.trend_score for s in package.role_signals},
            skill_scores={s.skill_id:s.trend_score for s in package.skill_signals},
            scenario_assumptions=package.scenario_assumptions,uncertainty=package.uncertainty,
            data_label='public_open',is_mock=False,evidence={e.evidence_id:e for e in package.evidence},
            role_evidence_ids={s.role_id:s.evidence_ids for s in package.role_signals},
            skill_evidence_ids={s.skill_id:s.evidence_ids for s in package.skill_signals},
            role_metrics={s.role_id:s.observed_metrics for s in package.role_signals},
            skill_metrics={s.skill_id:s.observed_metrics for s in package.skill_signals},
            role_labels={s.role_id:s.signal_label for s in package.role_signals},
            skill_labels={s.skill_id:s.signal_label for s in package.skill_signals},
            role_score_basis={s.role_id:s.score_basis for s in package.role_signals},
            skill_score_basis={s.skill_id:s.score_basis for s in package.skill_signals},
            size_basis='equal_area_no_comparable_verified_volume')
        self.snapshots[snap.snapshot_id] = snap
        self.evidence.update(snap.evidence)
        return snap

    def load_dir(self, root: str | Path):
        root = Path(root)
        if not root.exists(): return
        for path in sorted((root/'snapshots').glob('*.json')):
            approval_path = root/'approvals'/path.name
            if not approval_path.exists(): raise ImportRejected(f'missing approval manifest for {path.name}')
            self.import_public(json.loads(path.read_text()),json.loads(approval_path.read_text()))

class ResourceRepository:
    def __init__(self):
        self.entries: dict[str, ApprovedResourceEntry] = {}

    def import_approved(self, raw_entries: list[dict], raw_approvals: list[dict]):
        try:
            entries=[ApprovedResourceEntry.model_validate(e) for e in raw_entries]
            approvals=[ResourceApproval.model_validate(a) for a in raw_approvals]
        except Exception as exc:
            raise ImportRejected(f'invalid resource schema: {exc}') from exc
        ids=[e.resource.resource_id for e in entries]
        if any(not ID_RE.fullmatch(rid) for rid in ids):
            raise ImportRejected('resource_id must be a stable opaque identifier')
        approval_map={a.resource_id:a for a in approvals}
        if not _unique(ids) or not _unique([a.resource_id for a in approvals]) or set(ids)!=set(approval_map):
            raise ImportRejected('resource approvals must match every resource_id exactly')
        pending={}
        for entry in entries:
            resource=entry.resource
            approval=approval_map[resource.resource_id]
            if resource.resource_id in self.entries or not _unique(entry.skill_ids) or not set(entry.skill_ids)<=set(SKILLS):
                raise ImportRejected('resource ID or skill mapping invalid')
            if not _public_https_url(resource.url) or approval.url != resource.url:
                raise ImportRejected('resource URL missing, unsafe or not exactly approved')
            if resource.verified_at.tzinfo is None or approval.reviewed_at.tzinfo is None or approval.reviewed_at < resource.verified_at or approval.reviewed_at > datetime.now(timezone.utc) + timedelta(minutes=5):
                raise ImportRejected('resource verification/approval timestamps invalid')
            pending[resource.resource_id]=entry
        self.entries.update(pending)

    def load_dir(self, root: str | Path):
        root=Path(root)
        resources=root/'resources.json'; approvals=root/'resource_approvals.json'
        if resources.exists() != approvals.exists(): raise ImportRejected('resource approval pair incomplete')
        if resources.exists(): self.import_approved(json.loads(resources.read_text()),json.loads(approvals.read_text()))

    def has_approved_data(self) -> bool:
        return bool(self.entries)

    def select(self, skill_id: str, language: str, currency: str, budget: float):
        options=[entry.resource for entry in self.entries.values() if skill_id in entry.skill_ids and entry.resource.language==language and entry.resource.currency==currency and entry.resource.cost_amount<=budget]
        return sorted(options,key=lambda r:(r.cost_amount,r.resource_id))[0] if options else None
