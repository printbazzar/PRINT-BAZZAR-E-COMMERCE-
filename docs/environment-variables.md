# Print Bazzar — Environment Variables Specification
**Security Classification**: CONFIDENTIAL — DO NOT COMMIT REAL CREDENTIALS TO GITHUB  

---

## 1. Backend Server Environment Variables (`server/.env`)

| Variable Name | Required? | Example Value | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | Optional | `5000` | Port for the Express REST API server to listen on. |
| `DATABASE_URL` | **Required** | `postgresql://postgres.[REF]:[PASS]@[HOST]:6543/postgres?pgbouncer=true` | Supabase Transaction Connection Pooler URL for runtime queries. |
| `DIRECT_URL` | **Required** | `postgresql://postgres.[REF]:[PASS]@[HOST]:5432/postgres` | Direct PostgreSQL connection URL for Prisma schema migrations. |
| `JWT_SECRET` | **Required** | `printbazzar_super_secure_enterprise_jwt_secret_key_2026` | 64+ character random string used to sign and verify customer/staff JWTs. |
| `CORS_ORIGIN` | **Required** | `https://www.printbazzar.com,http://localhost:5173` | Comma-separated allowed frontend origins for CORS headers. |
| `SUPABASE_URL` | Optional | `https://[REF].supabase.co` | Supabase project API URL for storage and auth operations. |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | `eyJhbGciOi...` | Supabase service role secret for server-side storage bypass. |
| `RAZORPAY_KEY_ID` | Production | `rzp_live_xxxxxxxx` | Payment Gateway Public Key ID. |
| `RAZORPAY_KEY_SECRET`| Production | `xxxxxxxxxxxxxxxx` | Payment Gateway Secret Key (Keep strictly server-side). |

---

## 2. Frontend Client Environment Variables (`printbazzar_react/client/.env`)

| Variable Name | Required? | Example Value | Description |
| :--- | :--- | :--- | :--- |
| `VITE_API_URL` | **Required** | `http://localhost:5000/api/v1` (Dev) / `https://api.printbazzar.com/api/v1` (Prod) | Base URL for frontend API client requests. |
| `VITE_RAZORPAY_KEY_ID` | Optional | `rzp_live_xxxxxxxx` | Public client key for opening checkout modal (amounts verified on server). |

---

## 3. Environment Segregation Matrix

```text
┌─────────────────────────┬───────────────────────────────┬───────────────────────────────┐
│ Configuration           │ Development / Local           │ Production                    │
├─────────────────────────┼───────────────────────────────┼───────────────────────────────┤
│ Frontend URL            │ http://localhost:5173         │ https://www.printbazzar.com   │
│ Backend API URL         │ http://localhost:5000/api/v1  │ https://api.printbazzar.com/api/v1 │
│ Database Mode           │ Cloud Pooler / Local Postgres │ High Availability Supabase Pooler │
│ JWT Expiry              │ 7 Days                        │ 24 Hours with Refresh Tokens  │
│ File Storage            │ Supabase / Local Uploads Dir  │ Supabase S3 Private Buckets   │
│ Payment Gateway         │ Test Mode (Sandbox)           │ Live Mode (GSTIN Verified)    │
└─────────────────────────┴───────────────────────────────┴───────────────────────────────┘
```

---

## 4. Key Rotation & Security Policy

1. **Never commit `.env` or `.env.local` to Git**: Always verify `.gitignore` excludes all `.env*` files.
2. **Rotating JWT Secret**: If an admin token is compromised, change `JWT_SECRET` in production. This will invalidate all active sessions immediately, requiring staff to re-authenticate.
3. **Database Password Rotation**: Change password in Supabase Dashboard ➔ Settings ➔ Database, then update `DATABASE_URL` and `DIRECT_URL` in the hosting environment variables.
