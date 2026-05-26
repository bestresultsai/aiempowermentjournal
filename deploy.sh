#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# deploy.sh — one-shot deploy for the BestResults.AI in-house tool.
#
# Usage:
#   ./deploy.sh "what you changed"
#
# What it does:
#   1. Makes sure you're on the main branch.
#   2. Pulls the latest from GitHub (so you don't push stale work).
#   3. Stages every change in the repo.
#   4. Commits with the message you passed.
#   5. Pushes to GitHub. Netlify auto-deploys within ~30 seconds.
#
# If there's nothing to commit, it just tells you and exits — safe to re-run.
# -----------------------------------------------------------------------------

set -e  # bail on first error

# --- 0. Argument handling -----------------------------------------------------

if [ $# -eq 0 ]; then
  echo "❌  Missing commit message."
  echo
  echo "Try:   ./deploy.sh \"Added the cohort module prototype\""
  exit 1
fi

MSG="$*"   # accept multi-word messages without quotes too

# --- 1. Sanity check ----------------------------------------------------------

if [ ! -d ".git" ]; then
  echo "❌  This isn't a git repo. Run deploy.sh from inside the project folder."
  exit 1
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ]; then
  echo "⚠️   You're on branch '$BRANCH', not 'main'."
  read -p "    Continue anyway? [y/N] " yn
  case $yn in
    [Yy]* ) echo "    OK, continuing on $BRANCH.";;
    *     ) echo "    Stopped."; exit 1;;
  esac
fi

# --- 2. Stage everything ------------------------------------------------------
# (Done BEFORE pulling — git pull --rebase refuses to run with unstaged work.)

git add -A

# Bail early if nothing changed.
if git diff --cached --quiet; then
  echo
  echo "ℹ️   No local changes to commit."
  echo "    Pulling latest from origin/$BRANCH in case the remote moved …"
  git pull --rebase origin "$BRANCH" || {
    echo "❌  Pull failed. Fix conflicts manually, then re-run."
    exit 1
  }
  echo "✅  Nothing to deploy — local is up to date with origin."
  exit 0
fi

# --- 3. Commit ----------------------------------------------------------------

echo "📝  Committing with message:"
echo "    \"$MSG\""
git commit -m "$MSG"

# --- 4. Pull latest (rebase your new commit on top) ---------------------------

echo
echo "⤓   Pulling latest from origin/$BRANCH …"
git pull --rebase origin "$BRANCH" || {
  echo
  echo "❌  Pull failed (likely a merge conflict with what's on GitHub)."
  echo "    Resolve the conflict manually, then run:"
  echo "        git rebase --continue && git push origin $BRANCH"
  echo "    Or ask Claude for help."
  exit 1
}

# --- 5. Push ------------------------------------------------------------------

echo
echo "⤴   Pushing to origin/$BRANCH …"
git push origin "$BRANCH"

# --- Done --------------------------------------------------------------------

echo
echo "✅  Deployed. Netlify will build & ship in ~30 seconds."
echo "    Live deploys:  https://app.netlify.com/  (check your Deploys tab)"
echo "    Repo:          https://github.com/bestresultsai/aiempowermentjournal/commits/$BRANCH"
