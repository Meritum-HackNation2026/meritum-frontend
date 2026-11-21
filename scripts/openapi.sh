#!/usr/bin/env bash
# Refresh the meritum-backend OpenAPI schema and the types generated from it.
#   pnpm openapi                  schema of meritum-backend develop, then the types
#   pnpm openapi <ref>            another branch, tag or commit of meritum-backend
#   pnpm openapi --types-only     only regenerate the types from the saved schema
# The schema comes from the backend code (create_app().openapi() through uv), not from a
# running server. pnpm test (tests/api/openapi.test.ts) checks without network that the
# types match the saved schema. Needs `gh`, `git` and `uv` for a schema refresh.
set -euo pipefail
cd "$(dirname "$0")/.."
schema=src/api/openapi.json
types=src/api/_openapi.gen.ts

if [ "${1:-}" != "--types-only" ]; then
  ref=${1:-develop}
  stage=$(mktemp -d)
  trap 'rm -rf "$stage"' EXIT
  gh repo clone Meritum-HackNation2026/meritum-backend "$stage/backend" -- --quiet
  git -C "$stage/backend" checkout --quiet "$ref" --
  (cd "$stage/backend" && uv run --quiet python -c '
import json, sys
from meritum_backend.main import create_app
json.dump(create_app().openapi(), sys.stdout, indent=2, ensure_ascii=False)
print()
') >"$stage/openapi.json"
  mv "$stage/openapi.json" "$schema"
  echo "schema: meritum-backend $(git -C "$stage/backend" rev-parse HEAD)"
fi
pnpm exec openapi-typescript "$schema" --output "$types"
