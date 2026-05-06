// Seed starting memory for all 6 employees
// Run: node seed-memory.js
// Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env.local

// Calls the live deployed API — no local credentials needed
const APP_URL = 'https://marketing-team-pi.vercel.app'

async function setMemory(employeeId, memory) {
  const res = await fetch(`${APP_URL}/api/memory/${employeeId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memory }),
  })
  const data = await res.json()
  console.log(`${employeeId}: ${data.ok ? '✓ seeded' : '✗ failed — ' + JSON.stringify(data)}`)
}

const memories = {
  maya: `## Current SEO Status (May 2026)

**afix.sg:**
- GSC property: https://www.afix.sg/ (URL prefix). Canonical fix just pushed — all pages now point to www.afix.sg.
- 9 redirect errors being resolved (afix.sg → www.afix.sg canonical mismatch, now fixed)
- 20 pages "discovered not indexed" — indexing requests submitted for priority pages
- Sitemap: https://www.afix.sg/sitemap.xml (34 URLs, all www)
- Priority location pages: Toa Payoh, Bishan, Ang Mo Kio, Kallang, Serangoon
- Symptom pages: /aircon-not-cold/, /aircon-leaking-water/ (high commercial intent)
- Pages live in repo: toa-payoh, bishan, ang-mo-kio, kallang, serangoon, aircon-not-cold, aircon-leaking-water

**atsell.io:**
- GSC property: sc-domain:atsell.io (domain property, covers all variants)
- 23 pages in sitemap — indexing requests submitted
- Platform pages: /shopee-partner, /lazada-partner, /tiktok-shop-partner
- Tools: /calculator, /seo-grader
- Blog: 7 articles live
- Competitor comparison pages: /vs/sci-ecommerce, /vs/anchanto, /vs/synagie, etc.
- Next priorities: internal linking between platform pages, /markets/singapore geo page

## Priority Tasks
- Brief Cole on which afix.sg estate pages are getting impressions once GSC data stabilises
- Build /markets/singapore and /markets/malaysia pages for atsell.io
- Add schema markup to all blog articles
- Weekly: resubmit sitemap after any new pages go live`,

  cole: `## Current Content Status (May 2026)

**afix.sg:**
- Active ad campaign targeting: Toa Payoh, Bishan, Kallang (group-buy mechanic)
- Need: 3 ad copy variations per active estate (FOMO / PAS / Direct)
- WhatsApp close script needs refresh for group-buy mechanic
- Landing page copy: progress bar labels, CTA, FAQ

**atsell.io:**
- Blog queue (write in this order):
  1. "How to sell on Shopee Singapore — complete guide 2024" (high volume)
  2. "What is Shopee Mall and how to get approved"
  3. "TikTok Shop live selling tips for brands"
  4. "How to increase Lazada conversion rate"
- All 7 existing blog articles are live and indexed (pending)
- Platform pages could use outcome-led hero copy refresh

## Brand Voice Reminders
- afix.sg: Singapore vernacular, direct, no fluff. "No funny charges." price-first.
- atsell.io: Authoritative, outcomes-first. Lead with "156% avg revenue growth", "100+ brands"
- Never write "we" for afix — write as the brand talking to homeowners
- Blog articles: 1000–1200 words, H2/H3 structure, one comparison table per article`,

  rex: `## Current Campaign Status (May 2026)

**afix.sg:**
- Platform: Meta (Facebook + Instagram)
- Objective: Messages (WhatsApp clicks)
- Budget: S$20/day per active ad set
- Active areas: Toa Payoh (primary), Bishan, Kallang
- Primary KPI: cost-per-WhatsApp-click (target: below S$4.00)
- Secondary KPI: landing page → WhatsApp CTR (flag if below 20%)
- A/B test phase: Phase 0 (let Meta optimise) — days 1–5 from launch
- Audience: SG, 28–55, interests: Home improvement, Carousell, PropertyGuru, Daikin, HDB
- Campaign structure: 1 campaign per area, 2–3 variations per ad set

**atsell.io:**
- No active paid campaigns
- Retargeting audience building: Calculator + SEO Grader users via Meta Pixel
- Monitor: competitor keyword buys on Google Ads for "ecommerce enabler Singapore"

## To Do
- When ad data is available: paste CSV from Meta Ads Manager into the Meta Ads panel for analysis
- Phase 1 test (days 6–14): FOMO hook vs Savings hook
- Brief Dani on creative needs before Phase 1 rotation`,

  cora: `## Current CRO Status (May 2026)

**afix.sg:**
- Landing page: /group-buy/index.html (progress bar + WhatsApp CTA)
- Progress bar rule: never show below 2/5 — seed with real bookings before launch
- Primary metric: landing page → WhatsApp CTR. Target: >20%. Flag if below.
- WhatsApp deep link must pre-fill: "I want to join the [Area] slot on [Date]"
- Active experiments: none yet — need baseline CTR data first
- Next experiment queue: CTA button copy, progress bar framing (X/10 vs X homes joined)

**atsell.io:**
- Fee Calculator (/calculator): optimize post-result CTA (email capture or WhatsApp)
- SEO Grader (/seo-grader): same — add capture after results shown
- Testimonials: currently in carousel — recommend rendering all 3 in DOM
- Contact form: minimize fields, single clear CTA

## Metrics to Watch
- afix.sg: WhatsApp click-through rate from landing page
- atsell.io: Calculator bounce rate, time-on-page, tool completion rate`,

  dani: `## Brand Guidelines (May 2026)

**afix.sg brand:**
- Primary colours: Navy #0B1829, Blue #4A90D9, Gold #C9A026
- Fonts: Playfair Display (headings), DM Sans (body)
- Ad creative style: action shots (water jet), technician at work, before/after
- Hero video: Prabha walkthrough — cut for 1:1 (feed), 9:16 (stories/reels), 16:9 (desktop)
- Default ad thumbnail: water jet action shot (IMG_1827)
- Progress bar: must look like a live counter — not a generic widget

**atsell.io brand:**
- Professional, modern, SEA credibility
- Platform logos: Shopee orange, Lazada red, TikTok black/red — use official guidelines
- OG images: 1200×630px, branded, title text overlay
- Social graphics: lead with data ("156% avg revenue growth", "100+ brands", "Since 2019")

## Asset Queue
- afix.sg: 3 Meta ad creatives for Toa Payoh Phase 1 (FOMO hook variation)
- atsell.io: OG images for all 7 blog articles
- atsell.io: Platform page hero visuals (Shopee/Lazada/TikTok logos + outcome stats)

## Higgsfield Access
- Image generation: Flux (photorealistic) or Soul (artistic) models
- Video generation: DOP Turbo
- Use the Higgsfield panel in the sidebar to generate assets directly`,

  iris: `## Competitive Intel Summary (May 2026)

**afix.sg competitors:**
- Urban Company: funded, app-based, FoamJet S$20/unit — MAIN THREAT. Watch pricing.
- IHome-Solution: running "Reserve your spot" mechanic — close to group-buy language
- Affordable Aircon, ACare, Optimal: running "$10 from 2nd unit" — saturated, 4 brands, avoid
- SUNNY Aircon, Premium Aircon Services, Everest Aircon, Upton: monitoring
- Confirmed whitespace (PROTECT): group-buy mechanic + location clustering — no one doing this
- Progress bar social proof: no competitor running it yet

**atsell.io competitors:**
- SCI Ecommerce, Anchanto, Synagie, aCommerce, Leap Commerce, Ban Leong, Intrepid
- Comparison pages live: /vs/sci-ecommerce, /vs/anchanto, /vs/synagie, /vs/acommerce, /vs/ban-leong, /vs/intrepid, /vs/leap-commerce
- Key differentiator: official partner of Shopee + Lazada + TikTok Shop simultaneously
- SEA geo expansion timing: VN, TH, PH — monitor market readiness

## Alert Conditions
- If any competitor adopts group-buy or location-clustering for aircon → escalate immediately
- If Urban Company or new entrant undercuts S$20/unit → flag pricing review
- If competitors build fee calculators or listing graders for atsell.io space → flag immediately`,
}

async function main() {
  console.log('Seeding employee memories...\n')
  for (const [id, memory] of Object.entries(memories)) {
    await setMemory(id, memory)
  }
  console.log('\nDone.')
}

main().catch(console.error)
