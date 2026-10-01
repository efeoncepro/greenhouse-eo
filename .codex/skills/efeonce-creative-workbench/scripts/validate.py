"""Read-only checks for this skill's Codex/Claude bundles and internal links."""
from pathlib import Path
import hashlib
import re

skill = Path(__file__).resolve().parents[1]
repo = skill.parents[2]
name = skill.name
roots = [repo / runtime / "skills" / name for runtime in (".codex", ".claude")]


def inventory(root):
    if not root.is_dir():
        raise SystemExit(f"Missing bundle: {root}")
    result = {}
    for file in root.rglob("*"):
        if "__pycache__" in file.parts:
            continue
        if file.is_symlink():
            raise SystemExit(f"Symlink is not a mirrored source: {file}")
        if file.is_file():
            result[file.relative_to(root).as_posix()] = hashlib.sha256(file.read_bytes()).hexdigest()
    return result


left, right = [inventory(root) for root in roots]
if left != right:
    different = sorted(p for p in left.keys() | right.keys() if left.get(p) != right.get(p))
    raise SystemExit("Codex/Claude drift: " + ", ".join(different))

checked = 0
for root in roots:
    for file in root.rglob("*.md"):
        for target in re.findall(r"\[[^\]]*\]\(([^)]+)\)", file.read_text()):
            target = target.split("#", 1)[0]
            if not target or re.match(r"^[a-z]+:", target):
                continue
            resolved = (file.parent / target).resolve()
            if not resolved.is_relative_to(repo) or not resolved.is_file():
                raise SystemExit(f"Missing/internal-link-outside-repo: {file}: {target}")
            checked += 1

router = repo / "docs/operations/agent-context-router.json"
if router.exists():
    import json
    domains = json.loads(router.read_text())["domains"]
    domain = next((item for item in domains if item["id"] == "creative-workbench"), None)
    if not domain or name not in domain["skills"]:
        raise SystemExit("Missing Greenhouse skill router")
    for source in domain["sources"]:
        if not (repo / source).is_file():
            raise SystemExit("Missing router source: " + source)

print(f"OK: {len(left)} files byte-identical in Codex/Claude; {checked} internal links; router valid")
