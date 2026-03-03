#!/usr/bin/env bash
set -euo pipefail

TEMPLATE_PATH="${1:-docs/cloudflare-alert-thresholds-template.json}"

if [[ ! -f "$TEMPLATE_PATH" ]]; then
  echo "[alert-validate] file not found: $TEMPLATE_PATH" >&2
  exit 1
fi

node - "$TEMPLATE_PATH" <<'NODE'
const fs = require('fs');

const path = process.argv[2];
const raw = fs.readFileSync(path, 'utf8');
const data = JSON.parse(raw);

if (typeof data.service !== 'string' || data.service.length === 0) {
  throw new Error('service must be a non-empty string');
}

if (!Array.isArray(data.alerts) || data.alerts.length === 0) {
  throw new Error('alerts must be a non-empty array');
}

const validMetrics = new Set(['5xx_ratio', '429_ratio', 'server_timing_upstream_p95_ms']);
const validSeverities = new Set(['warning', 'critical']);

for (const [idx, alert] of data.alerts.entries()) {
  const prefix = `alerts[${idx}]`;
  if (typeof alert.name !== 'string' || alert.name.length === 0) {
    throw new Error(`${prefix}.name must be a non-empty string`);
  }
  if (!validMetrics.has(alert.metric)) {
    throw new Error(`${prefix}.metric must be one of: ${Array.from(validMetrics).join(', ')}`);
  }
  if (typeof alert.window !== 'string' || !/^\d+m$/.test(alert.window)) {
    throw new Error(`${prefix}.window must be a string like 5m or 10m`);
  }
  if (typeof alert.threshold !== 'number' || alert.threshold <= 0) {
    throw new Error(`${prefix}.threshold must be a number > 0`);
  }
  if (!Number.isInteger(alert.consecutive_windows) || alert.consecutive_windows <= 0) {
    throw new Error(`${prefix}.consecutive_windows must be an integer > 0`);
  }
  if (!validSeverities.has(alert.severity)) {
    throw new Error(`${prefix}.severity must be warning|critical`);
  }
  if (!Array.isArray(alert.notification_targets) || alert.notification_targets.length === 0) {
    throw new Error(`${prefix}.notification_targets must be a non-empty array`);
  }
}

console.log(`[alert-validate] OK: ${path}`);
NODE
