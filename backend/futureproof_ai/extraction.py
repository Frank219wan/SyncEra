"""Conservative profile extraction for the Phase-1 Individual flow."""

from __future__ import annotations

import re
from typing import Any

from app.catalogue import SKILLS


def _contains_term(text: str, term: str) -> bool:
    pattern = rf"(?<![\w]){re.escape(term)}(?![\w])"
    return re.search(pattern, text, flags=re.IGNORECASE) is not None


def _clean_strings(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    output: list[str] = []
    seen: set[str] = set()
    for item in value:
        if not isinstance(item, str):
            continue
        cleaned = item.strip()
        key = cleaned.casefold()
        if cleaned and key not in seen:
            seen.add(key)
            output.append(cleaned)
    return output


def extract_profile(
    text: str | None,
    questionnaire: dict[str, Any] | None,
) -> dict[str, Any]:
    """Extract catalogue-backed profile fields without inventing levels.

    Explicit questionnaire skills are ``declared`` with confidence 1.0. A
    catalogue alias found in free text is ``inferred`` with a null level and
    confidence 0.85, so the existing confirmation API remains the authority
    for proficiency.
    """

    form = questionnaire if isinstance(questionnaire, dict) else {}
    extracted: list[dict[str, Any]] = []
    unknown: list[str] = []
    explicit_ids: set[str] = set()

    raw_skills = form.get("skills", [])
    if isinstance(raw_skills, list):
        for item in raw_skills:
            if not isinstance(item, dict):
                unknown.append(str(item))
                continue
            skill_id = item.get("skill_id")
            if not isinstance(skill_id, str) or skill_id not in SKILLS:
                unknown.append(str(skill_id))
                continue
            if skill_id in explicit_ids:
                continue
            level = item.get("level")
            if isinstance(level, bool) or not isinstance(level, int) or not 0 <= level <= 5:
                level = None
            explicit_ids.add(skill_id)
            extracted.append(
                {
                    "skill_id": skill_id,
                    "level": level,
                    "source": "declared",
                    "confidence": 1.0,
                }
            )

    source_text = text or ""
    for skill in SKILLS.values():
        if skill.skill_id in explicit_ids:
            continue
        terms = [skill.name, *skill.aliases]
        if any(_contains_term(source_text, term) for term in terms):
            extracted.append(
                {
                    "skill_id": skill.skill_id,
                    "level": None,
                    "source": "inferred",
                    "confidence": 0.85,
                }
            )

    occupation = form.get("current_occupation")
    if not isinstance(occupation, str) or not occupation.strip():
        occupation = None
    else:
        occupation = occupation.strip()

    warnings = [
        "Deterministic catalogue extraction; the user must confirm every skill and proficiency level.",
    ]
    if text and not extracted:
        warnings.append("No API Contract v1.0 catalogue skill alias was recognized in the supplied text.")

    return {
        "skills": extracted,
        "interests": _clean_strings(form.get("interests", [])),
        "current_occupation": occupation,
        "unrecognized_skill_terms": _clean_strings(unknown),
        "warnings": warnings,
    }
