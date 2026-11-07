# Production Deployment Runbook

**Site**: Sumit Mahajan — Distributed Systems & Correctness Portfolio  
**Framework**: Next.js 16.4.5 (App Router, Turbopack)  
**Hosting Target**: Vercel (Serverless / Edge Infrastructure)  
**Date**: November 2026  

---

## 1. Overview & Build Alignment

### Build Command & Compiler
- **Local build script** (`package.json`): `npm run build` &rarr; `next build`
- **Vercel build command**: `next build`
- **Both build commands match identically.**

### Why `--webpack` is NOT Used
1. **Turbopack Default**: Next.js 16 uses Turbopack as its default production compiler for `next build`.
2. **Tailwind Integration**: The configuration in [`next.config.ts`](file:///c:/Sumit%20Portfolio/next.config.ts) uses `@tailwindcss/turbopack` loader rules (`loaders: ["@tailwindcss/turbopack"]`). Running with `--webpack` would bypass these rules and require legacy Webpack CSS loader plugins.
3. **Build Performance**: Turbopack yields faster compilation times, lower memory consumption, and tree-shaken static chunks.
4. **Zero Legacy Shims**: The codebase does not rely on legacy Webpack plugins or custom webpack configuration overrides.

---

## 2. Required Environment Variables

Configure these variables in your hosting provider's dashboard (e.g. **Vercel Project Settings &rarr; Environment Variables**).  
> [!IMPORTANT]
> **Security Policy**: Only variable names are documented below. Never commit real values, tokens, or secret keys to Git.

| Variable Name | Environment | Purpose |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SITE_URL` | Production & Preview | Canonical production URL (e.g. `https://sumitmahajan.dev`). Used for canonical meta tags, OpenGraph URLs, JSON-LD, and XML sitemaps. |
| `RESEND_API_KEY` | Production & Preview (Secret) | Resend API authorization key (starts with `re_`). Kept exclusively on the server side; never prefixed with `NEXT_PUBLIC_`. |
| `CONTACT_TO_EMAIL` | Production & Preview (Secret) | The private destination inbox where visitor messages submitted via `/api/contact` are delivered. |
| `CONTACT_FROM_EMAIL` | Production & Preview | The sender email address used in Resend transactional dispatches. See Section 4 for free-tier rules. |

---

## 3. Step-by-Step Vercel Deployment

Because automated assistants cannot and should not access your personal hosting accounts, follow these manual steps to deploy:

### Step 1: Push Repository
Ensure all commits (through `phase6-4: deploy config`) are pushed to your remote Git repository:
```bash
git push origin <your-branch>
```

### Step 2: Import into Vercel
1. Log in to your [Vercel Dashboard](https://vercel.com).
2. Click **Add New... &rarr; Project**.
3. Select your Git provider and import the `Sumit Portfolio` repository.

### Step 3: Configure Project Settings
- **Framework Preset**: `Next.js`
- **Root Directory**: `./`
- **Build Command**: `next build` (leave default)
- **Output Directory**: `.next` (leave default)
- **Install Command**: `npm install` (leave default)

### Step 4: Set Environment Variables
In the **Environment Variables** section of the setup screen, add:
- `NEXT_PUBLIC_SITE_URL` = `https://your-domain.dev` (or your assigned `.vercel.app` URL initially)
- `RESEND_API_KEY` = your Resend API key (`re_...`)
- `CONTACT_TO_EMAIL` = your destination email address
- `CONTACT_FROM_EMAIL` = `onboarding@resend.dev` (or your verified domain sender)

### Step 5: Deploy
Click **Deploy**. Vercel will run `next build` using Turbopack and deploy the static pages and the `/api/contact` serverless function.

---

## 4. Resend Free Tier Sender & Recipient Rule

> [!WARNING]
> **Resend Free Tier Restriction**:
> On the Resend free tier without a custom verified domain:
> 1. `CONTACT_FROM_EMAIL` **must** be set to `onboarding@resend.dev`.
> 2. `onboarding@resend.dev` **strictly delivers only to the email address registered with your Resend account**.
> 3. Attempting to deliver messages to any other email address in `CONTACT_TO_EMAIL` will cause Resend's API to reject the request with HTTP 403 `validation_error`.

### Delivering to Any Inbox (Custom Domain Setup)
If your desired `CONTACT_TO_EMAIL` is different from your Resend registration address:
1. In the [Resend Dashboard](https://resend.com/domains), click **Add Domain**.
2. Enter your domain (e.g. `sumitmahajan.dev`).
3. Add the DNS records provided by Resend to your domain registrar (DKIM TXT/CNAME, SPF TXT, MX).
4. Once verified, change `CONTACT_FROM_EMAIL` in Vercel to `contact@sumitmahajan.dev` (or `noreply@sumitmahajan.dev`).
5. You can now deliver to any email address specified in `CONTACT_TO_EMAIL`.

---

## 5. Custom Domain Configuration Steps

1. In the Vercel Dashboard, go to **Project Settings &rarr; Domains**.
2. Enter your domain name (e.g., `sumitmahajan.dev`) and click **Add**.
3. Choose whether to redirect `www.sumitmahajan.dev` to `sumitmahajan.dev` (recommended).
4. In your DNS provider (e.g., Cloudflare, Namecheap, Porkbun):
   - **Apex Record (`@`)**: Type `A`, Value `76.76.21.21`
   - **Subdomain Record (`www`)**: Type `CNAME`, Value `cname.vercel-dns.com`
5. Vercel automatically generates and renews a free Let's Encrypt SSL/TLS certificate once DNS propagation completes.
6. Update `NEXT_PUBLIC_SITE_URL` in Vercel Environment Variables to your custom domain (`https://sumitmahajan.dev`).

---

## 6. How to Test the Contact Form After Deployment

Follow this exact test sequence on your live production URL:

1. **Open Developer Tools**:
   - Open Chrome/Edge/Firefox DevTools and go to the **Console** and **Network** tabs.
2. **Navigate to Contact**:
   - Visit `https://your-domain.dev/#contact` or click **"Skip to contact &rarr;"** in the header.
3. **Fill Out Form Data**:
   - **Your Name**: `Sumit Deploy Test`
   - **Your Email**: A valid email (e.g., `test@example.com`)
   - **Your Inquiry**: Enter a message of at least 10 characters (e.g. `Testing production contact delivery via Resend API.`)
   - Leave the invisible `company` honeypot field untouched.
4. **Submit**:
   - Wait at least 3 seconds before clicking submit (ensures the anti-bot `durationMs >= 3000` check passes).
   - Click **"Transcribe Message &rarr;"**.
5. **Verify Network Response**:
   - In the DevTools Network tab, inspect the request:
     - `POST /api/contact`
     - Status: `200 OK`
     - Response Body: `{"success": true}`
6. **Verify Email Delivery**:
   - Check the destination inbox (`CONTACT_TO_EMAIL`).
   - Check the [Resend Dashboard Emails Tab](https://resend.com/emails) to verify the message shows status **"Delivered"**.

---

## 7. Rollback Plan (Instant Zero-Downtime Rollback)

Every Vercel deployment creates an immutable build snapshot. If any regression occurs after a production release:

1. Open the [Vercel Dashboard](https://vercel.com) and navigate to your project.
2. Click the **Deployments** tab.
3. Find the previous stable deployment in the list.
4. Click the three horizontal dots (`...`) on the right side of that deployment row.
5. Select **"Promote to Production"**.
6. Vercel will instantly shift 100% of production traffic back to that deployment with **zero rebuild delay and zero downtime**.

---

## 8. Rate Limiting Note & Free Production Upgrade Option

### Current Implementation (Best-Effort)
The contact API endpoint ([`src/app/api/contact/route.ts`](file:///c:/Sumit%20Portfolio/src/app/api/contact/route.ts)) implements an in-memory sliding window rate limiter (`5 requests per 10 minutes per IP`).

> [!NOTE]
> **Serverless Limitation**:
> In-memory rate limiting is **best-effort** on Vercel and similar serverless platforms. Serverless instances are stateless, scale horizontally across multiple isolated containers, and restart on cold boots. A determined spammer hitting different function instances might bypass an in-memory map.

### Recommended Free Upgrade Option (Upstash Redis)
If you require strict, globally coordinated rate limiting in production:
- **Upstash Redis Free Tier**: Provides 10,000 commands/day free with no credit card required.
- **Library**: `@upstash/ratelimit` paired with `@upstash/redis` (native HTTP fetch, zero persistent connections required).
- *Per project guidelines: Do not add or provision external services without explicit confirmation.*

---

## 9. Security Headers Configuration

The production server emits strict security headers configured in [`next.config.ts`](file:///c:/Sumit%20Portfolio/next.config.ts):

| Header | Configured Value | Verification Status |
| :--- | :--- | :---: |
| **Content-Security-Policy** | `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';` | **PASS (0 violations)** |
| **Permissions-Policy** | `camera=(self), microphone=(), geolocation=(), browsing-topics=(), payment=(), usb=(), interest-cohort=(), accelerometer=(), gyroscope=(), magnetometer=(), display-capture=(), sync-xhr=()` | **PASS (Camera verified)** |
| **Referrer-Policy** | `strict-origin-when-cross-origin` | **PASS** |
| **X-Content-Type-Options** | `nosniff` | **PASS** |
| **X-Frame-Options** | `DENY` | **PASS** |

To test these headers on your live domain after deployment:
```bash
curl -I https://your-domain.dev
```

---

## 10. Post-Deployment Bundle Privacy Audit

After running the production build or deployment, run the bundle privacy audit to guarantee no private email addresses or secrets leaked into public client chunks:

```bash
node scripts/verify-bundle-privacy.mjs
```

**Expected Result**:
```text
Bundle Privacy Audit: 0 email hits detected.
PASS: No personal or recipient email addresses leaked in client bundles or server page outputs.
```
