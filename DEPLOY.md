# Shop Portal — Deployment Guide
## Free hosting with Vercel + Neon PostgreSQL

**Total cost: $0/month** (Vercel free tier + Neon free tier)

---

## Part 1: Set Up Free PostgreSQL with Neon

1. Go to [neon.tech](https://neon.tech) → **Sign Up** (free, no credit card)
2. Click **New Project** → name it `shop-portal` → region closest to you → **Create**
3. On the dashboard, click **Connection Details** → copy the **Connection string** — it looks like:
   ```
   postgresql://username:password@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Save this string — you'll need it in Step 3

---

## Part 2: Push Code to GitHub

1. Create a free GitHub account at [github.com](https://github.com) if you don't have one
2. Create a **New repository** → name it `shop-portal` → **Private** → **Create**
3. In VS Code terminal, run these commands once:
   ```
   cd e:\WORK_RESTRUCTURE\APP2\tattoo-shop-app
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/shop-portal.git
   git branch -M main
   git push -u origin main
   ```

---

## Part 3: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → **Sign Up** → choose **Continue with GitHub**
2. Click **Add New Project** → import your `shop-portal` repo
3. Before clicking Deploy, click **Environment Variables** and add ALL of these:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Neon connection string from Part 1 |
| `NEXTAUTH_SECRET` | Generate a new random 32-char string (e.g. from [generate-secret.vercel.app](https://generate-secret.vercel.app/32)) |
| `NEXTAUTH_URL` | `https://YOUR-APP.vercel.app` (you'll know this after first deploy — can update) |
| `VAPID_PUBLIC_KEY` | `BEsCp6d8mo7WfGLo3MNGlRzwDjVweY09SMbA2jS3a0Y2Jwkc2G0XUBv0qXhKO51ddwIeTP12BRgvXw7vS1xDrBw` |
| `VAPID_PRIVATE_KEY` | `a1UkD8NJnEnwLhfgxQkcf2pVcLqUDCMU4F3CHUdbPro` |
| `VAPID_MAILTO` | `mailto:your@email.com` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `BEsCp6d8mo7WfGLo3MNGlRzwDjVweY09SMbA2jS3a0Y2Jwkc2G0XUBv0qXhKO51ddwIeTP12BRgvXw7vS1xDrBw` |

4. Click **Deploy** — Vercel will build the app (takes ~2 minutes)

---

## Part 4: Switch Database to PostgreSQL for Production

Before deploying, you need to change one line in `prisma/schema.prisma`:

```diff
datasource db {
-  provider = "sqlite"
+  provider = "postgresql"
   url      = env("DATABASE_URL")
}
```

Then commit and push that change — Vercel will auto-redeploy.

After the first deploy, open the Vercel deployment logs and find the URL.
Run this from your local machine to create all the database tables on Neon:

```
DATABASE_URL="your-neon-connection-string" npx prisma db push
```

> **Note:** Keep `provider = "sqlite"` in your local `.env` for day-to-day development.
> Only change it to `"postgresql"` when you're ready to deploy (commit that change).
> A better long-term setup uses two separate env files, but this works fine for now.

---

## Part 5: Update NEXTAUTH_URL

After Vercel gives you a URL (like `https://shop-portal-abc123.vercel.app`):

1. Go to Vercel → your project → **Settings** → **Environment Variables**
2. Edit `NEXTAUTH_URL` to match your actual URL
3. Redeploy by going to **Deployments** → **...** → **Redeploy**

---

## Part 6: Set Up PWA on iPhone/iPad (Add to Home Screen)

Push notifications on iOS require the app to be added to the home screen:

1. Open the app URL in **Safari** on the iPhone/iPad (must be Safari, not Chrome)
2. Tap the **Share** button (box with arrow) at the bottom
3. Scroll down and tap **Add to Home Screen**
4. Name it `Shop Portal` → tap **Add**
5. Open the app from the home screen icon
6. Navigate to any page → tap the bell icon → tap **Enable push notifications on this device**
7. Tap **Allow** when Safari asks for permission

> **iOS requirement:** Push notifications only work when the app is opened from the home screen icon, not from the browser tab.

---

## Custom Domain (Optional — ~$12/year)

If you want `portal.yourshopdomain.com` instead of `something.vercel.app`:

1. Buy a domain from Namecheap, Cloudflare, or Google Domains
2. In Vercel → your project → **Settings** → **Domains** → add your domain
3. Follow the DNS instructions Vercel gives you

---

## Keeping Your Local Dev Database vs Production

| Environment | DATABASE_URL | Schema provider |
|---|---|---|
| Local dev | `file:./dev.db` (SQLite) | `"sqlite"` |
| Production (Vercel) | Neon connection string | `"postgresql"` |

When testing locally, everything works as normal with the SQLite database.
The artists' production data lives on Neon and is completely separate.
