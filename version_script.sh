#!/bin/bash

VERSION=${1:-"patch"}
INCREMENT=${2:-"1"}
PREFIX=${3:-""}

# Fetch latest tag, fallback to v0.0.0 if doesn't exist
git fetch --prune --unshallow 2>/dev/null
CURRENT_VERSION=$(git describe --abbrev=0 --tags 2>/dev/null)

if [[ $CURRENT_VERSION == '' ]]
then
  CURRENT_VERSION='v0.0.0'
fi

# remove v from tag and split tag by . into an array
VERSION_WITHOUT_V="${CURRENT_VERSION:1}"
CURRENT_VERSION_PARTS=(${VERSION_WITHOUT_V//./ })

# get number parts and increment
MAJOR=${CURRENT_VERSION_PARTS[0]}
MINOR=${CURRENT_VERSION_PARTS[1]}
PATCH=${CURRENT_VERSION_PARTS[2]}

if [[ $VERSION == 'major' ]]
then
  MAJOR=$(( MAJOR+INCREMENT ))
  MINOR='0'
  PATCH='0'
elif [[ $VERSION == 'minor' ]]
then
  MINOR=$(( MINOR+INCREMENT ))
  PATCH='0'
elif [[ $VERSION == 'patch' ]]
then
  PATCH=$(( PATCH+INCREMENT ))
else
  echo "No version type (https://semver.org/) or incorrect type specified, try: -v [major, minor, patch]"
  exit 1
fi

TITLE="$PREFIX$MAJOR.$MINOR.$PATCH"
echo "milestone tile: $TITLE"
echo milestone_title="$TITLE" >> "$GITHUB_OUTPUT"
echo milestone_version="$MAJOR.$MINOR.$PATCH" >> "$GITHUB_OUTPUT"