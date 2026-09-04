# Print Bazzar — Database Architecture & Handover Documentation

---

## 1. Database Specifications & Environment

* **Database Engine**: PostgreSQL 14+
* **Primary Dialect**: Relational SQL with JSONB support
* **ORM**: Prisma ORM 5.22.0 (`@prisma/client` & `prisma`)
* **Schema File**: [`server/prisma/schema.prisma`](../server/prisma/schema.prisma)
* **Migrations Directory**: [`server/prisma/migrations/`](../server/prisma/migrations/)
* **Connection Pooling**: Supports PgBouncer / Supabase Transaction Pooler (via `DATABASE_URL`) with direct unpooled fallback for DDL migrations (via `DIRECT_URL`).

---

## 2. Setting Up a Fresh Database Instance

### Step 1: Create Database
Connect to your PostgreSQL server and execute:
```sql
CREATE DATABASE printbazzar_db WITH ENCODING 'UTF8';
```

### Step 2: Configure Connection Strings
In `server/.env`:
```ini
# Pooled connection string (Port 6543 on Supabase or standard 5432)
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/printbazzar_db?schema=public"

# Direct unpooled connection string (Port 5432)
DIRECT_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/printbazzar_db?schema=public"
```

### Step 3: Apply Migrations
From the `server` directory, run:
```bash
npx prisma migrate deploy
```
*Note: During active local development, `npm run db:push` can be used to synchronize rapid schema experiments.*

### Step 4: Generate Client Types
```bash
npm run db:generate
```

### Step 5: Seed Baseline System Data
Populate system roles, permissions, administrative staff, default product catalogs, and store settings:
```bash
npm run db:seed
```

---

## 3. Migration History

All structural database revisions are tracked in version-controlled SQL files:
1. **`20260903_add_workflow_engine`**: Created production workflow tables (`ProductionJob`, `ProductionLog`), enhanced order statuses, proof approvals, and two-stage design payments.
2. **`20260904_add_auth_session`**: Added secure session tracking (`AuthSession`), customer audit logs, and unified business store settings.

---

## 4. Entity-Relationship Model Overview

```mermaid
erDiagram
    Role ||--o{ User : assigns
    Permission ||--o{ RolePermission : defines
    Role ||--o{ RolePermission : groups
    User ||--o{ AuthSession : initiates
    Customer ||--o{ CustomerAddress : maintains
    Customer ||--o{ CustomerSession : authenticates
    Customer ||--o{ Order : places
    Category ||--o{ Product : categorizes
    Product ||--o{ ProductImage : displays
    Product ||--o{ OrderItem : includes
    Order ||--o{ OrderItem : contains
    Order ||--o{ Payment : generates
    Order ||--o{ OrderStatusHistory : tracks
    Order ||--o{ ProductionJob : fulfills
    Order ||--o{ DesignOrder : customizes
```

---

## 5. Main Tables & Data Models

### A. Staff Authentication & RBAC
* **`User`**: Internal staff accounts.
  * Fields: `id`, `name`, `email`, `passwordHash`, `department` (`DESIGN`, `PRODUCTION`, `FINISHING_QC`, `PACKING`, `DELIVERY`, `ALL`), `roleId`, `isActive`, `lastLoginAt`.
* **`Role`**: Role definitions (`SUPER_ADMIN`, `DESIGN_LEAD`, `PRESS_OPERATOR`, `FINISHING_INSPECTOR`, `PACKING_SUPERVISOR`, `DELIVERY_EXECUTIVE`).
* **`Permission`**: Granular permissions (e.g. `ORDER_VIEW`, `ORDER_EDIT`, `SETTINGS_EDIT`, `PRODUCTION_MANAGE`).
* **`RolePermission`**: Join table mapping permissions to roles.
* **`AuthSession`**: Active JWT refresh tokens, device hashes, IP tracking, and revocation flags.

### B. Customer Accounts & CRM
* **`Customer`**: Public retail and corporate (B2B) accounts.
  * Fields: `id`, `name`, `email`, `mobile`, `passwordHash`, `isCorporate`, `companyName`, `gstNumber`, `isActive`.
* **`CustomerAddress`**: Saved delivery destinations with recipient name, phone, street, landmark, city, state, and pincode.
* **`CustomerSession`**: Customer authentication sessions and token management.
* **`CustomerAuditLog`**: Security audit logs recording logins, profile updates, and password changes.

