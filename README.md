# Print Bazzar eCommerce & ERP Platform

> Industrial Precision Printing, Custom Design Studio & Enterprise Web-to-Print eCommerce ERP System.

---

## 📖 Project Overview

**Print Bazzar** is a full-stack, enterprise-grade Web-to-Print eCommerce and ERP fulfillment platform built specifically for commercial printing presses. The system bridges consumer e-commerce with real-world factory workflows, enabling real-time artwork preflighting, dynamic multi-attribute print pricing, automated GST tax invoicing, milestone design payments, and factory floor order dispatch.

The platform is designed with a decoupled architecture consisting of a **React + Tailwind CSS frontend storefront/admin** and an **Express.js + Prisma ORM + PostgreSQL backend REST API**.

---

## 🌟 Major Features

### Customer Storefront
* **Dynamic Product Catalog**: 80+ print categories and customized products (Business Cards, Brochures, Flyers, Standees, Labels, Invitations, ID Cards, Signage).
* **Multi-Attribute Pricing Engine**: Instant dynamic pricing based on sheet size, GSM stock, lamination coatings, quantity tiers, folding options, and custom design service.
* **Preflight Artwork Inspection**: Real-time client-side artwork analysis checking dimensions, bleed tolerances, resolution (DPI), color mode, and orientation warnings before order placement.
* **Two-Stage Milestone Payments**: Initial design service fee collection at checkout, followed by proof approval and automatic balance collection before factory press release.
* **Order Tracking Portal**: Real-time multi-stage visual tracking (`RECEIVED` ➔ `DESIGN` ➔ `PRODUCTION` ➔ `FINISHING_QC` ➔ `PACKING` ➔ `DELIVERY` ➔ `COMPLETED`).
* **B2B / Corporate Portals**: Dedicated corporate registration and checkout with GST input and business account management.
* **Dynamic Centralized Business Profile**: Store address, operating hours, phone numbers, WhatsApp channels, and GSTIN centrally managed from the Admin Panel.

### Admin & Factory ERP Management
* **Role-Based Access Control (RBAC)**: Fine-grained permissions across roles (`SUPER_ADMIN`, `DESIGN_LEAD`, `PRESS_OPERATOR`, `FINISHING_INSPECTOR`, `PACKING_SUPERVISOR`, `DELIVERY_EXECUTIVE`).
* **Visual Kanban Workflow Board**: Drag-and-drop production tracking across departmental queues.
* **Production Job Cards**: Clean, shop-floor printable job tickets stripped of pricing/customer billing, focusing strictly on paper specs, coatings, cut sizes, and operator QC checklists.
* **Thermal Shipping Labels**: Standard 4x6 / A5 printable courier shipping labels with return-to-origin details and courier assignment.
* **Automated GST Tax Invoices**: Full tax compliant invoices calculating CGST + SGST (Intra-state Tamil Nadu) or IGST (Inter-state) with official state codes.
* **Dynamic Settings Hub**: Complete management of Gateway Keys, Website Footer, Business Identity, Delivery Charges, and Store Policies without code deployments.

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18.3.1 | Single-Page Application (SPA) with declarative components |
| **Build Tool** | Vite 6.0.5 | Ultra-fast HMR and Rollup-based production bundling |
| **UI Styling** | Tailwind CSS 3.4.17 + Flowbite React 0.10.2 | Utility-first responsive design with accessible UI primitives |
| **Routing** | React Router DOM 7.1.1 | Client-side routing with nested layouts and protected routes |
| **Backend Runtime** | Node.js (v18+ LTS, ES Modules) | High-performance asynchronous JavaScript runtime |
| **API Framework** | Express 4.21.2 | Robust REST API with modular routers and controllers |
| **Database & ORM** | PostgreSQL + Prisma ORM 5.22.0 | Type-safe schema migrations, queries, and relations |
| **Security & Auth** | JSON Web Tokens (JWT) + BcryptJS + Helmet | Stateless HS256 tokens, HttpOnly cookies, CSRF defense, and rate limiting |
| **Payments** | Razorpay Node SDK / Webhook Signature Verification | Card, NetBanking, UPI, and Cash on Delivery (COD) |
| **File Storage** | Multer Local Disk Storage / Supabase S3 Storage | Secure binary uploads with validation, previews, and attachments |

