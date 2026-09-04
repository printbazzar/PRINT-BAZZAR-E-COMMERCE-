# Print Bazzar — REST API Reference Guide

Base URL for all endpoints: `/api/v1`

---

## 1. Authentication & Accounts

### A. Staff Authentication

#### `POST /auth/login`
* **Purpose**: Authenticates administrative staff and press operators.
* **Auth Required**: No.
* **Permissions**: None.
* **Request Body**:
  ```json
  {
    "email": "admin@printbazzar.online",
    "password": "Password123"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "uuid",
        "name": "Super Admin",
        "email": "admin@printbazzar.online",
        "role": "SUPER_ADMIN",
        "department": "ALL"
      },
      "token": "jwt_token_here"
    }
  }
  ```
* **Error Response (401 Unauthorized)**:
  ```json
  {
    "success": false,
    "message": "Invalid email or password credentials."
  }
  ```

#### `GET /auth/me`
* **Purpose**: Fetches the currently authenticated staff profile.
* **Auth Required**: Yes (Bearer Token).
* **Success Response (200 OK)**: Profile and assigned permissions object.

---

### B. Customer Authentication

#### `POST /customer/auth/signup`
* **Purpose**: Registers a new retail or corporate customer.
* **Auth Required**: No.
* **Request Body**:
  ```json
  {
    "name": "Arun Kumar",
    "email": "arun@example.com",
    "mobile": "9876543210",
    "password": "Password123",
    "isCorporate": true,
    "companyName": "Trichy Tech Solutions",
    "gstNumber": "33AAACT1234F1Z5"
  }
  ```
* **Success Response (201 Created)**: Created customer record and auth token.

#### `POST /customer/auth/login`
* **Purpose**: Customer portal login.
* **Auth Required**: No.
* **Request Body**: `email`, `password`.

---

## 2. Catalog & Products

#### `GET /products`
* **Purpose**: Retrieves public active product list.
* **Auth Required**: No.
* **Query Params**: `category` (slug/id), `search` (keyword), `limit`, `page`.
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "uuid",
        "name": "Premium Visiting Cards",
        "slug": "premium-visiting-cards",
        "basePrice": 350.00,
        "thumbnailUrl": "/uploads/cards.jpg"
      }
    ]
  }
  ```

#### `GET /products/:slug`
* **Purpose**: Retrieves full product detail, images, specifications, and paper options.
* **Auth Required**: No.

#### `POST /admin/products`
* **Purpose**: Creates a new product.
* **Auth Required**: Yes (`SUPER_ADMIN` or `CATALOG_EDIT`).
* **Request Body**: Name, slug, categoryId, basePrice, specifications JSON, images array.

---

## 3. Dynamic Pricing Calculation

#### `POST /pricing/calculate`
* **Purpose**: Evaluates exact price for custom print configuration.
* **Auth Required**: No.
* **Request Body**:
  ```json
  {
    "productId": "uuid",
    "quantity": 500,
    "paperGsm": "350 GSM Art Card",
    "lamination": "VELVET_MATTE",
    "isDoubleSide": true,
    "hasDesignService": true
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "unitPrice": 0.90,
      "baseTotal": 450.00,
      "designFee": 200.00,
      "taxGst": 117.00,
      "grandTotal": 767.00
    }
  }
  ```

---

## 4. Orders & Checkout

#### `POST /orders`
* **Purpose**: Creates an order and initiates fulfillment.
* **Auth Required**: Optional (Supports guest checkout or logged-in customer).
* **Request Body**:
  ```json
  {
    "items": [
      {
        "productId": "uuid",
        "quantity": 500,
        "selectedOptions": {},
        "artworkUrl": "/uploads/card-artwork.pdf"
      }
    ],
    "shippingAddress": {
      "recipientName": "Suresh",
      "mobile": "9629098565",
      "street": "No. 12 Main Road",
      "city": "Trichy",
      "state": "Tamil Nadu",
      "pincode": "620008"
    },
    "deliveryMethod": "STORE_PICKUP",
    "paymentMethod": "ONLINE_RAZORPAY"
  }
  ```
* **Success Response (201 Created)**: Returns created `orderNumber`, `grandTotal`, `balanceDue`, and payment intent.

#### `GET /orders/track/:orderIdentifier`
* **Purpose**: Public tracking endpoint for customers using Order Number or Phone.
* **Auth Required**: No.
* **Success Response (200 OK)**: Order timeline, workflow stage, digital proof URLs, and store pickup address.

---

## 5. Payments & Verification

#### `POST /payments/verify`
* **Purpose**: Validates cryptographic signature from Razorpay after customer payment.
* **Auth Required**: No (Cryptographic signature verification).
* **Request Body**:
  ```json
  {
    "orderId": "uuid",
    "razorpay_order_id": "order_EK12345",
    "razorpay_payment_id": "pay_293849",
    "razorpay_signature": "hmac_sha256_hex_signature",
    "paymentStage": "INITIAL_DESIGN_FEE"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Payment verified successfully. Order confirmed."
  }
  ```

---

## 6. File Uploads & Artwork Ingestion

#### `POST /upload/artwork`
* **Purpose**: Uploads client artwork or print-ready PDF/ZIP.
* **Auth Required**: No (Rate limited and MIME validated).
* **Content-Type**: `multipart/form-data`.
* **Field**: `file` (Binary).
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "url": "/uploads/173701234-artwork.pdf",
    "filename": "173701234-artwork.pdf",
    "storageType": "LOCAL_DISK"
  }
  ```

