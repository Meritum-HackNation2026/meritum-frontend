#!/usr/bin/env bash
# Build and (re)deploy the web frontend of one environment on dellpromaxgb10.
#   deploy/deploy.sh <main|develop> [git-sha]
# Runs on the self-hosted runner `dellpromaxgb10` (on the host itself).
# Needs the platform (meritum-infra: onprem/dellpromaxgb10/platform/setup.sh):
# network `meritum` and meritum-gateway, which routes
# meritum.gburek.app -> meritum-web-prd and meritum-dev.gburek.app -> meritum-web-dev.
set -euo pipefail
repo=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
branch=${1:?usage: deploy.sh <main|develop> [sha]}
sha=${2:-$(git -C "$repo" rev-parse HEAD)}
case "$branch" in
  main) env=prd host=meritum.gburek.app ;;
  develop) env=dev host=meritum-dev.gburek.app ;;
  *) echo "only main and develop deploy" >&2; exit 1 ;;
esac
state=${M_STATE:-$HOME/meritum}
gateway=${M_GATEWAY_BIND:-172.17.0.1:18095}
container="meritum-web-$env"
image="meritum-web:$env-${sha:0:12}"
log() { printf '[meritum-web] %s\n' "$*" >&2; }

docker network inspect meritum >/dev/null 2>&1 \
  || { echo "::error::network meritum missing: run the platform workflow in meritum-infra"; exit 1; }

labels=(--label meritum.managed=true --label meritum.role=web --label meritum.env="$env" --label meritum.sha="$sha")
docker build -q -t "$image" "${labels[@]}" "$repo" >/dev/null
log "built $image"

exec 9>"$state/deploy.lock"
flock 9  # one change at a time on this host
docker rm -f "$container" >/dev/null 2>&1 || true
docker run -d --name "$container" --network meritum --restart unless-stopped \
  "${labels[@]}" -e API_UPSTREAM="meritum-api-$env:8000" "$image" >/dev/null
log "started $container"

for i in $(seq 30); do
  if curl -fsS -H "Host: $host" "http://$gateway/" | grep -q '<div id="root">'; then break; fi
  [ "$i" = 30 ] && { log "$host does not answer through $gateway"; docker logs --tail 50 "$container" >&2; exit 1; }
  sleep 2
done
log "serving $host through meritum-gateway"
# The API may not be deployed yet; the frontend deploy does not depend on it.
curl -fsS -H "Host: $host" "http://$gateway/api/v1/health" >&2 \
  || echo "::warning title=API::$host/api/v1/health does not answer (meritum-api-$env not deployed?)"

docker image ls meritum-web --filter "label=meritum.env=$env" --format '{{.Repository}}:{{.Tag}}' \
  | grep -vx "$image" | xargs -r docker rmi >/dev/null 2>&1 || true
