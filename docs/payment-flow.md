# Print Bazzar — Payment Integration & Financial Security
**Standard**: 100% Server-Side Amount Recalculation & Cryptographic Signature Verification  

---

## 1. End-to-End Payment Flow Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer
    participant Frontend as Storefront (Client)
    participant Server as Node.js Backend API
    participant DB as Supabase PostgreSQL
    participant Gateway as Payment Gateway (Razorpay)

    Customer->>Frontend: Clicks "Proceed to Pay" at Checkout
    Frontend->>Server: POST /api/v1/orders/create-payment-intent (Items, Options, Design Addons)
    Note over Server: CRITICAL: Recalculates exact total from DB prices.<br/>Never trusts client-side totals!
    Server->>DB: Query Product Prices, Slabs & Design Package Rates
    Server->>Gateway: POST /orders (Amount in Paise, Currency INR, Receipt ID)
    Gateway-->>Server: Returns gatewayOrderId
    Server->>DB: Create Order (status: PENDING, paymentStatus: UNPAID)
    Server-->>Frontend: Returns orderNumber & gatewayOrderId
    Frontend->>Customer: Opens Razorpay Checkout Modal
    Customer->>Gateway: Enters UPI / Netbanking / Card details & Pays
    Gateway-->>Frontend: Returns payment_id & razorpay_signature
    Frontend->>Server: POST /api/v1/orders/verify-payment (orderId, payment_id, signature)
    Note over Server: Verifies HMAC SHA256 signature using RAZORPAY_KEY_SECRET
    Server->>DB: Update Payment record (status: SUCCESS, transactionRef)
    Server->>DB: Update Order (paymentStatus: PAID)
    Server->>DB: Instantiate linked DesignOrder (PB-DES-XXXXX) if design selected
    Server-->>Frontend: Payment Success confirmation
    Frontend->>Customer: Renders Order Confirmation Page (/order-confirmation/PB-ORD-XXXXX)
```

---

## 2. Mandatory Financial Security Rules

1. **Zero Trust on Frontend Totals**:
   Any price or subtotal sent in the HTTP request payload is treated solely as an unverified UI hint. The server retrieves active base rates, slab prices, finishing surcharges, design package fees, add-ons, and GST percentages directly from the database and calculates the canonical charge.
2. **Cryptographic Webhook & Signature Verification**:
   Payment callbacks must verify the SHA256 HMAC signature against `RAZORPAY_KEY_SECRET`. Orders are never marked `PAID` without mathematical cryptographic proof from the gateway.
3. **Double-Spend Prevention**:
   Every payment verification checks if the order has already been marked `PAID`. Subsequent callback attempts are treated as idempotent updates without duplicating design tickets or stock deductions.
