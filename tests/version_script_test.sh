#!/bin/bash
set -uo pipefail

SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/version_script.sh"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

TESTS=0
FAILURES=0
STATUS=0

git_quiet() {
  git -c user.name=test -c user.email=test@example.com -c init.defaultBranch=main \
    -c commit.gpgsign=false -c tag.gpgsign=false "$@" >/dev/null 2>&1
}

given_remote_tags() {
  rm -rf "$WORK/origin" "$WORK/clone"
  git_quiet init "$WORK/origin"
  git_quiet -C "$WORK/origin" commit --allow-empty -m init
  local tag
  for tag in "$@"; do
    git_quiet -C "$WORK/origin" commit --allow-empty -m "$tag"
    git_quiet -C "$WORK/origin" tag "$tag"
  done
  git_quiet clone --depth 1 --no-tags "file://$WORK/origin" "$WORK/clone"
}

run_script() {
  : > "$WORK/output"
  (cd "$WORK/clone" && GITHUB_OUTPUT="$WORK/output" "$SCRIPT" "$@") > "$WORK/log" 2>&1
  STATUS=$?
}

output() {
  grep "^$1=" "$WORK/output" | cut -d= -f2-
}

assert_eq() {
  if [[ $2 != "$3" ]]; then
    echo "    $1: expected '$2', got '$3'"
    return 1
  fi
}

run_test() {
  local name=$1
  TESTS=$((TESTS + 1))
  if "$name"; then
    echo "ok - $name"
  else
    FAILURES=$((FAILURES + 1))
    echo "not ok - $name"
    sed 's/^/    log: /' "$WORK/log"
  fi
}

test_no_tags_starts_from_zero() {
  given_remote_tags
  run_script patch 1 v
  assert_eq status 0 "$STATUS" &&
    assert_eq title v0.0.1 "$(output milestone_title)" &&
    assert_eq version 0.0.1 "$(output milestone_version)"
}

test_fetches_tags_missing_from_shallow_checkout() {
  given_remote_tags v1.2.3
  run_script patch
  assert_eq version 1.2.4 "$(output milestone_version)"
}

test_uses_highest_version_not_newest_commit() {
  given_remote_tags v1.10.0 v1.9.0
  run_script patch
  assert_eq version 1.10.1 "$(output milestone_version)"
}

test_ignores_prerelease_and_non_semver_tags() {
  given_remote_tags v1.2.0 v2.0.0-rc1 release-x v3 v4.1
  run_script minor
  assert_eq version 1.3.0 "$(output milestone_version)"
}

test_parses_tags_without_v_prefix() {
  given_remote_tags 1.2.3
  run_script patch
  assert_eq version 1.2.4 "$(output milestone_version)"
}

test_compares_tags_with_and_without_v_prefix() {
  given_remote_tags 1.10.0 v1.2.3
  run_script patch
  assert_eq version 1.10.1 "$(output milestone_version)"
}

test_minor_resets_patch() {
  given_remote_tags v1.2.3
  run_script minor
  assert_eq version 1.3.0 "$(output milestone_version)"
}

test_major_with_custom_increment_resets_minor_and_patch() {
  given_remote_tags v1.2.3
  run_script major 2
  assert_eq version 3.0.0 "$(output milestone_version)"
}

test_prefix_with_spaces_is_kept() {
  given_remote_tags v1.2.3
  run_script patch 1 "Release "
  assert_eq title "Release 1.2.4" "$(output milestone_title)"
}

test_defaults_to_patch_increment_of_one() {
  given_remote_tags v1.2.3
  run_script
  assert_eq version 1.2.4 "$(output milestone_version)"
}

test_rejects_unknown_increment_type() {
  given_remote_tags v1.2.3
  run_script huge
  assert_eq status 1 "$STATUS" &&
    assert_eq output "" "$(cat "$WORK/output")"
}

test_rejects_zero_increment() {
  given_remote_tags v1.2.3
  run_script patch 0
  assert_eq status 1 "$STATUS"
}

test_rejects_non_numeric_increment() {
  given_remote_tags v1.2.3
  run_script patch abc
  assert_eq status 1 "$STATUS"
}

for test_name in $(declare -F | awk '$3 ~ /^test_/ { print $3 }'); do
  run_test "$test_name"
done

echo "$((TESTS - FAILURES))/$TESTS passed"
[[ $FAILURES -eq 0 ]]
