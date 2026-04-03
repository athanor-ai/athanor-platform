# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Athanor Platform, please report it
responsibly. **Do not open a public GitHub issue.**

Email: **security@athanor.dev**

Please include:

- A description of the vulnerability and its potential impact
- Steps to reproduce the issue
- Any relevant logs, screenshots, or proof-of-concept code

We will acknowledge receipt within **48 hours** and aim to provide a fix or
mitigation plan within **7 business days**.

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.x     | Yes       |

## Security Architecture

### Row Level Security (RLS)

All Supabase tables have RLS enabled with explicit policies that enforce
tenant isolation based on organization membership. See
`supabase/migrations/20250102000000_add_rls_policies.sql` for the full policy
set.

### Credential Handling

- API key material is stored encrypted in the `credentials` table.
- The client/UI only receives safe metadata (`CredentialSummary` type) —
  never the `encrypted_key` column.
- The `SUPABASE_SERVICE_ROLE_KEY` is server-only and never exposed to the
  browser.

### CI Security Checks

- **Gitleaks** secret scanning runs on every push and PR.
- **Dependabot** monitors npm dependencies for known vulnerabilities.
- The CI pipeline enforces lint, typecheck, and build on every PR.

## Dependency Management

This project uses [Dependabot](.github/dependabot.yml) to automatically
monitor and update dependencies with known security advisories.
