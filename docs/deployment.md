# Print Bazzar — Enterprise Production Deployment Manual
**Target Cloud**: Vercel (Edge CDN Frontend) + Railway / Render (Node.js API) + Supabase (PostgreSQL & Storage)  
**Ownership Model**: 100% Print Bazzar Company-Controlled Accounts  

---

## 1. Company Ownership & Account Governance

To maintain total independence and long-term security, ensure the following company-owned infrastructure accounts are created:

1. **GitHub Organization / Account**: `github.com/printbazzar-official` (Maintained by company leadership).
2. **Supabase Organization**: `supabase.com` account registered to `admin@printbazzar.com`.
3. **Vercel Team Account**: Registered to `admin@printbazzar.com`.
4. **Domain Registrar**: Hostinger / Cloudflare / GoDaddy account owning `printbazzar.com`.
5. **Payment Gateway**: Razorpay / Cashfree / Stripe merchant account verified with company GSTIN.

---

## 2. GitHub Repository Setup

1. In the company GitHub account, create a new private repository: `print-bazzar-platform`.
2. Initialize local repository and push:
   ```bash
   git init
   git add .
   git commit -m "feat: complete production-ready print bazzar platform with prepress ERP"
   git branch -M main
   git remote add origin https://github.com/printbazzar-official/print-bazzar-platform.git
   git push -u origin main
   ```
3. Set up branch protection rules for `main`:
   - Require pull request reviews before merging.
   - Require status checks to pass before merging.

---

## 3. Supabase Cloud Configuration

1. In Supabase Dashboard, select Project: `uigpizwsjtpecaduampi` (or your company production project).
2. Ensure database region is `ap-south-1 (Mumbai)` for minimal latency across India.
3. Obtain connection strings:
   - **Transaction Pooler (Port 6543)**: For runtime API requests (`DATABASE_URL`).
   - **Session Direct (Port 5432)**: For Prisma migrations and schema sync (`DIRECT_URL`).
4. Execute schema synchronization:
   ```bash
   cd server
   npx prisma db push
   npx prisma generate
   ```

---

## 4. Frontend Deployment on Vercel

1. In Vercel, click **"Add New" ➔ "Project"** and import `printbazzar-official/print-bazzar-platform`.
2. Configure settings:
   - **Root Directory**: `printbazzar_react/client`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add Environment Variables:
   - `VITE_API_URL`: Your production backend API URL (e.g., `https://api.printbazzar.com/api/v1`)
4. Click **Deploy**. Vercel will provision an edge-cached SSL deployment.
5. In **Project Settings ➔ Domains**, attach your production domain: `www.printbazzar.com` and redirect apex `printbazzar.com` to `www`.

---

## 5. Backend API Deployment (Railway / Render)

### Railway Deployment (Recommended for In-House WebSockets & Background Jobs)
1. In Railway, click **"New Project" ➔ "Deploy from GitHub repo"**.
2. Select `print-bazzar-platform`.
3. Set **Root Directory** to `server`.
4. Add Environment Variables:
   ```env
   PORT=5000
   DATABASE_URL=postgresql://postgres.xxx:6543/postgres?pgbouncer=true
   DIRECT_URL=postgresql://postgres.xxx:5432/postgres
   JWT_SECRET=[GENERATE_STRONG_RANDOM_64_CHAR_SECRET]
   CORS_ORIGIN=https://www.printbazzar.com
   ```
5. Deploy and attach custom domain: `api.printbazzar.com`.

---

## 6. Verification Checklist

- [ ] HTTPS enabled on storefront and API.
- [ ] Database queries routed through connection pooler.
- [ ] Product customizer calculates pricing with zero console errors.
- [ ] Design packages render dynamically from database.
- [ ] Orders generate sequential IDs (`PB-ORD-XXXXX` & `PB-DES-XXXXX`).
- [ ] Preflight analyzer checks PDF/image files accurately.
- [ ] Admin panel `/admin` accessible with role permissions enforced.
