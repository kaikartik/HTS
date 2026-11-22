# Cross-Branch Notes

- Kartik Saxena: replace `auth-stub.ts` with the real login, session, and role guard; preserve supervisor/admin route restrictions.
- Ketan Tripathi and Kartik Saxena: provide REST endpoints for ticket search/filter, assignment, merging, dashboard/SLA aggregates, reports, users, categories, teams, SLA policies, business hours/holidays, notification templates, settings, and audit history.
- Shared frontend owner: add links to `/supervisor-khus/...` and `/admin-khus/...` in the shared navigation or home page; the root layout remains untouched in this branch.
- Shared frontend owner: provide the official IPEC logo asset and its final approved usage. Replace the local inline placeholder component once the real logo file is available; do not add assets to `public/` from this branch.
- Team: review shared design tokens and components for consolidation after the feature branches are integrated.
- No dependencies were added. CSV export is native and PDF export uses `window.print()`.