### C. Products & Catalog
* **`Category`**: Product classifications (e.g. *Business Essentials*, *Marketing & Promotional*, *Apparels*, *Signages*).
* **`Product`**: Print items with base prices, min quantities, slug, specifications JSON, and SEO metadata.
* **`ProductImage`**: Multi-angle gallery images and perspective thumbnails.
* **`ProductSpecification`**: Key-value technical specifications (e.g., Paper GSM, Coating, Turnaround).

### D. Multi-Attribute Dynamic Pricing
* **`PricingTier`**: Quantity threshold discounts (e.g. 100, 250, 500, 1000, 2000 units).
* **`PriceAddon`**: Custom print finishes (e.g., Gold Foil, Velvet Lamination, Round Corners, Embossing).
* **`QuantityTier`**: Tiered multipliers for bulk manufacturing.
* **`PriceHistory` / `PriceVersion`**: Audit log of all pricing modifications and author timestamps.

### E. Orders & Fulfillment
* **`Order`**: Master order record.
  * Fields: `orderNumber`, `customerId`, `orderStatus` (`PENDING`, `PROCESSING`, `PRODUCTION_QUEUE`, `PRINTING`, `QC`, `DISPATCHED`, `DELIVERED`, `CANCELLED`), `paymentStatus` (`PENDING`, `PARTIALLY_PAID`, `PAID`, `REFUNDED`), `totalAmount`, `discountAmount`, `taxAmount`, `shippingAmount`, `grandTotal`, `balanceDue`, `deliveryMethod` (`COURIER`, `STORE_PICKUP`), `shippingAddress` (JSONB).
* **`OrderItem`**: Specific line items with selected configuration options, paper attributes, and attached artwork file URLs.
* **`OrderStatusHistory`**: Immutable timestamped log of stage transitions and operator notes.
* **`OrderNote`**: Internal staff communications and customer-facing instructions.

### F. Graphic Design & Production Workflows
* **`DesignOrder`**: Graphic design service tickets for orders requiring custom artwork.
  * Fields: `orderId`, `designerId`, `status` (`BRIEF_SUBMITTED`, `IN_DESIGN`, `DRAFT_READY`, `APPROVED`, `REVISION_REQUESTED`), `briefNotes`.
* **`DesignRevision` / `DesignDraft`**: Proof files uploaded by prepress designers for customer digital review.
* **`ProductionJob`**: Factory floor machine tickets (`machineName`, `operatorName`, `priority`, `startTime`, `finishTime`).
* **`ProductionLog`**: Real-time event log for press cycles and material consumption.

### G. Payments & Accounting
* **`Payment`**: Financial transactions linked to orders.
  * Fields: `orderId`, `amount`, `currency`, `method` (`ONLINE_RAZORPAY`, `COD`, `BANK_TRANSFER`), `transactionId`, `gatewayOrderId`, `signature`, `status` (`INITIATED`, `SUCCESS`, `FAILED`).
* **`StoreSetting`**: Key-value JSON storage for system-wide configuration:
  * `BUSINESS_INFORMATION_SETTINGS`: Brand name, address, GSTIN, helplines, hours, socials.
  * `STORE_FOOTER_SETTINGS`: Footer link columns, copyright notices, certifications.
  * Payment gateway credentials (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`), shipping rules, and tax percentages.

---

## 6. Safe Database Backup & Restore Procedures

> [!CAUTION]
> **Data Privacy Notice**: Never export or commit live database dumps containing real customer passwords, emails, phone numbers, or addresses to public or shared developer repositories.

### Exporting Schema Only (Safe for Development)
To dump the database structure without any customer records:
```bash
pg_dump -h localhost -U postgres -d printbazzar_db --schema-only > schema_dump.sql
```

### Exporting Full Database (Encrypted Offline Storage)
For production backups:
```bash
pg_dump -h localhost -U postgres -d printbazzar_db -F c -b -v -f "printbazzar_backup_$(date +%Y%m%d).dump"
```

### Restoring from Backup
```bash
pg_restore -h localhost -U postgres -d printbazzar_db -v "printbazzar_backup_20260904.dump"
```
