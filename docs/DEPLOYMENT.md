# Deployment Guide

This guide explains how to deploy the Zakah Calculator to various hosting platforms.

## Table of Contents

1. [Overview](#overview)
2. [Deployment to GitHub Pages](#deployment-to-github-pages)
3. [Deployment to Vercel](#deployment-to-vercel)
4. [Deployment to Netlify](#deployment-to-netlify)
5. [Deployment to AWS S3](#deployment-to-aws-s3)
6. [Custom Domain Setup](#custom-domain-setup)
7. [HTTPS Configuration](#https-configuration)
8. [GitHub Actions for Automated Deployments](#github-actions-for-automated-deployments)
9. [Automated Price Updates](#automated-price-updates)
10. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Overview

The Zakah Calculator is a **static website** — it requires no server-side runtime or database. This makes deployment simple and cost-effective.

### Deployment Requirements

- **Web server** that serves static files (HTML, CSS, JavaScript, JSON)
- **HTTPS recommended** (for Service Worker and PWA features)
- **HTTP/2 support** (optional but improves performance)
- **Gzip compression** (optional but reduces file sizes)

### Deployment Options

| Platform | Cost | Ease | HTTPS | Notes |
|----------|------|------|-------|-------|
| **GitHub Pages** | Free | ✅✅✅ | Auto | Recommended for GitHub projects |
| **Vercel** | Free | ✅✅✅ | Auto | Optimized for static sites |
| **Netlify** | Free | ✅✅✅ | Auto | Great alternative to Vercel |
| **AWS S3** | Cheap | ✅✅ | ❌ (requires CloudFront) | Scalable, good for large traffic |
| **Self-hosted** | Variable | ✅ | DIY | Full control, requires own server |

---

## Deployment to GitHub Pages

### Method 1: Automatic (from main branch)

**Pros**: Simplest method, automatic on every commit

**Steps**:

1. **Go to repository settings**:
   - GitHub repo → **Settings** → **Pages**

2. **Configure Pages source**:
   - Source: `Deploy from a branch`
   - Branch: `main` (or `master`)
   - Folder: `/ (root)`
   - Click **Save**

3. **Wait for deployment**:
   - GitHub automatically builds and deploys
   - Visit: `https://YOUR-USERNAME.github.io/zakah/`

4. **Check status**:
   - Go to **Deployments** tab in repo
   - View deployment history and logs

### Method 2: Build from different branch

If you want to use a specific branch (e.g., `deploy` or `production`):

1. Go to **Settings** → **Pages**
2. Select the desired branch and folder
3. Click **Save**
4. Deploy happens on every push to that branch

### Adding Custom Domain

See [Custom Domain Setup](#custom-domain-setup) below.

### Automatic Deploys on New Releases

You can set up GitHub Actions to deploy only on new releases:

```yaml
# .github/workflows/deploy.yml
name: Deploy on Release

on:
  release:
    types: [published]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to GitHub Pages
        run: echo "Deploy triggered by release"
```

---

## Deployment to Vercel

Vercel is specifically optimized for static sites and SPA deployments.

### Step 1: Sign Up

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub, GitLab, or Bitbucket
3. Authorize Vercel to access your repositories

### Step 2: Import Project

1. Click **New Project**
2. Select your **zakah** repository
3. Vercel auto-detects it's a static site
4. Click **Deploy** (no configuration needed)

### Step 3: Configure (Optional)

In **Project Settings** → **Build & Development Settings**:
- **Build Command**: (leave empty for static)
- **Output Directory**: (leave empty)
- **Install Command**: (leave empty)

### Step 4: Deploy

1. Vercel deploys immediately
2. URL: `https://zakah.vercel.app/` (or your custom domain)
3. Every push to `main` triggers auto-deploy

### Preview Deployments

Vercel creates preview deployments for every PR:
- View at: `https://zakah-pr-123.vercel.app/`
- Great for testing before merging

---

## Deployment to Netlify

Netlify is another excellent option with similar features to Vercel.

### Step 1: Connect Repository

1. Go to [netlify.com](https://netlify.com)
2. Click **Add new site** → **Import an existing project**
3. Choose Git provider (GitHub, GitLab, Bitbucket)
4. Select **zakah** repository

### Step 2: Configure Build

Leave default settings:
- **Build command**: (empty)
- **Publish directory**: `/` (root)
- Click **Deploy**

### Step 3: Customize Domain

1. After deployment, go to **Site settings** → **Domain management**
2. Change site name or add custom domain
3. Enable HTTPS (automatic)

### Netlify Features

- **Serverless functions** (optional for advanced features)
- **Form submissions** (not needed for this project)
- **Analytics** (optional)

---

## Deployment to AWS S3

For larger scale deployments or if you prefer AWS:

### Step 1: Create S3 Bucket

```bash
aws s3 mb s3://zakah-calculator

# Enable static website hosting
aws s3 website s3://zakah-calculator \
  --index-document index.html \
  --error-document index.html
```

### Step 2: Upload Files

```bash
# Sync entire directory to S3
aws s3 sync . s3://zakah-calculator \
  --exclude ".git/*" \
  --exclude ".github/*" \
  --exclude "node_modules/*" \
  --exclude ".env"
```

### Step 3: Set Permissions

```bash
# Make objects public
aws s3 cp s3://zakah-calculator \
  --recursive \
  --acl public-read
```

### Step 4: Enable CloudFront (for HTTPS)

1. Go to **CloudFront** in AWS Console
2. Click **Create distribution**
3. Origin domain: your S3 bucket
4. Enable HTTPS
5. Deploy

### Step 5: Custom Domain

1. In **Route 53**, create record pointing to CloudFront
2. Or use your registrar's DNS to point to CloudFront URL

---

## Custom Domain Setup

### Method 1: GitHub Pages with Custom Domain

1. **Purchase domain** from registrar (Namecheap, GoDaddy, etc.)

2. **Configure DNS** at registrar:
   - **CNAME record**: `zakah.example.com` → `YOUR-USERNAME.github.io`
   - Or **A records**: Point to GitHub's IP addresses

   **GitHub's A records**:
   ```
   185.199.108.153
   185.199.109.153
   185.199.110.153
   185.199.111.153
   ```

3. **GitHub Pages settings**:
   - **Settings** → **Pages** → **Custom domain**
   - Enter: `zakah.example.com`
   - Check **Enforce HTTPS**
   - Click **Save**

4. **Wait for DNS propagation** (5-30 minutes)

5. **Verify**: Visit `https://zakah.example.com`

### Method 2: Vercel with Custom Domain

1. In Vercel **Project Settings** → **Domains**
2. Click **Add Domain**
3. Enter your custom domain: `zakah.example.com`
4. Vercel shows DNS instructions
5. Update your registrar's DNS settings
6. Vercel auto-enables HTTPS (via Let's Encrypt)

### Method 3: Netlify with Custom Domain

1. In Netlify **Site settings** → **Domain management**
2. Click **Add custom domain**
3. Enter domain name
4. Netlify checks DNS and provides instructions
5. Update registrar DNS settings if needed
6. HTTPS auto-enabled

---

## HTTPS Configuration

### For GitHub Pages

**Automatic** — GitHub Pages provides free HTTPS via Let's Encrypt.

To enforce HTTPS:
1. **Settings** → **Pages** → **Custom domain** (if using one)
2. Check **Enforce HTTPS** checkbox
3. Wait 5 minutes for certificate generation
4. Test: Visit your site, verify lock icon in browser

### For Vercel / Netlify

**Automatic** — Both platforms auto-generate SSL certificates via Let's Encrypt.

No configuration needed; HTTPS is enforced by default.

### For AWS S3 + CloudFront

1. **CloudFront distribution** must be configured for HTTPS
2. **AWS Certificate Manager** (ACM):
   - Request certificate for your domain
   - Verify email (or DNS)
   - Use certificate in CloudFront

---

## GitHub Actions for Automated Deployments

The project includes GitHub Actions for automated price updates. You can extend this for deployments.

### Price Update Workflow

See `.github/workflows/update-rates.yml` — this:

1. Runs daily (or on schedule)
2. Fetches live metal and currency rates
3. Updates `data/metals.json` and `data/rates.json`
4. Commits and pushes changes
5. Triggers GitHub Pages deployment

### Configuration

In `.github/workflows/update-rates.yml`:

```yaml
schedule:
  - cron: '0 0 * * *'  # Daily at midnight UTC
```

Change the cron expression for different schedules:
- `0 */6 * * *` — Every 6 hours
- `0 0 * * MON` — Weekly on Monday
- `0 0 1 * *` — Monthly on the 1st

### Required Secrets

For the workflow to push updates, it needs GitHub token (usually auto-provided):

1. **Settings** → **Secrets and variables** → **Actions**
2. Verify `GITHUB_TOKEN` exists (auto-created)
3. If needed, add additional API keys:
   - `METALS_API_KEY` — Metals price API key
   - `FX_API_KEY` — Forex API key

---

## Automated Price Updates

### Setup Metal Price API

1. **Sign up** at [Metals-API](https://metals-api.com/) or similar
2. **Get API key** from dashboard
3. **In GitHub**:
   - Go to **Settings** → **Secrets** → **Actions**
   - Add secret: `METALS_API_KEY` = your API key

4. **Update workflow** (`.github/workflows/update-rates.yml`):
   ```bash
   curl "https://metals-api.io/api/latest?apikey=${{ secrets.METALS_API_KEY }}" \
     > data/metals.json
   ```

### Setup Forex API

1. **Sign up** at [ExchangeRate-API](https://exchangerate-api.com/) or similar
2. **Get API key**
3. **In GitHub** → Add secret: `FX_API_KEY`
4. **Update workflow**:
   ```bash
   curl "https://v6.exchangerate-api.com/v6/${{ secrets.FX_API_KEY }}/latest/USD" \
     > data/rates.json
   ```

### Testing Workflow Locally

To test GitHub Actions locally:

```bash
# Install act (GitHub Actions runtime for local testing)
brew install act  # macOS
# or: Download from https://github.com/nektos/act

# Run workflow
act -j your-job-name
```

---

## Monitoring & Maintenance

### Check Deployment Status

**GitHub Pages**:
- **Settings** → **Pages** → Deployment history
- Or visit the site and check response headers

**Vercel/Netlify**:
- Dashboard shows live status
- Recent deployments tab

**AWS S3**:
- CloudFront invalidation status
- S3 bucket versioning

### Monitor Uptime

Set up uptime monitoring (e.g., UptimeRobot):

1. Go to [uptimerobot.com](https://uptimerobot.com)
2. Create new monitor for your domain
3. Check every 5 minutes
4. Get alerts if site goes down

### Check Performance

Use these tools to monitor performance:

- **Lighthouse**: `lighthouse https://zakah.example.com`
- **Web Vitals**: Built-in Chrome DevTools or PageSpeed Insights
- **Bundle size**: Monitor JS/CSS file sizes over time

### Update Pricing Data

Verify prices are updating automatically:

1. Check `data/metals.json` — timestamp should be recent
2. Check `data/rates.json` — timestamp should be recent
3. If outdated:
   - Check GitHub Actions workflow logs
   - Verify API keys are still valid
   - Check for API rate limits

---

## Disaster Recovery

### Rollback to Previous Version

**GitHub Pages**:
```bash
# Revert last commit
git revert HEAD

# Or reset to specific commit
git reset --hard abc1234

# Push to main (triggers redeploy)
git push origin main
```

**Vercel/Netlify**:
- Use dashboard → **Deployments** tab
- Click previous version → **Redeploy**
- Or click **Promote to Production**

### Backup

GitHub automatically backs up your repository. Additional backups:

```bash
# Export repository as ZIP
git archive --format zip HEAD > zakah-backup.zip

# Or clone to local
git clone --mirror https://github.com/Samin-yasar/zakah.git zakah-backup.git
```

---

## Troubleshooting

### Issue: Site Shows 404

**Problem**: GitHub Pages returns 404 error

**Solutions**:
1. Verify repository is public (not private)
2. Check **Settings** → **Pages** is enabled
3. Verify branch and folder are correct
4. Wait 5 minutes for deployment to complete

### Issue: HTTPS Certificate Not Generating

**Problem**: Browser shows SSL error

**Solutions**:
1. Verify custom domain DNS is configured correctly
2. Wait 15–30 minutes for Let's Encrypt
3. Force refresh HTTPS: **Settings** → uncheck/recheck "Enforce HTTPS"

### Issue: Service Worker Not Caching

**Problem**: App doesn't work offline

**Solutions**:
1. Ensure first visit is over HTTPS
2. Check browser console for SW errors
3. Verify `sw.js` is deployed and accessible
4. Try different browser or incognito mode

### Issue: Prices Not Updating

**Problem**: `data/metals.json` is outdated

**Solutions**:
1. Check GitHub Actions → **Workflows** → **update-rates** tab
2. Check for errors in workflow logs
3. Verify API keys are valid in **Secrets**
4. Test API manually:
   ```bash
   curl "https://metals-api.io/api/latest?apikey=YOUR_KEY"
   ```

---

## Deployment Checklist

Before deploying to production, verify:

- [ ] Service Worker caches correctly
- [ ] HTTPS is enabled and working
- [ ] Custom domain (if using) is configured
- [ ] Price update workflow is running
- [ ] All languages display correctly
- [ ] PDF export works
- [ ] Offline mode works (with cached prices)
- [ ] PWA installation works (test on Android)
- [ ] Performance is acceptable (<3s load time)
- [ ] No console errors or warnings

---

## Next Steps

After deployment:

1. **Test thoroughly** in multiple browsers and devices
2. **Share the link** with users
3. **Monitor uptime** and performance
4. **Set up analytics** (optional)
5. **Request feedback** from users
6. **Report issues** to the maintainer

---

**For questions, see [CONTRIBUTING.md](../CONTRIBUTING.md) or open an issue on GitHub.**
