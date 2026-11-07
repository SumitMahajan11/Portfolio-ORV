# Launch Checklist & Deployment Guide

This document defines the deployment, domain configuration, pre-launch verification tests, rollback procedures, and post-launch distribution plan for Sumit Mahajan's story portfolio.

---

## 1. Vercel Production Configuration

### A. Required Environment Variables
Configure these in the **Vercel Dashboard &rarr; Project Settings &rarr; Environment Variables**:

| Variable Name | Environment | Purpose | Sensitivity |
| :--- | :--- | :--- | :--- |
| `RESEND_API_KEY` | Production, Preview | API key from [Resend](https://resend.com) used to deliver contact inquiries. | **Secret** (Starts with `re_`) |
| `CONTACT_TO_EMAIL` | Production, Preview | The private destination inbox where visitor messages are sent. | **Private** |
| `CONTACT_FROM_EMAIL` | Production, Preview | Verified sending address (e.g. `onboarding@resend.dev` or `contact@yourdomain.com`). | Standard |
| `NEXT_PUBLIC_SITE_URL` | Production | Canonical site URL (e.g. `https://sumitmahajan.dev`). Sets metadataBase, OpenGraph URLs, and sitemap.xml. | Public |

> [!NOTE]
> In local development, these variables reside in `.env.local` (gitignored). Never commit actual API keys or personal destination email addresses to git.

### B. Deployment & Branch Settings
- **Production Branch**: `main`
- **Build Command**: `next build` (default)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)
- **Preview Deployment Protection**: Enable **Vercel Deployment Protection** under Settings &rarr; Deployment Protection to require team authentication on preview URLs. This prevents search engines from indexing incomplete preview branches or dev routes.

### C. Privacy & Analytics Policy
- **Default Policy**: **Analytics OFF**. In strict compliance with privacy standards, zero tracking scripts, telemetry pixels, or cookies are loaded.
- **Cookie-less Alternative (If Analytics Desired)**:
  If visitor traffic measurement is needed, use a strictly cookie-less, zero-PII privacy engine:
  - **Vercel Web Analytics** (in Cookieless Privacy Mode): Collects anonymous page view counts and Web Vitals without setting cookies or tracking IP addresses.
  - **Cloudflare Web Analytics**: 100% cookie-free JS beacon measuring visits and Core Web Vitals.
  - **Self-hosted Umami**: Open-source, GDPR-compliant analytics that stores no personal data.

---

## 2. Custom Domain & DNS Setup

> [!IMPORTANT]
> **Custom Domain Decision**:
> Do you already own a custom domain (e.g. `sumitmahajan.dev`, `sumitmahajan.me`, `sumit.tech`), or do you plan to launch on the default `sumit-portfolio.vercel.app` initially?

### DNS Configuration Steps (If Using Custom Domain)
1. In the Vercel Dashboard, navigate to **Settings &rarr; Domains**.
2. Enter your domain (e.g. `yourdomain.dev`).
3. Add the following DNS records at your domain registrar (Cloudflare, Namecheap, Porkbun, Google Domains/Squarespace):

| Type | Name / Host | Target / Value | TTL | Note |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `@` (apex) | `76.76.21.21` | Automatic / 300 | Vercel Anycast edge network IP |
| **CNAME** | `www` | `cname.vercel-dns.com` | Automatic / 300 | Handles `www` subdomain routing |

4. **HTTPS / SSL Certificate**: Automatically provisioned by Vercel via Let's Encrypt once DNS records resolve (typically 2–10 minutes).
5. **WWW & Apex Redirection**: In Vercel Domains, set the apex domain (`yourdomain.dev`) as Primary and configure `www.yourdomain.dev` to automatically redirect with HTTP 308 (Permanent Redirect).
6. **Update Canonical Site URL**: Once the domain resolves, update `NEXT_PUBLIC_SITE_URL=https://yourdomain.dev` in Vercel Environment Variables and trigger a fresh deployment so all OpenGraph metadata, JSON-LD schemas, and `sitemap.xml` point to the custom domain.

---

## 3. Pre-Launch Verification Tests (Manual Run Required)

Before public announcement, execute these 7 hands-on verification tests on the live production URL:

### 1. Mobile Contact Form End-to-End Test
- **Action**: Open the live site on a real mobile smartphone (iOS Safari or Android Chrome).
- **Steps**:
  1. Scroll down to the Act 6 contact section.
  2. Enter a test name, a valid email address, and a message (e.g. "Testing portfolio delivery from mobile").
  3. Tap **SEND**.
- **Verification**:
  - The submit button transitions to sending state without jumping or breaking layout.
  - A success confirmation banner appears: *"Message transmitted through the scenario channel."*
  - Check your destination inbox (`CONTACT_TO_EMAIL`) and verify the email arrived with the correct sender name, reply-to header, and formatted body.

### 2. Five Narrative Fragments Discovery Test
- **Action**: Verify that all 5 hidden fragments can be discovered and trigger notification banners:
  1. *Fragment 1*: Poke Biyoo companion 3+ times in the bottom corner.
  2. *Fragment 2*: In Scenario 1 (Edge-Cloud), toggle the Star-Network green routing path.
  3. *Fragment 3*: In Scenario 2 (Ratify), inspect the Hidden Leaf partition wall beat.
  4. *Fragment 4*: In Scenario 3 (iac-verifier), switch between the topology graph and Nen vow table.
  5. *Fragment 5*: Reach the Act 6 finale wall.

