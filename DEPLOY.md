# Deploy workflow

This repo is connected to Netlify. Every push to `main` triggers a fresh production deploy automatically. The `deploy.sh` script at the root of this repo wraps the three git commands needed to push, so a deploy is a single line.

## The one command

```bash
./deploy.sh "what you changed"
```

That's it. The script does the rest:

1. Confirms you're on the `main` branch (warns if not).
2. Pulls latest from GitHub so you don't push stale work.
3. Stages every change in the repo.
4. Commits with your message.
5. Pushes to GitHub.

Netlify picks up the push and rebuilds the site within ~30 seconds. Watch the Deploys tab in Netlify to see it go green.

## One-time setup (only if this is your first time)

Open Terminal and `cd` into this repo:

```bash
cd "/Users/josuedanielacuna/Library/CloudStorage/GoogleDrive-josue@bestresults.ai/My Drive/Claude Projects/BestResultsAI Platform/Github Repo/aiempowermentjournal"
```

Tip: in Finder, right-click the `aiempowermentjournal` folder and choose "New Terminal at Folder" — that does the `cd` for you.

If it's your first time on this machine, set your git identity (one time only):

```bash
git config --global user.name "Josue Acuna"
git config --global user.email "josue@bestresults.ai"
```

The script itself is already executable (Claude set it up). Test it:

```bash
./deploy.sh --help 2>/dev/null || echo "no help flag, expected"
```

## Example session

```bash
$ ./deploy.sh "Added cohort module prototype"

⤓   Pulling latest from origin/main …
   Already up to date.

📝  Committing with message:
    "Added cohort module prototype"
[main abc1234] Added cohort module prototype
 12 files changed, 850 insertions(+), 3 deletions(-)

⤴   Pushing to origin/main …
   To https://github.com/bestresultsai/aiempowermentjournal.git
      bbe71b1..abc1234  main -> main

✅  Deployed. Netlify will build & ship in ~30 seconds.
```

## When something goes wrong

- **"Permission denied"** when running `./deploy.sh` → run `chmod +x deploy.sh` once, then try again.
- **Pull failed (merge conflict)** → someone else (or you on another machine) committed something that doesn't fit cleanly with your local work. Open the files git mentions, fix the conflict markers (`<<<<<<<` / `=======` / `>>>>>>>`), save, then run `git add .` and `git commit` manually, then re-run `./deploy.sh`. If you're stuck, ask Claude.
- **Push rejected** → usually means your local is behind. The script's `git pull --rebase` handles this, but if it didn't, just re-run `./deploy.sh "..."`.
- **Netlify build fails** → check the Deploys tab in Netlify for the build log. Paste it to Claude and we'll fix it.

## What's currently staged

Right now (just after the cohort module landed), your local clone has 12 new or modified files compared to GitHub. They include the 10-session BBWS cohort module + the `deploy.sh` script itself. Running `./deploy.sh "Added cohort module prototype"` will ship them.
