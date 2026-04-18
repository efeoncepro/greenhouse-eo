#!/usr/bin/env bash
# scripts/worktree-sync.sh — mantiene worktrees alineadas con origin sin interferir entre agentes.
#
# Uso:
#   bash scripts/worktree-sync.sh                # sync del worktree -develop + status de todos
#   bash scripts/worktree-sync.sh --status       # solo reporta, no mueve refs
#   bash scripts/worktree-sync.sh --all          # intenta ff-merge en TODAS las worktrees tracked
#   bash scripts/worktree-sync.sh --path PATH    # sync una worktree específica
#
# Reglas:
# - Solo aplica `git merge --ff-only` — nunca crea merge commits ni fuerza push
# - Si una worktree tiene cambios sin commitear, no la toca (reporta y sigue)
# - Primary worktree en detached HEAD se mantiene como está (no es sincronizable)
# - Respeta la regla canónica: una rama solo vive en una worktree

set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
MODE="default"
TARGET_PATH=""

while (($#)); do
  case "$1" in
    --status) MODE="status"; shift ;;
    --all) MODE="all"; shift ;;
    --path) MODE="single"; TARGET_PATH="$2"; shift 2 ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# //' | head -20
      exit 0
      ;;
    *) echo "unknown flag: $1" >&2; exit 2 ;;
  esac
done

color() {
  local kind="$1"; shift
  case "$kind" in
    ok) printf "\033[32m%s\033[0m\n" "$*" ;;
    warn) printf "\033[33m%s\033[0m\n" "$*" ;;
    err) printf "\033[31m%s\033[0m\n" "$*" ;;
    dim) printf "\033[2m%s\033[0m\n" "$*" ;;
    *) printf "%s\n" "$*" ;;
  esac
}

sync_worktree() {
  local path="$1"
  local head branch ahead behind dirty
  head=$(git -C "$path" rev-parse --short HEAD 2>/dev/null || echo "?")
  branch=$(git -C "$path" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "?")

  if [[ "$branch" == "HEAD" ]]; then
    color dim "  detached HEAD @ $head — skipping (not trackable)"
    return 0
  fi

  # Is there an upstream?
  local upstream
  upstream=$(git -C "$path" rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || echo "")

  if [[ -z "$upstream" ]]; then
    color dim "  $branch (no upstream) — skipping"
    return 0
  fi

  # Check for uncommitted changes
  dirty=$(git -C "$path" status --porcelain | head -1)
  if [[ -n "$dirty" ]]; then
    color warn "  $branch — DIRTY working tree, skipping sync (commit or stash first)"
    return 0
  fi

  # Fetch then check divergence
  git -C "$path" fetch --quiet origin "${branch}" 2>/dev/null || {
    color err "  $branch — fetch failed"
    return 1
  }

  ahead=$(git -C "$path" rev-list --count "${upstream}..HEAD" 2>/dev/null || echo "0")
  behind=$(git -C "$path" rev-list --count "HEAD..${upstream}" 2>/dev/null || echo "0")

  if [[ "$behind" == "0" && "$ahead" == "0" ]]; then
    color ok "  $branch — already up-to-date @ $head"
    return 0
  fi

  if [[ "$ahead" != "0" ]]; then
    color warn "  $branch — $ahead ahead / $behind behind $upstream (has local commits, skipping ff-merge)"
    return 0
  fi

  # Pure fast-forward case
  if [[ "$MODE" == "status" ]]; then
    color warn "  $branch — $behind behind $upstream (would fast-forward)"
    return 0
  fi

  git -C "$path" merge --ff-only "$upstream" >/dev/null 2>&1 && {
    local newhead
    newhead=$(git -C "$path" rev-parse --short HEAD)
    color ok "  $branch — fast-forwarded $head → $newhead (+$behind)"
  } || {
    color err "  $branch — ff-merge failed"
    return 1
  }
}

# Parse `git worktree list --porcelain` into path|branch pairs
parse_worktrees() {
  git worktree list --porcelain | awk '
    /^worktree / { path = substr($0, 10) }
    /^branch / { branch = substr($0, 8); printf "%s\t%s\n", path, branch; branch = "" }
    /^detached/ { printf "%s\tHEAD\n", path }
  '
}

echo "Worktree sync — mode: $MODE"
echo

case "$MODE" in
  single)
    [[ -z "$TARGET_PATH" ]] && { color err "--path requires an argument"; exit 2; }
    echo "Syncing single worktree: $TARGET_PATH"
    sync_worktree "$TARGET_PATH"
    ;;
  status|all)
    while IFS=$'\t' read -r wt_path wt_branch; do
      echo "→ $wt_path ($wt_branch)"
      sync_worktree "$wt_path" || true
    done < <(parse_worktrees)
    ;;
  default)
    # Default: only sync the -develop worktree (the canonical mirror)
    DEVELOP_WT=""
    while IFS=$'\t' read -r wt_path wt_branch; do
      if [[ "$wt_branch" == "refs/heads/develop" ]]; then
        DEVELOP_WT="$wt_path"
      fi
    done < <(parse_worktrees)

    if [[ -z "$DEVELOP_WT" ]]; then
      color warn "No worktree found tracking develop. Create one with:"
      echo "  git worktree add ../greenhouse-eo-develop develop"
      exit 1
    fi

    echo "→ $DEVELOP_WT (develop)"
    sync_worktree "$DEVELOP_WT"
    ;;
esac

echo
color dim "Done."