---

## 📂 Project Structure

```
E-COMMERCE WEBSITE/
├── .env.example                     # Root environment configuration guide
├── .gitignore                        # Git ignore covering secrets, node_modules & dumps
├── README.md                         # This comprehensive project documentation
├── vercel.json                       # Vercel deployment configuration
├── docs/                             # Developer Handover & Technical Documentation
│   ├── API_DOCUMENTATION.md          # Complete REST API reference
│   ├── ARCHITECTURE.md               # System architectural blueprints and diagrams
│   ├── DATABASE_DOCUMENTATION.md     # Prisma schema, models, relations & backup guide
│   ├── DEPLOYMENT_GUIDE.md           # Production deployment & rollback guide
│   ├── DEVELOPER_HANDOVER_CHECKLIST.md # Quality & portability audit checklist
│   ├── FEATURES_IMPLEMENTED.md       # Complete inventory of features and status
│   ├── FUTURE_ROADMAP.md             # Recommended roadmap for future enhancements
│   ├── KNOWN_ISSUES.md               # Technical debt and architectural notes
│   └── SERVICES_LIST.md              # Inventory of third-party external services
├── printbazzar_react/                # Frontend application
│   └── client/
│       ├── .env.example              # Client environment variables template
│       ├── package.json              # Frontend dependencies and scripts
│       ├── vite.config.js            # Vite build configuration
│       ├── tailwind.config.js        # Tailwind styling theme & plugins
│       └── src/
│           ├── admin/                # Admin portal views & settings managers
│           ├── assets/               # Static images, vectors & banners
│           ├── Components/           # Reusable components (Header, Footer, JobCard, etc.)
│           ├── context/              # React Contexts (Auth, Cart, BusinessInfo)
│           ├── Pages/                # Customer storefront pages (Shop, Detail, Checkout, Track)
│           ├── ProductDetails/       # Specialized product customization templates (87 files)
│           ├── services/             # API client services (`api.js`)
│           └── utils/                # Pricing engine, preflight analyzer
└── server/                           # Backend application
    ├── .env.example                  # Server environment variables template
    ├── package.json                  # Backend dependencies and scripts
    ├── uploads/                      # Uploaded artwork and media (Local fallback)
    ├── backups/                      # Database backups (Excluded from Git)
    ├── prisma/
    │   ├── schema.prisma             # Canonical database schema
    │   └── migrations/               # Production SQL migration history
    └── src/
        ├── server.js                 # Express server entrypoint
        ├── config/                   # CORS, JWT, Cookie & Security configurations
        ├── controllers/              # Business controllers (Auth, Order, Product, Settings)
        ├── middleware/               # Auth guards, RBAC, Rate limiters, Sanitizers, CSRF
        ├── routes/                   # API v1 route declarations
        ├── scripts/                  # Seeders, test suites, and database backup scripts
        ├── services/                 # Email, SMS, WhatsApp notification services
        └── utils/                    # Business validators, pricing engine, storage bridges
```

---

## 🚀 Step-by-Step Installation & Local Setup

Follow these exact steps to clone, configure, and run Print Bazzar on any developer machine (Windows, macOS, or Linux).

### Prerequisites
* **Node.js**: v18.0.0 or higher (v20+ recommended)
* **npm**: v9.0.0 or higher
* **PostgreSQL**: v14.0 or higher (Local instance, Docker container, or hosted database like Neon / Supabase)

---

### Step 1: Clone or Download the Project
```bash
git clone <repository-url> printbazzar
cd printbazzar
```

---

### Step 2: Install Backend Dependencies
```bash
cd server
npm install
```

---

### Step 3: Install Frontend Dependencies
```bash
cd ../printbazzar_react/client
npm install
```

---

### Step 4: Configure Environment Variables

1. **Backend Environment Setup**:
   Copy the backend example file:
   ```bash
   cd ../../server
   cp .env.example .env
   ```
   Open `server/.env` and update the values:
   ```ini
   PORT=5000
   NODE_ENV=development
   DATABASE_URL="postgresql://postgres:password@localhost:5432/printbazzar_db?schema=public"
   DIRECT_URL="postgresql://postgres:password@localhost:5432/printbazzar_db?schema=public"
   JWT_SECRET="generate_a_secure_random_string_at_least_32_characters_long"
   ALLOWED_ORIGINS="http://localhost:5173,http://localhost:3000"
   CLIENT_URL="http://localhost:5173"
   ```