---

## 7. Invoices & Tax Receipts

#### `GET /orders/:id/invoice`
* **Purpose**: Generates GST Tax Invoice payload for an order.
* **Auth Required**: Yes (Customer owning the order or Admin staff).
* **Success Response (200 OK)**: Complete tax invoice breakdown with dynamic seller details, GSTIN, CGST/SGST/IGST tax values, and customer billing address.

---

## 8. ERP Workflow & Production Queues

#### `GET /admin/workflow/queue`
* **Purpose**: Retrieves all orders categorized by department queue.
* **Auth Required**: Yes (`SUPER_ADMIN` or departmental staff).
* **Success Response (200 OK)**: Lists orders in `DESIGN`, `PRODUCTION`, `FINISHING_QC`, `PACKING`, and `DELIVERY`.

#### `PUT /admin/workflow/orders/:id/stage`
* **Purpose**: Transitions order to the next production department.
* **Auth Required**: Yes.
* **Request Body**:
  ```json
  {
    "nextStage": "PRODUCTION",
    "operatorNotes": "Offset printing plate exposed, paper loaded into Heidelberg press"
  }
  ```

---

## 9. Centralized Website Settings

#### `GET /settings/business-info`
* **Purpose**: Public cached endpoint for storefront business details.
* **Auth Required**: No (Cached 60s).
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "brand": { "brandName": "Print Bazzar", "legalName": "Print Bazzar" },
      "tax": { "gstin": "33AAAAA0000A1Z5", "isGstinVerified": false },
      "address": { "fullDisplayAddress": "12 A, Allimal Street, Big Bazzar St, Singarathope, Tiruchirapalli - 620008" },
      "contact": { "primaryPhone": "+91 96290 98565", "whatsappNumber": "919629098565" },
      "operatingHours": { "weekdays": "Monday - Saturday: 9:30 AM - 8:30 PM" }
    }
  }
  ```

#### `PUT /admin/settings/business-info`
* **Purpose**: Updates business details, GSTIN, address, and helplines.
* **Auth Required**: Yes (`SUPER_ADMIN` or `SETTINGS_EDIT`).
* **Request Body**: Full or partial business schema. Validates GSTIN regex and sanitizes XSS.
