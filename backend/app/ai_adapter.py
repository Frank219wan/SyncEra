"""Internal AI handoff for the existing /api/v1 service.

A configured Python module must export create_adapter() returning an object with
extract_profile(text, questionnaire) and score_roles(profile, trend_package, scenario).
The remaining conceptual teammate functions are documented in AI_BACKEND_HANDOFF.md;
they are not claimed to be connected. The default DemoAdapter is a labelled fallback.
"""
from __future__ import annotations
import importlib
import os
from typing import Protocol, Any
from .models import Profile, TrendPackage

class AIAdapter(Protocol):
    is_mock: bool
    def extract_profile(self, text: str | None, questionnaire: dict | None) -> dict[str,Any]: ...
    def score_roles(self, profile: Profile, trend_package: TrendPackage, scenario: str) -> list[dict[str,Any]]: ...

class AIAdapterConfigurationError(RuntimeError):
    pass

def load_ai_adapter(module_path: str | None = None) -> AIAdapter:
    module_path = module_path or os.getenv('AI_ADAPTER_MODULE')
    if not module_path:
        return DemoAdapter()
    try:
        module = importlib.import_module(module_path)
        factory = getattr(module,'create_adapter')
        adapter = factory()
        if not callable(getattr(adapter,'extract_profile',None)) or not callable(getattr(adapter,'score_roles',None)):
            raise TypeError('required adapter methods missing')
        if not isinstance(getattr(adapter,'is_mock',None),bool):
            raise TypeError('is_mock provenance flag missing')
        return adapter
    except Exception as exc:
        raise AIAdapterConfigurationError(f'AI_ADAPTER_MODULE {module_path!r} could not be loaded or validated') from exc

class DemoAdapter:
    """Transparent rule-only demo fallback; no LLM or live retrieval."""
    is_mock=True
    def extract_profile(self, text, questionnaire):
        from .catalogue import SKILLS
        raw = (text or '') + ' ' + str(questionnaire or '')
        found=[]
        explicit = questionnaire.get('skills', []) if isinstance(questionnaire, dict) else []
        for item in explicit:
            if isinstance(item, dict) and item.get('skill_id') in SKILLS:
                found.append({'skill_id': item['skill_id'], 'level': item.get('level'), 'source': 'declared', 'confidence': 1.0})
        explicit_ids = {item['skill_id'] for item in found}
        for skill in SKILLS.values():
            if skill.skill_id not in explicit_ids and any(alias.lower() in raw.lower() for alias in skill.aliases):
                found.append({'skill_id':skill.skill_id,'level':None,'source':'inferred','confidence':0.6})
        return {'skills':found,'interests':questionnaire.get('interests',[]) if questionnaire else [],'current_occupation':questionnaire.get('current_occupation') if questionnaire else None,'unrecognized_skill_terms':[],'warnings':['Rule-only extraction; review every skill and level.']}