2. **Frontend Environment Setup**:
   Copy the client example file:
   ```bash
   cd ../printbazzar_react/client
   cp .env.example .env
   ```
   Ensure `printbazzar_react/client/.env` contains:
   ```ini
   VITE_API_URL=http://localhost:5000/api/v1
   ```

---

### Step 5: Configure Database & Run Migrations

1. Ensure your PostgreSQL service is running and the database exists:
   ```sql
   CREATE DATABASE printbazzar_db;
   ```

2. From the `server` directory, apply the Prisma database schema migrations:
   ```bash
   cd ../../server
   npx prisma migrate deploy
   ```
   *(Alternatively, for a fresh development database, you can run `npm run db:push`)*

3. Generate the Prisma Client:
   ```bash
   npm run db:generate
   ```

---

### Step 6: Seed Initial System Data & Staff Accounts
Populate permissions, roles, staff accounts, default products, categories, and business settings:
```bash
npm run db:seed
```

> **Default Seeded Accounts**:
> * **Super Admin**: `admin@printbazzar.online` / `Admin@123`
> * **Design Lead**: `design@printbazzar.online` / `Staff@123`
> * **Press Operator**: `press@printbazzar.online` / `Staff@123`
> * **QC Inspector**: `qc@printbazzar.online` / `Staff@123`
> * **Packing Supervisor**: `packing@printbazzar.online` / `Staff@123`
> * **Delivery Boy**: `delivery@printbazzar.online` / `Staff@123`
> *(Note: Remember to update default passwords before deploying to production!)*

---

### Step 7: Start the Backend Server
From the `server` directory:
```bash
npm run dev
```
The API server will launch at: **`http://localhost:5000`**

---

### Step 8: Start the Frontend Client
In a separate terminal, from `printbazzar_react/client`:
```bash
npm run dev
```
The storefront application will launch at: **`http://localhost:5173`**

---

### Step 9: Build for Production
To generate minified, production-ready static assets:
```bash
cd printbazzar_react/client
npm run build
```
Production assets will be built in `printbazzar_react/client/dist/`.

---

## 🧪 Verification & Health Checks

Verify your installation by running the automated backend test suites:
```bash
cd server
node src/scripts/verifyBusinessInfoSuite.js
node src/scripts/verifyPaymentAndJobCard.js
```
Expected result: **`ALL TESTS COMPLETED: 100% PASSED`**

---

## 📚 Technical Documentation Index

Detailed architectural and developer guides are available in the [`docs/`](./docs/) directory:
* [System Architecture (`docs/ARCHITECTURE.md`)](./docs/ARCHITECTURE.md)
* [Database & Data Models (`docs/DATABASE_DOCUMENTATION.md`)](./docs/DATABASE_DOCUMENTATION.md)
* [REST API Documentation (`docs/API_DOCUMENTATION.md`)](./docs/API_DOCUMENTATION.md)
* [Deployment & Rollback Guide (`docs/DEPLOYMENT_GUIDE.md`)](./docs/DEPLOYMENT_GUIDE.md)
* [Third-Party Services Inventory (`docs/SERVICES_LIST.md`)](./docs/SERVICES_LIST.md)
* [Features & Status Matrix (`docs/FEATURES_IMPLEMENTED.md`)](./docs/FEATURES_IMPLEMENTED.md)
* [Known Issues & Technical Debt (`docs/KNOWN_ISSUES.md`)](./docs/KNOWN_ISSUES.md)
* [Future Development Roadmap (`docs/FUTURE_ROADMAP.md`)](./docs/FUTURE_ROADMAP.md)
* [Developer Handover Checklist (`docs/DEVELOPER_HANDOVER_CHECKLIST.md`)](./docs/DEVELOPER_HANDOVER_CHECKLIST.md)

---

## 📄 License & Intellectual Property
Print Bazzar platform source code, custom pricing algorithms, and ERP workflows are proprietary assets belonging to Print Bazzar.