### 3. Sound System Permission & Fallback Test
- **Action**: Verify the audio system follows the zero-auto-play and denial-safe policy.
- **Steps**:
  1. On first visit, verify the sound toggle in the top-right reads **"Sound Off"** and no audio plays.
  2. Click **Sound Off**. The permission modal must appear: *"Enable sound effects?"*
  3. Press the `Escape` key. Verify the modal dismisses immediately without sound playing.
  4. Click **Sound Off** again and select **Enable Sound**. Verify subtle ambient chime plays and the toggle updates to **"Sound On (Click to turn off)"**.
  5. Click **Sound On**. Verify all audio immediately stops and state updates to muted.

### 4. Optional Camera Permission & Denial Test
- **Action**: Test the Act 6 "Let the story see you?" camera button.
- **Steps**:
  1. Click **"LET THE STORY SEE YOU?"**.
  2. When the browser displays the camera permission prompt, click **Block** / **Deny**.
- **Verification**:
  - The site must NOT crash or throw an unhandled error.
  - A polite inline notification must render: *"Camera access was denied. The story continues regardless."*
  - Verify that no network calls or uploads are attempted (processing is 100% local in canvas).

### 5. Slow 4G Real-Device Performance Test
- **Action**: Test on a physical smartphone under real cellular 4G (or Chrome DevTools throttled to Slow 4G / 4x CPU throttle).
- **Verification**:
  - Initial text paint loads in $< 2.5\text{s}$ with fonts rendering immediately via `display: swap`.
  - Cumulative Layout Shift (CLS) remains $< 0.05$ (no jarring jumps while images or SVGs load).
  - Native touch scrubbing remains fluid without sticky scroll lag.

### 6. Outbound Link & Public Channel Check
- **Action**: Verify every outbound anchor tag on the live site resolves with HTTP 200.
  - GitHub Profile: `https://github.com/SumitMahajan11` &rarr; Verified **HTTP 200**.
  - All public repository and demo links (once filled in `src/content/projects.ts`) &rarr; Must return **HTTP 200**.

### 7. Social Share Preview Debuggers
- **Action**: Test how the link unfurls on social platforms using official debuggers:
  - **Twitter / X**: [Twitter Card Validator](https://cards-dev.twitter.com/validator) or compose a draft tweet. Verify `summary_large_image` displays the dark void 1200x630 OG card with star motif and title.
  - **LinkedIn**: [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/). Verify title, description, and preview image cache correctly.
  - **WhatsApp / iMessage**: Send the link in a test chat. Verify the horn/star favicon mark and summary line render cleanly.

---

## 4. Rollback Plan (Vercel Instant Rollback)

If an unexpected critical issue or runtime regression occurs after a production deployment:

### Instant Rollback via Vercel Dashboard (Zero Rebuild Time)
1. Open the [Vercel Dashboard](https://vercel.com).
2. Select the `sumit-portfolio` project.
3. Click the **Deployments** tab.
4. Locate the last known good deployment (e.g. the commit preceding the bug).
5. Click the three dots (`...`) on the right side of that deployment row.
6. Click **Instant Rollback** (or **Promote to Production**).
7. **Result**: Vercel instantly routes edge traffic to the previous immutable deployment artifact in $< 1\text{ second}$. No rebuild or bundle compilation is required.

### Git Rollback (Keeping Git History Clean)
After rolling back on Vercel, revert the faulty commit locally:
```bash
# Revert the faulty commit
git revert <commit-hash>

# Push the revert to main
git push origin main
```
Vercel will automatically build and deploy the clean revert commit as the new production head.

---

## 5. Post-Launch Distribution Strategy

Once all pre-launch verification gates pass, place the live link in the following locations:

### 1. GitHub User Profile
- **Website Field**: Set `https://yourdomain.dev` (or `.vercel.app`) in your GitHub Profile settings.
- **GitHub Profile README (`SumitMahajan11/SumitMahajan11`)**:
  Add a prominent project badge or banner:
  ```markdown
  ### 📖 Interactive Story Portfolio
  Explore my distributed systems and formal verification scenarios:
  👉 [Sumit Mahajan — Story Portfolio](https://yourdomain.dev)
  ```
- **Flagship Repositories**:
  In the READMEs for `ratify` and `iac-verifier`, add a link back to the live interactive scenario visualizer.

### 2. LinkedIn Profile
- **Custom Profile Button**: Add a "View Portfolio" button pointing directly to your live URL.
- **Featured Section**: Add a link card to the top of your profile with the OpenGraph preview image.
- **Announcement Post**:
  Share a launch post highlighting:
  - The novel-inspired story portfolio structure (*Omniscient Reader's Viewpoint* theme).
  - The core focus: Distributed systems correctness, Raft consensus verification, and Z3 reachability.
  - The evidence-only philosophy: zero buzzwords, 100% verified test proofs.

### 3. Engineering Resume & CV
- **Header Contact Section**:
  ```text
  Sumit Mahajan | Pune, India
  GitHub: github.com/SumitMahajan11 | Portfolio: yourdomain.dev
  ```

### 4. Open-Source & Internship Applications
- **GSoC 2027 Proposals (CNCF / Kubeflow / KubeVirt)**:
  Include the link in your project proposals and cover letters as concrete, interactive proof of systems programming in Rust, TLA+ verification, and cloud orchestration.
