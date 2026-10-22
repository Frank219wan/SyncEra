"""Database teammates can plug in repositories without changing API routes."""

from __future__ import annotations

import sys
from types import ModuleType

import pytest

from app.repository_ports import (
    RepositoryConfigurationError,
    load_market_repository,
    load_profile_repository,
    load_resource_repository,
)


class ProfileFixture:
    def save_new(self, profile):
        return None

    def get(self, profile_id):
        return None

    def update(self, profile, expected_revision):
        return False


class MarketFixture:
    def validate_active(self):
        return None

    def get_snapshot(self, snapshot_id=None):
        return None

    def get_evidence(self, evidence_id):
        return None


class ResourceFixture:
    def has_approved_data(self):
        return False

    def select(self, skill_id, language, currency, budget):
        return None


def test_repository_module_contract(monkeypatch):
    module = ModuleType('tests.fixture_repositories')
    module.create_profile_repository = ProfileFixture
    module.create_market_repository = MarketFixture
    module.create_resource_repository = ResourceFixture
    monkeypatch.setitem(sys.modules, module.__name__, module)

    assert isinstance(load_profile_repository(module.__name__), ProfileFixture)
    assert isinstance(load_market_repository(module.__name__), MarketFixture)
    assert isinstance(load_resource_repository(module.__name__), ResourceFixture)


def test_configured_repository_never_silently_falls_back(monkeypatch):
    module = ModuleType('tests.invalid_repository')
    module.create_market_repository = lambda: object()
    monkeypatch.setitem(sys.modules, module.__name__, module)

    with pytest.raises(RepositoryConfigurationError):
        load_market_repository(module.__name__)
