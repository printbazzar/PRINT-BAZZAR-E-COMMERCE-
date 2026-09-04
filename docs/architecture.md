# Print Bazzar — System Architecture & Data Flow Guide

---

## 1. High-Level Architecture Overview

Print Bazzar is designed with an API-first, decoupled multi-tier architecture separating the client presentation layer from the core transactional backend and ERP state machines.

```mermaid
graph TD
    subgraph ClientTier ["Client Presentation Layer (React 18 + Vite)"]
        CF[Customer Storefront<br/>Shop, Detail, Cart, Checkout]
        AP[Admin Dashboard & Settings<br/>/admin/*]
        WF[Staff ERP Workflow Board<br/>StaffQueue & Job Cards]
    end

    subgraph APITier ["Security & API Gateway (Express 4)"]
        RT[API Router /api/v1/*]
        SEC[Security Headers, CORS & Rate Limiter]
        AUTH[JWT & Session Verification]
        VAL[Input Sanitizer & XSS Filter]
    end

    subgraph ServiceTier ["Core Business Services & Controllers"]
        OC[Order & Pricing Controller]
        PC[Payment & Milestone Gateway]
        DC[Prepress Design Service]
        SC[Centralized Settings Controller]
        FC[Multer & Storage Controller]
    end

    subgraph PersistenceTier ["Data & Storage Layer"]
        PRISMA[Prisma ORM Client]
        PG[(PostgreSQL Database)]
        DISK[Local Storage /uploads]
        SUPA[Supabase Cloud Storage S3]
    end

    CF -->|HTTPS / JSON| SEC
    AP -->|HTTPS / Bearer Auth| SEC
    WF -->|HTTPS / Cookie / Bearer| SEC

    SEC --> VAL --> AUTH --> RT
    RT --> OC
    RT --> PC
    RT --> DC
    RT --> SC
    RT --> FC

    OC & PC & DC & SC --> PRISMA --> PG
    FC --> DISK
    FC -.->|Optional S3| SUPA
```

---

## 2. Core Operational Workflows

### A. Authentication & Session Flow
The platform supports dual authentication paths for internal staff and public customers:

```mermaid
sequenceDiagram
    autonumber
    actor User as Staff or Customer
    participant Client as React Application
    participant API as Express Auth Router
    participant DB as PostgreSQL (Prisma)

    User->>Client: Enter Email & Password
    Client->>API: POST /api/v1/auth/login or /customer/auth/login
    API->>DB: Query User / Customer by Unique Email
    DB-->>API: Return Password Hash & Role
    API->>API: Verify Password with Bcrypt
    API->>API: Generate HS256 Access Token & Refresh Token
    API->>DB: Record AuthSession (IP, User-Agent, Expiry)
    API-->>Client: Return Token & Set HttpOnly Session Cookie
    Client->>Client: Store Token in AuthContext State
```

* **Staff Authentication**: Validated against `User`, `Role`, and `RolePermission` tables. Enforces department authorization.
* **Customer Authentication**: Validated against `Customer` table with corporate B2B flags.

---

### B. Two-Stage Order & Milestone Payment Flow
Commercial printing often requires custom artwork preparation before press setup. Print Bazzar implements a safe two-stage milestone payment model:

```mermaid
sequenceDiagram
    autonumber
    actor Cust as Customer
    participant Front as Checkout / Track Order
    participant API as Payment Controller
    participant Gate as Razorpay Gateway
    participant ERP as Factory Production Queue

    Cust->>Front: Select "Let Us Design" & Proceed to Checkout
    Front->>API: POST /api/v1/orders (Collect Design Fee e.g. ₹200)
    API->>Gate: Create Order / Payment Intent
    Gate-->>Front: Open Razorpay Checkout Modal
    Cust->>Gate: Complete Design Fee Payment
    Gate-->>Front: Signature & Payment ID
    Front->>API: POST /api/v1/payments/verify
    API->>API: Verify Cryptographic HMAC Signature
    API-->>ERP: Create DesignOrder in DESIGN_QUEUE
    Note over ERP: Prepress Designer prepares and uploads Proof
    ERP-->>Cust: Notification: Digital Proof Ready
    Cust->>Front: Inspect Proof on /track-order
    Cust->>Front: Click "Approve Proof & Pay Balance"
    Front->>Gate: Open Razorpay for Balance Due
    Cust->>Gate: Pay Balance
    Gate-->>API: Balance Payment Verified
    API-->>ERP: Release Order to PRODUCTION_QUEUE (Press Machines Unlocked)
```

---

### C. File Preflight & Upload Flow
To prevent blurry or misaligned prints:
1. **Client-Side Preflight Analyzer** (`utils/preflightAnalyzer.js`):
   - Reads image dimensions, DPI, orientation, and aspect ratio in the browser.
   - Calculates bleed box margin (+3mm) and warns if file resolution is under 300 DPI.
2. **Secure Binary Ingestion** (`middleware/fileUpload.js`):
   - Validates MIME type (`image/jpeg`, `image/png`, `image/webp`, `application/pdf`, `application/zip`, `application/postscript`).
   - Limits payload size (up to 50MB).
   - Generates randomized cryptographic filenames.
3. **Storage Strategy**:
   - Saves to local disk at `server/uploads/` with secure HTTP disposition headers.
   - Optionally mirrors to cloud storage buckets (Supabase Storage / AWS S3) if credentials are provided in `.env`.

---

### D. ERP Factory Fulfillment State Machine

```mermaid
stateDiagram-v2
    [*] --> PENDING: Order Placed
    PENDING --> DESIGN_QUEUE: Design Service Selected (Design Fee Paid)
    PENDING --> PRODUCTION_QUEUE: Print-Ready Artwork Uploaded (Paid in Full)
    
    DESIGN_QUEUE --> PROOF_UPLOADED: Designer Uploads Proof
    PROOF_UPLOADED --> DESIGN_QUEUE: Customer Requests Changes
    PROOF_UPLOADED --> PRODUCTION_QUEUE: Proof Approved & Balance Paid
    
    PRODUCTION_QUEUE --> PRINTING: Assigned to Press Operator
    PRINTING --> FINISHING_QC: Offset / Digital Run Complete
    FINISHING_QC --> PACKAGING: Lamination, Cutting & QC Passed
    PACKAGING --> READY_FOR_PICKUP: Store Pickup Selected
    PACKAGING --> OUT_FOR_DELIVERY: Courier Dispatched (ST Courier / DTDC)
    
    READY_FOR_PICKUP --> COMPLETED: Customer Handover
    OUT_FOR_DELIVERY --> COMPLETED: Delivered to Customer
```

---

## 3. Security & Resilience Architecture

* **Stateless Token Verification**: Tokens signed with HS256 using server-side secret; zero DB query needed for read-only route authentication.
* **Database Connection Resilience**: Graceful transaction handling with automatic retry on transient connection drops.
* **Input Sanitization**: Strip dangerous HTML tags, inline scripts, and SQL injection payloads on all JSON requests.
* **Centralized Website Settings**: Key business attributes stored in `StoreSetting` JSON records, cached in server memory with cache-invalidation hooks on every update.
