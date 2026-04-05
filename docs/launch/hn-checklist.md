# Hacker News Launch Checklist

Internal checklist — complete every item before submitting to HN.

## Demo Readiness

- [ ] Live demo at production URL loads in <3 seconds
- [ ] Works on mobile (test iPhone Safari, Android Chrome)
- [ ] No API keys, auth, or signup required to try
- [ ] Fallback to mock/demo data if WebSocket source is overwhelmed
- [ ] Test with throttled connection (Chrome DevTools → Slow 3G)
- [ ] Test with 10,000+ simulated concurrent connections or confirm auto-scaling

## README

- [ ] Hero GIF/video optimized (<5MB), loads instantly
- [ ] "Get started in 30 seconds" section with copy-pasteable commands
- [ ] All links verified (no 404s)
- [ ] No broken images
- [ ] MIT license clearly stated in README and LICENSE file
- [ ] Badges: CI status (green), npm version, license

## Repository Health

- [ ] >10 meaningful commits in the last week
- [ ] Issue templates configured (`.github/ISSUE_TEMPLATE/`)
- [ ] CI pipeline passing (GitHub Actions green badge)
- [ ] At least 10-20 initial stars from colleagues/friends (organic, not coordinated)
- [ ] CONTRIBUTING.md exists
- [ ] No secrets, API keys, or .env files committed

## Infrastructure

- [ ] Deployed to auto-scaling platform (Vercel / Cloudflare)
- [ ] Monitoring set up (Vercel Analytics or equivalent)
- [ ] WebSocket provider can handle traffic spike or gracefully degrades
- [ ] Error boundaries in place — no white screens on failure
- [ ] CDN caching configured for static assets

## Content Prepared

- [ ] First comment drafted and reviewed (see `hn-comment.md`)
- [ ] FAQ answers reviewed (see `faq.md`)
- [ ] Tweet/social posts drafted with video clip
- [ ] Reddit posts drafted for r/javascript, r/reactjs, r/dataisbeautiful

## Timing

- [ ] Submission scheduled for Tuesday–Thursday, 8–10am ET
- [ ] No major tech news breaking that day
- [ ] Team available to monitor and respond for 6 hours post-submission

## Final Go/No-Go

- [ ] One person has tested the full flow end-to-end on a clean device
- [ ] Demo URL confirmed live and responsive
- [ ] GitHub repo is public
- [ ] npm package published (if applicable)
