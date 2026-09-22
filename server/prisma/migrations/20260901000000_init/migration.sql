-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "department" TEXT NOT NULL DEFAULT 'ALL',
    "roleId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "imageUrl" TEXT,
    "bannerUrl" TEXT,
    "description" TEXT,
    "parentId" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "shortDescription" TEXT,
    "fullDescription" TEXT,
    "thumbnailUrl" TEXT,
    "videoUrl" TEXT,
    "startingPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minQuantity" INTEGER NOT NULL DEFAULT 1,
    "maxQuantity" INTEGER,
    "quantityUnit" TEXT NOT NULL DEFAULT 'Pieces',
    "quantityType" TEXT NOT NULL DEFAULT 'FIXED',
    "customQtyMin" INTEGER NOT NULL DEFAULT 100,
    "customQtyMax" INTEGER,
    "customQtyStep" INTEGER NOT NULL DEFAULT 50,
    "customUnitPrice" DOUBLE PRECISION,
    "pricingType" TEXT NOT NULL DEFAULT 'TIERED',
    "pricingSource" TEXT NOT NULL DEFAULT 'CURRENT_PRINTBAZZAR_WEBSITE',
    "sourceStatus" TEXT NOT NULL DEFAULT 'LIVE_CONFIRMED',
    "gstPercentage" DOUBLE PRECISION NOT NULL DEFAULT 18.0,
    "productionDays" INTEGER NOT NULL DEFAULT 1,
    "singleSideDesignCharge" DOUBLE PRECISION NOT NULL DEFAULT 200.0,
    "doubleSideDesignCharge" DOUBLE PRECISION NOT NULL DEFAULT 400.0,
    "turnaroundTime" TEXT DEFAULT 'Single Day Delivery (Order Before 12PM)',
    "deliveryInfo" TEXT DEFAULT 'Fast local & courier delivery available',
    "hasCustomDesign" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isBestSeller" BOOLEAN NOT NULL DEFAULT false,
    "isNewArrival" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "templateId" TEXT,
    "templateVersion" INTEGER DEFAULT 1,
    "templateSnapshotJson" TEXT,
    "pricingFormulaJson" TEXT,
    "productionDepartment" TEXT DEFAULT 'PRODUCTION',
    "productionMachine" TEXT,
    "qcChecklistJson" TEXT,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "imageType" TEXT NOT NULL DEFAULT 'GALLERY',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSpecification" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "specKey" TEXT NOT NULL,
    "specValue" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductSpecification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductOption" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "optionName" TEXT NOT NULL,
    "optionType" TEXT NOT NULL DEFAULT 'SELECT',
    "isAddon" BOOLEAN NOT NULL DEFAULT false,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductOptionValue" (
    "id" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "valueLabel" TEXT NOT NULL,
    "priceModifierType" TEXT NOT NULL DEFAULT 'FLAT',
    "priceModifierValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductOptionValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCombination" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "combinationKey" TEXT NOT NULL,
    "optionsJson" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "sku" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCombination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPriceSlab" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "minQty" INTEGER NOT NULL,
    "maxQty" INTEGER,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "singleSidePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "doubleSidePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "designCharge" DOUBLE PRECISION NOT NULL DEFAULT 200,
    "singleSideDesignCharge" DOUBLE PRECISION NOT NULL DEFAULT 200,
    "doubleSideDesignCharge" DOUBLE PRECISION NOT NULL DEFAULT 400,
    "unitName" TEXT NOT NULL DEFAULT 'Pieces',
    "pricingType" TEXT NOT NULL DEFAULT 'TIERED',
    "source" TEXT NOT NULL DEFAULT 'CURRENT_PRINTBAZZAR_WEBSITE',

    CONSTRAINT "ProductPriceSlab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "oldPriceData" TEXT NOT NULL,
    "newPriceData" TEXT NOT NULL,
    "changedByUserId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptionMaster" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "optionType" TEXT NOT NULL DEFAULT 'SELECT',
    "visibility" TEXT NOT NULL DEFAULT 'CUSTOMER_VISIBLE',
    "helpText" TEXT,
    "tooltip" TEXT,
    "imageUrl" TEXT,
    "unit" TEXT,
    "minValue" DOUBLE PRECISION,
    "maxValue" DOUBLE PRECISION,
    "stepValue" DOUBLE PRECISION,
    "isAddon" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptionMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptionMasterValue" (
    "id" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "swatchValue" TEXT,
    "defaultModifierType" TEXT NOT NULL DEFAULT 'FLAT',
    "defaultModifierValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptionMasterValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductOptionMapping" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "customLabel" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'CUSTOMER_VISIBLE',
    "helpText" TEXT,
    "tooltip" TEXT,
    "imageUrl" TEXT,
    "unit" TEXT,
    "minValue" DOUBLE PRECISION,
    "maxValue" DOUBLE PRECISION,
    "stepValue" DOUBLE PRECISION,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "isAddon" BOOLEAN NOT NULL DEFAULT false,
    "defaultValue" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "pricingBehavior" TEXT NOT NULL DEFAULT 'MATRIX_DIMENSION',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductOptionMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductOptionValueMapping" (
    "id" TEXT NOT NULL,
    "mappingId" TEXT NOT NULL,
    "masterValueId" TEXT NOT NULL,
    "customLabel" TEXT,
    "priceModifierType" TEXT NOT NULL DEFAULT 'FLAT',
    "priceModifierValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductOptionValueMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPricingMatrix" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "combinationKey" TEXT NOT NULL,
    "optionsJson" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION,
    "sku" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductPricingMatrix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCompatibilityRule" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "ruleName" TEXT NOT NULL,
    "triggerOptionCode" TEXT NOT NULL,
    "triggerValueCode" TEXT NOT NULL,
    "operator" TEXT NOT NULL DEFAULT 'EQUALS',
    "action" TEXT NOT NULL,
    "targetOptionCode" TEXT NOT NULL,
    "targetValueCode" TEXT,
    "reason" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCompatibilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceVersion" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "versionLabel" TEXT NOT NULL,
    "pricingModel" TEXT NOT NULL DEFAULT 'MATRIX',
    "snapshotData" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedByUserId" TEXT,
    "changeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Banner" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "desktopImageUrl" TEXT NOT NULL,
    "mobileImageUrl" TEXT,
    "buttonText" TEXT DEFAULT 'Shop Now',
    "buttonUrl" TEXT DEFAULT '/shop',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerAvatar" TEXT,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "reviewText" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'GOOGLE',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "googleId" TEXT,
    "avatarUrl" TEXT,
    "passwordHash" TEXT,
    "mobile" TEXT NOT NULL DEFAULT '',
    "whatsapp" TEXT,
    "accountType" TEXT NOT NULL DEFAULT 'B2C_RETAIL',
    "companyName" TEXT,
    "gstNumber" TEXT,
    "businessPan" TEXT,
    "isVerifiedCorporate" BOOLEAN NOT NULL DEFAULT false,
    "corporateDiscountPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditLimit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "otpCode" TEXT,
    "otpExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerAddress" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Office / Branch',
    "recipientName" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'Tamil Nadu',
    "pincode" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "customerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "selectedOptions" TEXT NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "designRequired" BOOLEAN NOT NULL DEFAULT false,
    "artworkFileUrl" TEXT,
    "artworkOption" TEXT DEFAULT 'PRINT_READY_FILE',
    "designPackageId" TEXT,
    "designPackageName" TEXT,
    "designCharge" DOUBLE PRECISION DEFAULT 0,
    "designBriefResponses" TEXT,
    "designAssets" TEXT,
    "termsAccepted" BOOLEAN DEFAULT false,
    "termsAcceptedAt" TIMESTAMP(3),
    "selectedAddons" TEXT,
    "preferredStyle" TEXT,
    "preferredColor" TEXT,
    "requirementNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerMobile" TEXT NOT NULL,
    "customerWhatsapp" TEXT,
    "shippingAddress" TEXT NOT NULL,
    "billingAddress" TEXT,
    "gstNumber" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shippingCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cgstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sgstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "igstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grandTotal" DOUBLE PRECISION NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "orderStatus" TEXT NOT NULL DEFAULT 'ORDER_RECEIVED',
    "deliveryType" TEXT NOT NULL DEFAULT 'LOCAL_DELIVERY',
    "trackingReference" TEXT,
    "estimatedDeliveryDate" TIMESTAMP(3),
    "currentDepartment" TEXT NOT NULL DEFAULT 'DESIGN',
    "assignedStaffName" TEXT,
    "machineNumber" TEXT,
    "proofFileUrl" TEXT,
    "proofStatus" TEXT DEFAULT 'PENDING',
    "proofApprovedAt" TIMESTAMP(3),
    "packingWeight" TEXT,
    "courierPartner" TEXT,
    "trackingUrl" TEXT,
    "deliveryMethod" TEXT DEFAULT 'COURIER',
    "pickupLocation" TEXT,
    "pickupReadyAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "pickupVerifiedBy" TEXT,
    "estimatedDispatchDate" TIMESTAMP(3),
    "productionDays" INTEGER DEFAULT 3,
    "transitDays" INTEGER DEFAULT 2,
    "orderSource" TEXT NOT NULL DEFAULT 'WEBSITE',
    "branch" TEXT DEFAULT 'TRICHY_MAIN',
    "discountReason" TEXT,
    "createdStaffId" TEXT,
    "createdStaffName" TEXT,
    "managerApprovalId" TEXT,
    "managerApprovalName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productNameSnapshot" TEXT NOT NULL,
    "skuSnapshot" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceSnapshot" DOUBLE PRECISION NOT NULL,
    "totalPriceSnapshot" DOUBLE PRECISION NOT NULL,
    "designRequired" BOOLEAN NOT NULL DEFAULT false,
    "artworkFileUrl" TEXT,
    "artworkOption" TEXT DEFAULT 'PRINT_READY_FILE',
    "designPackageId" TEXT,
    "designPackageName" TEXT,
    "designCharge" DOUBLE PRECISION DEFAULT 0,
    "designBriefResponses" TEXT,
    "designAssets" TEXT,
    "termsAccepted" BOOLEAN DEFAULT false,
    "termsAcceptedAt" TIMESTAMP(3),
    "selectedAddons" TEXT,
    "designJobNumber" TEXT,
    "preferredStyle" TEXT,
    "preferredColor" TEXT,
    "requirementNotes" TEXT,
    "specificationsSnapshot" TEXT,
    "optionsSnapshot" TEXT,
    "configurationSnapshot" TEXT,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "previousStatus" TEXT,
    "newStatus" TEXT NOT NULL,
    "changedByUserId" TEXT,
    "note" TEXT,
    "customerNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderNote" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT,
    "noteText" TEXT NOT NULL,
    "isInternalOnly" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'UPI',
    "transactionId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentMetadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "entityId" TEXT,
    "oldValues" TEXT,
    "newValues" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductArtworkSetting" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "enablePrintReady" BOOLEAN NOT NULL DEFAULT true,
    "enableDesignSupport" BOOLEAN NOT NULL DEFAULT true,
    "acceptedFormats" TEXT NOT NULL DEFAULT 'PDF,AI,CDR,PSD,PNG,JPG',
    "maxFileSizeMb" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "minFileSizeMb" DOUBLE PRECISION,
    "printWidth" DOUBLE PRECISION,
    "printHeight" DOUBLE PRECISION,
    "sizeUnit" TEXT NOT NULL DEFAULT 'inches',
    "bleed" TEXT DEFAULT '0.125 inches on all sides',
    "safeMargin" TEXT DEFAULT '0.125 inches',
    "resolutionDpi" INTEGER NOT NULL DEFAULT 300,
    "colorMode" TEXT NOT NULL DEFAULT 'CMYK',
    "fontInstructions" TEXT DEFAULT 'Convert all text to curves/outlines or embed fonts',
    "specialInstructions" TEXT,
    "designTerms" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductArtworkSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductDesignPackage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "packageName" TEXT NOT NULL,
    "description" TEXT,
    "designCharge" DOUBLE PRECISION NOT NULL DEFAULT 300.0,
    "doubleSideDesignCharge" DOUBLE PRECISION,
    "initialConcepts" INTEGER NOT NULL DEFAULT 1,
    "revisionsIncluded" INTEGER NOT NULL DEFAULT 1,
    "additionalRevisionCharge" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "estimatedTime" TEXT NOT NULL DEFAULT '1 Business Day',
    "includedServices" TEXT,
    "excludedServices" TEXT,
    "termsAndConditions" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductDesignPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductDesignBriefField" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "fieldLabel" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL DEFAULT 'SINGLE_LINE_TEXT',
    "placeholder" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "helpText" TEXT,
    "optionsJson" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductDesignBriefField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtworkUpload" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storageLocation" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "productId" TEXT,
    "customerId" TEXT,
    "cartItemId" TEXT,
    "orderId" TEXT,
    "dpi" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "preflightStatus" TEXT,
    "preflightReport" TEXT,
    "customerAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtworkUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignPackage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "badge" TEXT,
    "shortDescription" TEXT,
    "detailedDescription" TEXT,
    "packageIcon" TEXT,
    "basePrice" DOUBLE PRECISION NOT NULL DEFAULT 299.0,
    "doubleSidePrice" DOUBLE PRECISION DEFAULT 499.0,
    "offerPrice" DOUBLE PRECISION,
    "concepts" INTEGER NOT NULL DEFAULT 1,
    "revisions" INTEGER NOT NULL DEFAULT 1,
    "deliveryDays" INTEGER NOT NULL DEFAULT 2,
    "deliveryTimeText" TEXT DEFAULT '2 Working Days',
    "expressDeliveryTime" TEXT DEFAULT '24 Hours',
    "expressDeliveryCharge" DOUBLE PRECISION DEFAULT 250.0,
    "featuresJson" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesignPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignAddon" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 150.0,
    "description" TEXT,
    "badge" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesignAddon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductDesignPackageMapping" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "customPrice" DOUBLE PRECISION,
    "customDoubleSidePrice" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductDesignPackageMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignOrder" (
    "id" TEXT NOT NULL,
    "designJobNumber" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT,
    "productId" TEXT,
    "packageId" TEXT,
    "packageNameSnapshot" TEXT NOT NULL,
    "packagePriceSnapshot" DOUBLE PRECISION NOT NULL,
    "packageSnapshotJson" TEXT,
    "addonsSnapshotJson" TEXT,
    "requirementNotes" TEXT,
    "preferredStyle" TEXT,
    "preferredColor" TEXT,
    "briefResponsesJson" TEXT,
    "uploadedAssetsJson" TEXT,
    "designerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REQUIREMENT_RECEIVED',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "deadline" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "finalFilesJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesignOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignRevision" (
    "id" TEXT NOT NULL,
    "designOrderId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL DEFAULT 1,
    "customerComment" TEXT,
    "designerResponse" TEXT,
    "draftFileUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesignRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionJob" (
    "id" TEXT NOT NULL,
    "jobNumber" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT,
    "productId" TEXT,
    "productNameSnapshot" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'STANDARD',
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "assignedStaffName" TEXT,
    "machineNumber" TEXT,
    "specsSnapshotJson" TEXT,
    "customizationSnapshotJson" TEXT,
    "approvedArtworkUrl" TEXT,
    "approvedArtworkVersion" TEXT DEFAULT 'V1 - Approved',
    "artworkStatus" TEXT DEFAULT 'APPROVED',
    "deadline" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "assignedDepartment" TEXT DEFAULT 'PRODUCTION',
    "assignedStaffId" TEXT,
    "assignedByUserId" TEXT,
    "assignedByName" TEXT,
    "assignedAt" TIMESTAMP(3),
    "reassignedByUserId" TEXT,
    "reassignedByName" TEXT,
    "reassignedAt" TIMESTAMP(3),
    "preHoldStatus" TEXT,
    "estimatedCompletionTime" TIMESTAMP(3),
    "actualCompletionTime" TIMESTAMP(3),
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "pausedAt" TIMESTAMP(3),
    "pauseReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityCheck" (
    "id" TEXT NOT NULL,
    "qcNumber" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productionJobId" TEXT,
    "inspectorName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "checklistJson" TEXT,
    "failureReason" TEXT,
    "failureNotes" TEXT,
    "inspectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualityCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "shipmentNumber" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "deliveryMethod" TEXT NOT NULL DEFAULT 'COURIER',
    "recipientName" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "altMobile" TEXT,
    "companyName" TEXT,
    "fullAddress" TEXT NOT NULL,
    "landmark" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "courierPartner" TEXT,
    "trackingNumber" TEXT,
    "trackingUrl" TEXT,
    "packageCount" INTEGER NOT NULL DEFAULT 1,
    "packageWeightKg" DOUBLE PRECISION,
    "boxDimensions" TEXT,
    "dispatchDate" TIMESTAMP(3),
    "expectedDeliveryDate" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dispatchStaffName" TEXT,
    "pickupLocation" TEXT,
    "pickupReadyAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "handoverStaffName" TEXT,
    "verifiedCustomerName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "invoiceType" TEXT NOT NULL DEFAULT 'ORDER_RECEIPT',
    "companyDetailsJson" TEXT,
    "billToSnapshotJson" TEXT,
    "shipToSnapshotJson" TEXT,
    "itemsSnapshotJson" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "taxableAmount" DOUBLE PRECISION NOT NULL,
    "cgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "igst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shippingCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grandTotal" DOUBLE PRECISION NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceDue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PAID',
    "paymentMethod" TEXT NOT NULL DEFAULT 'UPI',
    "transactionReference" TEXT,
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobIssue" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productionJobId" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "issueCategory" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reportedByUserId" TEXT,
    "reportedByName" TEXT,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolutionStatus" TEXT NOT NULL DEFAULT 'OPEN',
    "resolvedByUserId" TEXT,
    "resolvedByName" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "department" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "orderId" TEXT,
    "productionJobId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductConfigurationTemplate" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "pricingModel" TEXT NOT NULL DEFAULT 'MATRIX',
    "fieldsConfigJson" TEXT NOT NULL,
    "defaultOptionsJson" TEXT,
    "qcChecklistJson" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductConfigurationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteRequest" (
    "id" TEXT NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "productId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerMobile" TEXT NOT NULL,
    "specificationsJson" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "description" TEXT,
    "referenceImageUrl" TEXT,
    "quotedPrice" DOUBLE PRECISION,
    "quotedBreakdownJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "quotedAt" TIMESTAMP(3),
    "quotedByName" TEXT,
    "respondedAt" TIMESTAMP(3),
    "convertedOrderId" TEXT,
    "notes" TEXT,
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_categoryId_status_idx" ON "Product"("categoryId", "status");

-- CreateIndex
CREATE INDEX "ProductCombination_productId_quantity_idx" ON "ProductCombination"("productId", "quantity");

-- CreateIndex
CREATE INDEX "ProductCombination_productId_combinationKey_idx" ON "ProductCombination"("productId", "combinationKey");

-- CreateIndex
CREATE UNIQUE INDEX "OptionMaster_code_key" ON "OptionMaster"("code");

-- CreateIndex
CREATE UNIQUE INDEX "OptionMasterValue_masterId_code_key" ON "OptionMasterValue"("masterId", "code");

-- CreateIndex
CREATE INDEX "ProductOptionMapping_productId_displayOrder_idx" ON "ProductOptionMapping"("productId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ProductOptionMapping_productId_masterId_key" ON "ProductOptionMapping"("productId", "masterId");

-- CreateIndex
CREATE INDEX "ProductOptionValueMapping_mappingId_displayOrder_idx" ON "ProductOptionValueMapping"("mappingId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ProductOptionValueMapping_mappingId_masterValueId_key" ON "ProductOptionValueMapping"("mappingId", "masterValueId");

-- CreateIndex
CREATE INDEX "ProductPricingMatrix_productId_quantity_idx" ON "ProductPricingMatrix"("productId", "quantity");

-- CreateIndex
CREATE INDEX "ProductPricingMatrix_productId_combinationKey_idx" ON "ProductPricingMatrix"("productId", "combinationKey");

-- CreateIndex
CREATE INDEX "ProductCompatibilityRule_productId_triggerOptionCode_idx" ON "ProductCompatibilityRule"("productId", "triggerOptionCode");

-- CreateIndex
CREATE INDEX "PriceVersion_productId_versionNumber_idx" ON "PriceVersion"("productId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_googleId_key" ON "Customer"("googleId");

-- CreateIndex
CREATE INDEX "Customer_mobile_idx" ON "Customer"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_sessionToken_key" ON "Cart"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "Order_orderStatus_idx" ON "Order"("orderStatus");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");

-- CreateIndex
CREATE INDEX "Order_orderSource_idx" ON "Order"("orderSource");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_orderId_idx" ON "OrderStatusHistory"("orderId");

-- CreateIndex
CREATE INDEX "OrderNote_orderId_idx" ON "OrderNote"("orderId");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreSetting_key_key" ON "StoreSetting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ProductArtworkSetting_productId_key" ON "ProductArtworkSetting"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductDesignPackageMapping_productId_packageId_key" ON "ProductDesignPackageMapping"("productId", "packageId");

-- CreateIndex
CREATE UNIQUE INDEX "DesignOrder_designJobNumber_key" ON "DesignOrder"("designJobNumber");

-- CreateIndex
CREATE INDEX "DesignOrder_orderId_idx" ON "DesignOrder"("orderId");

-- CreateIndex
CREATE INDEX "DesignOrder_orderItemId_idx" ON "DesignOrder"("orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionJob_jobNumber_key" ON "ProductionJob"("jobNumber");

-- CreateIndex
CREATE INDEX "ProductionJob_orderId_idx" ON "ProductionJob"("orderId");

-- CreateIndex
CREATE INDEX "ProductionJob_orderItemId_idx" ON "ProductionJob"("orderItemId");

-- CreateIndex
CREATE INDEX "ProductionJob_assignedStaffId_idx" ON "ProductionJob"("assignedStaffId");

-- CreateIndex
CREATE INDEX "ProductionJob_assignedDepartment_idx" ON "ProductionJob"("assignedDepartment");

-- CreateIndex
CREATE INDEX "ProductionJob_priority_idx" ON "ProductionJob"("priority");

-- CreateIndex
CREATE INDEX "ProductionJob_status_idx" ON "ProductionJob"("status");

-- CreateIndex
CREATE UNIQUE INDEX "QualityCheck_qcNumber_key" ON "QualityCheck"("qcNumber");

-- CreateIndex
CREATE INDEX "QualityCheck_orderId_idx" ON "QualityCheck"("orderId");

-- CreateIndex
CREATE INDEX "QualityCheck_productionJobId_idx" ON "QualityCheck"("productionJobId");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_shipmentNumber_key" ON "Shipment"("shipmentNumber");

-- CreateIndex
CREATE INDEX "Shipment_orderId_idx" ON "Shipment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_orderId_idx" ON "Invoice"("orderId");

-- CreateIndex
CREATE INDEX "JobIssue_orderId_idx" ON "JobIssue"("orderId");

-- CreateIndex
CREATE INDEX "JobIssue_productionJobId_idx" ON "JobIssue"("productionJobId");

-- CreateIndex
CREATE INDEX "JobIssue_department_idx" ON "JobIssue"("department");

-- CreateIndex
CREATE INDEX "JobIssue_resolutionStatus_idx" ON "JobIssue"("resolutionStatus");

-- CreateIndex
CREATE INDEX "StaffNotification_userId_isRead_idx" ON "StaffNotification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "StaffNotification_department_idx" ON "StaffNotification"("department");

-- CreateIndex
CREATE INDEX "StaffNotification_createdAt_idx" ON "StaffNotification"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ProductConfigurationTemplate_code_key" ON "ProductConfigurationTemplate"("code");

-- CreateIndex
CREATE INDEX "ProductConfigurationTemplate_category_idx" ON "ProductConfigurationTemplate"("category");

-- CreateIndex
CREATE INDEX "ProductConfigurationTemplate_status_idx" ON "ProductConfigurationTemplate"("status");

-- CreateIndex
CREATE INDEX "ProductConfigurationTemplate_code_version_idx" ON "ProductConfigurationTemplate"("code", "version");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteRequest_quoteNumber_key" ON "QuoteRequest"("quoteNumber");

-- CreateIndex
CREATE INDEX "QuoteRequest_customerId_idx" ON "QuoteRequest"("customerId");

-- CreateIndex
CREATE INDEX "QuoteRequest_productId_idx" ON "QuoteRequest"("productId");

-- CreateIndex
CREATE INDEX "QuoteRequest_status_idx" ON "QuoteRequest"("status");

-- CreateIndex
CREATE INDEX "QuoteRequest_createdAt_idx" ON "QuoteRequest"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProductConfigurationTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSpecification" ADD CONSTRAINT "ProductSpecification_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOption" ADD CONSTRAINT "ProductOption_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOptionValue" ADD CONSTRAINT "ProductOptionValue_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "ProductOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCombination" ADD CONSTRAINT "ProductCombination_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPriceSlab" ADD CONSTRAINT "ProductPriceSlab_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionMasterValue" ADD CONSTRAINT "OptionMasterValue_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "OptionMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOptionMapping" ADD CONSTRAINT "ProductOptionMapping_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOptionMapping" ADD CONSTRAINT "ProductOptionMapping_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "OptionMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOptionValueMapping" ADD CONSTRAINT "ProductOptionValueMapping_mappingId_fkey" FOREIGN KEY ("mappingId") REFERENCES "ProductOptionMapping"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOptionValueMapping" ADD CONSTRAINT "ProductOptionValueMapping_masterValueId_fkey" FOREIGN KEY ("masterValueId") REFERENCES "OptionMasterValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPricingMatrix" ADD CONSTRAINT "ProductPricingMatrix_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCompatibilityRule" ADD CONSTRAINT "ProductCompatibilityRule_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceVersion" ADD CONSTRAINT "PriceVersion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceVersion" ADD CONSTRAINT "PriceVersion_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAddress" ADD CONSTRAINT "CustomerAddress_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderNote" ADD CONSTRAINT "OrderNote_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderNote" ADD CONSTRAINT "OrderNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductArtworkSetting" ADD CONSTRAINT "ProductArtworkSetting_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDesignPackage" ADD CONSTRAINT "ProductDesignPackage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDesignBriefField" ADD CONSTRAINT "ProductDesignBriefField_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtworkUpload" ADD CONSTRAINT "ArtworkUpload_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDesignPackageMapping" ADD CONSTRAINT "ProductDesignPackageMapping_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDesignPackageMapping" ADD CONSTRAINT "ProductDesignPackageMapping_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "DesignPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignOrder" ADD CONSTRAINT "DesignOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignOrder" ADD CONSTRAINT "DesignOrder_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignOrder" ADD CONSTRAINT "DesignOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignOrder" ADD CONSTRAINT "DesignOrder_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "DesignPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignOrder" ADD CONSTRAINT "DesignOrder_designerId_fkey" FOREIGN KEY ("designerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignRevision" ADD CONSTRAINT "DesignRevision_designOrderId_fkey" FOREIGN KEY ("designOrderId") REFERENCES "DesignOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionJob" ADD CONSTRAINT "ProductionJob_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionJob" ADD CONSTRAINT "ProductionJob_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionJob" ADD CONSTRAINT "ProductionJob_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityCheck" ADD CONSTRAINT "QualityCheck_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityCheck" ADD CONSTRAINT "QualityCheck_productionJobId_fkey" FOREIGN KEY ("productionJobId") REFERENCES "ProductionJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobIssue" ADD CONSTRAINT "JobIssue_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobIssue" ADD CONSTRAINT "JobIssue_productionJobId_fkey" FOREIGN KEY ("productionJobId") REFERENCES "ProductionJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobIssue" ADD CONSTRAINT "JobIssue_reportedByUserId_fkey" FOREIGN KEY ("reportedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobIssue" ADD CONSTRAINT "JobIssue_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffNotification" ADD CONSTRAINT "StaffNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffNotification" ADD CONSTRAINT "StaffNotification_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffNotification" ADD CONSTRAINT "StaffNotification_productionJobId_fkey" FOREIGN KEY ("productionJobId") REFERENCES "ProductionJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteRequest" ADD CONSTRAINT "QuoteRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteRequest" ADD CONSTRAINT "QuoteRequest_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
