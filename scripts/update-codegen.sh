#!/usr/bin/env bash

set -x

# exit if gh command not installed
if ! command -v gh &> /dev/null
then
    echo "gh command could not be found. Install from here: https://cli.github.com/"
    exit 1
fi

current_branch=$(git branch --show-current)

# branch isn't main exit
if [ "$current_branch" != "main" ]; then
  echo "Not on main branch, exiting"
  exit 1
fi

git pull

changed_files=$(git diff --name-only main...HEAD)
# if there are changed files, exit
if [ -n "$changed_files" ]; then
  echo "There are changed files, exiting"
  exit 1
fi


npm run generate

types_diff=$(git diff src/generated/)
# if there are no changed files, exit
if [ -z "$types_diff" ]; then
  echo "Generated files have not changed, exiting"
  exit 1
fi

npm run test -- --watch=false && npm run typecheck -- --watch=false

if [ $? -ne 0 ]; then
  echo "Tests or typecheck failed, exiting"
  exit 1
fi

git add src/generated
git commit -m "chore: update generated files"

npx bumpp patch -y

echo "pick latest version here"
gh release create -d --generate-notes

echo "go to url above and publish release to publish to npm"
