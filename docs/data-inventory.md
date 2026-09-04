# PRINT BAZZAR — DATA INVENTORY & ASSET AUDIT
**Generated on**: September 3, 2026  
**Database**: Supabase PostgreSQL (`aws-0-ap-south-1.pooler.supabase.com`)  
**Project Reference**: `uigpizwsjtpecaduampi`  
**Total Live Records Verified**: 3,125  

---

## 1. Executive Master Data Inventory

| Business Entity | Current Location | Table / Bucket | Record Count | Used By Modules | Critical? | Data Preservation Policy |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Admin & Staff Accounts** | Supabase PostgreSQL | `User` | 6 | Staff Login, ERP Workflows, Audits | **CRITICAL** | Never delete. Inactive toggle only. |
| **Staff Roles** | Supabase PostgreSQL | `Role` | 7 | Access Control, Permissions | **CRITICAL** | System roles locked. |
| **System Permissions** | Supabase PostgreSQL | `Permission` | 12 | Role-Based Access Control | **CRITICAL** | Static seed master data. |
| **Role Permissions** | Supabase PostgreSQL | `RolePermission` | 84 | Granular Access Matrix | **CRITICAL** | System mappings locked. |
| **Registered Customers** | Supabase PostgreSQL | `Customer` | 3 | Customer Login, Order Tracking | **CRITICAL** | Never delete. Inactive toggle only. |
| **Customer Addresses** | Supabase PostgreSQL | `CustomerAddress` | 17 | Checkout, Shipping, GST Invoicing | **CRITICAL** | Retain for historical order linkage. |
| **Printing Categories** | Supabase PostgreSQL | `Category` | 13 | Navigation, Shop, Homepage Grids | **CRITICAL** | Soft-deactivate if discontinued. |
| **Printing Products** | Supabase PostgreSQL | `Product` | 139 | Storefront, Customizers, Catalog | **CRITICAL** | Never hard delete once ordered. |
| **Product Gallery Images** | Supabase PostgreSQL | `ProductImage` | 93 | Storefront Product Galleries | **CRITICAL** | Linked to CDN asset URLs. |
| **Product Specifications** | Supabase PostgreSQL | `ProductSpecification` | 374 | Technical Specifications Tables | **CRITICAL** | Preserved in order snapshots. |
| **Product Options** | Supabase PostgreSQL | `ProductOption` | 309 | Configuration Dropdowns & Radios | **CRITICAL** | Preserved in order snapshots. |
| **Option Values** | Supabase PostgreSQL | `ProductOptionValue` | 1,015 | Option Values & Price Modifiers | **CRITICAL** | Preserved in order snapshots. |
| **Price Slabs (Volume)** | Supabase PostgreSQL | `ProductPriceSlab` | 451 | Dynamic Slabs (100, 250, 500, etc.) | **CRITICAL** | Historical orders retain snapshots. |
| **Combination Pricing** | Supabase PostgreSQL | `ProductCombination` | 0 | Exact Matrix Pricing (Size x GSM) | High | Used for exact multi-option matrix. |
| **Artwork Settings** | Supabase PostgreSQL | `ProductArtworkSetting`| 0 | Product File Requirement Rules | High | Configures file templates & specs. |
| **Product Design Mappings**| Supabase PostgreSQL | `ProductDesignPackageMapping`| 417 | Product-Specific Design Overrides | **CRITICAL** | Reusable package-to-product join. |
| **Master Design Packages** | Supabase PostgreSQL | `DesignPackage` | 3 | Basic, Standard, Premium Catalog | **CRITICAL** | Soft-archive only if referenced. |
| **Master Design Add-ons** | Supabase PostgreSQL | `DesignAddon` | 6 | Extra Revisions, Source File Extras | **CRITICAL** | Reusable add-on catalog. |
| **Design Orders (Jobs)** | Supabase PostgreSQL | `DesignOrder` | 0 | Design Studio Queue, Proofing | **CRITICAL** | Linked to Main Order. Never delete. |
| **Design Revisions** | Supabase PostgreSQL | `DesignRevision` | 0 | Customer Proofing & Comments | **CRITICAL** | Permanent versioned proof history. |
| **Artwork Uploads** | Supabase PostgreSQL | `ArtworkUpload` | 0 | Customer Print-Ready Files | **CRITICAL** | Preflight quality logs and files. |
| **Orders** | Supabase PostgreSQL | `Order` | 17 | Customer Orders, Production ERP | **CRITICAL** | Permanent legal business record. |
| **Order Line Items** | Supabase PostgreSQL | `OrderItem` | 17 | Product Configuration Snapshots | **CRITICAL** | Immutable historical unit pricing. |
| **Order Status History** | Supabase PostgreSQL | `OrderStatusHistory`| 69 | ERP Department Handover Logs | **CRITICAL** | Timestamped audit timeline. |
| **Order Internal Notes** | Supabase PostgreSQL | `OrderNote` | 0 | Staff Communication Desk | High | Retained with order lifecycle. |
| **Payment Transactions** | Supabase PostgreSQL | `Payment` | 17 | Gateways, Receipts, Bank Refs | **CRITICAL** | Financial audit records. |
| **Price Change History** | Supabase PostgreSQL | `PriceHistory` | 3 | Historical Price Log | **CRITICAL** | Business change log. |
| **Active Cart Items** | Supabase PostgreSQL | `CartItem` | 0 | Transient Shopping Sessions | Low | Auto-purged upon checkout. |
| **Marketing Banners** | Supabase PostgreSQL | `Banner` | 4 | Homepage Carousel & Promos | High | CMS configurable. |
| **Store Settings** | Supabase PostgreSQL | `StoreSetting` | 14 | GST, Shipping, Design Limits | **CRITICAL** | System-wide business configuration. |
| **System Audit Logs** | Supabase PostgreSQL | `AuditLog` | 35 | Administrative Change Tracking | **CRITICAL** | Immutable chronological logs. |
| **Product Images (Files)** | Supabase Storage / CDN | `product-images` | Verified | Product Media Displays | **CRITICAL** | Public read, authenticated write. |
| **Artwork Uploads (Files)**| Supabase Storage | `customer-uploads`| Verified | Preflight & Customer Artwork | **CRITICAL** | Private authenticated read/write. |
| **Design Drafts (Files)** | Supabase Storage | `design-drafts` | Verified | Proofing Files (PDF/PNG) | **CRITICAL** | Customer proof approval links. |
| **Final Press Files** | Supabase Storage | `design-final-files`| Verified | Master Vector Production Files | **CRITICAL** | Restricted production press access. |

