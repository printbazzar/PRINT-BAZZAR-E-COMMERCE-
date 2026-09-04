# Print Bazzar — Production Deployment, Operations & Rollback Guide

---

## 1. Hosting Infrastructure Requirements

| Component | Recommended Hosting Provider | Sizing / Plan | Operating Environment |
| :--- | :--- | :--- | :--- |
| **Frontend Storefront** | Vercel / Cloudflare Pages / AWS Amplify | Standard Edge CDN | Node.js 18+ (Build only), Static SPA |
| **Backend API** | Render / Railway / DigitalOcean / AWS EC2 | 1 vCPU, 2GB RAM minimum | Node.js 20 LTS, Persistent Server |
| **Database** | Supabase PostgreSQL / Neon / AWS RDS | PostgreSQL 14+, 512MB RAM+ | Managed PostgreSQL with Connection Pooling |
| **Media File Storage** | Supabase Storage S3 / AWS S3 / Local EBS | S3-compatible bucket | Block / Object Storage |

---

## 2. Production Environment Variables Checklist

### Backend (`server/.env`)
```ini
PORT=5000
NODE_ENV=production
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"
JWT_SECRET="[STRONG_64_CHAR_HEX_KEY]"
ALLOWED_ORIGINS="https://printbazzar.online,https://www.printbazzar.online"
CLIENT_URL="https://printbazzar.online"

# Razorpay Production Keys
RAZORPAY_KEY_ID="rzp_live_xxxxxxxxxxxx"
RAZORPAY_KEY_SECRET="xxxxxxxxxxxxxxxxxxxx"

# Supabase Storage S3 (Optional)
SUPABASE_URL="https://[PROJECT_ID].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="[SERVICE_ROLE_KEY]"
```

### Frontend (`printbazzar_react/client/.env`)
```ini
VITE_API_URL="https://api.printbazzar.online/api/v1"
```

---

## 3. Domain, DNS & SSL Configuration

### Recommended DNS Architecture
* **Apex Domain** (`printbazzar.online`): CNAME to Vercel/Cloudflare edge target (e.g. `cname.vercel-dns.com`).
* **API Subdomain** (`api.printbazzar.online`): A / CNAME record pointing to Backend server (Render / EC2 / Railway).
* **SSL Certificates**: Automated Let's Encrypt TLS 1.3 wildcard certificates managed by hosting edge or Certbot with auto-renewal.

---

## 4. Standard Deployment Procedure

### Deploying Backend Updates
1. Push release to target branch (e.g. `main` or `production`).
2. SSH into production server or trigger hosting webhook:
   ```bash
   cd /var/www/printbazzar/server
   git pull origin main
   npm install --production
   ```
3. Run schema migrations safely:
   ```bash
   npx prisma migrate deploy
   ```
4. Restart application daemon via PM2:
   ```bash
   pm2 reload printbazzar-api
   ```
5. Check logs to ensure zero runtime boot errors:
   ```bash
   pm2 logs printbazzar-api --lines 50
   ```

### Deploying Frontend Updates
1. Run clean production build:
   ```bash
   cd /var/www/printbazzar/printbazzar_react/client
   npm install
   npm run build
   ```
2. Assets in `dist/` are automatically served via Edge CDN or Nginx reverse proxy.

---

## 5. Rollback Procedures

### Instant Backend Rollback
If a newly deployed backend version produces critical errors:
1. Revert to the previous stable Git commit:
   ```bash
   git log --oneline -n 5
   git checkout <PREVIOUS_COMMIT_HASH>
   npm install --production
   pm2 reload printbazzar-api
   ```
2. If database migrations included breaking changes, restore database from backup taken before deployment:
   ```bash
   pg_restore -h localhost -U postgres -d printbazzar_db -v pre_deployment_backup.dump
   ```

### Instant Frontend Rollback
* **Vercel / Cloudflare**: Select previous successful deployment in dashboard and click **"Promote to Production"** (instant 0-second rollback).
* **Self-hosted Nginx**: Point symlink `/var/www/html` to previous build directory and reload Nginx (`systemctl reload nginx`).

---

## 6. Process Monitoring & Maintenance

### PM2 Process Manager Commands
* View live status: `pm2 status`
* View real-time resource usage: `pm2 monit`
* Restart server: `pm2 restart printbazzar-api`
* Stop server: `pm2 stop printbazzar-api`
* Setup auto-start on system reboot: `pm2 startup && pm2 save`
