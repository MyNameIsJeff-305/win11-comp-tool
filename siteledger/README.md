# SiteLedger MVP

Industry-neutral office assessment and IT inventory application for SMART Solutions.

This directory is isolated from the legacy Express app. Do not merge into or deploy the legacy application's main branch without reviewing the deployment boundary.

## Scope

Astro + Tailwind application shell; dynamic equipment inventory; clients/sites; software categories and installations; multiple private photos; Supabase Auth and tenant/assignment/client RLS; review and immutable finalization; built-in Freshservice draft export independent of Tally and the old API.

No device credentials are stored or exported. Freshservice photo access uses authenticated gallery links, not public buckets or expiring URLs embedded in long-lived KB articles. A completed assessment and a published KB article are separate states.

## Verification recorded on 2026-09-18

- 27 domain, report, authorization and export-unit tests passed in the build environment.
- 12 browser workflow checks passed using the actual bundled interface with an explicit in-memory storage test double. Browser HTTP/file navigation is administrator-blocked in that environment, so native IndexedDB and live cloud integrations are not claimed as tested there.
- Desktop and mobile screenshots generated and visually reviewed.
- PostgreSQL schema/RLS regression suite and CI/CD configuration supplied with the source package; cloud runs must be checked before production use.

## Infrastructure status

Feature branch: `feat/siteledger-mvp-20260918`.
Netlify project reserved: `smart-siteledger`, site ID `4535e9a0-c9a1-44df-bf6c-a0f91d805c78`.
No live deployment or Supabase database is implied by this reservation. A new Supabase project requires the selected organization and plan/cost confirmation. Provider credentials must be configured securely; none are committed.

The connected GitHub actions expose branch/file/PR operations but not standalone repository creation. The full source delivery includes a safe `scripts/create-repository.sh` bootstrap for an independently authenticated GitHub CLI to create a private standalone repository.

## Runbook

1. Use a clean extraction of the complete SiteLedger source delivery.
2. Review `docs/SETUP.md`, `docs/SECURITY.md`, and `docs/VERIFICATION.md`.
3. Create a new Supabase project; apply `supabase/schema.sql` there only.
4. Configure Auth, SMTP, bootstrap admin, private storage and Netlify environment variables.
5. Generate and commit the dependency lockfile in a network-enabled runner.
6. Pass the complete app/database/browser CI checks.
7. Perform real-account role/tenant/storage tests and a controlled Freshservice draft test.
8. Enable production deployment only after those checks. Do not disable the old Tally integration until cutover is verified.

The existing Express routes, main branch, client data and Freshservice articles are not modified by this tracking branch.
