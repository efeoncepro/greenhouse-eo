#!/usr/bin/env python3
"""Deterministic integrity and freshness checks for software-architect-2026."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path


SKILL_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = SKILL_ROOT.parents[2]
CATALOG = SKILL_ROOT / "references" / "source-catalog.json"
EVALS = REPO_ROOT / "evals" / "software-architect-2026" / "scenarios.json"

REQUIRED_SOURCE_FIELDS = {
    "id",
    "title",
    "publisher",
    "url",
    "authority",
    "topics",
    "license",
    "content_class",
    "volatility",
    "version",
    "status",
    "last_verified",
    "review_by",
    "owner",
}

BANNED_PATTERNS = {
    "legacy DORA four-metric model": re.compile(r"DORA.{0,100}(four|4) metrics", re.I | re.S),
    "private reasoning capture": re.compile(r"reasoning chain captured", re.I),
    "MCP as unconditional infrastructure": re.compile(r"MCP is infrastructure-critical", re.I),
    "evals replacing deterministic tests": re.compile(r"evals replace tests", re.I),
    "legacy Greenhouse task template": re.compile(r"TASK_TEMPLATE_v2", re.I),
    "nonexistent Greenhouse constitution": re.compile(r"CONSTITUTION\.md", re.I),
    "invented Greenhouse RLS setting": re.compile(r"current_setting\(['\"]app\.current_tenant", re.I),
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--network", action="store_true", help="also verify source URLs")
    return parser.parse_args()


def load_json(path: Path, errors: list[str]) -> object:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        errors.append(f"invalid JSON {path.relative_to(REPO_ROOT)}: {exc}")
        return {}


def validate_frontmatter(errors: list[str]) -> None:
    path = SKILL_ROOT / "SKILL.md"
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        errors.append("SKILL.md must start with YAML frontmatter")
        return
    try:
        frontmatter = text.split("---\n", 2)[1]
    except IndexError:
        errors.append("SKILL.md frontmatter is not closed")
        return
    keys = {
        line.split(":", 1)[0].strip()
        for line in frontmatter.splitlines()
        if line.strip() and not line.lstrip().startswith("#") and ":" in line
    }
    if keys != {"name", "description"}:
        errors.append(f"SKILL.md frontmatter keys must be name+description only; found {sorted(keys)}")
    if "name: software-architect-2026" not in frontmatter:
        errors.append("SKILL.md name must match its folder")
    line_count = len(text.splitlines())
    word_count = len(re.findall(r"\b\w+\b", text))
    if line_count > 500:
        errors.append(f"SKILL.md exceeds 500 lines ({line_count})")
    if word_count > 5000:
        errors.append(f"SKILL.md exceeds 5,000 words ({word_count})")


def validate_local_links(errors: list[str]) -> None:
    link_pattern = re.compile(r"\[[^\]]*\]\(([^)]+)\)")
    for path in SKILL_ROOT.rglob("*.md"):
        text = path.read_text(encoding="utf-8")
        for raw_target in link_pattern.findall(text):
            target = raw_target.strip().split("#", 1)[0]
            if not target or target.startswith(("http://", "https://", "mailto:", "/")):
                continue
            resolved = (path.parent / target).resolve()
            if not resolved.exists():
                errors.append(
                    f"broken local link in {path.relative_to(REPO_ROOT)}: {raw_target}"
                )


def validate_sources(network: bool, errors: list[str], warnings: list[str]) -> None:
    data = load_json(CATALOG, errors)
    if not isinstance(data, dict) or not isinstance(data.get("sources"), list):
        errors.append("source-catalog.json must contain a sources array")
        return
    today = dt.date.today()
    seen: set[str] = set()
    for index, source in enumerate(data["sources"]):
        if not isinstance(source, dict):
            errors.append(f"source entry {index} must be an object")
            continue
        missing = REQUIRED_SOURCE_FIELDS - source.keys()
        if missing:
            errors.append(f"source entry {index} missing {sorted(missing)}")
            continue
        source_id = str(source["id"])
        if source_id in seen:
            errors.append(f"duplicate source id {source_id}")
        seen.add(source_id)
        if not str(source["url"]).startswith("https://"):
            errors.append(f"source {source_id} must use https")
        if source["status"] not in {"current", "review_due", "deprecated", "superseded"}:
            errors.append(f"source {source_id} has invalid status {source['status']}")
        try:
            verified = dt.date.fromisoformat(str(source["last_verified"]))
            review_by = dt.date.fromisoformat(str(source["review_by"]))
            if review_by < verified:
                errors.append(f"source {source_id} review_by predates last_verified")
            if review_by < today and source["status"] == "current":
                errors.append(f"source {source_id} is overdue since {review_by}")
        except ValueError:
            errors.append(f"source {source_id} has invalid ISO date")
        if network:
            request = urllib.request.Request(
                str(source["url"]),
                headers={"User-Agent": "greenhouse-architecture-skill-validator/1.0"},
                method="HEAD",
            )
            try:
                with urllib.request.urlopen(request, timeout=8) as response:
                    if response.status >= 400:
                        errors.append(f"source {source_id} returned HTTP {response.status}")
            except urllib.error.HTTPError as exc:
                if exc.code in {403, 405, 429}:
                    warnings.append(f"source {source_id} could not be HEAD-checked: HTTP {exc.code}")
                else:
                    errors.append(f"source {source_id} returned HTTP {exc.code}")
            except (urllib.error.URLError, TimeoutError) as exc:
                warnings.append(f"source {source_id} network check inconclusive: {exc}")


def validate_content(errors: list[str], warnings: list[str]) -> None:
    markdown_paths = list(SKILL_ROOT.rglob("*.md"))
    corpus = "\n".join(path.read_text(encoding="utf-8") for path in markdown_paths)
    for label, pattern in BANNED_PATTERNS.items():
        if pattern.search(corpus):
            errors.append(f"banned stale guidance detected: {label}")
    for path in (SKILL_ROOT / "references").glob("*.md"):
        lines = path.read_text(encoding="utf-8").splitlines()
        if len(lines) > 100:
            first_50 = "\n".join(lines[:50]).lower()
            if not any(
                heading in first_50
                for heading in ("## contents", "## table of contents", "## contenido")
            ):
                warnings.append(f"long reference has no early contents section: {path.relative_to(REPO_ROOT)}")
    if not (SKILL_ROOT / "agents" / "openai.yaml").exists():
        errors.append("agents/openai.yaml is missing")


def validate_evals(errors: list[str]) -> None:
    data = load_json(EVALS, errors)
    if not isinstance(data, dict):
        errors.append("evaluation scenarios root must be an object")
        return
    scenarios = data.get("scenarios")
    if not isinstance(scenarios, list) or len(scenarios) != 16:
        errors.append("evaluation suite must contain exactly 16 scenarios")
        return
    ids = [scenario.get("id") for scenario in scenarios if isinstance(scenario, dict)]
    if len(set(ids)) != 16:
        errors.append("evaluation scenario IDs must be unique")
    required = {
        "id",
        "title",
        "mode",
        "prompt",
        "criteria",
        "critical",
        "hardFailOnAnyCriticalCriterion",
        "thresholds",
    }
    for scenario in scenarios:
        if not isinstance(scenario, dict):
            errors.append("every evaluation scenario must be an object")
            continue
        missing = required - scenario.keys()
        if missing:
            errors.append(f"scenario {scenario.get('id', '<unknown>')} missing {sorted(missing)}")
        if not isinstance(scenario.get("criteria"), list) or len(scenario.get("criteria", [])) < 3:
            errors.append(f"scenario {scenario.get('id', '<unknown>')} needs at least three binary criteria")
        if scenario.get("hardFailOnAnyCriticalCriterion") is not True:
            errors.append(f"scenario {scenario.get('id', '<unknown>')} must hard-fail critical criteria")
        for criterion in scenario.get("criteria", []):
            if not isinstance(criterion, dict) or set(criterion) != {"id", "description", "critical"}:
                errors.append(f"scenario {scenario.get('id', '<unknown>')} has invalid criterion schema")


def main() -> int:
    args = parse_args()
    errors: list[str] = []
    warnings: list[str] = []
    validate_frontmatter(errors)
    validate_local_links(errors)
    validate_sources(args.network, errors, warnings)
    validate_content(errors, warnings)
    validate_evals(errors)
    for warning in sorted(set(warnings)):
        print(f"WARN: {warning}")
    for error in sorted(set(errors)):
        print(f"ERROR: {error}")
    if errors:
        print(f"FAIL: {len(set(errors))} error(s), {len(set(warnings))} warning(s)")
        return 1
    print(f"PASS: architecture skill integrity ({len(set(warnings))} warning(s))")
    return 0


if __name__ == "__main__":
    sys.exit(main())
