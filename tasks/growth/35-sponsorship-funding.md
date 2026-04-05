# Task 35: Sponsorship & Funding

## Goal
Set up funding infrastructure to sustain full-time development. Funded projects ship faster, which drives more growth.

## Context
Projects with sponsors signal longevity and seriousness. Developers are more likely to depend on a funded project. Funding also enables hiring contributors, paying for infrastructure, and attending conferences.

## Requirements

### 1. GitHub Sponsors
- Set up GitHub Sponsors profile for the maintainer(s)
- Create tiers:
  - **$5/mo** — Supporter: name in README sponsors section
  - **$25/mo** — Backer: name + link in README, Discord role
  - **$100/mo** — Silver Sponsor: logo in README, priority issue responses
  - **$500/mo** — Gold Sponsor: large logo in README + docs site, monthly check-in
  - **$2,000/mo** — Platinum: logo on landing page, dedicated support channel, feature input

### 2. Open Collective
- Create Open Collective for transparent fund management
- Allows corporate sponsors (companies can expense it)
- Transparent spending (builds trust)

### 3. FUNDING.yml
```yaml
# .github/FUNDING.yml
github: [maintainer-username]
open_collective: swarming
```

### 4. Sponsors Section in README
```markdown
## Sponsors

### Platinum
<!-- Platinum sponsors here -->

### Gold
<!-- Gold sponsors here -->

### Silver
<!-- Silver sponsors here -->

### Backers
<!-- Individual backers here -->

[Become a sponsor →](https://github.com/sponsors/maintainer)
```

### 5. Sponsors on Landing Page
- Dedicated section showing sponsor logos
- Auto-updated from GitHub Sponsors API
- "Your logo here" placeholder to encourage sponsorship

### 6. Sponsorship Pitch Document
For reaching out to companies:
```
Subject: Sponsoring Swarming — Open Source Data Visualization

Swarming is an open-source GPU-accelerated visualization engine used 
by X developers (Y GitHub stars, Z weekly npm downloads).

Sponsorship benefits:
- Logo visibility to [audience size] developers monthly
- Priority feature requests
- Direct communication channel with maintainers
- Brand association with cutting-edge open source

[Include metrics: stars, downloads, website traffic, Discord members]
```

### 7. Target Sponsors
Companies that benefit from the project's success:
- **Cloud providers**: Vercel, Netlify, Cloudflare (hosting the demo)
- **Data companies**: Datadog, Grafana, New Relic (monitoring viz)
- **Blockchain**: Solana Foundation, Alchemy, Infura (blockchain viz)
- **Developer tools**: JetBrains, GitHub, GitLab
- **Open source funds**: Google Open Source, FOSS Fund

## Files to Create/Modify
- `.github/FUNDING.yml`
- `README.md` — sponsors section
- `docs/sponsors/pitch.md` — outreach document
- Landing page — sponsors component
