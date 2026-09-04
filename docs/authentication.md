# Print Bazzar — Authentication & Access Control (RBAC)
**Architecture**: Dual Multi-Tenant Auth (Customer Portal + In-House Staff ERP)  

---

## 1. Role-Based Access Control (RBAC) Model

The application enforces strict role segregation across all operations:

```text
                                  AUTHENTICATION
                                        │
                    ┌───────────────────┴───────────────────┐
                    ↓                                       ↓
             CUSTOMER AUTH                            STAFF ERP AUTH
        (Retail B2C / Corporate)                 (Role-Based Department Access)
                    │                                       │
        ┌───────────┴───────────┐               ┌───────────┼───────────┬───────────┐
        ↓                       ↓               ↓           ↓           ↓           ↓
    Own Profile             Own Orders      Designer      Press         QC       Admin
    Own Addresses           Proof Approval  (Jobs Hub)  (Production) (Finishing) (Full CMS)
```

---

## 2. In-House Staff Roles & Department Boundaries

| Role Name | Department Code | System Permissions | Operational Scope |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `ALL` | All Permissions (`*`) | Full access to Pricing, CMS, Settings, Staff, Audits, Orders. |
| **Admin** | `ALL` | `PRODUCT_EDIT`, `ORDER_VIEW`, `ORDER_UPDATE`, `WORKFLOW_VIEW` | Store management and production oversight. |
| **Lead Designer** | `DESIGN` | `ORDER_VIEW`, `ORDER_UPDATE`, `WORKFLOW_VIEW` | Accesses Design Studio, customer briefs, draft uploads, revision logs. |
| **Press Master** | `PRODUCTION`| `ORDER_VIEW`, `ORDER_UPDATE`, `WORKFLOW_VIEW` | Accesses approved print jobs in `PRODUCTION_QUEUE`, machine job cards. |
| **Finishing & QC** | `FINISHING_QC`| `ORDER_VIEW`, `ORDER_UPDATE`, `WORKFLOW_VIEW` | Quality control verification, lamination, die-cutting handover. |
| **Packing Desk** | `PACKING` | `ORDER_VIEW`, `ORDER_UPDATE`, `WORKFLOW_VIEW` | Weighing, box labeling, parcel preparation. |
| **Delivery Boy** | `DELIVERY` | `ORDER_VIEW`, `ORDER_UPDATE` | Dispatch manifest, customer address routing, delivery marking. |

---

## 3. Customer Authentication & Profile Isolation

Customers authenticate via `/account/login` and `/account/signup`.
- **Session Tokens**: JWT containing `customerId`, `email`, and `customerType` (`RETAIL` vs `B2B_CORPORATE`).
- **Data Isolation**: Customer endpoints strictly scope queries by `req.customer.id`:
  - A customer can **only view their own orders**.
  - A customer can **only upload and view their own artwork files**.
  - Direct object reference attacks (IDOR) are blocked at the controller middleware layer.

---

## 4. Default Seed Staff Accounts (Pre-configured)

| Department / Role | Email | Password | Primary Workflow Page |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@printbazzar.online` | `Admin@123` | `/admin/dashboard` |
| **Design Studio** | `design@printbazzar.online` | `Staff@123` | `/admin/design-services` & `/admin/workflow` |
| **Press Operator** | `press@printbazzar.online` | `Staff@123` | `/admin/workflow` (Production Column) |
| **Finishing & QC** | `qc@printbazzar.online` | `Staff@123` | `/admin/workflow` (Finishing Column) |
| **Packaging Desk** | `packing@printbazzar.online` | `Staff@123` | `/admin/workflow` (Packing Column) |
| **Delivery Boy** | `delivery@printbazzar.online` | `Staff@123` | `/admin/workflow` (Delivery Column) |
