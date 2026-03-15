# Security Policy

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Email your findings to the maintainers (see `package.json` for contact). Include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested mitigations

We will acknowledge receipt within **48 hours** and aim to publish a fix within **14 days** for critical issues.

## Supported Versions

Only the latest release on `main` receives security patches.

## JWT_SECRET Requirements

`JWT_SECRET` must be at least 32 characters long. The setup script generates a cryptographically random 48-byte secret automatically — use it. Never use the `docker-local-jwt-secret-change-in-production` default in any internet-facing deployment.

## Disclosure Policy

We follow [responsible disclosure](https://en.wikipedia.org/wiki/Responsible_disclosure). Once a fix is released, we will publish a summary in `CHANGELOG.md` crediting the reporter (unless they prefer to remain anonymous).
