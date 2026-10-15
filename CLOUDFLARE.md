# Cloudflare migration

Only main is used. Render is retained as backup. No custom domain or DNS route is included in these configurations. Worker observability is disabled.

Install using `npm ci`, inspect the bundle using `npm run cf:check`, then deploy using `npm run cf:deploy`. Validate the returned workers.dev URL before adding any domain. Build output and local state are ignored by Git.

Static Assets only. `scripts/build-cloudflare.mjs` copies the existing browser assets and public documentation without changing their bytes. Supabase functions, repository scripts, environment files, and deployment configuration are excluded. Existing chat API and local storage keys are unchanged.

Acceptance: entry page, avatar and icon files, version.json and JS must load; character selection, local history, and a real chat reply must succeed from workers.dev before domain cutover.
