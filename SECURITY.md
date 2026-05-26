# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.x     | ✅ Active |

The project is pre-1.0. The most recent `main` branch is what we patch.

## Reporting a Vulnerability

**Do not open a public issue for security vulnerabilities.**

Instead, please report via one of:

1. **GitHub Security Advisories** (preferred) — use the "Report a vulnerability" button on the [Security tab](https://github.com/YOUR_USERNAME/Infiniteworlds/security).
2. **Email** — replace with your real contact: `security@your-domain.example`

Include:
- Description of the issue and impact
- Steps to reproduce (proof-of-concept code if applicable)
- Affected file paths and commit SHA
- Your name/handle for credit (optional)

You should receive an acknowledgment within **72 hours**. We aim to ship a fix within **14 days** for high-severity issues.

## What Counts as a Security Issue

✅ In scope:
- API key/credential leakage in code or logs
- SQL injection via the SQLite layer
- Prompt injection vectors that could exfiltrate user data
- XSS through the dialogue/narrative rendering
- Audio file upload endpoints accepting non-audio payloads
- WebSocket message handling vulnerabilities

❌ Out of scope:
- Vulnerabilities in third-party services (ElevenLabs, Meshy.ai, 9router) — report to those vendors directly
- Issues requiring physical access or a fully compromised host
- Rate limiting or DoS without a meaningful escalation path
- Issues in unsupported or forked deployments

## Responsible Disclosure

We follow coordinated disclosure. Please give us a reasonable window to patch before public disclosure (typically 90 days, or sooner if a fix ships). Credit will be given in the [CHANGELOG.md](./CHANGELOG.md) and release notes.

## Security Hardening Notes

If you deploy Infiniteworlds publicly, review:

- Set `CLIENT_URL` strictly in `.env` (CORS lockdown)
- Run behind HTTPS — voice APIs require secure context
- Don't expose port 3001 directly; reverse-proxy through nginx/Caddy
- Rotate ElevenLabs/Meshy keys regularly
- The SQLite database is unencrypted by default — encrypt at rest if hosting user data
