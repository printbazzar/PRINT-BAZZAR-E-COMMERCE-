import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Breadcrumb, Button, Checkbox, Label, Modal, Select, Spinner, TextInput, Textarea } from 'flowbite-react';
import {
  HiHome,
  HiClock,
  HiCheckCircle,
  HiUpload,
  HiOutlineExclamationCircle,
  HiOutlineShieldCheck,
  HiOutlineTruck,
  HiOutlineDocumentText,
  HiOutlineSparkles,
  HiOutlineQuestionMarkCircle,
  HiOutlineColorSwatch,
  HiStar,
  HiTrash,
  HiRefresh,
  HiOutlineClipboardList,
} from 'react-icons/hi';
import { FaWhatsapp } from 'react-icons/fa';
import { api } from '../services/api';
import { calculateProductPrice, checkIsDoubleSide, evaluateCompatibilityRules } from '../utils/pricingEngine';
import { analyzeArtworkFile, getProductFileSpecifications } from '../utils/preflightAnalyzer';
import { useCart } from '../context/CartContext';
import { useBusinessInfo } from '../context/BusinessInfoContext';
import PreflightInspectionCard from '../Components/PreflightInspectionCard';
import ProductMediaGallery from '../Components/ProductMediaGallery';
import ProductInfoTabs from '../Components/ProductInfoTabs';
import DeliveryEstimator from '../Components/DeliveryEstimator';
import RelatedProductsSection from '../Components/RelatedProductsSection';
import GuideDesign from '../Components/GuideDesign';
import Feedback from '../Components/Feedback';

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { businessInfo, getWhatsAppLink } = useBusinessInfo();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selected state
  const [selectedImage, setSelectedImage] = useState('');
  const [quantity, setQuantity] = useState(100);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [openModal, setOpenModal] = useState(false);

  // Phase 16: Artwork & Design Support State
  const [artworkOption, setArtworkOption] = useState('PRINT_READY_FILE'); // 'PRINT_READY_FILE' | 'DESIGN_SUPPORT'
  const [availablePackages, setAvailablePackages] = useState([]);
  const [availableDesignAddons, setAvailableDesignAddons] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [requirementNotes, setRequirementNotes] = useState('');
  const [preferredStyle, setPreferredStyle] = useState('Modern Minimalist');
  const [preferredColor, setPreferredColor] = useState('');
  const [uploadedArtwork, setUploadedArtwork] = useState(null);
  const [designBriefResponses, setDesignBriefResponses] = useState({});
  const [designAssets, setDesignAssets] = useState({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [uploadingAssetField, setUploadingAssetField] = useState(null);
  const [designStep, setDesignStep] = useState(1);
  const [showPreUploadSpecs, setShowPreUploadSpecs] = useState(false);

  // Artwork Upload & Preflight Quality state
  const [artworkFile, setArtworkFile] = useState(null);
  const [artworkUrl, setArtworkUrl] = useState('');
  const [uploadingArtwork, setUploadingArtwork] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [preflightReport, setPreflightReport] = useState(null);
  const [isAnalyzingPreflight, setIsAnalyzingPreflight] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

  // Pricing state
  const [pricing, setPricing] = useState({
    basePrice: 0,
    productPrice: 0,
    designFee: 0,
    basePackageFee: 0,
    designAddonsFee: 0,
    designPackageName: '',
    optionSurcharges: 0,
    subtotal: 0,
    shipping: 0,
    totalTax: 0,
    grandTotal: 0,
  });

  useEffect(() => {
    fetchProduct();
  }, [slug]);

  const fetchProduct = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getProductBySlug(slug);
      if (res.success && res.data) {
        const prod = res.data;
        setProduct(prod);
        setSelectedImage(prod.thumbnailUrl || prod.images?.[0]?.imageUrl || '');

        // Initialize options from dynamic mappings (with fallback to legacy options)
        const initialOptions = {};
        if (prod.optionMappings && prod.optionMappings.length) {
          const sortedMappings = [...prod.optionMappings].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
          sortedMappings.forEach((m) => {
            if (m.isEnabled === false) return;
            const optName = m.customLabel || m.master?.name;
            const enabledVals = (m.valueMappings || []).filter((v) => v.isEnabled !== false);
            const defaultVal =
              m.defaultValue ||
              enabledVals.find((v) => v.isDefault)?.customLabel ||
              enabledVals.find((v) => v.isDefault)?.masterValue?.label ||
              enabledVals[0]?.customLabel ||
              enabledVals[0]?.masterValue?.label ||
              m.master?.values?.[0]?.label;

            if (defaultVal) {
              initialOptions[optName] = defaultVal;
            }
          });
        } else if (prod.options && prod.options.length) {
          prod.options.forEach((opt) => {
            if (opt.values && opt.values.length) {
              initialOptions[opt.optionName] = opt.values[0].valueLabel;
            }
          });
        }
        setSelectedOptions(initialOptions);

        // Initialize quantity
        const initQty = prod.priceSlabs?.[0]?.minQty || prod.minQuantity || 100;
        setQuantity(initQty);

        // Initialize default design package if Option 2 selected
        try {
          const pkgRes = await api.getDesignPackages(prod.id);
          if (pkgRes.success && Array.isArray(pkgRes.data) && pkgRes.data.length > 0) {
            setAvailablePackages(pkgRes.data);
            const defaultPkg = pkgRes.data.find((p) => p.isDefault) || pkgRes.data[0];
            setSelectedPackage(defaultPkg);
          } else if (prod.designPackages && prod.designPackages.length > 0) {
            setAvailablePackages(prod.designPackages);
            setSelectedPackage(prod.designPackages[0]);
          }
        } catch (pkgErr) {
          console.error('Failed to load mapped packages:', pkgErr);
        }

        // Fetch master design add-ons
        try {
          const addonRes = await api.getDesignAddons();
          if (addonRes.success && Array.isArray(addonRes.data)) {
            setAvailableDesignAddons(addonRes.data);
          }
        } catch (addonErr) {
          console.error('Failed to load design add-ons:', addonErr);
        }
      }
    } catch (err) {
      console.error('Failed to load product:', err);
      setError('Unable to load product information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Re-calculate price whenever options change
  useEffect(() => {
    if (product) {
      const result = calculateProductPrice({
        product,
        quantity,
        selectedOptions,
        artworkOption,
        designPackage: artworkOption === 'DESIGN_SUPPORT' ? selectedPackage : null,
        selectedAddons: artworkOption === 'DESIGN_SUPPORT' ? selectedAddons : [],
      });
      setPricing(result);
    }
  }, [product, quantity, selectedOptions, artworkOption, selectedPackage, selectedAddons]);

  const handleOptionChange = (optionName, value) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [optionName]: value,
    }));
  };

  // Dynamic compatibility evaluation
  const compatibilityResult = React.useMemo(() => {
    if (!product) return { disabledOptionValues: {}, hiddenOptions: [], isCompatible: true, activeViolations: [] };
    return evaluateCompatibilityRules({ product, selectedOptions });
  }, [product, selectedOptions]);

  // Missing required options validator
  const missingRequiredOptions = React.useMemo(() => {
    if (!product?.optionMappings?.length) return [];
    return product.optionMappings
      .filter((m) => m.isRequired && m.isEnabled !== false && !compatibilityResult.hiddenOptions.includes(m.customLabel || m.master?.name || m.master?.code))
      .filter((m) => {
        const optName = m.customLabel || m.master?.name;
        return !selectedOptions[optName];
      })
      .map((m) => m.customLabel || m.master?.name);
  }, [product, selectedOptions, compatibilityResult]);

  // Dynamic combination & compatibility checker
  const isOptionValueAvailable = (optName, valLabel, optCode) => {
    // 1. Check compatibility rules
    if (compatibilityResult.disabledOptionValues) {
      const disabledList =
        (optCode && compatibilityResult.disabledOptionValues[optCode]) ||
        compatibilityResult.disabledOptionValues[optName] ||
        [];
      if (disabledList.some((d) => String(d).toLowerCase().trim() === String(valLabel).toLowerCase().trim())) {
        return false;
      }
    }

    // 2. Check pricing matrices if MATRIX pricing
    if (product?.pricingType === 'MATRIX' && product?.pricingMatrices?.length > 0) {
      const matches = product.pricingMatrices.filter(
        (m) => m.quantity === quantity && m.isAvailable !== false
      );
      if (matches.length > 0) {
        return matches.some((m) => {
          let opts = {};
          try {
            opts = typeof m.optionsJson === 'string' ? JSON.parse(m.optionsJson) : (m.optionsJson || {});
          } catch (e) {
            opts = {};
          }
          return !opts[optName] || opts[optName] === valLabel;
        });
      }
    }

    // 3. Legacy combinations check
    if (!product?.combinations || product.combinations.length === 0) return true;

    return product.combinations.some((comb) => {
      if (comb.quantity !== quantity) return false;
      if (!comb.isAvailable) return false;

      let combOpts = {};
      try {
        combOpts = typeof comb.optionsJson === 'string' ? JSON.parse(comb.optionsJson) : (comb.optionsJson || {});
      } catch (e) {
        combOpts = {};
      }

      if (combOpts[optName] && combOpts[optName] !== valLabel) {
        return false;
      }

      return true;
    });
  };

  const handleArtworkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const maxMb = product?.artworkSetting?.maxFileSizeMb || 10;
    if (file.size > maxMb * 1024 * 1024) {
      setUploadError(`File exceeds maximum size limit of ${maxMb}MB.`);
      return;
    }

    setArtworkFile(file);
    setUploadingArtwork(true);
    setUploadError('');
    setIsAnalyzingPreflight(true);
    setDisclaimerAccepted(false);

    try {
      // 1. Automated Preflight Quality Analysis
      const report = await analyzeArtworkFile(file, product?.slug, product?.category?.slug);
      setPreflightReport(report);

      // 2. Upload file to Phase 16 artwork endpoint
      const res = await api.uploadArtworkFile(file, {
        productId: product?.id,
        purpose: 'PRINT_READY',
      });
      if (res.success && res.data) {
        setUploadedArtwork(res.data);
        setArtworkUrl(res.data.fileUrl);
      }
    } catch (err) {
      setUploadError(err.message || 'Artwork upload failed. Please try again.');
    } finally {
      setUploadingArtwork(false);
      setIsAnalyzingPreflight(false);
    }
  };

  const handleDeleteUploadedArtwork = async () => {
    if (uploadedArtwork?.id) {
      try {
        await api.deleteArtworkFile(uploadedArtwork.id);
      } catch (err) {
        console.warn('Artwork file delete error:', err);
      }
    }
    setUploadedArtwork(null);
    setArtworkFile(null);
    setArtworkUrl('');
    setPreflightReport(null);
  };

  const handleBriefAssetUpload = async (fieldKey, e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingAssetField(fieldKey);
    try {
      const res = await api.uploadArtworkFile(file, {
        productId: product?.id,
        purpose: `BRIEF_ASSET_${fieldKey.toUpperCase()}`,
      });
      if (res.success && res.data) {
        setDesignAssets((prev) => ({
          ...prev,
          [fieldKey]: res.data,
        }));
      }
    } catch (err) {
      alert(`Asset upload failed: ${err.message}`);
    } finally {
      setUploadingAssetField(null);
    }
  };

  const handleAddToCart = () => {
    if (!product) return false;

    // Required Options Guard
    if (missingRequiredOptions.length > 0) {
      alert(`Please select required option(s): ${missingRequiredOptions.join(', ')}`);
      return false;
    }

    // Compatibility Rules Guard
    if (!compatibilityResult.isCompatible) {
      const reasons = compatibilityResult.activeViolations.map((v) => v.reason).join('\n• ');
      alert(`Incompatible Option Selected:\n• ${reasons}`);
      return false;
    }

    // 1. Combination Availability Guard (Phase 8)
    if (pricing.isAvailable === false) {
      alert(pricing.unavailableReason || 'This configuration is currently unavailable. Please select another option.');
      return false;
    }

    // 2. MANDATORY ARTWORK SELECTION GUARD
    if (!artworkOption) {
      alert('Please select an Artwork Option:\n• Option 1: I Have My Print-Ready File\n• Option 2: I Need Design Support\nto continue.');
      return false;
    }

    // 3. Option 1 Guard: Must have uploaded file & preflight check
    if (artworkOption === 'PRINT_READY_FILE') {
      if (!uploadedArtwork && !artworkFile) {
        alert('Please upload your print-ready artwork file before proceeding to cart.');
        return false;
      }
      if (preflightReport?.status === 'ERROR' && !disclaimerAccepted) {
        alert(
          `🚨 CRITICAL PRINT QUALITY ALERT!\n\nYour uploaded file (${preflightReport.fileName}) has quality warnings (${
            preflightReport.dpi?.effectiveDpi ? `${preflightReport.dpi.effectiveDpi} DPI` : 'Issues'
          }).\n\nPlease acknowledge the confirmation disclaimer below the file upload or switch to "I Need Design Support".`
        );
        return false;
      }
    }

    // 4. Option 2 Guard: Must have package, required brief fields, and terms accepted
    if (artworkOption === 'DESIGN_SUPPORT') {
      if (!selectedPackage) {
        alert('Please select a Design Support Package to proceed.');
        return false;
      }

      // Check required brief fields
      const requiredFields = (product.designBriefFields || []).filter((f) => f.isRequired);
      for (const field of requiredFields) {
        if (field.fieldType === 'FILE_UPLOAD') {
          if (!designAssets[field.fieldKey]) {
            alert(`Please upload the required file: "${field.fieldLabel}".`);
            return false;
          }
        } else {
          const val = designBriefResponses[field.fieldKey];
          if (!val || !val.toString().trim()) {
            alert(`Please complete the required design brief question: "${field.fieldLabel}".`);
            return false;
          }
        }
      }

      if (!termsAccepted) {
        alert('Please read and accept the Design Support Terms & Conditions to proceed.');
        return false;
      }
    }

    addToCart({
      product,
      quantity,
      quantityUnit: product.quantityUnit || 'Pieces',
      selectedOptions,
      appliedAddons: pricing.appliedAddons || [],
      basePrice: pricing.basePrice,
      productPrice: pricing.productPrice || pricing.basePrice,
      addonTotal: pricing.optionSurcharges,
      designRequired: artworkOption === 'DESIGN_SUPPORT',
      designFee: pricing.designFee || 0,
      basePackageFee: pricing.basePackageFee || 0,
      designAddonsFee: pricing.designAddonsFee || 0,
      designPackageName: pricing.designPackageName || (selectedPackage ? (selectedPackage.packageName || selectedPackage.name) : null),
      selectedAddons,
      preferredStyle,
      preferredColor,
      requirementNotes,
      artworkOption, // 'PRINT_READY_FILE' | 'DESIGN_SUPPORT'
      artworkFileUrl: uploadedArtwork?.fileUrl || artworkUrl || null,
      artworkFileName: uploadedArtwork?.originalName || artworkFile?.name || null,
      artworkUploadId: uploadedArtwork?.id || null,
      designPackageId: selectedPackage?.id || null,
      designPackage: selectedPackage,
      designBriefResponses,
      designAssets,
      termsAccepted: Boolean(termsAccepted),
      termsAcceptedAt: termsAccepted ? new Date().toISOString() : null,
      preflightReport: preflightReport
        ? {
            status: preflightReport.status,
            score: preflightReport.score,
            dpi: preflightReport.dpi?.effectiveDpi || 300,
            fileType: preflightReport.fileType,
          }
        : null,
      unitPrice: pricing.subtotal / quantity,
      totalPrice: pricing.subtotal,
    });
    return true;
  };

  const handleBuyNow = () => {
    const added = handleAddToCart();
    if (added) {
      navigate('/checkout');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center py-20">
        <Spinner size="xl" />
        <p className="mt-4 text-gray-600 font-medium">Loading product specifications...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8">
          <HiOutlineExclamationCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The requested product could not be located.'}</p>
          <Button as={Link} to="/shop" color="dark" className="mx-auto">
            Browse All Products
          </Button>
        </div>
      </div>
    );
  }

  const perUnitPrice = (pricing.subtotal / quantity).toFixed(2);
  const fileSpecs = getProductFileSpecifications(product);

  return (
    <div className="mx-auto px-4 py-6 max-w-7xl">
      {/* Breadcrumbs */}
      <div className="py-2">
        <Breadcrumb className="text-xs md:text-sm">
          <Breadcrumb.Item icon={HiHome}>
            <Link to="/" className="hover:underline text-gray-700">
              Home
            </Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <Link to="/shop" className="hover:underline text-gray-700">
              Catalogue
            </Link>
          </Breadcrumb.Item>
          {product.category && (
            <Breadcrumb.Item>
              <Link to={`/category/${product.category.slug}`} className="hover:underline text-gray-700">
                {product.category.name}
              </Link>
            </Breadcrumb.Item>
          )}
          <Breadcrumb.Item>{product.name}</Breadcrumb.Item>
        </Breadcrumb>
      </div>

      {/* Main Product Layout */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Ultra HD Image Gallery, Lightbox Zoom & Video Showcase */}
        <div className="lg:col-span-5">
          <div className="sticky top-28">
            <ProductMediaGallery
              productName={product.name}
              mainThumbnail={product.thumbnailUrl}
              images={product.images}
              videoUrl={product.videoUrl || null}
              isBestSeller={product.isBestSeller}
              onOpenVideoTab={() => {
                const tabsEl = document.getElementById('product-info-tabs-section');
                if (tabsEl) {
                  tabsEl.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            />
          </div>
        </div>

        {/* Right Column: Customizer & Options */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-xs">
          <div className="border-b pb-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700 px-2.5 py-1 rounded">
                SKU: {product.sku}
              </span>
              <div className="flex items-center gap-1 text-yellow-400 text-xs font-bold">
                <HiStar className="w-4 h-4" />
                <span className="text-gray-800">4.8</span>
                <span className="text-gray-400">(Verified Print Quality)</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2">{product.name}</h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-1.5 leading-relaxed">{product.shortDescription}</p>

            {/* Live Price Tag */}
            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-3xl sm:text-4xl font-black text-red-600">₹{pricing.subtotal}</span>
              <span className="text-xs sm:text-sm text-gray-500 font-medium">
                {product.pricingType === 'PER_SQFT'
                  ? `(₹${perUnitPrice} / Sq.ft for ${quantity} Sq.ft)`
                  : `(₹${perUnitPrice} / ${product.quantityUnit?.replace(/s$/, '') || 'piece'} for ${quantity} ${product.quantityUnit || 'pcs'})`}
              </span>
            </div>
          </div>

          {/* Step 1: Core Specifications & Dimensions (Size, Material, GSM, Side, Lamination, Shape) */}
          {(() => {
            const hasDynamic = product.optionMappings && product.optionMappings.length > 0;
            const coreList = hasDynamic
              ? [...product.optionMappings]
                  .filter((m) => !m.isAddon && m.isEnabled !== false)
                  .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
              : (product.options || []).filter((o) => !o.isAddon);

            if (!coreList.length) return null;

            return (
              <div className="mt-6 pt-4 border-t space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block font-extrabold text-xs uppercase tracking-wider text-gray-800">
                    Step 1: Configuration Options
                  </label>
                  {hasDynamic && (
                    <span className="text-[10px] text-gray-400 font-medium">
                      Tailored specifically for {product.name}
                    </span>
                  )}
                </div>

                {coreList.map((item, idx) => {
                  const optName = hasDynamic ? (item.customLabel || item.master?.name) : item.optionName;
                  const optCode = hasDynamic ? item.master?.code : item.optionName;
                  const isRequired = hasDynamic ? item.isRequired !== false : true;

                  if (
                    compatibilityResult.hiddenOptions.includes(optName) ||
                    compatibilityResult.hiddenOptions.includes(optCode)
                  ) {
                    return null;
                  }

                  const valuesList = hasDynamic
                    ? (item.valueMappings || [])
                        .filter((vm) => vm.isEnabled !== false)
                        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                        .map((vm) => ({
                          id: vm.id,
                          valueLabel: vm.customLabel || vm.masterValue?.label,
                          priceModifierType: vm.priceModifierType,
                          priceModifierValue: vm.priceModifierValue,
                        }))
                    : (item.values || []);

                  return (
                    <div key={item.id || optName} className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-gray-700">
                          {idx + 1}. {optName}
                        </span>
                        {isRequired && <span className="text-red-500 text-xs font-black">*</span>}
                        {selectedOptions[optName] && (
                          <span className="text-[11px] text-purple-700 font-bold ml-auto">
                            Selected: {selectedOptions[optName]}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {valuesList.map((v) => {
                          const isSelected = selectedOptions[optName] === v.valueLabel;
                          const isAvailable = isOptionValueAvailable(optName, v.valueLabel, optCode);

                          return (
                            <button
                              key={v.id || v.valueLabel}
                              type="button"
                              disabled={!isAvailable}
                              onClick={() => handleOptionChange(optName, v.valueLabel)}
                              className={`p-2.5 rounded-xl border text-left transition-all relative ${
                                !isAvailable
                                  ? 'opacity-40 cursor-not-allowed bg-gray-100 border-gray-200 line-through text-gray-400'
                                  : isSelected
                                  ? 'border-yellow-400 bg-yellow-50 text-black font-black ring-2 ring-yellow-400 shadow-xs'
                                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 font-semibold'
                              }`}
                            >
                              <span className="text-xs block leading-tight">{v.valueLabel}</span>
                              {v.priceModifierValue > 0 && isAvailable && (
                                <span className="text-[10px] text-red-600 font-bold block mt-0.5">
                                  +{v.priceModifierType === 'PERCENT' ? `${v.priceModifierValue}%` : `₹${v.priceModifierValue}`}
                                </span>
                              )}
                              {!isAvailable && (
                                <span className="text-[9px] text-red-500 font-semibold block mt-0.5 not-italic">
                                  Incompatible
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Step 2: Optional Premium Finishes & Add-Ons (Spot UV, Foil, Die Cut, Rounded Corners) */}
          {(() => {
            const hasDynamic = product.optionMappings && product.optionMappings.length > 0;
            const addonList = hasDynamic
              ? [...product.optionMappings]
                  .filter((m) => m.isAddon && m.isEnabled !== false)
                  .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
              : (product.options || []).filter((o) => o.isAddon);

            if (!addonList.length) return null;

            return (
              <div className="mt-6 pt-4 border-t space-y-4">
                <div className="flex justify-between items-center">
                  <label className="font-extrabold text-xs uppercase tracking-wider text-purple-900">
                    Step 2: Optional Premium Finishes & Add-Ons
                  </label>
                  <span className="text-[11px] text-purple-700 font-bold">✨ Optional Enhancements</span>
                </div>

                {addonList.map((item) => {
                  const optName = hasDynamic ? (item.customLabel || item.master?.name) : item.optionName;
                  const optCode = hasDynamic ? item.master?.code : item.optionName;

                  if (
                    compatibilityResult.hiddenOptions.includes(optName) ||
                    compatibilityResult.hiddenOptions.includes(optCode)
                  ) {
                    return null;
                  }

                  const valuesList = hasDynamic
                    ? (item.valueMappings || [])
                        .filter((vm) => vm.isEnabled !== false)
                        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                        .map((vm) => ({
                          id: vm.id,
                          valueLabel: vm.customLabel || vm.masterValue?.label,
                          priceModifierType: vm.priceModifierType,
                          priceModifierValue: vm.priceModifierValue,
                        }))
                    : (item.values || []);

                  return (
                    <div key={item.id || optName} className="bg-purple-50/40 p-3.5 rounded-2xl border border-purple-100">
                      <div className="flex justify-between items-center mb-2">
                        <span className="block font-bold text-xs text-purple-950">{optName}</span>
                        {selectedOptions[optName] && (
                          <span className="text-[10px] text-purple-700 font-extrabold bg-purple-100 px-2 py-0.5 rounded-full">
                            Applied: {selectedOptions[optName]}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {valuesList.map((v) => {
                          const isSelected = selectedOptions[optName] === v.valueLabel;
                          const isAvailable = isOptionValueAvailable(optName, v.valueLabel, optCode);

                          return (
                            <button
                              key={v.id || v.valueLabel}
                              type="button"
                              disabled={!isAvailable}
                              onClick={() => {
                                if (isSelected) {
                                  const copy = { ...selectedOptions };
                                  delete copy[optName];
                                  setSelectedOptions(copy);
                                } else {
                                  handleOptionChange(optName, v.valueLabel);
                                }
                              }}
                              className={`p-2.5 rounded-xl border text-left transition-all ${
                                !isAvailable
                                  ? 'opacity-40 cursor-not-allowed bg-gray-100 border-gray-200 line-through text-gray-400'
                                  : isSelected
                                  ? 'border-purple-600 bg-purple-100 text-purple-950 font-black ring-2 ring-purple-400 shadow-xs'
                                  : 'border-gray-200 bg-white text-gray-700 hover:border-purple-200 font-semibold'
                              }`}
                            >
                              <span className="text-xs block leading-tight">{v.valueLabel}</span>
                              {v.priceModifierValue > 0 && isAvailable && (
                                <span className="text-[10px] text-purple-700 font-black block mt-0.5">
                                  +{v.priceModifierType === 'PERCENT' ? `${v.priceModifierValue}%` : `₹${v.priceModifierValue}`}
                                </span>
                              )}
                              {!isAvailable && (
                                <span className="text-[9px] text-red-500 font-semibold block mt-0.5 not-italic">
                                  Incompatible
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Step 3: Quantity Selection (Fixed Slabs, Custom Quantity, or Both) */}
          <div className="mt-6 pt-4 border-t">
            <div className="flex justify-between items-center mb-2">
              <label className="font-extrabold text-xs uppercase tracking-wider text-gray-800">
                Step 3: Select Quantity ({product.quantityUnit || 'Pieces'})
              </label>
              <span className="text-[11px] text-green-600 font-bold">⚡ Bulk savings applied</span>
            </div>

            {/* If product has Fixed slabs or BOTH */}
            {(product.quantityType !== 'CUSTOM') && (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                {product.priceSlabs && product.priceSlabs.length > 0
                  ? product.priceSlabs.map((slab, idx) => {
                      const isSelected = quantity === slab.minQty;
                      const firstSlab = product.priceSlabs[0];
                      const baseUnitPrice = firstSlab ? firstSlab.singleSidePrice / firstSlab.minQty : 0;
                      const thisUnitPrice = slab.singleSidePrice / slab.minQty;
                      const savingsPct =
                        idx > 0 && baseUnitPrice > 0 && thisUnitPrice < baseUnitPrice
                          ? Math.round(((baseUnitPrice - thisUnitPrice) / baseUnitPrice) * 100)
                          : 0;

                      return (
                        <button
                          key={slab.id}
                          type="button"
                          onClick={() => setQuantity(slab.minQty)}
                          className={`relative p-2.5 rounded-xl border text-center transition-all ${
                            isSelected
                              ? 'border-yellow-400 bg-yellow-400 text-black font-extrabold shadow-sm ring-2 ring-yellow-400/40'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 font-semibold'
                          }`}
                        >
                          {savingsPct > 0 && (
                            <span className="absolute -top-2 right-1 bg-green-600 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase shadow-xs">
                              Save {savingsPct}%
                            </span>
                          )}
                          <span className="text-xs font-black block">{slab.minQty} {product.quantityUnit || 'pcs'}</span>
                          <span className="text-[10px] text-gray-600 block mt-0.5">
                            ₹{slab.singleSidePrice ? (slab.singleSidePrice / slab.minQty).toFixed(2) : ''}/{product.quantityUnit === 'Cards' ? 'card' : 'pc'}
                          </span>
                        </button>
                      );
                    })
                  : [100, 200, 500, 1000].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setQuantity(q)}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          quantity === q
                            ? 'border-yellow-400 bg-yellow-400 text-black font-extrabold shadow-sm'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 font-semibold'
                        }`}
                      >
                        <span className="text-xs block font-bold">{q} {product.quantityUnit || 'pcs'}</span>
                      </button>
                    ))}
              </div>
            )}

            {/* Custom Quantity Input if CUSTOM or BOTH */}
            {(product.quantityType === 'CUSTOM' || product.quantityType === 'BOTH') && (
              <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between gap-3">
                <div className="flex-1">
                  <span className="text-xs font-bold text-gray-800 block">
                    {product.quantityType === 'BOTH' ? 'Or Enter Custom Quantity:' : 'Specify Exact Order Quantity:'}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    Min: {product.customQtyMin || product.minQuantity || 50} | Step: {product.customQtyStep || 50}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={product.customQtyMin || product.minQuantity || 1}
                    max={product.customQtyMax || 100000}
                    step={product.customQtyStep || 1}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-28 p-1.5 text-center font-black text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400"
                  />
                  <span className="text-xs font-bold text-gray-700">{product.quantityUnit || 'Pieces'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Step 4: Mandatory Artwork & Design Options (Phase 16) */}
          <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-black text-white px-2 py-0.5 rounded">
                  Mandatory Step
                </span>
                <h3 className="text-base sm:text-lg font-black text-gray-900 mt-1 flex items-center gap-1.5">
                  <HiOutlineClipboardList className="w-5 h-5 text-purple-600" />
                  Step 4: Choose Your Artwork & Design Option
                </h3>
              </div>
              <span className="text-xs text-gray-500 font-semibold">
                Select an option before adding to cart
              </span>
            </div>

            {/* Option 1 & Option 2 Selection Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* OPTION 1 CARD */}
              <button
                type="button"
                onClick={() => setArtworkOption('PRINT_READY_FILE')}
                className={`p-4 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between ${
                  artworkOption === 'PRINT_READY_FILE'
                    ? 'border-blue-600 bg-blue-50/70 shadow-md ring-2 ring-blue-500/30'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                      Option 1
                    </span>
                    {artworkOption === 'PRINT_READY_FILE' && (
                      <HiCheckCircle className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <h4 className="font-extrabold text-sm text-gray-900">I HAVE MY PRINT-READY FILE</h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    I will upload my finalized artwork in PDF, AI, CDR, PSD, PNG, or JPG.
                  </p>
                </div>

                <div className="mt-4 pt-2.5 border-t border-blue-200/50 flex items-center justify-between">
                  <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded">
                    Design Charge: ₹0 (FREE)
                  </span>
                  <span className="text-[11px] text-gray-500 font-medium">Free Preflight Check</span>
                </div>
              </button>

              {/* OPTION 2 CARD */}
              <button
                type="button"
                onClick={() => setArtworkOption('DESIGN_SUPPORT')}
                className={`p-4 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between ${
                  artworkOption === 'DESIGN_SUPPORT'
                    ? 'border-purple-600 bg-purple-50/70 shadow-md ring-2 ring-purple-500/30'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                      Option 2
                    </span>
                    {artworkOption === 'DESIGN_SUPPORT' && (
                      <HiCheckCircle className="w-5 h-5 text-purple-600" />
                    )}
                  </div>
                  <h4 className="font-extrabold text-sm text-gray-900">I NEED DESIGN SUPPORT</h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Our professional graphic designers will create custom artwork for your brand.
                  </p>
                </div>

                <div className="mt-4 pt-2.5 border-t border-purple-200/50 flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded">
                    Starting at ₹{product.designPackages?.[0]?.designCharge || product.singleSideDesignCharge || 200}
                  </span>
                  <span className="text-[11px] text-purple-600 font-bold flex items-center gap-1">
                    <HiOutlineSparkles className="w-3.5 h-3.5" /> Custom Design Service
                  </span>
                </div>
              </button>
            </div>

            {/* DIRECT WHATSAPP SUPPORT LINK */}
            <div className="mt-3 flex items-center justify-between p-3 rounded-xl bg-green-50/70 border border-green-200 text-xs">
              <div className="flex items-center gap-2">
                <FaWhatsapp className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <span className="font-extrabold text-green-950 block">Need custom sizing or help before ordering?</span>
                  <span className="text-[11px] text-green-700">Chat directly with our press team on WhatsApp</span>
                </div>
              </div>
              <a
                href={getWhatsAppLink(`Hello ${businessInfo?.brand?.brandName || 'Print Bazzar'}, I need help configuring ${product.name} (SKU: ${product.sku}).`)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-xs transition"
              >
                Chat on WhatsApp
              </a>
            </div>

            {/* ========================================================= */}
            {/* OPTION 1 WORKFLOW: PRE-UPLOAD CHECKLIST & FILE DROPZONE */}
            {/* ========================================================= */}
            {artworkOption === 'PRINT_READY_FILE' && (
              <div className="mt-5 space-y-4">
                {/* Pre-Upload Quality Specifications Checklist */}
                <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3.5 sm:p-5 text-xs text-blue-950 space-y-3 shadow-xs">
                  <div
                    className="flex items-center justify-between gap-2 cursor-pointer select-none"
                    onClick={() => setShowPreUploadSpecs(!showPreUploadSpecs)}
                  >
                    <div className="flex items-center gap-2">
                      <HiOutlineDocumentText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div>
                        <h4 className="font-black text-xs sm:text-base text-blue-950">
                          Pre-Upload File Checklist & Specifications
                        </h4>
                        <span className="text-[10px] text-blue-700 font-semibold block sm:hidden">
                          {fileSpecs?.dimensionsText} • Bleed {fileSpecs?.bleedText} • {fileSpecs?.resolutionText}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="hidden sm:inline-block text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full border border-blue-200">
                        {fileSpecs?.productType || 'Industry'} Standard
                      </span>
                      <button
                        type="button"
                        className="sm:hidden text-xs font-black text-blue-800 bg-blue-100 px-2.5 py-1 rounded-lg"
                      >
                        {showPreUploadSpecs ? 'Hide ▲' : 'View Specs ▼'}
                      </button>
                    </div>
                  </div>

                  {/* 5-Key Specifications Grid - Always visible on desktop, toggleable on mobile */}
                  <div className={`${showPreUploadSpecs ? 'block' : 'hidden sm:block'} space-y-3 pt-1`}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                      <div className="bg-white/95 p-3 rounded-xl border border-blue-100 shadow-2xs">
                        <span className="text-[10px] text-gray-500 uppercase font-extrabold block">Card / Trim Size</span>
                        <span className="font-black text-xs sm:text-sm text-gray-900 block mt-0.5">
                          {fileSpecs?.dimensionsText}
                        </span>
                      </div>

                      <div className="bg-white/95 p-3 rounded-xl border border-blue-100 shadow-2xs">
                        <span className="text-[10px] text-gray-500 uppercase font-extrabold block">Bleed Allowance</span>
                        <span className="font-black text-xs sm:text-sm text-red-600 block mt-0.5">
                          {fileSpecs?.bleedText}
                        </span>
                      </div>

                      <div className="bg-white/95 p-3 rounded-xl border border-blue-100 shadow-2xs">
                        <span className="text-[10px] text-gray-500 uppercase font-extrabold block">Safe Margin Area</span>
                        <span className="font-black text-xs sm:text-sm text-emerald-700 block mt-0.5">
                          {fileSpecs?.safeMarginText}
                        </span>
                      </div>

                      <div className="bg-white/95 p-3 rounded-xl border border-blue-100 shadow-2xs">
                        <span className="text-[10px] text-gray-500 uppercase font-extrabold block">Resolution</span>
                        <span className="font-black text-xs sm:text-sm text-blue-700 block mt-0.5">
                          {fileSpecs?.resolutionText}
                        </span>
                      </div>

                      <div className="bg-white/95 p-3 rounded-xl border border-blue-100 shadow-2xs col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-gray-500 uppercase font-extrabold block">Color Mode</span>
                        <span className="font-black text-xs sm:text-sm text-purple-700 block mt-0.5">
                          {fileSpecs?.colorModeText}
                        </span>
                      </div>
                    </div>

                    {/* Typography, Formats & Special Prepress Note */}
                    <div className="bg-white/95 p-3.5 rounded-xl border border-blue-100 text-xs text-gray-700 space-y-2 shadow-2xs">
                      <div className="flex items-start gap-2">
                        <strong className="text-gray-900 whitespace-nowrap">Fonts / Typography:</strong>
                        <span>{fileSpecs?.fontInstructions}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <strong className="text-gray-900 whitespace-nowrap">Accepted Formats:</strong>
                        <span className="font-bold text-gray-900">{fileSpecs?.acceptedFormats}</span>
                      </div>
                      {fileSpecs?.specialNote && (
                        <div className="pt-2 border-t border-blue-100 text-blue-900 flex items-start gap-2 bg-blue-50/50 p-2.5 rounded-lg">
                          <strong className="whitespace-nowrap text-blue-950 font-black">📌 Note Information:</strong>
                          <span className="font-medium leading-relaxed">{fileSpecs.specialNote}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Upload Dropzone */}
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-2xl p-5 text-center transition">
                  <input
                    type="file"
                    id="artwork-upload"
                    className="hidden"
                    onChange={handleArtworkUpload}
                    accept=".pdf,.ai,.cdr,.psd,.png,.jpg,.jpeg"
                  />

                  {!uploadedArtwork && !artworkFile ? (
                    <label
                      htmlFor="artwork-upload"
                      className="cursor-pointer flex flex-col items-center justify-center gap-1.5 py-2"
                    >
                      <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-1">
                        <HiUpload className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-black text-gray-900">
                        {uploadingArtwork ? 'Uploading & Inspecting Artwork...' : 'Click to Browse or Drag & Drop Print File'}
                      </span>
                      <span className="text-xs text-gray-500">
                        Accepted Formats: {fileSpecs?.acceptedFormats || 'PDF, AI, CDR, PSD, PNG, JPG (Max 10MB)'}
                      </span>
                      {uploadingArtwork && <Spinner size="sm" className="mt-2" />}
                    </label>
                  ) : (
                    <div className="bg-white border-2 border-green-500/40 rounded-xl p-4 text-left space-y-3">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-green-100 text-green-700 flex items-center justify-center font-black text-xs uppercase">
                            {(uploadedArtwork?.mimeType?.split('/')[1] || artworkFile?.name?.split('.').pop() || 'FILE').slice(0, 4)}
                          </div>
                          <div>
                            <h5 className="font-extrabold text-sm text-gray-900 truncate max-w-xs sm:max-w-md">
                              ✔ {uploadedArtwork?.originalName || artworkFile?.name}
                            </h5>
                            <p className="text-xs text-gray-500">
                              {((uploadedArtwork?.fileSize || artworkFile?.size || 0) / 1024 / 1024).toFixed(2)} MB • Uploaded & Ready for Production
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="xs"
                            color="light"
                            onClick={() => document.getElementById('artwork-upload')?.click()}
                            className="text-xs"
                          >
                            <HiRefresh className="w-3.5 h-3.5 mr-1" /> Replace
                          </Button>
                          <Button
                            size="xs"
                            color="failure"
                            onClick={handleDeleteUploadedArtwork}
                            className="text-xs"
                          >
                            <HiTrash className="w-3.5 h-3.5 mr-1" /> Delete
                          </Button>
                        </div>
                      </div>

                      {uploadedArtwork?.fileUrl && (
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Secure Storage: Cloud Ready</span>
                          <a
                            href={uploadedArtwork.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline font-semibold"
                          >
                            Preview Uploaded File ↗
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {uploadError && (
                    <div className="mt-3 p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold">
                      ⚠ {uploadError}
                    </div>
                  )}
                </div>

                {/* Preflight Inspection Card */}
                {preflightReport && (
                  <PreflightInspectionCard
                    report={preflightReport}
                    onReUploadClick={() => document.getElementById('artwork-upload')?.click()}
                    onSwitchToDesignService={() => {
                      setArtworkOption('DESIGN_SUPPORT');
                      setPreflightReport(null);
                      setArtworkFile(null);
                      setUploadedArtwork(null);
                      setArtworkUrl('');
                    }}
                    disclaimerAccepted={disclaimerAccepted}
                    onToggleDisclaimer={() => setDisclaimerAccepted(!disclaimerAccepted)}
                  />
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* OPTION 2 WORKFLOW: 5-STEP MOBILE-FIRST DESIGN SERVICE     */}
            {/* ========================================================= */}
            {artworkOption === 'DESIGN_SUPPORT' && (
              <div className="mt-5 space-y-6">
                {/* 5-Step Progress Tracker */}
                <div className="bg-purple-100/70 p-3 rounded-2xl border border-purple-200 shadow-2xs">
                  <div className="flex items-center justify-between text-xs font-black text-purple-950 mb-2">
                    <span className="flex items-center gap-1.5">
                      <HiOutlineSparkles className="w-4 h-4 text-purple-600" />
                      Step {designStep} of 5:{' '}
                      {designStep === 1 && 'Choose Design Package'}
                      {designStep === 2 && 'Creative Style & Colors'}
                      {designStep === 3 && 'Upload Brand Assets'}
                      {designStep === 4 && 'Content Brief & Text'}
                      {designStep === 5 && 'Review Design Summary'}
                    </span>
                    <span className="text-[10px] text-purple-700 font-bold bg-purple-200/80 px-2 py-0.5 rounded-full">
                      Step-by-Step
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {[
                      { s: 1, name: '1. Package' },
                      { s: 2, name: '2. Style' },
                      { s: 3, name: '3. Assets' },
                      { s: 4, name: '4. Brief' },
                      { s: 5, name: '5. Review' },
                    ].map((stepItem) => (
                      <button
                        key={stepItem.s}
                        type="button"
                        onClick={() => setDesignStep(stepItem.s)}
                        className={`py-1.5 rounded-lg text-[10px] font-black transition-all ${
                          designStep === stepItem.s
                            ? 'bg-purple-600 text-white shadow-xs'
                            : designStep > stepItem.s
                            ? 'bg-purple-200 text-purple-900 font-extrabold'
                            : 'bg-white text-gray-400'
                        }`}
                      >
                        {designStep > stepItem.s ? '✓ ' : ''}{stepItem.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* STEP 1: DESIGN PACKAGE & ADD-ONS SELECTION */}
                <div className={`${designStep === 1 ? 'block' : 'hidden sm:block'} space-y-4`}>
                  <div className="flex justify-between items-center">
                    <label className="font-extrabold text-xs uppercase tracking-wider text-purple-950 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-black flex items-center justify-center">1</span>
                      Choose Design Package:
                    </label>
                    <span className="text-[11px] text-purple-700 font-bold">Transparent Fixed Pricing</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(availablePackages && availablePackages.length > 0
                      ? availablePackages
                      : (product.designPackages && product.designPackages.length > 0
                          ? product.designPackages
                          : [
                              {
                                id: 'default-pkg',
                                name: 'Standard Design',
                                packageName: 'Standard Design',
                                badge: 'MOST POPULAR',
                                shortDescription: '2 creative directions and CMYK press optimization.',
                                basePrice: product.singleSideDesignCharge || 499,
                                doubleSidePrice: product.doubleSideDesignCharge || 799,
                                concepts: 2,
                                revisions: 2,
                                deliveryTimeText: '2 Working Days',
                                features: ['2 Initial Concepts', '2 Revisions Included', 'Print-ready PDF', 'CMYK Color Profile'],
                              },
                            ]
                        )
                    ).map((pkg) => {
                      const isSelected = selectedPackage?.id === pkg.id || (selectedPackage?.name && selectedPackage?.name === (pkg.name || pkg.packageName));
                      const isDoubleSide = checkIsDoubleSide(selectedOptions);
                      const singleCharge = parseFloat(pkg.customPrice ?? pkg.basePrice ?? pkg.designCharge ?? 0);
                      const doubleCharge = parseFloat(
                        pkg.customDoubleSidePrice ??
                        pkg.doubleSidePrice ??
                        pkg.doubleSideDesignCharge ??
                        (product.doubleSideDesignCharge || (singleCharge > 0 ? singleCharge * 1.6 : 400))
                      );
                      const activePackageCharge = isDoubleSide ? doubleCharge : singleCharge;

                      return (
                        <div
                          key={pkg.id || pkg.name || pkg.packageName}
                          onClick={() => setSelectedPackage(pkg)}
                          className={`p-4 rounded-2xl border-2 text-left cursor-pointer transition-all relative flex flex-col justify-between ${
                            isSelected
                              ? 'border-purple-600 bg-purple-50/80 shadow-md ring-2 ring-purple-500/30'
                              : 'border-gray-200 bg-white hover:border-purple-200'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between mb-1.5 gap-1">
                              <div>
                                <span className="font-extrabold text-sm text-gray-900 block">{pkg.name || pkg.packageName}</span>
                                {pkg.badge && (
                                  <span className="inline-block mt-0.5 text-[9px] font-black uppercase bg-purple-100 text-purple-800 px-2 py-0.2 rounded-full">
                                    {pkg.badge}
                                  </span>
                                )}
                              </div>
                              <div className="text-right">
                                <span className="text-base font-black text-purple-700 block">
                                  +₹{activePackageCharge}
                                </span>
                                <span className="text-[10px] font-bold text-purple-600 block">
                                  {isDoubleSide ? '2-Sides' : '1-Side'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-500 my-2">
                              <span className={`px-2 py-0.5 rounded transition ${!isDoubleSide ? 'bg-purple-100 text-purple-800 font-bold ring-1 ring-purple-300' : 'bg-gray-100 text-gray-600'}`}>
                                1-Side: ₹{singleCharge}
                              </span>
                              <span className={`px-2 py-0.5 rounded transition ${isDoubleSide ? 'bg-indigo-100 text-indigo-800 font-bold ring-1 ring-indigo-300' : 'bg-gray-100 text-gray-600'}`}>
                                2-Sides: ₹{doubleCharge}
                              </span>
                            </div>

                            {(pkg.shortDescription || pkg.description) && (
                              <p className="text-xs text-gray-600 mb-2.5 leading-relaxed line-clamp-2">
                                {pkg.shortDescription || pkg.description}
                              </p>
                            )}

                            <div className="flex flex-wrap gap-1.5 text-[10px] text-gray-700 font-medium mb-2.5">
                              <span className="bg-white border border-purple-200 px-2 py-0.5 rounded-md">
                                🎯 {pkg.concepts || pkg.initialConcepts || 1} Concept(s)
                              </span>
                              <span className="bg-white border border-purple-200 px-2 py-0.5 rounded-md">
                                🔄 {pkg.revisions === -1 ? 'Unlimited' : `${pkg.revisions || pkg.revisionsIncluded || 1} Revision(s)`}
                              </span>
                              <span className="bg-white border border-purple-200 px-2 py-0.5 rounded-md">
                                ⏱ {pkg.deliveryTimeText || pkg.estimatedTime || `${pkg.deliveryDays || 2} Days`}
                              </span>
                            </div>

                            {Array.isArray(pkg.features) && pkg.features.length > 0 && (
                              <ul className="text-[11px] text-gray-600 border-t border-purple-100 pt-2 space-y-0.5">
                                {pkg.features.slice(0, 4).map((feat, idx) => (
                                  <li key={idx} className="flex items-center gap-1">
                                    <span className="text-green-600 font-bold">✔</span> {feat}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          <div className="mt-3 pt-2 border-t border-purple-100 flex items-center justify-between text-xs">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isSelected ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                              {isSelected ? '✔ Selected' : 'Choose Package'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Optional Design Add-ons */}
                  {availableDesignAddons && availableDesignAddons.length > 0 && (
                    <div className="mt-4 space-y-3 bg-purple-50/50 p-4 rounded-2xl border border-purple-200">
                      <div className="flex justify-between items-center">
                        <label className="font-extrabold text-xs uppercase tracking-wider text-purple-950 flex items-center gap-1.5">
                          <HiOutlineSparkles className="w-4 h-4 text-purple-600" />
                          Optional Design Add-ons & Extras:
                        </label>
                        <span className="text-[11px] text-purple-700 font-bold">Select any extras</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {availableDesignAddons.map((addon) => {
                          const isChecked = selectedAddons.some((a) => a.id === addon.id);
                          return (
                            <label
                              key={addon.id}
                              className={`flex items-start justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                                isChecked ? 'bg-purple-100/80 border-purple-500 shadow-2xs' : 'bg-white border-gray-200 hover:border-purple-300'
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    if (isChecked) {
                                      setSelectedAddons(selectedAddons.filter((a) => a.id !== addon.id));
                                    } else {
                                      setSelectedAddons([...selectedAddons, addon]);
                                    }
                                  }}
                                  className="w-4 h-4 mt-0.5 text-purple-600 rounded focus:ring-purple-500"
                                />
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-xs text-gray-900">{addon.name}</span>
                                    {addon.badge && (
                                      <span className="text-[9px] bg-yellow-100 text-yellow-800 font-bold px-1.5 py-0.2 rounded-full">
                                        {addon.badge}
                                      </span>
                                    )}
                                  </div>
                                  {addon.description && (
                                    <p className="text-[11px] text-gray-500 mt-0.5">{addon.description}</p>
                                  )}
                                </div>
                              </div>
                              <span className="font-black text-xs text-purple-700 whitespace-nowrap ml-2">
                                +₹{addon.price}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Step 1 Mobile Next Button */}
                  <div className="sm:hidden pt-2 flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => setDesignStep(2)}
                      className="w-full bg-purple-600 text-white font-extrabold text-xs py-2 rounded-xl"
                    >
                      Next: Style & Colors ➔
                    </Button>
                  </div>
                </div>

                {/* STEP 2: STYLE PREFERENCE & BRAND COLORS */}
                <div className={`${designStep === 2 ? 'block' : 'hidden sm:block'} space-y-3.5 bg-gray-50 border border-gray-200 rounded-2xl p-4 sm:p-5`}>
                  <div className="flex justify-between items-center">
                    <label className="font-extrabold text-xs uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-black flex items-center justify-center">2</span>
                      Creative Style & Colors:
                    </label>
                  </div>

                  <div>
                    <Label value="Preferred Design Style" className="text-xs font-bold text-gray-800 mb-1.5 block" />
                    <div className="flex flex-wrap gap-2">
                      {[
                        'Modern Minimalist',
                        'Bold & Corporate',
                        'Creative & Vibrant',
                        'Luxury & Elegant',
                        'Traditional / Classic',
                      ].map((style) => (
                        <button
                          key={style}
                          type="button"
                          onClick={() => setPreferredStyle(style)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border min-h-[40px] ${
                            preferredStyle === style
                              ? 'bg-purple-600 text-white border-purple-600 shadow-xs ring-2 ring-purple-300'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300'
                          }`}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <Label value="Preferred Brand Colors" className="text-xs font-bold text-gray-800" />
                      <TextInput
                        placeholder="e.g. Navy Blue & Gold, Red & White..."
                        value={preferredColor}
                        onChange={(e) => setPreferredColor(e.target.value)}
                        className="text-xs mt-1"
                      />
                    </div>

                    <div>
                      <Label value="Tagline / Key Notes" className="text-xs font-bold text-gray-800" />
                      <TextInput
                        placeholder="e.g. Include QR code, highlight phone number..."
                        value={requirementNotes}
                        onChange={(e) => setRequirementNotes(e.target.value)}
                        className="text-xs mt-1"
                      />
                    </div>
                  </div>

                  {/* Step 2 Mobile Navigation */}
                  <div className="sm:hidden pt-3 flex gap-2">
                    <Button
                      size="sm"
                      color="light"
                      onClick={() => setDesignStep(1)}
                      className="w-1/3 text-xs font-bold"
                    >
                      ◀ Back
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setDesignStep(3)}
                      className="w-2/3 bg-purple-600 text-white font-extrabold text-xs"
                    >
                      Next: Upload Assets ➔
                    </Button>
                  </div>
                </div>

                {/* STEP 3 & 4: BRAND ASSETS UPLOAD & CONTENT BRIEF */}
                <div className={`${(designStep === 3 || designStep === 4) ? 'block' : 'hidden sm:block'} bg-gray-50 border border-gray-200 rounded-2xl p-4 sm:p-5 space-y-4`}>
                  <div className="flex justify-between items-center">
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-black flex items-center justify-center">
                        {designStep === 3 ? '3' : '4'}
                      </span>
                      {designStep === 3 ? 'Upload Brand Logo / Reference Images:' : 'Content Brief & Information Form:'}
                    </h4>
                  </div>

                  {/* Step 3 view on mobile or full view */}
                  <div className={`${designStep === 3 ? 'block' : 'hidden sm:block'} space-y-3`}>
                    <p className="text-xs text-gray-500">
                      Upload your logo file (PNG/JPG/SVG/PDF) or sketch for our designers to incorporate.
                    </p>

                    {/* Logo/Asset Upload Dropzone */}
                    {product.designBriefFields?.filter((f) => f.fieldType === 'FILE_UPLOAD').length > 0 ? (
                      product.designBriefFields.filter((f) => f.fieldType === 'FILE_UPLOAD').map((field) => (
                        <div key={field.fieldKey} className="border border-dashed border-purple-300 rounded-xl p-3 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div>
                            <span className="text-xs font-bold text-gray-800 block">
                              {field.fieldLabel} {field.isRequired && <span className="text-red-600">*</span>}
                            </span>
                            <span className="text-[11px] text-gray-500">{field.helpText || 'Accepted: PNG, JPG, PDF, AI (Max 10MB)'}</span>
                            {designAssets[field.fieldKey] && (
                              <span className="text-xs text-green-700 font-bold flex items-center gap-1 mt-1">
                                ✔ {designAssets[field.fieldKey].originalName}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              id={`asset-upload-${field.fieldKey}`}
                              className="hidden"
                              onChange={(e) => handleBriefAssetUpload(field.fieldKey, e)}
                              accept=".png,.jpg,.jpeg,.svg,.ai,.pdf"
                            />
                            <Button
                              size="xs"
                              color="light"
                              disabled={uploadingAssetField === field.fieldKey}
                              onClick={() => document.getElementById(`asset-upload-${field.fieldKey}`)?.click()}
                              className="text-xs font-bold"
                            >
                              {uploadingAssetField === field.fieldKey ? <Spinner size="xs" /> : designAssets[field.fieldKey] ? 'Replace' : 'Upload File'}
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="border border-dashed border-purple-300 rounded-xl p-4 bg-white text-center space-y-2">
                        <input
                          type="file"
                          id="general-logo-upload"
                          className="hidden"
                          onChange={(e) => handleBriefAssetUpload('logo', e)}
                          accept=".png,.jpg,.jpeg,.svg,.ai,.pdf"
                        />
                        <button
                          type="button"
                          onClick={() => document.getElementById('general-logo-upload')?.click()}
                          className="cursor-pointer text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-4 py-2 rounded-xl transition"
                        >
                          <HiUpload className="w-4 h-4 inline mr-1" />
                          {designAssets['logo'] ? `✔ ${designAssets['logo'].originalName} (Click to Replace)` : 'Upload Company Logo / Images'}
                        </button>
                        <p className="text-[10px] text-gray-400">Accepted: PNG, JPG, PDF, SVG, AI (Max 10MB)</p>
                      </div>
                    )}

                    <div className="sm:hidden pt-2 flex gap-2">
                      <Button size="sm" color="light" onClick={() => setDesignStep(2)} className="w-1/3 text-xs font-bold">
                        ◀ Back
                      </Button>
                      <Button size="sm" onClick={() => setDesignStep(4)} className="w-2/3 bg-purple-600 text-white font-extrabold text-xs">
                        Next: Content Brief ➔
                      </Button>
                    </div>
                  </div>

                  {/* Step 4 view on mobile or full view */}
                  <div className={`${designStep === 4 ? 'block' : 'hidden sm:block'} space-y-3.5 pt-2`}>
                    <p className="text-xs text-gray-500">
                      Enter the names, phone numbers, addresses, or content you want written on your print item.
                    </p>

                    {(!product.designBriefFields || product.designBriefFields.filter(f => f.fieldType !== 'FILE_UPLOAD').length === 0) ? (
                      <div>
                        <Label value="Text Content & Contact Details *" className="text-xs font-bold" />
                        <Textarea
                          rows={4}
                          placeholder="Company name, designations, mobile numbers, email address, website, physical shop address, tagline..."
                          value={designBriefResponses['general_brief'] || ''}
                          onChange={(e) => setDesignBriefResponses({ ...designBriefResponses, general_brief: e.target.value })}
                          required
                          className="text-xs mt-1"
                        />
                      </div>
                    ) : (
                      product.designBriefFields.filter(f => f.fieldType !== 'FILE_UPLOAD').map((field) => {
                        const fieldVal = designBriefResponses[field.fieldKey] || '';
                        return (
                          <div key={field.id || field.fieldKey} className="space-y-1">
                            <Label className="text-xs font-bold text-gray-800">
                              {field.fieldLabel} {field.isRequired && <span className="text-red-600">*</span>}
                            </Label>
                            {field.fieldType === 'MULTI_LINE_TEXT' ? (
                              <Textarea
                                rows={3}
                                placeholder={field.placeholder || 'Enter details...'}
                                value={fieldVal}
                                onChange={(e) => setDesignBriefResponses({ ...designBriefResponses, [field.fieldKey]: e.target.value })}
                                className="text-xs"
                              />
                            ) : field.fieldType === 'SELECT' ? (
                              <Select
                                value={fieldVal}
                                onChange={(e) => setDesignBriefResponses({ ...designBriefResponses, [field.fieldKey]: e.target.value })}
                                size="sm"
                              >
                                <option value="">-- Select Choice --</option>
                                {(typeof field.optionsJson === 'string' ? JSON.parse(field.optionsJson || '[]') : (field.optionsJson || [])).map((opt, oI) => (
                                  <option key={oI} value={opt}>{opt}</option>
                                ))}
                              </Select>
                            ) : (
                              <TextInput
                                type={field.fieldType === 'NUMBER' ? 'number' : field.fieldType === 'EMAIL' ? 'email' : field.fieldType === 'PHONE' ? 'tel' : 'text'}
                                placeholder={field.placeholder || ''}
                                value={fieldVal}
                                onChange={(e) => setDesignBriefResponses({ ...designBriefResponses, [field.fieldKey]: e.target.value })}
                                size="sm"
                              />
                            )}
                          </div>
                        );
                      })
                    )}

                    <div className="sm:hidden pt-2 flex gap-2">
                      <Button size="sm" color="light" onClick={() => setDesignStep(3)} className="w-1/3 text-xs font-bold">
                        ◀ Back
                      </Button>
                      <Button size="sm" onClick={() => setDesignStep(5)} className="w-2/3 bg-purple-600 text-white font-extrabold text-xs">
                        Next: Review Summary ➔
                      </Button>
                    </div>
                  </div>
                </div>

                {/* STEP 5: REVIEW SELECTIONS & TERMS CONFIRMATION */}
                <div className={`${designStep === 5 ? 'block' : 'hidden sm:block'} space-y-4`}>
                  {/* Live Itemized Price Math Card */}
                  <div className="p-4 bg-purple-100/70 border border-purple-200 rounded-2xl text-xs text-purple-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="space-y-1">
                      <div className="font-extrabold text-sm text-purple-900">
                        Design Service Summary:
                      </div>
                      <div className="text-gray-700 text-xs">
                        <strong>Package:</strong> {selectedPackage?.name || selectedPackage?.packageName || 'Standard Design'} (+₹{pricing.basePackageFee || pricing.designFee})
                        <br />
                        <strong>Style:</strong> {preferredStyle} {preferredColor && `(${preferredColor})`}
                        {selectedAddons.length > 0 && (
                          <div className="mt-1 font-medium text-purple-800">
                            <strong>Add-ons ({selectedAddons.length}):</strong> {selectedAddons.map(a => a.name).join(', ')} (+₹{pricing.designAddonsFee})
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-left sm:text-right bg-white/90 p-3 rounded-xl border border-purple-200 w-full sm:w-auto">
                      <span className="text-[10px] text-purple-700 font-bold block">Total Product + Design</span>
                      <span className="font-black text-lg text-purple-950">
                        ₹{pricing.subtotal?.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Mandatory Design Support Terms & Conditions Agreement */}
                  <div className="bg-purple-50/50 border border-purple-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-xs uppercase tracking-wider text-purple-950 flex items-center gap-1.5">
                        <HiOutlineDocumentText className="w-4 h-4 text-purple-700" />
                        Design Support Terms & Conditions
                      </h4>
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                        Required
                      </span>
                    </div>

                    <div className="max-h-28 overflow-y-auto p-3 bg-white rounded-xl border border-purple-100 text-[11px] text-gray-600 font-mono whitespace-pre-line leading-relaxed">
                      {product.artworkSetting?.designTerms || `
1. Scope includes layout composition and typography based on submitted brief.
2. Revisions cover font, text, and placement modifications within the package quota.
3. Physical printing begins strictly upon customer digital mockup proof approval.
4. Print Bazzar is not liable for typographical errors approved by customer.
5. High-resolution vector source files are excluded unless explicitly stated.
                      `.trim()}
                    </div>

                    <label className="flex items-start gap-2 pt-1 cursor-pointer">
                      <Checkbox
                        id="design-terms-checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-xs font-bold text-gray-800">
                        I have reviewed the design package terms, revision rules, and agree to the Print Bazzar Design Support Terms & Conditions.
                      </span>
                    </label>
                  </div>

                  {/* Step 5 Back to Step 4 button on mobile */}
                  <div className="sm:hidden pt-1 flex justify-start">
                    <Button size="xs" color="light" onClick={() => setDesignStep(4)} className="font-bold">
                      ◀ Back to Content Brief
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Combination Unavailability Warning Box (Phase 8) */}
          {pricing.isAvailable === false && (
            <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 text-amber-900 flex items-start gap-3 mt-6 shadow-xs">
              <span className="text-xl flex-shrink-0">⚠️</span>
              <div>
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-amber-950">
                  Configuration Unavailable
                </h4>
                <p className="text-xs text-amber-900 font-semibold mt-0.5">
                  This configuration is currently unavailable. Please select another option.
                </p>
              </div>
            </div>
          )}

          {/* Dynamic Price Calculation Summary Box */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mt-6">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-700">Order Subtotal:</span>
              <span className={`text-3xl font-black ${pricing.isAvailable !== false ? 'text-red-600' : 'text-gray-400'}`}>
                ₹{pricing.subtotal}
              </span>
            </div>
            <div className="text-xs text-gray-500 space-y-1.5 border-t pt-2.5">
              <div className="flex justify-between font-medium">
                <span>
                  Base Print Cost ({pricing.quantity} {product.quantityUnit || 'pcs'}):
                </span>
                <span className="text-gray-900 font-bold">₹{pricing.basePrice}</span>
              </div>

              {/* Applied Add-ons and Modifiers */}
              {pricing.appliedAddons && pricing.appliedAddons.length > 0 && (
                <div className="space-y-1 py-1 border-y border-dashed border-gray-200 my-1">
                  {pricing.appliedAddons.map((addon, idx) => (
                    <div key={idx} className="flex justify-between text-purple-900 text-[11px]">
                      <span className="flex items-center gap-1 font-medium">
                        <span className="text-purple-600">✦</span> {addon.optionName}: {addon.valueLabel}
                      </span>
                      <span className="font-bold">+₹{addon.amount}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Fallback appliedModifiers for volume slab products */}
              {!pricing.appliedAddons?.length && pricing.appliedModifiers && pricing.appliedModifiers.length > 0 && (
                <div className="space-y-1 py-1 border-y border-dashed border-gray-200 my-1">
                  {pricing.appliedModifiers.map((mod, idx) => (
                    <div key={idx} className="flex justify-between text-yellow-800 text-[11px]">
                      <span className="flex items-center gap-1 font-medium">
                        <span className="text-yellow-600">✦</span> {mod.valueLabel}:
                      </span>
                      <span className="font-bold">+₹{mod.amount}</span>
                    </div>
                  ))}
                </div>
              )}

              {pricing.designFee > 0 && (
                <div className="flex justify-between text-purple-700 font-semibold">
                  <span>
                    🎨 Design Support ({pricing.designPackageName || (selectedPackage ? selectedPackage.packageName : 'Package')}):
                  </span>
                  <span className="font-bold">+₹{pricing.designFee}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-gray-700 pt-1">
                <span>GST (18% included in checkout):</span>
                <span>₹{pricing.totalTax}</span>
              </div>
            </div>
          </div>

          {/* Your Selection Summary Card */}
          <div className="bg-white border-2 border-purple-200 rounded-2xl p-4 mt-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-purple-100">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-purple-950 flex items-center gap-1.5">
                <HiOutlineClipboardList className="w-4 h-4 text-purple-700" />
                Your Selection Summary
              </h4>
              <span className="text-[11px] font-mono text-purple-700 font-black">
                {quantity} {product.quantityUnit || 'Units'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {Object.entries(selectedOptions).map(([opt, val]) => (
                <div key={opt} className="flex justify-between py-1 px-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <span className="text-gray-500 font-medium truncate mr-2">{opt}:</span>
                  <span className="text-gray-900 font-bold text-right">{val}</span>
                </div>
              ))}
              <div className="flex justify-between py-1 px-2.5 rounded-lg bg-purple-50/50 border border-purple-100">
                <span className="text-purple-700 font-medium">Artwork Service:</span>
                <span className="text-purple-900 font-bold">
                  {artworkOption === 'DESIGN_SUPPORT' ? (selectedPackage?.packageName || 'Design Support') : 'Print-Ready File (FREE)'}
                </span>
              </div>
            </div>

            {/* Active Compatibility Warning Banner */}
            {compatibilityResult.activeViolations?.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1">
                <div className="font-extrabold flex items-center gap-1 text-red-700">
                  <HiOutlineExclamationCircle className="w-4 h-4" />
                  Compatibility Notice:
                </div>
                {compatibilityResult.activeViolations.map((v, i) => (
                  <p key={i} className="text-[11px] font-medium">{v.reason}</p>
                ))}
              </div>
            )}

            {/* Missing Required Warning */}
            {missingRequiredOptions.length > 0 && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-bold">
                ⚠️ Required options missing: {missingRequiredOptions.join(', ')}
              </div>
            )}
          </div>

          {/* Terms & Conditions Agreement */}
          <div className="flex items-center gap-2 pt-4">
            <Checkbox id="terms" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} />
            <Label htmlFor="terms" className="text-xs text-gray-600 cursor-pointer">
              I agree to the{' '}
              <button
                type="button"
                onClick={() => setOpenModal(true)}
                className="text-red-600 underline font-medium"
              >
                print specifications and order terms
              </button>
            </Label>
          </div>

          {/* Action CTA Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
            <Button
              color="dark"
              disabled={
                !agreeTerms ||
                pricing.isAvailable === false ||
                missingRequiredOptions.length > 0 ||
                !compatibilityResult.isCompatible
              }
              onClick={handleAddToCart}
              className="bg-black hover:bg-gray-800 disabled:bg-gray-300 text-white font-extrabold py-1.5 rounded-xl text-sm"
            >
              Add To Cart
            </Button>
            <Button
              disabled={
                !agreeTerms ||
                pricing.isAvailable === false ||
                missingRequiredOptions.length > 0 ||
                !compatibilityResult.isCompatible
              }
              onClick={handleBuyNow}
              className="bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-300 text-black font-black py-1.5 rounded-xl text-sm shadow-md"
            >
              Buy Now ➔
            </Button>
          </div>

          {/* Instant Delivery Code / Pincode Estimator */}
          <div className="mt-5">
            <DeliveryEstimator />
          </div>
        </div>
      </div>

      {/* Comprehensive Product Info Tabs: Specs, Video Demo, Guidelines, FAQs, Terms & Verified Reviews */}
      <div id="product-info-tabs-section" className="mt-12">
        <ProductInfoTabs product={product} />
      </div>

      {/* Guide Banner */}
      <div className="mt-10">
        <GuideDesign />
      </div>

      {/* Smart Cross-Sell & Recommended Products */}
      <RelatedProductsSection
        currentProductId={product.id}
        categorySlug={product.category?.slug}
        categoryName={product.category?.name}
      />

      {/* Feedback & Enquiry Form */}
      <div className="mt-12">
        <Feedback />
      </div>

      {/* Sticky Mobile Bottom Buy Bar (Positioned above MobileBottomNav) */}
      <div
        className="lg:hidden fixed bottom-13.5 sm:bottom-14 left-0 right-0 bg-white/98 backdrop-blur-md border-t border-gray-200 px-3 py-2 z-35 shadow-2xl flex items-center justify-between gap-3"
      >
        <div className="flex-1 min-w-0">
          <span className="text-[10px] text-gray-500 font-bold block truncate">
            Total ({quantity} {product.quantityUnit || 'pcs'})
          </span>
          <span className="text-lg sm:text-xl font-black text-red-600">
            ₹{pricing.subtotal?.toLocaleString('en-IN')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="xs"
            color="dark"
            onClick={handleAddToCart}
            className="bg-black hover:bg-gray-800 text-white font-extrabold text-xs px-3 py-2 rounded-xl min-h-[44px]"
          >
            Add to Cart
          </Button>
          <Button
            size="xs"
            onClick={handleBuyNow}
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-black text-xs px-3.5 py-2 rounded-xl shadow-sm min-h-[44px]"
          >
            Buy Now ➔
          </Button>
        </div>
      </div>

      {/* Terms & Conditions Modal */}
      <Modal show={openModal} onClose={() => setOpenModal(false)}>
        <Modal.Header>Print Specifications & Order Terms</Modal.Header>
        <Modal.Body>
          <div className="space-y-3 text-xs text-gray-600">
            <p>
              Please double check all phone numbers, spellings, dimensions, and artwork content before placing your order.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Files submitted are checked for resolution and bleed compliance before offset production.</li>
              <li>RGB screen colors may vary slightly in CMYK industrial offset printing.</li>
              <li>Production turnaround starts upon order placement and artwork confirmation.</li>
            </ul>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
}
