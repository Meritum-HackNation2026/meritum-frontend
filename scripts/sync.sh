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
# Downloads go to a staging folder first, so a failed call leaves the copies untouched.
stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT
fetch() {
  mkdir -p "$stage/$(dirname "$4")"
  gh api -H 'Accept: application/vnd.github.raw' "repos/$1/contents/${2// /%20}?ref=$3" >"$stage/$4"
}
# sha256sum on Linux, shasum on older macOS; same output format.
sums() { if command -v sha256sum >/dev/null; then sha256sum "$@"; else shasum -a 256 "$@"; fi; }

# Parallel arrays (design-system path -> path here); quoted everywhere, so names with
# spaces stay whole.
from=(contracts/meritum.ts contracts/meritum.schema.json contracts/examples.json copy/pl.json copy/privacy.json
  tokens/meritum.css)
to=(src/contracts/meritum.ts src/contracts/meritum.schema.json src/contracts/examples.json
  src/copy/pl.json src/copy/privacy.json src/styles/meritum.css)
# A plain assignment, not a process substitution, so set -e stops on a failed call.
names=$(gh api "repos/$ds/contents/components/meritum?ref=$ds_ref" \
  --jq '.[] | select(.type == "file") | .name')
[ -n "$names" ] || { echo "error: $ds@$ds_ref lists no components/meritum files" >&2; exit 1; }
while IFS= read -r name; do
  from+=("components/meritum/$name")
  to+=("src/components/meritum/$name")
done <<<"$names"

for i in "${!from[@]}"; do
  fetch "$ds" "${from[$i]}" "$ds_ref" "${to[$i]}"
done
copies=("${to[@]}")
sources="meritum-design-system $ds_ref"

# shortcut: core has no catalog/catalog.json until meritum-core#22 lands, so a 404 skips
# the copy with a warning; make it mandatory once the file exists.
if err=$(fetch "$core" catalog/catalog.json "$core_ref" src/contracts/catalog.json 2>&1); then
  copies+=(src/contracts/catalog.json)
  sources+=$'\n'"meritum-core $core_ref"
elif [[ $err == *"HTTP 404"* ]]; then
  rm "$stage/src/contracts/catalog.json"
  echo "warning: $core@${core_ref:0:12} has no catalog/catalog.json yet, skipped" >&2
else
  echo "$err" >&2
  exit 1
fi

rm -rf src/contracts src/copy src/components/meritum src/styles/meritum.css
cp -R "$stage/src/." src/
printf '%s\n' "$sources" >SOURCE
sorted=()
while IFS= read -r -d '' f; do sorted+=("$f"); done < <(printf '%s\0' "${copies[@]}" | LC_ALL=C sort -z)
sums "${sorted[@]}" >SHA256SUMS
echo "synced ${#copies[@]} files from $ds@${ds_ref:0:12}; run pnpm build to see what to adapt"
