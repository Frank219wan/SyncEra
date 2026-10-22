"""Pluggable persistence boundaries for SQLite, PostgreSQL, and Neon.

Database implementations may live on another branch or in another module.  The
FastAPI application depends only on these small business interfaces, and loads
an implementation through an explicit server-side module setting.
"""

from __future__ import annotations

import importlib
import os
from typing import Any, Protocol

from .models import Evidence, Profile, Resource


class ProfileRepository(Protocol):
    def save_new(self, profile: Profile) -> None: ...

    def get(self, profile_id: str) -> Profile | None: ...

    def update(self, profile: Profile, expected_revision: int) -> bool: ...


class MarketSnapshotRepository(Protocol):
    def validate_active(self) -> None: ...

    def get_snapshot(self, snapshot_id: str | None = None) -> Any | None: ...

    def get_evidence(self, evidence_id: str) -> Evidence | None: ...


class LearningResourceRepository(Protocol):
    def has_approved_data(self) -> bool: ...

    def select(
        self,
        skill_id: str,
        language: str,
        currency: str,
        budget: float,
    ) -> Resource | None: ...


class RepositoryConfigurationError(RuntimeError):
    """Raised at startup when an explicitly configured repository is invalid."""


def _configured_module(explicit: str | None, environment_name: str) -> str | None:
    value = explicit if explicit is not None else os.getenv(environment_name)
    return value.strip() if value and value.strip() else None


def _load_factory(module_path: str, factory_name: str, methods: tuple[str, ...]) -> Any:
    try:
        module = importlib.import_module(module_path)
        factory = getattr(module, factory_name)
        repository = factory()
        missing = [name for name in methods if not callable(getattr(repository, name, None))]
        if missing:
            raise TypeError(f"repository methods missing: {', '.join(missing)}")
        return repository
    except Exception as exc:
        raise RepositoryConfigurationError(
            f"Repository module {module_path!r} could not provide {factory_name}()"
        ) from exc


def load_profile_repository(module_path: str | None = None) -> ProfileRepository:
    configured = _configured_module(module_path, "PROFILE_REPOSITORY_MODULE")
    if configured:
        return _load_factory(configured, "create_profile_repository", ("save_new", "get", "update"))
    from .storage import ProfileStore

    return ProfileStore()


def load_market_repository(module_path: str | None = None) -> MarketSnapshotRepository:
    configured = _configured_module(module_path, "MARKET_REPOSITORY_MODULE")
    if configured:
        return _load_factory(
            configured,
            "create_market_repository",
            ("validate_active", "get_snapshot", "get_evidence"),
        )
    from .approved_data import MarketRepository

    return MarketRepository()


def load_resource_repository(module_path: str | None = None) -> LearningResourceRepository:
    configured = _configured_module(module_path, "RESOURCE_REPOSITORY_MODULE")
    if configured:
        return _load_factory(
            configured,
            "create_resource_repository",
            ("has_approved_data", "select"),
        )
    from .approved_data import ResourceRepository

    return ResourceRepository()
