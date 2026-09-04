# Print Bazzar — Third-Party Services & Integrations Inventory

> **Security Note**: This document outlines all external integrations, required environment variables, and account access specifications. Under no circumstances should live passwords or private cryptographic keys be stored here.

---

## 1. Services Inventory Matrix

| Service | Category | Purpose | Integration Location | Env Variables Required | Developer Access Needed? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Razorpay** | Payment Gateway | Handles UPI, NetBanking, Debit/Credit cards, and milestone payments. | `server/src/controllers/paymentController.js`<br/>`client/src/Components/PaymentGatewayModal.jsx` | `RAZORPAY_KEY_ID`<br/>`RAZORPAY_KEY_SECRET` | Yes (Standard Merchant Dashboard access to generate test/live API keys & webhooks) |
| **PostgreSQL (Supabase / Neon / AWS RDS)** | Relational Database | Primary data persistence for catalog, orders, ERP queues, users, and audit logs. | `server/prisma/schema.prisma`<br/>`server/src/server.js` | `DATABASE_URL`<br/>`DIRECT_URL` | Yes (Database admin credentials or project owner access for migrations) |
| **Supabase Storage (Optional)** | Cloud Object Storage | Cloud storage for high-resolution customer artwork files and proofs. Fallback to local disk `server/uploads/`. | `server/src/utils/supabaseStorage.js` | `SUPABASE_URL`<br/>`SUPABASE_SERVICE_ROLE_KEY`<br/>`SUPABASE_ANON_KEY` | Optional (Only if choosing cloud S3 storage instead of local VPS disk) |
| **Google Maps Platform** | Location & Mapping | Embeds interactive shop location and route directions to Singarathope press. | `client/src/Pages/Contact.jsx`<br/>`client/src/admin/AdminBusinessSettings.jsx` | None (Public Embed URL iframe, or `GOOGLE_MAPS_API_KEY` for dynamic Places API) | No (Embed uses direct coordinate URL) |
| **WhatsApp (Click-to-Chat & Webhook)** | Customer Support & Notifications | Direct floating customer support, sample kit requests, proof discussions, and order status updates. | `client/src/context/BusinessInfoContext.jsx`<br/>`client/src/Components/WhatsappIcon.jsx`<br/>`server/src/services/notificationService.js` | `WHATSAPP_WEBHOOK_URL` (Optional for automated server alerts) | No (Uses standard universal `wa.me/` protocol; Meta Business API optional) |
| **SMTP / Transactional Email (Optional)** | Email Dispatch | Customer order receipts, password resets, and corporate invoice delivery. | `server/src/services/notificationService.js` | `SMTP_HOST`<br/>`SMTP_PORT`<br/>`SMTP_USER`<br/>`SMTP_PASS`<br/>`SMTP_FROM` | Yes (Email service provider such as Resend, SendGrid, Amazon SES, or Google Workspace SMTP) |
| **SMS Gateway (Optional)** | Transactional SMS | Dispatches order verification and courier tracking SMS across India. | `server/src/services/notificationService.js` | `SMS_GATEWAY_URL`<br/>`SMS_API_KEY`<br/>`SMS_SENDER_ID` | Optional (Indian DLT-registered SMS provider e.g. Fast2SMS / Textlocal) |
| **Courier Logistics (ST Courier / DTDC)** | Physical Dispatch | Doorstep parcel delivery across Tamil Nadu and all India pincodes. | `client/src/Components/ShippingLabelModal.jsx`<br/>`client/src/admin/AdminOrderDetail.jsx` | Manual tracking number input (ST Courier / DTDC API optional for future automation) | No (Thermal shipping labels generated internally; tracking IDs pasted by staff) |
| **Vercel / Cloudflare Pages** | Frontend Web Hosting | Serves client SPA static bundles with edge caching and SSL. | `vercel.json`<br/>`printbazzar_react/client/` | `VITE_API_URL` | Yes (Vercel/Cloudflare account access for git deployments) |
| **DNS & Domain Registrar** | Domain Name & SSL | Manages DNS records (`A`, `CNAME`, `TXT`) for `printbazzar.online`. | Domain registrar dashboard (e.g. Hostinger, GoDaddy) | None | Yes (Access required for initial DNS delegation and SSL propagation) |

---

## 2. Credentials Handover Guidelines for Business Owner

When handing over this system to a new development team or agency, the business owner must securely transfer access to:
1. **Razorpay Dashboard**: Admin should invite developer as a `Developer` role (read-only API key generator) without giving banking withdrawal access.
2. **PostgreSQL / Supabase Project**: Developer needs Database Editor role to run migrations and inspect tables.
3. **Domain & DNS**: Provide DNS management access to configure subdomains (`api.printbazzar.online`).
4. **Official Contact Channels**: Provide the verified official business phone, WhatsApp number, and GSTIN to enter via **Admin → Website Settings → Business Information**.
