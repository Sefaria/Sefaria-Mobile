#!/bin/bash
# get_or_create_firebase_app.sh
#
# Returns the Firebase App ID for the given Android package name.
# If no Firebase app with that package name exists in the project, creates one first.
#
# Usage:
#   ./get_or_create_firebase_app.sh <package_name> <display_name>
#
# Requirements:
#   - GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service account JSON
#     (or gcloud auth activated: `gcloud auth activate-service-account --key-file=...`)
#   - gcloud CLI installed (pre-installed on GitHub Actions runners)
#   - python3 available (pre-installed everywhere)
#
# Example:
#   ./get_or_create_firebase_app.sh "org.sefaria.sefaria.my_branch" "Sefaria my-branch"

set -euo pipefail

PACKAGE_NAME="${1:?Usage: $0 <package_name> <display_name>}"
DISPLAY_NAME="${2:?Usage: $0 <package_name> <display_name>}"
FIREBASE_PROJECT_ID="sefaria-mobile-analytics"

# Activate service account if GOOGLE_APPLICATION_CREDENTIALS is set but gcloud isn't authed yet.
# (On local machines with `gcloud auth login` this is a no-op.)
if [ -n "${GOOGLE_APPLICATION_CREDENTIALS:-}" ]; then
  gcloud auth activate-service-account --key-file="$GOOGLE_APPLICATION_CREDENTIALS" --quiet 2>/dev/null || true
fi

# Get a short-lived OAuth2 access token
TOKEN=$(gcloud auth print-access-token)

# ------------------------------------------------------------------
# Check whether a Firebase Android app with this package name exists
# ------------------------------------------------------------------
LIST_RESPONSE=$(curl -sf \
  -H "Authorization: Bearer $TOKEN" \
  "https://firebase.googleapis.com/v1beta1/projects/${FIREBASE_PROJECT_ID}/androidApps")

EXISTING_ID=$(echo "$LIST_RESPONSE" | python3 - <<PYEOF
import sys, json
try:
    apps = json.loads("""$LIST_RESPONSE""").get('apps', [])
    for app in apps:
        if app.get('packageName') == '${PACKAGE_NAME}':
            print(app['appId'])
            break
except Exception:
    pass
PYEOF
)

if [ -n "$EXISTING_ID" ]; then
  echo "$EXISTING_ID"
  exit 0
fi

# ------------------------------------------------------------------
# App not found — create it
# ------------------------------------------------------------------
>&2 echo "Firebase app '${PACKAGE_NAME}' not found — creating..."

CREATE_RESPONSE=$(curl -sf -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"packageName\": \"${PACKAGE_NAME}\", \"displayName\": \"${DISPLAY_NAME}\"}" \
  "https://firebase.googleapis.com/v1beta1/projects/${FIREBASE_PROJECT_ID}/androidApps")

# The create call is async — it returns an Operation. Poll until done.
OPERATION_NAME=$(echo "$CREATE_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['name'])")

>&2 echo "Waiting for Firebase app provisioning..."
for i in $(seq 1 12); do
  sleep 5
  OP_RESPONSE=$(curl -sf \
    -H "Authorization: Bearer $TOKEN" \
    "https://firebase.googleapis.com/v1beta1/${OPERATION_NAME}")
  DONE=$(echo "$OP_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('done', False))")
  if [ "$DONE" = "True" ]; then
    NEW_APP_ID=$(echo "$OP_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['response']['appId'])")
    >&2 echo "Created Firebase app: ${NEW_APP_ID}"
    echo "$NEW_APP_ID"
    exit 0
  fi
  >&2 echo "  ...still provisioning (attempt $i/12)"
done

>&2 echo "ERROR: Firebase app creation timed out after 60 seconds"
exit 1
