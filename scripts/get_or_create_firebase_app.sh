#!/bin/bash
# get_or_create_firebase_app.sh
#
# Returns the Firebase App ID for the given Android package name on stdout.
# If no Firebase app with that package name exists in the project, creates one first.
# Optionally writes the app's google-services.json to a given path.
#
# Usage:
#   ./get_or_create_firebase_app.sh <package_name> <display_name> [google_services_output_path]
#
# Requirements:
#   - GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service account JSON
#     (gcloud is then authenticated automatically on first call)
#   - gcloud CLI installed (pre-installed on GitHub Actions runners)
#   - python3 available (pre-installed everywhere)
#
# Example:
#   ./get_or_create_firebase_app.sh "org.sefaria.sefaria.my_branch" "Sefaria my-branch" "../app/google-services.json"

set -euo pipefail

PACKAGE_NAME="${1:?Usage: $0 <package_name> <display_name> [google_services_output_path]}"
DISPLAY_NAME="${2:?Usage: $0 <package_name> <display_name> [google_services_output_path]}"
GOOGLE_SERVICES_OUTPUT="${3:-}"   # optional; if set, write the app's google-services.json here

FIREBASE_PROJECT_ID="sefaria-mobile-analytics"

# Authenticate once if a service account key file is provided.
# On a developer machine with `gcloud auth login` already done, this is a no-op.
if [ -n "${GOOGLE_APPLICATION_CREDENTIALS:-}" ]; then
  gcloud auth activate-service-account \
    --key-file="$GOOGLE_APPLICATION_CREDENTIALS" --quiet 2>/dev/null || true
fi

# Helper: fetch a fresh short-lived OAuth2 token.
# Called before every API request so long-running operations never hit token expiry.
get_token() { gcloud auth print-access-token; }

# Helper: parse a JSON key from stdin safely (no shell-variable injection).
#   json_get <key_path_as_python_expr>
# The JSON is read from stdin; the expression is evaluated against the parsed object.
json_get() {
  local expr="$1"
  python3 -c "import sys, json; data = json.load(sys.stdin); print(${expr})"
}

# Helper: test whether a JSON key equals a given value, reading from stdin.
#   json_find_app_id <target_package_name>
# Prints the appId if found, prints nothing if not found.
json_find_app_id() {
  local target="$1"
  python3 -c "
import sys, json, os
data = json.load(sys.stdin)
target = os.environ['TARGET_PACKAGE']
for app in data.get('apps', []):
    if app.get('packageName') == target:
        print(app['appId'])
        break
" TARGET_PACKAGE="$target"
}

# ------------------------------------------------------------------
# Check whether a Firebase Android app with this package name exists
# ------------------------------------------------------------------
LIST_RESPONSE=$(curl -sf \
  -H "Authorization: Bearer $(get_token)" \
  "https://firebase.googleapis.com/v1beta1/projects/${FIREBASE_PROJECT_ID}/androidApps")

EXISTING_ID=$(echo "$LIST_RESPONSE" | json_find_app_id "$PACKAGE_NAME")

get_app_id_and_maybe_config() {
  local app_id="$1"

  # If the caller wants a google-services.json, download and decode it now.
  # This ensures the Gradle build finds a matching <client> entry for the QA package name.
  if [ -n "$GOOGLE_SERVICES_OUTPUT" ]; then
    >&2 echo "📥 Downloading google-services.json for ${PACKAGE_NAME}..."
    CONFIG_B64=$(curl -sf \
      -H "Authorization: Bearer $(get_token)" \
      "https://firebase.googleapis.com/v1beta1/projects/${FIREBASE_PROJECT_ID}/androidApps/${app_id}/config" \
      | python3 -c "import sys,json; print(json.load(sys.stdin)['configFileContents'])")
    echo "$CONFIG_B64" | base64 --decode > "$GOOGLE_SERVICES_OUTPUT"
    >&2 echo "✅ Written to ${GOOGLE_SERVICES_OUTPUT}"
  fi

  echo "$app_id"
}

if [ -n "$EXISTING_ID" ]; then
  get_app_id_and_maybe_config "$EXISTING_ID"
  exit 0
fi

# ------------------------------------------------------------------
# App not found — create it
# ------------------------------------------------------------------
>&2 echo "Firebase app '${PACKAGE_NAME}' not found — creating..."

CREATE_RESPONSE=$(curl -sf -X POST \
  -H "Authorization: Bearer $(get_token)" \
  -H "Content-Type: application/json" \
  -d "{\"packageName\": \"${PACKAGE_NAME}\", \"displayName\": \"${DISPLAY_NAME}\"}" \
  "https://firebase.googleapis.com/v1beta1/projects/${FIREBASE_PROJECT_ID}/androidApps")

# The create call is async — it returns a long-running Operation. Poll until done.
OPERATION_NAME=$(echo "$CREATE_RESPONSE" | json_get "data['name']")

>&2 echo "Waiting for Firebase app provisioning..."
for i in $(seq 1 12); do
  sleep 5
  # Refresh the token on each poll so a slow provisioning run never expires it.
  OP_RESPONSE=$(curl -sf \
    -H "Authorization: Bearer $(get_token)" \
    "https://firebase.googleapis.com/v1beta1/${OPERATION_NAME}")
  DONE=$(echo "$OP_RESPONSE" | json_get "data.get('done', False)")
  if [ "$DONE" = "True" ]; then
    NEW_APP_ID=$(echo "$OP_RESPONSE" | json_get "data['response']['appId']")
    >&2 echo "✅ Created Firebase app: ${NEW_APP_ID}"
    get_app_id_and_maybe_config "$NEW_APP_ID"
    exit 0
  fi
  >&2 echo "  ...still provisioning (attempt $i/12)"
done

>&2 echo "ERROR: Firebase app creation timed out after 60 seconds"
exit 1
