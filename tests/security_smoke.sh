#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

pass() {
  printf '[PASS] %s\n' "$1"
}

fail() {
  printf '[FAIL] %s\n' "$1" >&2
  exit 1
}

fetch() {
  local name="$1"
  shift
  curl -sS -D "$TMP_DIR/$name.headers" -o "$TMP_DIR/$name.body" "$@"
}

assert_status() {
  local name="$1"
  local expected="$2"
  local actual
  actual="$(head -n 1 "$TMP_DIR/$name.headers" | awk '{print $2}')"
  [[ "$actual" == "$expected" ]] || fail "$name expected HTTP $expected, got $actual"
}

assert_header_contains() {
  local name="$1"
  local header="$2"
  local expected="$3"
  grep -i "^$header:" "$TMP_DIR/$name.headers" | grep -qi "$expected" || fail "$name missing header $header containing $expected"
}

assert_body_contains() {
  local name="$1"
  local expected="$2"
  grep -q "$expected" "$TMP_DIR/$name.body" || fail "$name body missing: $expected"
}

fetch login "$BASE_URL/login"
assert_status login 200
assert_header_contains login "X-Frame-Options" "SAMEORIGIN"
assert_header_contains login "X-Content-Type-Options" "nosniff"
assert_header_contains login "Referrer-Policy" "strict-origin-when-cross-origin"
assert_body_contains login "APP_CSRF_TOKEN"
pass "login page exposes csrf token and security headers"

fetch missing "$BASE_URL/this-route-does-not-exist"
assert_status missing 404
pass "unknown route returns 404"

fetch admin_guest "$BASE_URL/admin"
assert_status admin_guest 404
pass "guest cannot enumerate admin route"

fetch logout_get "$BASE_URL/logout"
assert_status logout_get 302
grep -i '^Location:' "$TMP_DIR/logout_get.headers" | grep -Eq '/(login|dashboard)' || fail "logout_get redirect target invalid"
pass "logout GET is not a destructive 200 endpoint"

fetch login_post_no_csrf -X POST \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data 'login=test&password=test' \
  "$BASE_URL/login"
assert_status login_post_no_csrf 302
grep -i '^Location:' "$TMP_DIR/login_post_no_csrf.headers" | grep -q '/login' || fail "login_post_no_csrf should redirect to /login"
pass "post without csrf is rejected"

printf '\nSecurity smoke tests passed for %s\n' "$BASE_URL"
