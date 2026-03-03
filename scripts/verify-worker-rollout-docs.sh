#!/usr/bin/env bash
set -euo pipefail

README_PATH="${1:-README.md}"
PACKAGE_JSON_PATH="${2:-package.json}"
OPS_CHECKLIST_PATH="${3:-docs/worker-operations-checklist.md}"
JSON_OUT_PATH="${DOCS_VERIFY_JSON:-}"

if [[ ! -f "$README_PATH" ]]; then
  echo "[docs-verify] README not found: $README_PATH" >&2
  exit 1
fi
if [[ ! -f "$PACKAGE_JSON_PATH" ]]; then
  echo "[docs-verify] package.json not found: $PACKAGE_JSON_PATH" >&2
  exit 1
fi
if [[ ! -f "$OPS_CHECKLIST_PATH" ]]; then
  echo "[docs-verify] operations checklist not found: $OPS_CHECKLIST_PATH" >&2
  exit 1
fi

REQUIRED_SCRIPTS=(
  test:staging-smoke
  test:staging-smoke:dry
  test:staging-smoke:preflight
  test:staging-smoke:env:validate
  test:alerts:validate
  lint:scripts:rollout
  test:worker:readiness
  test:worker:readiness:strict
  progress:worker-rollout
  verify:worker-rollout:evidence
  verify:worker-rollout:evidence:strict
  report:worker-rollout:status
  report:worker-rollout:status:json
  report:worker-rollout:status:md
  sync:worker-rollout:open-items
  sync:worker-rollout:open-items:apply
  sync:worker-rollout:open-items:strict
  sync:worker-rollout:open-items:apply:strict
  report:worker-rollout:overview
  report:worker-rollout:overview:json
)

RESULTS=()
missing=0
for name in "${REQUIRED_SCRIPTS[@]}"; do
  in_package=1
  in_readme=1
  in_ops=1

  if ! node -e "const p=require('./${PACKAGE_JSON_PATH}'); if(!p.scripts || !p.scripts['${name}']) process.exit(1)"; then
    echo "[docs-verify] missing npm script: ${name}" >&2
    in_package=0
    missing=1
  fi

  if ! grep -Fq "npm run ${name}" "$README_PATH"; then
    echo "[docs-verify] README missing command: npm run ${name}" >&2
    in_readme=0
    missing=1
  fi

  if ! grep -Fq "npm run ${name}" "$OPS_CHECKLIST_PATH"; then
    echo "[docs-verify] operations checklist missing command: npm run ${name}" >&2
    in_ops=0
    missing=1
  fi

  RESULTS+=("${name}|${in_package}|${in_readme}|${in_ops}")
done

if [[ -n "$JSON_OUT_PATH" ]]; then
  mkdir -p "$(dirname "$JSON_OUT_PATH")"
  {
    echo "{"
    echo "  \"readme\": \"${README_PATH}\","
    echo "  \"packageJson\": \"${PACKAGE_JSON_PATH}\","
    echo "  \"operationsChecklist\": \"${OPS_CHECKLIST_PATH}\","
    echo "  \"ok\": $([[ "$missing" -eq 0 ]] && echo true || echo false),"
    echo "  \"commands\": ["
    for i in "${!RESULTS[@]}"; do
      IFS='|' read -r name in_package in_readme in_ops <<<"${RESULTS[$i]}"
      comma=","; [[ "$i" -eq $((${#RESULTS[@]} - 1)) ]] && comma=""
      echo "    {\"name\":\"${name}\",\"inPackage\":$([[ "$in_package" -eq 1 ]] && echo true || echo false),\"inReadme\":$([[ "$in_readme" -eq 1 ]] && echo true || echo false),\"inOperationsChecklist\":$([[ "$in_ops" -eq 1 ]] && echo true || echo false)}${comma}"
    done
    echo "  ]"
    echo "}"
  } >"$JSON_OUT_PATH"
  echo "[docs-verify] wrote JSON report: $JSON_OUT_PATH"
fi

if [[ "$missing" -ne 0 ]]; then
  exit 1
fi

echo "[docs-verify] worker rollout commands are aligned across package, README, and operations checklist"
