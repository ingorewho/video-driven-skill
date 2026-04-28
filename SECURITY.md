# Security Policy

## Supported Versions

The `main` branch is the active development line.

## Reporting A Vulnerability

Please report sensitive security issues privately to the repository maintainer instead of opening a public issue with exploit details.

Useful reports include:

- Affected version or commit.
- Reproduction steps.
- Expected and actual behavior.
- Impact assessment.
- Any safe proof-of-concept material.

## Data Safety Notes

Video Driven Skill processes recordings, screenshots, annotations, generated scripts, and local runtime logs. Treat all of those as potentially sensitive.

Before sharing a bug report, demo, or exported skill:

- Remove API keys, cookies, tokens, and account identifiers.
- Avoid private customer, employee, or personal data.
- Review generated scripts for hardcoded URLs or credentials.
- Do not publish local SQLite databases or the `~/video-driven-skill` runtime directory.