---

## 2. Live Verified Record Counts (Point-in-Time Audit)

```json
{
  "User": 6,
  "Customer": 3,
  "CustomerAddress": 17,
  "Category": 13,
  "Product": 139,
  "ProductOption": 309,
  "ProductOptionValue": 1015,
  "ProductPriceSlab": 451,
  "ProductImage": 93,
  "ProductSpecification": 374,
  "ProductDesignPackageMapping": 417,
  "DesignPackage": 3,
  "DesignAddon": 6,
  "Order": 17,
  "OrderItem": 17,
  "OrderStatusHistory": 69,
  "Payment": 17,
  "Banner": 4,
  "StoreSetting": 14,
  "PriceHistory": 3,
  "AuditLog": 35,
  "Role": 7,
  "Permission": 12,
  "RolePermission": 84
}
```

---

## 3. Data Safety & Immutability Rules

1. **Orders & Invoicing**:
   - Every `OrderItem` contains full snapshots of `productNameSnapshot`, `skuSnapshot`, `unitPriceSnapshot`, `totalPriceSnapshot`, `specificationsSnapshot`, and `optionsSnapshot`.
   - Modifying a product's price or options in the admin dashboard **never alters** historical order line items or financial balances.
2. **Design Packages & Historical Orders**:
   - `DesignOrder` stores `packageNameSnapshot`, `packagePriceSnapshot`, `packageSnapshotJson`, and `addonsSnapshotJson`.
   - If an admin edits a design package rate (e.g. ₹499 to ₹599), past design orders strictly preserve their original ₹499 snapshot.
   - Deleting a package that has active or completed orders triggers a safe **soft-archive** (`isActive = false`) rather than physical deletion.
3. **Automated Backup Archives**:
   - An immutable snapshot is stored in `/server/backups/printbazzar_full_backup_[TIMESTAMP].json`.
   - The restore script `/server/src/scripts/restoreDatabaseFromBackup.js` enables 1-click zero-data-loss rollback to any recorded point in time.
