# Print Bazzar — Row Level Security (RLS) Specification
**Database Provider**: Supabase PostgreSQL 15  
**Policy Standard**: Defense-in-depth security at both Database (RLS) and Controller (API Middleware) layers.  

---

## 1. Principles of Data Isolation

1. **Customer Privacy**: A customer can NEVER read, update, or enumerate another customer's orders, invoices, addresses, or uploaded artwork.
2. **Designer Scope**: Graphic designers can only access customer briefs, reference files, and revision drafts for jobs explicitly assigned to their department or account.
3. **Financial Protection**: Production press operators and delivery drivers can view product specifications and shipping destinations, but are restricted from modifying financial ledger balances or refund records.
4. **Super Admin Authorization**: Unrestricted administrative access is granted only to verified company leadership (`SUPER_ADMIN` role).

---

## 2. Production PostgreSQL RLS Policy Script

Execute the following SQL script in the Supabase SQL Editor to enforce native database-level RLS policies:

```sql
-- 1. Enable RLS on core tables
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerAddress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DesignOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DesignRevision" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ArtworkUpload" ENABLE ROW LEVEL SECURITY;

-- 2. Customer Isolation Policy on Orders
CREATE POLICY "Customers can only view their own orders"
ON "Order"
FOR SELECT
USING (
  auth.uid()::text = "customerId"
  OR (SELECT role FROM "User" WHERE id = auth.uid()::text) IN ('ADMIN', 'SUPER_ADMIN')
);

-- 3. Customer Address Isolation
CREATE POLICY "Customers can only view and edit their own addresses"
ON "CustomerAddress"
FOR ALL
USING (
  auth.uid()::text = "customerId"
  OR (SELECT role FROM "User" WHERE id = auth.uid()::text) IN ('ADMIN', 'SUPER_ADMIN')
);

-- 4. Designer Isolation Policy on Design Orders
CREATE POLICY "Designers can access assigned jobs and Admins can access all"
ON "DesignOrder"
FOR SELECT
USING (
  "designerId" = auth.uid()::text
  OR (SELECT department FROM "User" WHERE id = auth.uid()::text) IN ('DESIGN', 'ALL')
);

-- 5. Public Read for Active Catalog (Products & Categories)
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public catalog view"
ON "Product"
FOR SELECT
USING ("isActive" = true OR (SELECT role FROM "User" WHERE id = auth.uid()::text) IN ('ADMIN', 'SUPER_ADMIN'));
```

---

## 3. Controller Layer Guard Integration

In addition to database RLS, the backend Node.js controllers enforce role validation:

```javascript
// Example from orderController.js
if (req.customer && order.customerId !== req.customer.id) {
  return res.status(403).json({ success: false, message: 'Forbidden: Access to this order is denied' });
}
```
