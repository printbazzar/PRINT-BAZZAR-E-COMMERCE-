# Print Bazzar — Enterprise Administrator & Staff Operating Guide
**Target Audience**: Store Administrators, Production Managers, Customer Service, Prepress Leads  

---

## 1. Accessing the Admin Portal

- **URL**: `https://www.printbazzar.com/admin/login` (or `http://localhost:5173/admin/login` in development)
- **Default Super Admin**: `admin@printbazzar.online` / `Admin@123`

---

## 2. Admin Modules Overview

### A. Dashboard (`/admin/dashboard`)
- Executive KPI widgets: Total Revenue, Active Orders, Jobs in Production, Design Queue Count.
- Recent order stream and urgent alerts.

### B. Products & Pricing (`/admin/products`)
- **Product Catalog Table**: Real-time search, category filters, and active/inactive toggles.
- **Product Editor (`/admin/edit-product/:id`)**:
  - General: Name, Slug, Category, SKU, Description, Dimensions (Width, Height, Bleed mm).
  - Pricing: Starting Price, Custom Unit Price, Minimum/Maximum Quantity.
  - Slabs: Add or remove dynamic volume quantity tiers with single vs double sided rates.
  - Options: Configure core dimensions (e.g. Paper GSM, Size) and optional add-on modifiers (e.g. Spot UV, Velvet Lamination).
  - Gallery: Manage product photography and specification charts.

### C. Centralized Design Services (`/admin/design-services`)
- **Tab A (Packages)**: Add, edit, duplicate, or soft-archive master design packages. Configure concepts, revision rounds, turnaround days, and deliverable checklists.
- **Tab B (Add-ons)**: Manage selectable design extras (Extra Revision, Source File, Express Delivery).
- **Tab C (Product Mapping)**: Enable/disable design service per product, set custom single/double side rates, select default package, or run bulk assignments.
- **Tab D (Design Orders)**: Live design ticket queue. Review customer creative briefs, download uploaded brand assets, assign staff designers, upload proof drafts, and approve proofs to activate printing.
- **Tab E (Settings)**: Configure upload size limits and allowed file formats.

### D. In-House ERP Kanban (`/admin/workflow`)
- Drag-and-drop physical production tracking across 5 industrial departments:
  1. `DESIGN` (Prepress Proofing)
  2. `PRODUCTION` (Offset / Digital Press)
  3. `FINISHING_QC` (Lamination & Die-Cutting)
  4. `PACKING` (Weight Verification & Labeling)
  5. `DELIVERY` (Courier Dispatch & Local Out for Delivery)
- Instant proof gate: Design jobs cannot move to production until proof approval is logged.

### E. Store Settings (`/admin/settings`)
- GST rates (CGST/SGST/IGST percentages), company GSTIN, invoicing legal details, default courier partners, and system backup triggers.
