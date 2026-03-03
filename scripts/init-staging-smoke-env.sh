#!/usr/bin/env bash
set -euo pipefail

TEMPLATE="docs/staging-smoke.env.example"
TARGET="${1:-.env.staging-smoke}"

if [[ ! -f "$TEMPLATE" ]]; then
  echo "Error: template not found: $TEMPLATE" >&2
  exit 1
fi

if [[ -e "$TARGET" ]]; then
  echo "Error: target already exists: $TARGET" >&2
  echo "Use another path or remove the existing file first." >&2
  exit 1
fi

cp "$TEMPLATE" "$TARGET"
echo "Created $TARGET from $TEMPLATE"
echo "Next: edit $TARGET and run:"
echo "  bash scripts/run-staging-smoke-from-env.sh $TARGET normal"
