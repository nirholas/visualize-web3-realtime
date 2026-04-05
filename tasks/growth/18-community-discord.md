# Task 18: Community Discord Server

## Goal
Create and seed a Discord community that becomes the default place for swarming users to get help, share what they build, and contribute.

## Context
Every major open-source project has a Discord or Slack. Discord is better for open-source because it's free, has great developer features (threads, forums, code blocks), and developers already have accounts. A healthy Discord converts users into contributors.

## Requirements

### 1. Server Structure
```
swarming
├── 📢 INFORMATION
│   ├── #welcome           — Server rules, quick links
│   ├── #announcements     — Releases, blog posts, events
│   └── #roadmap           — Current priorities, what's next
├── 💬 COMMUNITY
│   ├── #general           — General discussion
│   ├── #showcase          — "Built with Swarming" (with image embeds)
│   ├── #ideas             — Feature suggestions
│   └── #off-topic         — Non-swarming chat
├── 🔧 HELP
│   ├── #getting-started   — Installation, first steps
│   ├── #troubleshooting   — Bug reports, debugging
│   ├── #providers         — Data source questions
│   └── #performance       — Optimization questions
├── 🛠️ DEVELOPMENT
│   ├── #contributing      — PR discussion, code reviews
│   ├── #architecture      — Design decisions
│   └── #plugins           — Plugin development
└── 🤖 BOTS
    └── #github-feed       — Auto-posted: new issues, PRs, releases
```

### 2. Bots & Integrations
- **GitHub bot**: Post new issues, PRs, and releases to #github-feed
- **Welcome bot**: Greet new members with quick-start guide
- **Star count bot**: Display current star count in server sidebar
- **npm bot**: Post new version releases
- **Moderation**: AutoMod for spam, link filtering

### 3. Roles
- `@maintainer` — Core team
- `@contributor` — Has merged a PR
- `@plugin-author` — Has published a plugin
- `@community` — Default role for verified members

### 4. Onboarding Flow
New member joins → sees #welcome with:
```
Welcome to swarming! 🎉

Quick links:
→ GitHub: github.com/swarming-vis/swarming
→ Docs: swarming.dev/docs
→ Playground: swarming.dev/playground
→ npm: npmjs.com/package/swarming

Get started:
1. npm install swarming
2. Check out #getting-started for tutorials
3. Share what you build in #showcase!

Need help? Ask in #troubleshooting
Want to contribute? Check #contributing
```

### 5. Seeding Strategy
Before public launch:
- Invite 10-20 early users/testers
- Seed #showcase with 3-4 example visualizations
- Post the first #announcements entry (project intro)
- Answer a few planted questions in #getting-started
- Pin the "Quick Start" message in every help channel

### 6. Moderation
- Require email verification
- No invite link spam
- Auto-delete messages with suspicious links
- Slowmode on #general (10 seconds) during traffic spikes

## Files to Create
- `docs/community/discord.md` — Discord setup instructions and channel descriptions
- Add Discord invite link to: README.md, docs site nav, landing page, GitHub repo description
