# Print Bazzar — Object Storage Architecture & File Security
**Storage Engine**: Supabase Storage (S3-Compatible API) + Edge CDN  

---

## 1. Storage Bucket Topography

```text
Supabase Storage
│
├── 📂 product-images       (Public CDN)    ➔ Product catalog galleries, banners, category icons
├── 📂 customer-uploads     (Private)       ➔ Customer print-ready artwork (PDF, AI, CDR, TIFF)
├── 📂 design-drafts        (Restricted)    ➔ Design proof previews for customer review (PNG, PDF)
├── 📂 design-final-files   (Restricted)    ➔ Approved vector production files for press operators
└── 📂 invoices             (Private)       ➔ Generated GST Tax Invoices
```

---

## 2. Bucket Access Policies & Configurations

| Bucket Identifier | Public Access? | Allowed MIME Types | Max Size | Primary Use Case |
| :--- | :--- | :--- | :--- | :--- |
| `product-images` | **YES** | `image/jpeg, image/png, image/webp, image/svg+xml` | 10 MB | Storefront product photography, category badges. |
| `customer-uploads` | **NO** | `application/pdf, application/postscript, image/*` | 100 MB | Customer artwork files uploaded during ordering. |
| `design-drafts` | **NO** | `image/png, image/jpeg, application/pdf` | 50 MB | Low/medium-res proof drafts sent to customer. |
| `design-final-files` | **NO** | `application/pdf, application/illustrator, application/x-cdr` | 250 MB | Approved high-res master files sent to press. |
| `invoices` | **NO** | `application/pdf` | 5 MB | Legal GSTR-1 compliant tax invoices. |

---

## 3. Upload Validation & Security Safeguards

1. **File Extension Whitelist**:
   Configured via `StoreSetting.DESIGN_ALLOWED_FORMATS`: `PDF,AI,CDR,PSD,PNG,JPG,SVG`. Any executable (`.exe`, `.sh`, `.bat`, `.js`) is rejected immediately.
2. **File Size Enforcement**:
   Enforced both on client (`ProductDetail.jsx`) and backend Multer middleware via `StoreSetting.DESIGN_MAX_FILE_SIZE_MB` (Default: 100MB).
3. **Signed URLs for Private Assets**:
   Customer artwork and final press vectors are accessed via time-limited signed URLs (valid for 60 minutes), preventing unauthorized public indexing.

---

## 4. File Retention & Lifecycle Management

- **Temporary Uploads**: Uncompleted checkout uploads are automatically purged after 72 hours.
- **Active Orders**: Artwork is preserved throughout production and delivery.
- **Archived Orders**: Approved final PDF files are retained for 3 years for easy 1-click customer reordering.
