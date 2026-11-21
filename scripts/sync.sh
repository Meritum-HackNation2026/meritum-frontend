#!/usr/bin/env bash
# Refresh the read-only copies of the design system and the core source catalogue.
#   pnpm sync                       copy from the main branch of both repos
#   pnpm sync <ds-ref> [<core-ref>] copy from other branches, tags or commits
# Never edit the copied files by hand: pnpm test (tests/synced-copies.test.ts) checks
# them against SHA256SUMS. Change them in meritum-design-system (contracts reach it
# from meritum-core, ADR-02/ADR-33), then run this script; pnpm build (tsc) then shows
# what the app must adapt. Mirrors contracts/sync.sh in meritum-design-system.
# Needs `gh` signed in with read access to both repos. Runs on bash 3.2 (macOS).
set -euo pipefail
cd "$(dirname "$0")/.."
org=Meritum-HackNation2026
ds=$org/meritum-design-system
core=$org/meritum-core
ds_ref=$(gh api "repos/$ds/commits/${1:-main}" --jq .sha)
core_ref=$(gh api "repos/$core/commits/${2:-main}" --jq .sha)
fetch() { gh api -H 'Accept: application/vnd.github.raw' "repos/$1/contents/${2// /%20}?ref=$3"; }
# sha256sum on Linux, shasum on older macOS; same output format.
sums() { if command -v sha256sum >/dev/null; then sha256sum "$@"; else shasum -a 256 "$@"; fi; }

# Parallel arrays (design-system path -> path here); quoted everywhere, so names with
# spaces stay whole.
from=(contracts/meritum.ts contracts/meritum.schema.json contracts/examples.json copy/pl.json
  tokens/meritum.css)
to=(src/contracts/meritum.ts src/contracts/meritum.schema.json src/contracts/examples.json
  src/copy/pl.json src/styles/meritum.css)
while IFS= read -r name; do
  from+=("components/meritum/$name")
  to+=("src/components/meritum/$name")
done < <(gh api "repos/$ds/contents/components/meritum?ref=$ds_ref" \
  --jq '.[] | select(.type == "file") | .name')

rm -rf src/contracts src/copy src/components/meritum
mkdir -p src/contracts src/copy src/components/meritum src/styles
for i in "${!from[@]}"; do
  fetch "$ds" "${from[$i]}" "$ds_ref" >"${to[$i]}"
done
copies=("${to[@]}")
source="meritum-design-system $ds_ref"

# shortcut: core has no catalog/catalog.json until meritum-core#22 lands, so the copy
# is skipped with a warning; make it mandatory once the file exists.
if fetch "$core" catalog/catalog.json "$core_ref" >src/contracts/catalog.json 2>/dev/null; then
  copies+=(src/contracts/catalog.json)
  source+=$'\n'"meritum-core $core_ref"
else
  rm -f src/contracts/catalog.json
  echo "warning: $core@${core_ref:0:12} has no catalog/catalog.json yet, skipped" >&2
fi

printf '%s\n' "$source" >SOURCE
sorted=()
while IFS= read -r -d '' f; do sorted+=("$f"); done < <(printf '%s\0' "${copies[@]}" | LC_ALL=C sort -z)
sums "${sorted[@]}" >SHA256SUMS
echo "synced ${#copies[@]} files from $ds@${ds_ref:0:12}; run pnpm build to see what to adapt"
