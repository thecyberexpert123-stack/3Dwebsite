# Files for the `thecyberexpert123-stack.github.io` repository

Android verifies a Trusted Web Activity by fetching
`https://thecyberexpert123-stack.github.io/.well-known/assetlinks.json`
— the **origin root**, not `/3Dwebsite/`. On GitHub Pages the root of a
user's origin is served by a repository named exactly
**`thecyberexpert123-stack.github.io`**. It costs nothing.

## One-time setup (5 minutes, on github.com)

1. **New repository** → name: `thecyberexpert123-stack.github.io` → Public → Create.
2. Add the two files from this folder, keeping the paths:
   - `.well-known/assetlinks.json`  (use "Add file → Create new file" and type
     `.well-known/assetlinks.json` as the name — the slash creates the folder)
   - `index.html`  (a tiny redirect so the bare origin lands on Whimlet)
3. Repository **Settings → Pages**: Source = *Deploy from a branch*, branch
   `main`, folder `/ (root)`. Wait ~1 minute.
4. Check: `https://thecyberexpert123-stack.github.io/.well-known/assetlinks.json`
   returns the JSON, and `https://thecyberexpert123-stack.github.io/` redirects
   to `/3Dwebsite/`.

## When you have the signing fingerprint

Replace the placeholder in `assetlinks.json` with the SHA-256 of the key that
signs the installed app:

- Play Store build → Play Console → *Setup → App integrity → App signing key
  certificate → SHA-256* (NOT the upload key).
- Sideloaded test build → `bubblewrap fingerprint list` in `android/`.

Commit; Pages redeploys on its own. Then re-open the app: the browser bar
disappears once the fingerprint matches.

Note: `.nojekyll` is included so Pages serves the dot-folder `.well-known`.
