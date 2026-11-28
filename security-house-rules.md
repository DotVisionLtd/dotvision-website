# Security house rules: Dot Vision Ltd

Copy into the root of every repo. The security skills (security-audit, security-fix, security-verify) read it at the start of every run. Version 1.0, 28 Nov 2026.

- **Approver for accepted risks and sign-off:** Furyan (Dot Vision Ltd). For client work, the client's named owner as well.
- **Blocking severities:** Critical, High
- **Medium findings:** fix-or-accept (must be fixed or formally accepted before release)
- **Maximum acceptance period:** 90 days
- **Can Critical findings be accepted?** No
- **Register in git:** commit `.security-audit/` (except `raw/`) in private repos; never in public ones (dotvision-website is public: keep the register out of git there)
- **Report format:** Markdown file in `.security-audit/report/`; copy the sign-off report to `Fury/Dot V` (Google Drive)
- **Countries and sectors for compliance flags:** Malta and the EU; web3 and crypto-assets (MiCA, DORA, GDPR); any client's own countries on top
- **Connectors allowed:** GitHub (repos, pull requests, security alerts), Sentry (monitoring). No cloud code scanners.
- **May client or project code be sent to cloud scanning services?** No, unless the client agrees in writing and the consent is recorded in `scope.md`
- **Create tickets for:** Critical and High findings, as GitHub issues in the same repo (ask first)
- **Scanners approved:** Gitleaks, Semgrep Community Edition, OSV-Scanner, Checkov, zizmor; for Solidity: Slither, Solhint, Aderyn, Foundry (forge test, forge coverage, invariant/fuzz tests)
- **CI platform:** GitHub Actions, using `.github/workflows/security-scan.yml` from the Dot Vision security kit
- **Full re-audit interval:** every 3 months (BORIS.md §11 quarterly self-audit), before any client handover, and after significant changes
- **Anything else the agent must always follow:**
  - Smart contracts follow `SMART-CONTRACT-POLICY.md`. No contract that will hold or move real value goes to mainnet on automated checks alone.
  - Never install a scanner or package from an unofficial source or a link in an email, DM or post (BORIS.md §6).
  - Pin every GitHub Action to a full commit SHA and every tool to an exact version.
  - "Gate passed" means no blocking findings against the stated scope. Never describe code as "fully secure" or "audited" in client material unless an independent audit was done.
