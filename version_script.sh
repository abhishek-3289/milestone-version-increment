#!/bin/bash
set -euo pipefail

INCREMENT_TYPE=${1:-patch}
INCREMENT=${2:-1}
PREFIX=${3:-}
OUTPUT_FILE=${GITHUB_OUTPUT:-/dev/stdout}

if ! [[ $INCREMENT =~ ^[1-9][0-9]*$ ]]; then
  echo "::error::increment must be a positive integer, got '$INCREMENT'"
  exit 1
fi

if ! git fetch --tags --force --quiet 2>/dev/null; then
  echo "::warning::Could not fetch tags from remote; using tags available locally"
fi

LATEST_TAG=$(
  git tag --list \
    | grep -E '^v?[0-9]+\.[0-9]+\.[0-9]+$' \
    | awk '{ version = $0; sub(/^v/, "", version); print version " " $0 }' \
    | sort -t. -k1,1n -k2,2n -k3,3n \
    | tail -n 1 \
    | cut -d' ' -f2 \
    || true
)
LATEST_TAG=${LATEST_TAG:-v0.0.0}

[[ $LATEST_TAG =~ ^v?([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]
MAJOR=${BASH_REMATCH[1]}
MINOR=${BASH_REMATCH[2]}
PATCH=${BASH_REMATCH[3]}

case $INCREMENT_TYPE in
  major)
    MAJOR=$((MAJOR + INCREMENT))
    MINOR=0
    PATCH=0
    ;;
  minor)
    MINOR=$((MINOR + INCREMENT))
    PATCH=0
    ;;
  patch)
    PATCH=$((PATCH + INCREMENT))
    ;;
  *)
    echo "::error::increment-type must be one of major, minor, patch (https://semver.org/), got '$INCREMENT_TYPE'"
    exit 1
    ;;
esac

VERSION="$MAJOR.$MINOR.$PATCH"
TITLE="$PREFIX$VERSION"
echo "Latest tag: $LATEST_TAG -> milestone title: $TITLE"
{
  echo "milestone_title=$TITLE"
  echo "milestone_version=$VERSION"
} >> "$OUTPUT_FILE"
