import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { TextInput, Textarea, Select, Checkbox, Label, Button, Spinner, Tabs } from 'flowbite-react';
import {
  HiArrowLeft,
  HiSave,
  HiPlus,
  HiTrash,
  HiUpload,
  HiOutlinePhotograph,
  HiOutlineVideoCamera,
  HiStar,
  HiOutlineDocumentText,
  HiOutlineSparkles,
  HiOutlineClipboardList,
  HiOutlineAdjustments,
} from 'react-icons/hi';
import { api } from '../services/api';
import AdminMediaUploader from '../Components/AdminMediaUploader';

const DEFAULT_PRINT_TERMS = `### Print Bazzar Design Support Terms & Conditions

1. **Design Scope**: Includes layout composition, brand typography, color styling, and content placement based on the provided brief.
2. **Revision Policy**: Includes specified revisions for font changes, text modifications, and minor layout tweaks.
3. **Additional Revision Charges**: Extra revisions beyond the package limit are billed at the package's additional revision rate.
4. **Content Responsibility**: Customer must provide accurate text, contact numbers, email, and addresses.
5. **Approval Responsibility**: Physical production starts only after customer proof confirmation via digital mockup.
6. **Printing Responsibility**: Print Bazzar is not liable for typographical or grammatical errors approved by customer.
7. **Copyright & Permissions**: Customer guarantees full ownership/license for all supplied logos, photographs, and assets.
8. **Delivery Timeline**: Design turnaround begins only after complete content, brief responses, and required assets are received.
9. **Scope Change**: Complete conceptual changes or new brief submissions outside original scope require a new design order.
10. **Source Files**: Editable source files (open CDR, AI, PSD) are excluded unless explicitly stated in package services.`.trim();

export default function AdminProductEditor() {
  const { id } = useParams();
  const isEditMode = Boolean(id && id !== 'new');
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    categoryId: '',
    startingPrice: 0,
    minQuantity: 100,
    maxQuantity: '',
    quantityType: 'FIXED', // FIXED, CUSTOM, BOTH
    quantityUnit: 'Pieces',
    customQtyMin: 100,
    customQtyMax: '',
    customQtyStep: 50,
    customUnitPrice: '',
    singleSideDesignCharge: 200,
    doubleSideDesignCharge: 400,
    shortDescription: '',
    fullDescription: '',
    thumbnailUrl: '',
    videoUrl: '',
    turnaroundTime: 'Single Day Delivery (Order Before 12PM)',
    deliveryInfo: 'Fast local & courier delivery available',
    hasCustomDesign: true,
    isFeatured: false,
    isBestSeller: false,
    isNewArrival: false,
    status: 'ACTIVE',
    priceChangeReason: '',
  });

  const [images, setImages] = useState([]);
  const [specifications, setSpecifications] = useState([]);
  const [options, setOptions] = useState([]);
  const [priceSlabs, setPriceSlabs] = useState([]);
  const [combinations, setCombinations] = useState([]);

  // Phase 16: Artwork & Design Support State
  const [artworkSetting, setArtworkSetting] = useState({
    enablePrintReady: true,
    enableDesignSupport: true,
    acceptedFormats: 'PDF, AI, CDR, PSD, PNG, JPG',
    maxFileSizeMb: 10,
    minFileSizeMb: '',
    printWidth: 90,
    printHeight: 53,
    sizeUnit: 'mm',
    bleed: '3 mm on all sides',
    safeMargin: '3 mm inside content safe mark',
    resolutionDpi: 300,
    colorMode: 'CMYK',
    fontInstructions: 'Convert all text to curves/outlines or embed fonts',
    specialInstructions: 'Keep all critical text, phone numbers, and logos at least 3mm inside the cut line to prevent clipping.',
    designTerms: DEFAULT_PRINT_TERMS,
  });

  const [designPackages, setDesignPackages] = useState([
    {
      packageName: 'Basic Design',
      description: 'Essential layout composition with customer content placement and 1 revision.',
      designCharge: 300,
      initialConcepts: 1,
      revisionsIncluded: 1,
      additionalRevisionCharge: 100,
      estimatedTime: '1 Business Day',
      includedServices: '1 Concept, Content Placement, High-Res Print PDF, 1 Revision',
      excludedServices: 'Complex Illustration, Source Files',
      isActive: true,
    },
    {
      packageName: 'Premium Design',
      description: 'Custom creative design with 2 distinct layout concepts and 3 revisions.',
      designCharge: 600,
      initialConcepts: 2,
      revisionsIncluded: 3,
      additionalRevisionCharge: 150,
      estimatedTime: '2 Business Days',
      includedServices: '2 Concepts, Premium Layout, Color Harmony, Print-Ready Files, 3 Revisions',
      excludedServices: 'Logo Design from Scratch',
      isActive: true,
    },
  ]);

  const [designBriefFields, setDesignBriefFields] = useState([
    {
      fieldLabel: 'Company / Business Name',
      fieldKey: 'company_name',
      fieldType: 'SINGLE_LINE_TEXT',
      placeholder: 'e.g. Acme Printing Corp',
      isRequired: true,
      helpText: 'Official company name to be printed.',
      optionsJson: '',
    },
    {
      fieldLabel: 'Contact Information & Text Content',
      fieldKey: 'contact_details',
      fieldType: 'MULTI_LINE_TEXT',
      placeholder: 'Names, phone numbers, addresses, emails, social handles, tagline...',
      isRequired: true,
      helpText: 'List all text content to be printed on this product.',
      optionsJson: '',
    },
    {
      fieldLabel: 'Brand Logo File',
      fieldKey: 'brand_logo',
      fieldType: 'FILE_UPLOAD',
      placeholder: 'Upload transparent PNG, SVG, AI, or high-res JPG',
      isRequired: false,
      helpText: 'Vector or high-res logo file.',
      optionsJson: '',
    },
  ]);

  useEffect(() => {
    api.getCategories().then((res) => {
      if (res.success) {
        setCategories(res.data || []);
        if (!isEditMode && res.data?.length > 0) {
          setFormData((prev) => ({ ...prev, categoryId: res.data[0].id }));
        }
      }
    });

    if (isEditMode) {
      fetchProductDetails();
    }
  }, [id]);

  const fetchProductDetails = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminProducts({ search: '', limit: 100 });
      if (res.success) {
        const prod = res.data?.find((p) => p.id === id);
        if (prod) {
          setFormData({
            name: prod.name || '',
            sku: prod.sku || '',
            categoryId: prod.categoryId || '',
            startingPrice: prod.startingPrice || 0,
            minQuantity: prod.minQuantity || 100,
            maxQuantity: prod.maxQuantity || '',
            quantityType: prod.quantityType || 'FIXED',
            quantityUnit: prod.quantityUnit || 'Pieces',
            customQtyMin: prod.customQtyMin || 100,
            customQtyMax: prod.customQtyMax || '',
            customQtyStep: prod.customQtyStep || 50,
            customUnitPrice: prod.customUnitPrice || '',
            singleSideDesignCharge: prod.singleSideDesignCharge || 200,
            doubleSideDesignCharge: prod.doubleSideDesignCharge || 400,
            shortDescription: prod.shortDescription || '',
            fullDescription: prod.fullDescription || '',
            thumbnailUrl: prod.thumbnailUrl || (prod.images?.[0]?.imageUrl || ''),
            videoUrl: prod.videoUrl || '',
            turnaroundTime: prod.turnaroundTime || 'Single Day Delivery (Order Before 12PM)',
            deliveryInfo: prod.deliveryInfo || '',
            hasCustomDesign: !!prod.hasCustomDesign,
            isFeatured: !!prod.isFeatured,
            isBestSeller: !!prod.isBestSeller,
            isNewArrival: !!prod.isNewArrival,
            status: prod.status || 'ACTIVE',
            priceChangeReason: '',
          });

          setImages(prod.images || []);
          setSpecifications(prod.specifications || []);
          setOptions(prod.options || []);
          setPriceSlabs(prod.priceSlabs || []);
          setCombinations(prod.combinations || []);

          if (prod.artworkSetting) {
            setArtworkSetting(prod.artworkSetting);
          }
          if (prod.designPackages && prod.designPackages.length > 0) {
            setDesignPackages(prod.designPackages);
          }
          if (prod.designBriefFields && prod.designBriefFields.length > 0) {
            setDesignBriefFields(prod.designBriefFields);
          }
        }
      }
    } catch (err) {
      console.error('Error loading product for edit:', err);
      setErrorMessage('Failed to load product details.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Multi-Image Upload Handler
  const handleMultipleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    for (const file of files) {
      try {
        const res = await api.uploadMedia(file);
        if (res.success && (res.url || res.imageUrl)) {
          const imgUrl = res.url || res.imageUrl;
          setImages((prev) => [
            ...prev,
            { imageUrl: imgUrl, imageType: 'GALLERY', displayOrder: prev.length + 1 },
          ]);
          setFormData((prev) => (prev.thumbnailUrl ? prev : { ...prev, thumbnailUrl: imgUrl }));
        }
      } catch (err) {
        console.error('Error uploading gallery image:', err);
        alert(`Failed to upload ${file.name}: ${err.message}`);
      }
    }
    e.target.value = '';
  };

  const setAsPrimaryThumbnail = (imgUrl) => {
    setFormData((prev) => ({ ...prev, thumbnailUrl: imgUrl }));
  };

  const removeImage = (index) => {
    setImages((prev) => {
      const removed = prev[index];
      const updated = prev.filter((_, i) => i !== index);
      if (formData.thumbnailUrl === removed?.imageUrl) {
        setFormData((f) => ({ ...f, thumbnailUrl: updated[0]?.imageUrl || '' }));
      }
      return updated;
    });
  };

  // Specifications builder
  const addSpecification = () => {
    setSpecifications((prev) => [...prev, { specKey: '', specValue: '' }]);
  };

  const updateSpecification = (index, field, value) => {
    setSpecifications((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const removeSpecification = (index) => {
    setSpecifications((prev) => prev.filter((_, i) => i !== index));
  };

  // Dynamic Custom Options & Finishes Builder (Spot UV, Foil, Lamination, Corners, Surcharges)
  const addOptionGroup = () => {
    setOptions((prev) => [
      ...prev,
      {
        optionName: '',
        optionType: 'SELECT',
        isRequired: true,
        displayOrder: prev.length + 1,
        values: [
          { valueLabel: 'None / Standard', priceModifierType: 'FLAT', priceModifierValue: 0 },
        ],
      },
    ]);
  };

  const updateOptionGroup = (optIdx, field, value) => {
    setOptions((prev) => {
      const updated = [...prev];
      updated[optIdx][field] = value;
      return updated;
    });
  };

  const removeOptionGroup = (optIdx) => {
    setOptions((prev) => prev.filter((_, i) => i !== optIdx));
  };

  const addOptionValue = (optIdx) => {
    setOptions((prev) => {
      const updated = [...prev];
      if (!updated[optIdx].values) updated[optIdx].values = [];
      updated[optIdx].values.push({
        valueLabel: '',
        priceModifierType: 'FLAT',
        priceModifierValue: 0,
      });
      return updated;
    });
  };

  const updateOptionValue = (optIdx, valIdx, field, value) => {
    setOptions((prev) => {
      const updated = [...prev];
      updated[optIdx].values[valIdx][field] = value;
      return updated;
    });
  };

  const removeOptionValue = (optIdx, valIdx) => {
    setOptions((prev) => {
      const updated = [...prev];
      updated[optIdx].values = updated[optIdx].values.filter((_, i) => i !== valIdx);
      return updated;
    });
  };

  // Quick Preset Template Loader
  const applyOptionPreset = (presetType) => {
    if (
      options.length > 0 &&
      !window.confirm('Apply preset template? This will replace the currently configured options for this product.')
    ) {
      return;
    }

    if (presetType === 'VISITING_CARD') {
      setOptions([
        {
          optionName: 'Printing Location',
          optionType: 'SELECT',
          isRequired: true,
          values: [
            { valueLabel: 'Single Side', priceModifierType: 'FLAT', priceModifierValue: 0 },
            { valueLabel: 'Double Side', priceModifierType: 'FLAT', priceModifierValue: 50 },
          ],
        },
        {
          optionName: 'Paper Stock / GSM',
          optionType: 'SELECT',
          isRequired: true,
          values: [
            { valueLabel: '350 GSM Premium Art Board', priceModifierType: 'FLAT', priceModifierValue: 0 },
            { valueLabel: '400 GSM Heavy Velvet Royal Board', priceModifierType: 'FLAT', priceModifierValue: 120 },
            { valueLabel: '300 GSM Vintage Brown Kraft', priceModifierType: 'FLAT', priceModifierValue: 80 },
            { valueLabel: 'Metallic Shimmer Gold / Pearl', priceModifierType: 'FLAT', priceModifierValue: 180 },
          ],
        },
        {
          optionName: 'Lamination Finish',
          optionType: 'SELECT',
          isRequired: true,
          values: [
            { valueLabel: 'Thermal Matte Lamination', priceModifierType: 'FLAT', priceModifierValue: 0 },
            { valueLabel: 'Gloss Reflective Lamination', priceModifierType: 'FLAT', priceModifierValue: 0 },
            { valueLabel: 'Double Side Velvet Soft-Touch', priceModifierType: 'FLAT', priceModifierValue: 140 },
          ],
        },
        {
          optionName: 'Spot UV Coating',
          optionType: 'SELECT',
          isRequired: true,
          values: [
            { valueLabel: 'No Spot UV', priceModifierType: 'FLAT', priceModifierValue: 0 },
            { valueLabel: 'Single Side Raised Spot UV', priceModifierType: 'FLAT', priceModifierValue: 200 },
            { valueLabel: 'Double Side Raised Spot UV', priceModifierType: 'FLAT', priceModifierValue: 350 },
          ],
        },
        {
          optionName: 'Foil Stamping',
          optionType: 'SELECT',
          isRequired: true,
          values: [
            { valueLabel: 'No Foil Stamping', priceModifierType: 'FLAT', priceModifierValue: 0 },
            { valueLabel: 'Single Side Gold Foil', priceModifierType: 'FLAT', priceModifierValue: 250 },
            { valueLabel: 'Double Side Gold Foil', priceModifierType: 'FLAT', priceModifierValue: 450 },
            { valueLabel: 'Single Side Silver Foil', priceModifierType: 'FLAT', priceModifierValue: 250 },
            { valueLabel: 'Double Side Silver Foil', priceModifierType: 'FLAT', priceModifierValue: 450 },
          ],
        },
        {
          optionName: 'Corner Finishing',
          optionType: 'SELECT',
          isRequired: true,
          values: [
            { valueLabel: 'Standard Square Cut', priceModifierType: 'FLAT', priceModifierValue: 0 },
            { valueLabel: '6mm Rounded Corners Die-Cut', priceModifierType: 'FLAT', priceModifierValue: 150 },
          ],
        },
      ]);
    } else if (presetType === 'STICKER') {
      setOptions([
        {
          optionName: 'Sticker Shape',
          optionType: 'SELECT',
          isRequired: true,
          values: [
            { valueLabel: 'Square / Rectangle Cut', priceModifierType: 'FLAT', priceModifierValue: 0 },
            { valueLabel: 'Circle / Round Die-Cut', priceModifierType: 'FLAT', priceModifierValue: 30 },
            { valueLabel: 'Oval Die-Cut', priceModifierType: 'FLAT', priceModifierValue: 40 },
            { valueLabel: 'Custom Contour Die-Cut', priceModifierType: 'FLAT', priceModifierValue: 90 },
          ],
        },
        {
          optionName: 'Material & Vinyl',
          optionType: 'SELECT',
          isRequired: true,
          values: [
            { valueLabel: 'White Gloss Vinyl (Waterproof)', priceModifierType: 'FLAT', priceModifierValue: 0 },
            { valueLabel: 'Matte Vinyl (Tear-Resistant)', priceModifierType: 'FLAT', priceModifierValue: 20 },
            { valueLabel: 'Clear Transparent Film', priceModifierType: 'FLAT', priceModifierValue: 60 },
            { valueLabel: 'Metallic Gold / Silver Foil', priceModifierType: 'FLAT', priceModifierValue: 120 },
          ],
        },
        {
          optionName: 'Sticker Size',
          optionType: 'SELECT',
          isRequired: true,
          values: [
            { valueLabel: '2" x 2" (50 x 50 mm)', priceModifierType: 'FLAT', priceModifierValue: 0 },
            { valueLabel: '3" x 3" (75 x 75 mm)', priceModifierType: 'FLAT', priceModifierValue: 60 },
            { valueLabel: '4" x 4" (100 x 100 mm)', priceModifierType: 'FLAT', priceModifierValue: 120 },
          ],
        },
      ]);
    } else if (presetType === 'FLYER') {
      setOptions([
        {
          optionName: 'Paper Size',
          optionType: 'SELECT',
          isRequired: true,
          values: [
            { valueLabel: 'A5 Size (148 x 210 mm)', priceModifierType: 'FLAT', priceModifierValue: 0 },
            { valueLabel: 'A4 Size (210 x 297 mm)', priceModifierType: 'FLAT', priceModifierValue: 120 },
            { valueLabel: 'A6 Pocket (105 x 148 mm)', priceModifierType: 'FLAT', priceModifierValue: -40 },
          ],
        },
        {
          optionName: 'Paper Stock',
          optionType: 'SELECT',
          isRequired: true,
          values: [
            { valueLabel: '130 GSM Gloss Art Paper', priceModifierType: 'FLAT', priceModifierValue: 0 },
            { valueLabel: '170 GSM Premium Art Paper', priceModifierType: 'FLAT', priceModifierValue: 80 },
            { valueLabel: '250 GSM Heavy Board', priceModifierType: 'FLAT', priceModifierValue: 180 },
          ],
        },
        {
          optionName: 'Folding Style',
          optionType: 'SELECT',
          isRequired: true,
          values: [
            { valueLabel: 'Flat Sheet (No Fold)', priceModifierType: 'FLAT', priceModifierValue: 0 },
            { valueLabel: 'Half / Bi-Fold (4 Panels)', priceModifierType: 'FLAT', priceModifierValue: 50 },
            { valueLabel: 'Tri-Fold / Z-Fold (6 Panels)', priceModifierType: 'FLAT', priceModifierValue: 90 },
          ],
        },
      ]);
    }
  };

  // Pricing Slabs builder
  const addPriceSlab = () => {
    setPriceSlabs((prev) => [
      ...prev,
      {
        minQty: 100,
        maxQty: '',
        unitPrice: 0,
        singleSidePrice: 0,
        doubleSidePrice: 0,
        singleSideDesignCharge: 200,
        doubleSideDesignCharge: 400,
        designCharge: 200,
      },
    ]);
  };

  const updatePriceSlab = (index, field, value) => {
    setPriceSlabs((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  // Move image order
  const moveImage = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= images.length) return;
    setImages((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIdx, 1);
      updated.splice(toIdx, 0, moved);
      return updated;
    });
  };

  // Exact Combination Matrix builder (Phase 4 & 7)
  const addCombination = () => {
    setCombinations((prev) => [
      ...prev,
      {
        combinationKey: `comb-${Date.now()}`,
        optionsJson: {},
        quantity: parseInt(formData.minQuantity, 10) || 100,
        price: formData.startingPrice || 0,
        sku: '',
        isAvailable: true,
        displayOrder: prev.length + 1,
      },
    ]);
  };

  const updateCombination = (idx, field, value) => {
    setCombinations((prev) => {
      const updated = [...prev];
      updated[idx][field] = value;
      return updated;
    });
  };

  const updateCombinationOption = (combIdx, optName, optVal) => {
    setCombinations((prev) => {
      const updated = [...prev];
      const currentOpts = typeof updated[combIdx].optionsJson === 'string'
        ? JSON.parse(updated[combIdx].optionsJson)
        : { ...(updated[combIdx].optionsJson || {}) };
      currentOpts[optName] = optVal;
      updated[combIdx].optionsJson = currentOpts;
      updated[combIdx].combinationKey = Object.entries(currentOpts).map(([k, v]) => `${k}:${v}`).join('|');
      return updated;
    });
  };

  const removeCombination = (idx) => {
    setCombinations((prev) => prev.filter((_, i) => i !== idx));
  };

  const generateCombinationsFromOptions = () => {
    const coreOptions = options.filter((opt) => !opt.isAddon && opt.values && opt.values.length > 0);
    if (!coreOptions.length) {
      alert('Please add at least one core configuration group (e.g. Size, Material, Side) with choice values first.');
      return;
    }

    let cartesian = [{}];
    for (const opt of coreOptions) {
      const next = [];
      for (const current of cartesian) {
        for (const val of opt.values) {
          next.push({
            ...current,
            [opt.optionName]: val.valueLabel,
          });
        }
      }
      cartesian = next;
    }

    if (cartesian.length > 80) {
      if (!window.confirm(`This will generate ${cartesian.length} combinations. Proceed?`)) {
        return;
      }
    }

    const targetQtys = priceSlabs.length > 0
      ? priceSlabs.map((s) => s.minQty)
      : [parseInt(formData.minQuantity, 10) || 100];

    const newCombinations = [];
    for (const qty of targetQtys) {
      for (const optMap of cartesian) {
        const combKey = Object.entries(optMap).map(([k, v]) => `${k}:${v}`).join('|');
        const existing = combinations.find((c) => c.combinationKey === combKey && c.quantity === qty);
        newCombinations.push(
          existing || {
            combinationKey: combKey,
            optionsJson: optMap,
            quantity: qty,
            price: formData.startingPrice || 0,
            sku: `${formData.sku || 'PB'}-${qty}-${newCombinations.length + 1}`,
            isAvailable: true,
            displayOrder: newCombinations.length + 1,
          }
        );
      }
    }

    setCombinations(newCombinations);
  };

  // ==========================================
  // PHASE 16: ARTWORK & DESIGN STUDIO HELPERS
  // ==========================================

  const handleArtworkSettingChange = (field, value) => {
    setArtworkSetting((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Design Packages Handlers
  const addDesignPackage = () => {
    setDesignPackages((prev) => [
      ...prev,
      {
        packageName: `Custom Package ${prev.length + 1}`,
        description: 'Complete custom professional artwork service.',
        designCharge: 200,
        doubleSideDesignCharge: 400,
        initialConcepts: 1,
        revisionsIncluded: 2,
        additionalRevisionCharge: 100,
        estimatedTime: '1 Business Day',
        includedServices: 'Design Proofing, High-Res Print File, 2 Revisions',
        excludedServices: 'Source Vector Files',
        isActive: true,
      },
    ]);
  };

  const updateDesignPackage = (idx, field, value) => {
    setDesignPackages((prev) =>
      prev.map((pkg, i) => (i === idx ? { ...pkg, [field]: value } : pkg))
    );
  };

  const removeDesignPackage = (idx) => {
    setDesignPackages((prev) => prev.filter((_, i) => i !== idx));
  };

  const loadDesignPackagePreset = (type) => {
    if (type === 'VISITING_CARD') {
      setDesignPackages([
        {
          packageName: 'Single-Side Standard Design',
          description: 'Clean, professional single-sided visiting card layout matching your brand typography.',
          designCharge: 200,
          doubleSideDesignCharge: 400,
          initialConcepts: 1,
          revisionsIncluded: 1,
          additionalRevisionCharge: 100,
          estimatedTime: '1 Business Day',
          includedServices: 'Single-Side Layout, Typography, Logo Placement, Print PDF, 1 Revision',
          excludedServices: 'Logo Design, Complex Vector Illustration',
          isActive: true,
        },
        {
          packageName: 'Double-Side Executive Design',
          description: 'Full double-sided executive brand layout with QR code generation and 2 concepts.',
          designCharge: 300,
          doubleSideDesignCharge: 500,
          initialConcepts: 2,
          revisionsIncluded: 2,
          additionalRevisionCharge: 150,
          estimatedTime: '1-2 Business Days',
          includedServices: 'Front & Back Layout, WhatsApp/URL QR Code, 2 Creative Concepts, 2 Revisions',
          excludedServices: 'Logo Creation from Scratch',
          isActive: true,
        },
        {
          packageName: 'Luxury Foil & Emboss Master Pack',
          description: 'Custom luxury branding with dedicated foil mask layers and embossed vector separation.',
          designCharge: 500,
          doubleSideDesignCharge: 800,
          initialConcepts: 2,
          revisionsIncluded: 3,
          additionalRevisionCharge: 200,
          estimatedTime: '2 Business Days',
          includedServices: 'Spot UV / Foil Layer Masks, Vector Cutlines, 2 Concepts, 3 Revisions, Print PDF',
          excludedServices: 'Mascot Drawing',
          isActive: true,
        },
      ]);
    } else if (type === 'BANNER') {
      setDesignPackages([
        {
          packageName: 'Standard Retail Banner Design',
          description: 'High-visibility billboard or flex banner design optimized for roadside reading distance.',
          designCharge: 450,
          doubleSideDesignCharge: 800,
          initialConcepts: 1,
          revisionsIncluded: 1,
          additionalRevisionCharge: 150,
          estimatedTime: '1 Business Day',
          includedServices: 'Bold Headline Styling, Phone / Address Prominence, High-Res Large Format Output',
          excludedServices: 'Commercial Stock Photo Purchases',
          isActive: true,
        },
        {
          packageName: 'Premium Exhibition / Event Backdrop',
          description: 'High-impact exhibition standee or stage backdrop with brand pattern layout.',
          designCharge: 850,
          doubleSideDesignCharge: 1500,
          initialConcepts: 2,
          revisionsIncluded: 3,
          additionalRevisionCharge: 200,
          estimatedTime: '2 Business Days',
          includedServices: '2 Layout Variations, Brand Identity Colors, High-Res Large Format Print-Ready TIFF/PDF',
          excludedServices: '3D Rendering',
          isActive: true,
        },
      ]);
    } else if (type === 'FLYER') {
      setDesignPackages([
        {
          packageName: 'Single-Side Promo Flyer',
          description: 'Eye-catching promotional flyer layout for retail sales, events, and product launches.',
          designCharge: 350,
          doubleSideDesignCharge: 600,
          initialConcepts: 1,
          revisionsIncluded: 1,
          additionalRevisionCharge: 100,
          estimatedTime: '1 Business Day',
          includedServices: 'Promotional Headline, Product Images Placement, Offer Highlights, Print-Ready PDF',
          excludedServices: 'Content Copywriting',
          isActive: true,
        },
        {
          packageName: 'Double-Side Complete Menu / Catalog Flyer',
          description: 'Structured 2-sided menu, price list, or product catalogue flyer with categorized sections.',
          designCharge: 450,
          doubleSideDesignCharge: 800,
          initialConcepts: 1,
          revisionsIncluded: 2,
          additionalRevisionCharge: 150,
          estimatedTime: '2 Business Days',
          includedServices: 'Two-Page Grid Layout, Price List Formatting, Product Photo Placements, 2 Revisions',
          excludedServices: 'Product Photography',
          isActive: true,
        },
      ]);
    }
  };

  // Design Brief Fields Handlers
  const addDesignBriefField = () => {
    const fIdx = designBriefFields.length + 1;
    setDesignBriefFields((prev) => [
      ...prev,
      {
        fieldLabel: `Custom Requirement ${fIdx}`,
        fieldKey: `custom_req_${fIdx}`,
        fieldType: 'SINGLE_LINE_TEXT',
        placeholder: 'Enter details...',
        isRequired: false,
        helpText: 'Instructions for customer.',
        optionsJson: '',
      },
    ]);
  };

  const updateDesignBriefField = (idx, field, value) => {
    setDesignBriefFields((prev) =>
      prev.map((f, i) => {
        if (i !== idx) return f;
        const updated = { ...f, [field]: value };
        if (field === 'fieldLabel' && (!f.fieldKey || f.fieldKey.startsWith('custom_req_'))) {
          updated.fieldKey = value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
        }
        return updated;
      })
    );
  };

  const removeDesignBriefField = (idx) => {
    setDesignBriefFields((prev) => prev.filter((_, i) => i !== idx));
  };

  const loadDesignBriefPreset = (type) => {
    if (type === 'VISITING_CARD') {
      setDesignBriefFields([
        {
          fieldLabel: 'Business / Company Name',
          fieldKey: 'company_name',
          fieldType: 'SINGLE_LINE_TEXT',
          placeholder: 'e.g. Apex Engineering Ltd.',
          isRequired: true,
          helpText: 'Official business name to be placed prominently.',
          optionsJson: '',
        },
        {
          fieldLabel: 'Cardholder Name & Designation',
          fieldKey: 'person_details',
          fieldType: 'SINGLE_LINE_TEXT',
          placeholder: 'e.g. Rajesh Kumar (Managing Director)',
          isRequired: true,
          helpText: 'Full name and official job title.',
          optionsJson: '',
        },
        {
          fieldLabel: 'Contact Numbers & WhatsApp',
          fieldKey: 'contact_numbers',
          fieldType: 'SINGLE_LINE_TEXT',
          placeholder: 'e.g. +91 98765 43210 / WhatsApp: +91 98765 43210',
          isRequired: true,
          helpText: 'Provide all phone and mobile numbers to print.',
          optionsJson: '',
        },
        {
          fieldLabel: 'Email, Website & Social Handles',
          fieldKey: 'online_presence',
          fieldType: 'SINGLE_LINE_TEXT',
          placeholder: 'e.g. sales@apexeng.com | www.apexeng.com',
          isRequired: false,
          helpText: 'Web address, email, Instagram / LinkedIn handles.',
          optionsJson: '',
        },
        {
          fieldLabel: 'Office / Shop Address',
          fieldKey: 'office_address',
          fieldType: 'MULTI_LINE_TEXT',
          placeholder: 'Complete physical address, landmark, and pin code...',
          isRequired: true,
          helpText: 'Full address as it should be printed.',
          optionsJson: '',
        },
        {
          fieldLabel: 'Brand Logo File',
          fieldKey: 'brand_logo',
          fieldType: 'FILE_UPLOAD',
          placeholder: 'Upload transparent PNG, SVG, AI, EPS, or high-res JPG',
          isRequired: false,
          helpText: 'Upload original vector or transparent background logo for crisp printing.',
          optionsJson: '',
        },
        {
          fieldLabel: 'Sample Card / Reference Image',
          fieldKey: 'sample_reference',
          fieldType: 'FILE_UPLOAD',
          placeholder: 'Upload sample layout or sketch you like',
          isRequired: false,
          helpText: 'Optional design reference or color palette.',
          optionsJson: '',
        },
        {
          fieldLabel: 'Special Design Notes / QR Code Requests',
          fieldKey: 'special_notes',
          fieldType: 'MULTI_LINE_TEXT',
          placeholder: 'e.g. Generate QR code for Google Maps location, prefer clean navy blue theme...',
          isRequired: false,
          helpText: 'Any extra instructions for our graphic designer.',
          optionsJson: '',
        },
      ]);
    } else if (type === 'BANNER') {
      setDesignBriefFields([
        {
          fieldLabel: 'Banner Main Headline / Offer Text',
          fieldKey: 'banner_headline',
          fieldType: 'SINGLE_LINE_TEXT',
          placeholder: 'e.g. GRAND OPENING - 50% FLAT DISCOUNT ON ALL ITEMS',
          isRequired: true,
          helpText: 'The primary message that will catch people’s attention from afar.',
          optionsJson: '',
        },
        {
          fieldLabel: 'Offer Bullet Points & Sub-Services',
          fieldKey: 'offer_details',
          fieldType: 'MULTI_LINE_TEXT',
          placeholder: 'List 3-5 key products, special offers, or highlights to display...',
          isRequired: true,
          helpText: 'Keep it concise for maximum outdoor readability.',
          optionsJson: '',
        },
        {
          fieldLabel: 'Prominent Contact Phone Number',
          fieldKey: 'contact_number',
          fieldType: 'SINGLE_LINE_TEXT',
          placeholder: 'e.g. Call / WhatsApp: 98765 43210',
          isRequired: true,
          helpText: 'Will be formatted in extra-large font.',
          optionsJson: '',
        },
        {
          fieldLabel: 'Address & Landmark',
          fieldKey: 'location_address',
          fieldType: 'MULTI_LINE_TEXT',
          placeholder: 'Opposite Railway Station, Main Bazaar, City...',
          isRequired: true,
          helpText: 'Concise address or landmark.',
          optionsJson: '',
        },
        {
          fieldLabel: 'High-Resolution Brand Logo',
          fieldKey: 'banner_logo',
          fieldType: 'FILE_UPLOAD',
          placeholder: 'Upload high-resolution logo',
          isRequired: false,
          helpText: 'High-res vector or PNG required for large format enlargement.',
          optionsJson: '',
        },
      ]);
    }
  };

  const resetDesignTerms = () => {
    if (window.confirm('Reset design terms to standard Print Bazzar printing industry terms?')) {
      handleArtworkSettingChange('designTerms', DEFAULT_PRINT_TERMS);
    }
  };

  // Save Product
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMessage('Product Name is required.');
      return;
    }
    if (!formData.categoryId) {
      setErrorMessage('Please select a Category.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const payload = {
        ...formData,
        startingPrice: parseFloat(formData.startingPrice) || 0,
        minQuantity: parseInt(formData.minQuantity, 10) || 1,
        maxQuantity: formData.maxQuantity ? parseInt(formData.maxQuantity, 10) : null,
        quantityType: formData.quantityType || 'FIXED',
        quantityUnit: formData.quantityUnit || 'Pieces',
        customQtyMin: parseInt(formData.customQtyMin, 10) || 100,
        customQtyMax: formData.customQtyMax ? parseInt(formData.customQtyMax, 10) : null,
        customQtyStep: parseInt(formData.customQtyStep, 10) || 50,
        customUnitPrice: formData.customUnitPrice ? parseFloat(formData.customUnitPrice) : null,
        singleSideDesignCharge: parseFloat(formData.singleSideDesignCharge) || 200,
        doubleSideDesignCharge: parseFloat(formData.doubleSideDesignCharge) || 400,
        thumbnailUrl: formData.thumbnailUrl || images[0]?.imageUrl || null,
        videoUrl: formData.videoUrl || null,
        images,
        specifications: specifications.filter((s) => s.specKey.trim() && s.specValue.trim()),
        priceSlabs: priceSlabs.map((s) => ({
          minQty: parseInt(s.minQty, 10) || 1,
          maxQty: s.maxQty ? parseInt(s.maxQty, 10) : null,
          unitPrice: parseFloat(s.unitPrice) || 0,
          singleSidePrice: parseFloat(s.singleSidePrice) || 0,
          doubleSidePrice: parseFloat(s.doubleSidePrice) || 0,
          singleSideDesignCharge: parseFloat(s.singleSideDesignCharge || s.designCharge) || 200,
          doubleSideDesignCharge: parseFloat(s.doubleSideDesignCharge || ((s.singleSideDesignCharge || s.designCharge || 200) * 2)) || 400,
          designCharge: parseFloat(s.singleSideDesignCharge || s.designCharge) || 200,
        })),
        combinations: combinations.map((c, idx) => ({
          combinationKey: c.combinationKey || `comb-${idx + 1}`,
          optionsJson: typeof c.optionsJson === 'string' ? c.optionsJson : JSON.stringify(c.optionsJson || {}),
          quantity: parseInt(c.quantity, 10) || 100,
          price: parseFloat(c.price) || 0,
          sku: c.sku || null,
          isAvailable: c.isAvailable !== false,
          displayOrder: idx + 1,
        })),
        options: options.map((opt, oIdx) => ({
          ...opt,
          isAddon: !!opt.isAddon,
          displayOrder: oIdx + 1,
        })),
        artworkSetting: {
          enablePrintReady: artworkSetting.enablePrintReady !== false,
          enableDesignSupport: artworkSetting.enableDesignSupport !== false,
          acceptedFormats: artworkSetting.acceptedFormats || 'PDF, AI, CDR, PSD, PNG, JPG',
          maxFileSizeMb: parseFloat(artworkSetting.maxFileSizeMb) || 100,
          minFileSizeMb: artworkSetting.minFileSizeMb ? parseFloat(artworkSetting.minFileSizeMb) : null,
          printWidth: artworkSetting.printWidth ? parseFloat(artworkSetting.printWidth) : null,
          printHeight: artworkSetting.printHeight ? parseFloat(artworkSetting.printHeight) : null,
          sizeUnit: artworkSetting.sizeUnit || 'inches',
          bleed: artworkSetting.bleed || '0.125 inches on all sides',
          safeMargin: artworkSetting.safeMargin || '0.125 inches',
          resolutionDpi: parseInt(artworkSetting.resolutionDpi, 10) || 300,
          colorMode: artworkSetting.colorMode || 'CMYK',
          fontInstructions: artworkSetting.fontInstructions || 'Convert all text to curves/outlines or embed fonts',
          specialInstructions: artworkSetting.specialInstructions || '',
          designTerms: artworkSetting.designTerms || DEFAULT_PRINT_TERMS,
        },
        designPackages: designPackages.map((pkg, idx) => ({
          ...pkg,
          designCharge: parseFloat(pkg.designCharge) || 0,
          initialConcepts: parseInt(pkg.initialConcepts, 10) || 1,
          revisionsIncluded: parseInt(pkg.revisionsIncluded, 10) || 1,
          additionalRevisionCharge: parseFloat(pkg.additionalRevisionCharge) || 100,
          displayOrder: idx + 1,
          isActive: pkg.isActive !== false,
        })),
        designBriefFields: designBriefFields.map((field, idx) => ({
          ...field,
          isRequired: !!field.isRequired,
          displayOrder: idx + 1,
        })),
      };

      if (isEditMode) {
        await api.updateProduct(id, payload);
        setSuccessMessage('Product updated successfully!');
      } else {
        await api.createProduct(payload);
        setSuccessMessage('Product created successfully!');
      }

      setTimeout(() => {
        navigate('/admin/products');
      }, 1200);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save product. Please check fields.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center">
        <Spinner size="xl" />
        <p className="mt-3 text-sm text-gray-500 font-medium">Loading product editor...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex justify-between items-center pb-4 border-b">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/products"
            className="p-2 bg-white border rounded-lg hover:bg-gray-50 text-gray-700"
          >
            <HiArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">
              {isEditMode ? `Edit: ${formData.name}` : 'Create New Product'}
            </h1>
            <p className="text-xs text-gray-500">Configure catalog specifications, pricing slabs & options</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditMode && (
            <Link
              to={`/admin/products/${id}/configuration`}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
              title="Open Dynamic Options & Pricing Matrix Hub"
            >
              <HiOutlineAdjustments className="w-4 h-4" />
              Configuration & Pricing Hub ➔
            </Link>
          )}

          <Button
            onClick={handleSaveProduct}
            disabled={isSaving}
            color="dark"
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold text-xs"
          >
            {isSaving ? <Spinner size="sm" /> : <HiSave className="w-4 h-4 mr-1.5" />}
            {isEditMode ? 'Update Product' : 'Publish Product'}
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold p-4 rounded-xl">
          ⚠ {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-xs font-semibold p-4 rounded-xl">
          ✔ {successMessage}
        </div>
      )}

      {/* Editor Tabs */}
      <div className="bg-white rounded-2xl border shadow-xs p-6">
        <Tabs aria-label="Product Editor Tabs" variant="underline">
          {/* TAB 1: BASIC INFORMATION */}
          <Tabs.Item active title="Basic Details">
            <div className="space-y-5 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label value="Product Name *" />
                  <TextInput
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. Premium Metallic Business Card"
                    required
                  />
                </div>

                <div>
                  <Label value="SKU (Stock Keeping Unit)" />
                  <TextInput
                    name="sku"
                    value={formData.sku}
                    onChange={handleInputChange}
                    placeholder="e.g. PB0001 (auto-generated if empty)"
                  />
                </div>

                <div>
                  <Label value="Category *" />
                  <Select
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Label value="Starting Base Price (₹) *" />
                  <TextInput
                    type="number"
                    name="startingPrice"
                    value={formData.startingPrice}
                    onChange={handleInputChange}
                    placeholder="188"
                    required
                  />
                </div>
              </div>

              {/* Graphic Design Service Costs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
                <div>
                  <Label value="🎨 Single Side Design Charge (₹)" className="text-purple-900 font-bold" />
                  <TextInput
                    type="number"
                    name="singleSideDesignCharge"
                    value={formData.singleSideDesignCharge}
                    onChange={handleInputChange}
                    placeholder="200"
                    required
                    className="mt-1 font-bold text-purple-950"
                  />
                  <span className="text-[10px] text-gray-500 mt-1 block">
                    Charged when customer selects "Let Us Design" on 1-side printing (e.g. ₹200).
                  </span>
                </div>

                <div>
                  <Label value="🎨 Double Side Design Charge (₹)" className="text-purple-900 font-bold" />
                  <TextInput
                    type="number"
                    name="doubleSideDesignCharge"
                    value={formData.doubleSideDesignCharge}
                    onChange={handleInputChange}
                    placeholder="400"
                    required
                    className="mt-1 font-bold text-purple-950"
                  />
                  <span className="text-[10px] text-gray-500 mt-1 block">
                    Charged when customer selects "Let Us Design" on 2-side printing (Front + Back 2 designs, e.g. ₹400).
                  </span>
                </div>
              </div>

              <div>
                <Label value="Short Description (for Listing Cards)" />
                <TextInput
                  name="shortDescription"
                  value={formData.shortDescription}
                  onChange={handleInputChange}
                  placeholder="e.g. For 100 pieces"
                />
              </div>

              <div>
                <Label value="Full Overview & Description" />
                <Textarea
                  name="fullDescription"
                  rows="4"
                  value={formData.fullDescription}
                  onChange={handleInputChange}
                  placeholder="Detailed material specifications, printing guidelines, and features..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label value="Turnaround Time Banner" />
                  <TextInput
                    name="turnaroundTime"
                    value={formData.turnaroundTime}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <Label value="Delivery Information Note" />
                  <TextInput
                    name="deliveryInfo"
                    value={formData.deliveryInfo}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* Status & Visibility Flags */}
              <div className="pt-4 border-t grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <Label value="Product Status" />
                  <Select name="status" value={formData.status} onChange={handleInputChange}>
                    <option value="ACTIVE">ACTIVE (Public)</option>
                    <option value="DRAFT">DRAFT (Hidden)</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </Select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <Checkbox
                    id="featured"
                    name="isFeatured"
                    checked={formData.isFeatured}
                    onChange={handleInputChange}
                  />
                  <Label htmlFor="featured">Featured Product</Label>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <Checkbox
                    id="bestSeller"
                    name="isBestSeller"
                    checked={formData.isBestSeller}
                    onChange={handleInputChange}
                  />
                  <Label htmlFor="bestSeller">Best Seller</Label>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <Checkbox
                    id="hasCustomDesign"
                    name="hasCustomDesign"
                    checked={formData.hasCustomDesign}
                    onChange={handleInputChange}
                  />
                  <Label htmlFor="hasCustomDesign">Allow Design Request</Label>
                </div>
              </div>
            </div>
          </Tabs.Item>

          {/* TAB 2: PRODUCT IMAGES & VIDEO SHOWCASE */}
          <Tabs.Item title="Images & Video">
            <div className="space-y-8 pt-4">
              {/* Section 1: Main Product Thumbnail */}
              <div className="bg-white p-5 rounded-2xl border shadow-xs space-y-3">
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-1.5">
                    <HiOutlinePhotograph className="w-4 h-4 text-blue-600" />
                    Primary Product Thumbnail
                  </h3>
                  <p className="text-xs text-gray-500">
                    This main image will be displayed on product cards, category catalogs, and search results.
                  </p>
                </div>

                <AdminMediaUploader
                  label="Upload Primary Thumbnail"
                  value={formData.thumbnailUrl || (images[0]?.imageUrl || '')}
                  onChange={(url) => {
                    setFormData({ ...formData, thumbnailUrl: url });
                    if (url && !images.some((img) => img.imageUrl === url)) {
                      setImages((prev) => [{ imageUrl: url, imageType: 'MAIN', displayOrder: 1 }, ...prev]);
                    }
                  }}
                  aspectHint="Square ratio (800x800 px) or high-res product photo recommended"
                  required
                />
              </div>

              {/* Section 2: Product Video Showcase */}
              <div className="bg-white p-5 rounded-2xl border shadow-xs space-y-3">
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-1.5">
                    <HiOutlineVideoCamera className="w-4 h-4 text-purple-600" />
                    Product Showcase Video (Optional)
                  </h3>
                  <p className="text-xs text-gray-500">
                    Upload an MP4 / WebM demo video showing product unboxing, paper texture, or finish quality.
                  </p>
                </div>

                <AdminMediaUploader
                  label="Upload Product Video File"
                  value={formData.videoUrl}
                  onChange={(url) => setFormData({ ...formData, videoUrl: url })}
                  type="video"
                  aspectHint="Direct MP4 / WebM video file (Max 100MB HD Video)"
                />
              </div>

              {/* Section 3: Additional Gallery Mockups */}
              <div className="bg-white p-5 rounded-2xl border shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-1.5">
                      <HiUpload className="w-4 h-4 text-yellow-500" />
                      Additional Gallery Images & Angles ({images.length})
                    </h3>
                    <p className="text-xs text-gray-500">
                      Upload multiple product angles, close-up finishes, size guides, and material photos.
                    </p>
                  </div>

                  <label className="cursor-pointer">
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleMultipleImageUpload}
                      accept="image/*"
                    />
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-black bg-yellow-400 hover:bg-yellow-500 rounded-xl shadow-xs transition-all">
                      <HiPlus className="w-4 h-4" /> Add More Photos
                    </span>
                  </label>
                </div>

                {/* Drag / Browse Dropzone */}
                <div className="relative border-2 border-dashed border-gray-300 hover:border-yellow-400 bg-gray-50/70 hover:bg-yellow-50/20 rounded-2xl p-6 text-center transition-all cursor-pointer">
                  <input
                    type="file"
                    multiple
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    onChange={handleMultipleImageUpload}
                    accept="image/*"
                  />
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <HiOutlinePhotograph className="w-8 h-8 text-gray-400" />
                    <span className="text-xs font-bold text-gray-800">
                      Drop multiple photos here or click to browse
                    </span>
                    <span className="text-[11px] text-gray-500">
                      Select multiple files at once (PNG, JPG, WEBP)
                    </span>
                  </div>
                </div>

                {/* Gallery Grid */}
                {images.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No additional gallery photos added yet.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 pt-2">
                    {images.map((img, idx) => {
                      const isPrimary = formData.thumbnailUrl === img.imageUrl || (idx === 0 && !formData.thumbnailUrl);
                      return (
                        <div
                          key={idx}
                          className={`relative group rounded-xl overflow-hidden bg-white border-2 shadow-xs transition-all ${
                            isPrimary ? 'border-yellow-400 ring-2 ring-yellow-400/30' : 'border-gray-200'
                          }`}
                        >
                          <img
                            src={img.imageUrl}
                            alt={`Photo ${idx + 1}`}
                            className="w-full h-32 object-cover bg-gray-100"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/src/assets/images/logo_white.png';
                            }}
                          />

                          {isPrimary && (
                            <span className="absolute top-2 left-2 bg-yellow-400 text-black text-[9px] font-black px-2 py-0.5 rounded-md uppercase shadow-xs flex items-center gap-0.5">
                              <HiStar className="w-3 h-3 text-black" /> Primary
                            </span>
                          )}

                          <div className="p-2 bg-gray-50 border-t flex items-center justify-between gap-1 text-xs">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => moveImage(idx, idx - 1)}
                                className="px-1.5 py-0.5 bg-gray-200 hover:bg-gray-300 rounded text-[10px] font-bold disabled:opacity-25"
                                title="Move Left"
                              >
                                ◀
                              </button>
                              <button
                                type="button"
                                disabled={idx === images.length - 1}
                                onClick={() => moveImage(idx, idx + 1)}
                                className="px-1.5 py-0.5 bg-gray-200 hover:bg-gray-300 rounded text-[10px] font-bold disabled:opacity-25"
                                title="Move Right"
                              >
                                ▶
                              </button>
                              {!isPrimary ? (
                                <button
                                  type="button"
                                  onClick={() => setAsPrimaryThumbnail(img.imageUrl)}
                                  className="text-[11px] text-blue-600 hover:text-blue-800 font-bold underline ml-1"
                                >
                                  Set Main
                                </button>
                              ) : (
                                <span className="text-[10px] text-gray-500 font-semibold ml-1">Main</span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => removeImage(idx)}
                              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                              title="Delete photo"
                            >
                              <HiTrash className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </Tabs.Item>

          {/* TAB 3: SPECIFICATIONS */}
          <Tabs.Item title="Specifications">
            <div className="space-y-4 pt-4">
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500">Add dynamic key-value specifications for this product.</p>
                <Button size="xs" color="light" onClick={addSpecification}>
                  <HiPlus className="w-3.5 h-3.5 mr-1" /> Add Specification Row
                </Button>
              </div>

              <div className="space-y-3">
                {specifications.map((spec, idx) => (
                  <div key={idx} className="flex gap-3 items-center">
                    <TextInput
                      placeholder="Spec Key (e.g. Paper GSM, Dimensions)"
                      value={spec.specKey}
                      onChange={(e) => updateSpecification(idx, 'specKey', e.target.value)}
                      className="flex-1"
                      size="sm"
                    />
                    <TextInput
                      placeholder="Spec Value (e.g. 350 GSM Art Board, 3.5 x 2 in)"
                      value={spec.specValue}
                      onChange={(e) => updateSpecification(idx, 'specValue', e.target.value)}
                      className="flex-1"
                      size="sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeSpecification(idx)}
                      className="p-2 text-red-500 hover:text-red-700"
                    >
                      <HiTrash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </Tabs.Item>

          {/* TAB 4: DYNAMIC CUSTOM OPTIONS & FINISHES (Spot UV, Foil, Lamination, Corners, Surcharges) */}
          <Tabs.Item title="Custom Options & Finishes">
            <div className="space-y-6 pt-4">
              {/* Preset Action Bar */}
              <div className="bg-yellow-50/70 border border-yellow-200 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <span className="font-black text-xs text-yellow-900 block flex items-center gap-1.5">
                    ⚡ Quick 1-Click Industry Preset Templates
                  </span>
                  <span className="text-[11px] text-yellow-800">
                    Quickly load standard UV, Foil, Lamination, and Surcharge options or build custom options below.
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyOptionPreset('VISITING_CARD')}
                    className="px-2.5 py-1 text-xs font-bold text-black bg-yellow-400 hover:bg-yellow-500 rounded-lg shadow-2xs transition-all"
                  >
                    📇 Visiting Card Preset
                  </button>
                  <button
                    type="button"
                    onClick={() => applyOptionPreset('STICKER')}
                    className="px-2.5 py-1 text-xs font-bold text-gray-800 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg shadow-2xs transition-all"
                  >
                    🏷️ Sticker Preset
                  </button>
                  <button
                    type="button"
                    onClick={() => applyOptionPreset('FLYER')}
                    className="px-2.5 py-1 text-xs font-bold text-gray-800 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg shadow-2xs transition-all"
                  >
                    📄 Flyer Preset
                  </button>
                </div>
              </div>

              {/* Header Action Bar */}
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900">
                    Configured Option Groups ({options.length})
                  </h3>
                  <p className="text-xs text-gray-500">
                    Each option group (e.g. Spot UV, Foil, Lamination) provides selectable choices and price modifiers for the customer.
                  </p>
                </div>

                <Button size="xs" color="dark" onClick={addOptionGroup} className="bg-black text-white font-bold">
                  <HiPlus className="w-3.5 h-3.5 mr-1" /> Add Option Group
                </Button>
              </div>

              {options.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 border-2 border-dashed rounded-2xl">
                  <p className="text-xs text-gray-500 font-semibold mb-2">No custom options or finishes defined yet.</p>
                  <Button size="xs" color="light" onClick={() => applyOptionPreset('VISITING_CARD')} className="mx-auto">
                    Load Visiting Card Preset
                  </Button>
                </div>
              ) : (
                <div className="space-y-5">
                  {options.map((opt, optIdx) => (
                    <div key={optIdx} className="bg-white border-2 border-gray-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                      {/* Option Group Header */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b">
                        <div className="flex-1 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-yellow-400 text-black text-xs font-black flex items-center justify-center">
                            {optIdx + 1}
                          </span>
                          <TextInput
                            placeholder="Option Group Name (e.g. Spot UV Coating, Foil Stamping, Lamination)"
                            value={opt.optionName}
                            onChange={(e) => updateOptionGroup(optIdx, 'optionName', e.target.value)}
                            size="sm"
                            className="flex-1 font-bold text-xs"
                            required
                          />
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 text-xs text-purple-900 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200 cursor-pointer font-bold">
                            <input
                              type="checkbox"
                              checked={!!opt.isAddon}
                              onChange={(e) => updateOptionGroup(optIdx, 'isAddon', e.target.checked)}
                              className="rounded text-purple-600 focus:ring-purple-500"
                            />
                            Optional Add-on (Finishing Modifier)
                          </label>

                          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={opt.isRequired !== false}
                              onChange={(e) => updateOptionGroup(optIdx, 'isRequired', e.target.checked)}
                              className="rounded text-yellow-400 focus:ring-yellow-400"
                            />
                            Required
                          </label>

                          <button
                            type="button"
                            onClick={() => removeOptionGroup(optIdx)}
                            className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50"
                            title="Delete this option group"
                          >
                            <HiTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Values Table for this Option Group */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-bold uppercase text-gray-500 tracking-wider">
                            Selectable Values & Price Surcharges
                          </span>
                          <button
                            type="button"
                            onClick={() => addOptionValue(optIdx)}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            <HiPlus className="w-3 h-3" /> Add Choice Value
                          </button>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left text-gray-700">
                            <thead className="bg-gray-50 text-[10px] uppercase text-gray-400 border-b">
                              <tr>
                                <th className="p-2">Value Label (e.g. Single Side Spot UV)</th>
                                <th className="p-2 w-32">Type</th>
                                <th className="p-2 w-28">Modifier (₹ / %)</th>
                                <th className="p-2 w-12 text-right"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {(opt.values || []).map((val, valIdx) => (
                                <tr key={valIdx} className="hover:bg-gray-50/50">
                                  <td className="p-2">
                                    <TextInput
                                      placeholder="Value Label (e.g. Single Side Gold Foil)"
                                      value={val.valueLabel}
                                      onChange={(e) => updateOptionValue(optIdx, valIdx, 'valueLabel', e.target.value)}
                                      size="sm"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <Select
                                      value={val.priceModifierType || 'FLAT'}
                                      onChange={(e) => updateOptionValue(optIdx, valIdx, 'priceModifierType', e.target.value)}
                                      size="sm"
                                    >
                                      <option value="FLAT">Flat ₹ (Total)</option>
                                      <option value="PER_UNIT">₹ / Unit</option>
                                      <option value="PERCENT">% Base</option>
                                    </Select>
                                  </td>
                                  <td className="p-2">
                                    <TextInput
                                      type="number"
                                      placeholder="0"
                                      value={val.priceModifierValue}
                                      onChange={(e) => updateOptionValue(optIdx, valIdx, 'priceModifierValue', e.target.value)}
                                      size="sm"
                                    />
                                  </td>
                                  <td className="p-2 text-right">
                                    <button
                                      type="button"
                                      onClick={() => removeOptionValue(optIdx, valIdx)}
                                      className="text-red-400 hover:text-red-600 p-1"
                                      title="Remove value"
                                    >
                                      <HiTrash className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Tabs.Item>

          {/* TAB 5: QUANTITY RULES (Phase 6) */}
          <Tabs.Item title="Quantity Rules">
            <div className="space-y-6 pt-4">
              <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-4">
                <h3 className="font-extrabold text-sm text-blue-950 flex items-center gap-1.5">
                  📐 Flexible Quantity Rules & Configuration
                </h3>
                <p className="text-xs text-blue-800 mt-1">
                  Choose whether customers order using Fixed Quantity Slabs (e.g. 100, 250, 500, 1000), enter a Custom Quantity (e.g. 750), or both.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label value="Quantity Model *" />
                  <Select
                    name="quantityType"
                    value={formData.quantityType}
                    onChange={handleInputChange}
                    className="mt-1 font-bold"
                  >
                    <option value="FIXED">Fixed Quantity Slabs Only (Recommended for Cards & Flyers)</option>
                    <option value="CUSTOM">Custom Quantity Input Only (e.g. Banners, Stickers, Large Format)</option>
                    <option value="BOTH">Both Fixed Preset Slabs & Custom Quantity Box</option>
                  </Select>
                  <span className="text-[10px] text-gray-500 mt-1 block">
                    Determines how the quantity selector appears on the customer product page.
                  </span>
                </div>

                <div>
                  <Label value="Quantity Unit Name *" />
                  <Select
                    name="quantityUnit"
                    value={formData.quantityUnit}
                    onChange={handleInputChange}
                    className="mt-1 font-bold"
                  >
                    <option value="Cards">Cards</option>
                    <option value="Pieces">Pieces</option>
                    <option value="Sheets">Sheets</option>
                    <option value="Pairs">Pairs</option>
                    <option value="Sq.ft">Sq.ft (Square Feet)</option>
                    <option value="Boxes">Boxes</option>
                    <option value="Sets">Sets</option>
                    <option value="Rolls">Rolls</option>
                  </Select>
                  <span className="text-[10px] text-gray-500 mt-1 block">
                    Unit displayed beside quantities (e.g. 500 Cards, 100 Sq.ft).
                  </span>
                </div>
              </div>

              {(formData.quantityType === 'CUSTOM' || formData.quantityType === 'BOTH') && (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-4">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-gray-700">
                    Custom Quantity Parameters & Limits
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <Label value="Min Quantity" />
                      <TextInput
                        type="number"
                        name="customQtyMin"
                        value={formData.customQtyMin}
                        onChange={handleInputChange}
                        placeholder="100"
                        size="sm"
                      />
                    </div>
                    <div>
                      <Label value="Max Quantity (Optional)" />
                      <TextInput
                        type="number"
                        name="customQtyMax"
                        value={formData.customQtyMax}
                        onChange={handleInputChange}
                        placeholder="50000"
                        size="sm"
                      />
                    </div>
                    <div>
                      <Label value="Step Increments" />
                      <TextInput
                        type="number"
                        name="customQtyStep"
                        value={formData.customQtyStep}
                        onChange={handleInputChange}
                        placeholder="50"
                        size="sm"
                      />
                      <span className="text-[9px] text-gray-400">e.g. 50, 100</span>
                    </div>
                    <div>
                      <Label value="Custom Unit Rate (₹/pc)" />
                      <TextInput
                        type="number"
                        step="0.01"
                        name="customUnitPrice"
                        value={formData.customUnitPrice}
                        onChange={handleInputChange}
                        placeholder="1.50"
                        size="sm"
                      />
                      <span className="text-[9px] text-gray-400">Leave empty to use slab interpolation</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Tabs.Item>

          {/* TAB 6: EXACT COMBINATION PRICING MATRIX (Phases 4 & 7) */}
          <Tabs.Item title={`Exact Combinations (${combinations.length})`}>
            <div className="space-y-4 pt-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-purple-50/70 border border-purple-200 rounded-2xl p-4">
                <div>
                  <h3 className="font-extrabold text-sm text-purple-950 flex items-center gap-1.5">
                    💎 Exact Combination Pricing Matrix
                  </h3>
                  <p className="text-xs text-purple-800 mt-0.5">
                    Define exact prices for valid combinations of [Size] x [Material] x [Side] x [Lamination] x [Qty].
                    Customer can only purchase combinations that are defined and available.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="xs" color="purple" onClick={generateCombinationsFromOptions} className="font-bold">
                    ⚡ Auto-Generate from Options
                  </Button>
                  <Button size="xs" color="light" onClick={addCombination}>
                    <HiPlus className="w-3.5 h-3.5 mr-1" /> Add Combination
                  </Button>
                </div>
              </div>

              {combinations.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 border-2 border-dashed rounded-2xl space-y-2">
                  <p className="text-xs text-gray-500 font-semibold">
                    No exact combination pricing rules defined yet.
                  </p>
                  <p className="text-[11px] text-gray-400 max-w-md mx-auto">
                    When no combinations are defined, the product automatically uses Volume Pricing Slabs.
                    Click "Auto-Generate" to automatically create rows from your configured options!
                  </p>
                  <Button size="xs" color="dark" onClick={generateCombinationsFromOptions} className="mx-auto mt-2">
                    ⚡ Generate Combinations from Options
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left text-gray-700">
                    <thead className="bg-gray-50 uppercase text-[10px] text-gray-400 border-b">
                      <tr>
                        <th className="p-2.5 w-24">Qty</th>
                        <th className="p-2.5">Configuration Dimensions</th>
                        <th className="p-2.5 w-32">Exact Price (₹)</th>
                        <th className="p-2.5 w-32">SKU (Optional)</th>
                        <th className="p-2.5 w-24 text-center">Available?</th>
                        <th className="p-2.5 w-12 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {combinations.map((comb, idx) => {
                        let opts = {};
                        try {
                          opts = typeof comb.optionsJson === 'string' ? JSON.parse(comb.optionsJson) : (comb.optionsJson || {});
                        } catch (e) {
                          opts = {};
                        }

                        const coreOptions = options.filter((o) => !o.isAddon);

                        return (
                          <tr key={idx} className={`hover:bg-gray-50/50 ${!comb.isAvailable ? 'opacity-50 bg-red-50/20' : ''}`}>
                            <td className="p-2">
                              <TextInput
                                type="number"
                                value={comb.quantity}
                                onChange={(e) => updateCombination(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                                size="sm"
                                className="font-bold text-xs"
                              />
                            </td>
                            <td className="p-2">
                              <div className="flex flex-wrap gap-1.5 items-center">
                                {coreOptions.length > 0 ? (
                                  coreOptions.map((opt) => (
                                    <div key={opt.id || opt.optionName} className="flex items-center gap-1">
                                      <span className="text-[10px] text-gray-400 font-bold">{opt.optionName}:</span>
                                      <select
                                        value={opts[opt.optionName] || ''}
                                        onChange={(e) => updateCombinationOption(idx, opt.optionName, e.target.value)}
                                        className="text-xs p-1 rounded border border-gray-300 bg-white font-medium focus:ring-1 focus:ring-purple-400"
                                      >
                                        <option value="">Select...</option>
                                        {(opt.values || []).map((v) => (
                                          <option key={v.id || v.valueLabel} value={v.valueLabel}>
                                            {v.valueLabel}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-[11px] text-gray-400 italic">
                                    {Object.entries(opts).map(([k, v]) => `${k}: ${v}`).join(' | ') || 'No core options selected'}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-2">
                              <TextInput
                                type="number"
                                value={comb.price}
                                onChange={(e) => updateCombination(idx, 'price', parseFloat(e.target.value) || 0)}
                                size="sm"
                                className="font-black text-purple-700"
                              />
                            </td>
                            <td className="p-2">
                              <TextInput
                                value={comb.sku || ''}
                                onChange={(e) => updateCombination(idx, 'sku', e.target.value)}
                                size="sm"
                                placeholder="Variant SKU"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <label className="inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={comb.isAvailable !== false}
                                  onChange={(e) => updateCombination(idx, 'isAvailable', e.target.checked)}
                                  className="rounded text-green-600 focus:ring-green-500"
                                />
                                <span className={`text-[10px] ml-1 font-bold ${comb.isAvailable ? 'text-green-700' : 'text-red-600'}`}>
                                  {comb.isAvailable ? 'Active' : 'Disabled'}
                                </span>
                              </label>
                            </td>
                            <td className="p-2 text-right">
                              <button
                                type="button"
                                onClick={() => removeCombination(idx)}
                                className="text-red-500 hover:text-red-700 p-1"
                                title="Remove combination"
                              >
                                <HiTrash className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Tabs.Item>

          {/* TAB 7: PRICING SLABS */}
          <Tabs.Item title={`Volume Slabs (${priceSlabs.length})`}>
            <div className="space-y-4 pt-4">
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500">
                  Configure volume tiers, Single Side vs Double Side rates, and design charges.
                </p>
                <Button size="xs" color="light" onClick={addPriceSlab}>
                  <HiPlus className="w-3.5 h-3.5 mr-1" /> Add Quantity Tier
                </Button>
              </div>

              {priceSlabs.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">
                  No pricing slabs defined. The system will use the default starting price formula.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left text-gray-700">
                    <thead className="bg-gray-50 uppercase text-[10px] text-gray-400 border-b">
                      <tr>
                        <th className="p-2.5">Min Qty</th>
                        <th className="p-2.5">Single Side (₹)</th>
                        <th className="p-2.5">Double Side (₹)</th>
                        <th className="p-2.5 text-purple-700">1-Side Design (₹)</th>
                        <th className="p-2.5 text-purple-700">2-Side Design (₹)</th>
                        <th className="p-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {priceSlabs.map((slab, idx) => (
                        <tr key={idx}>
                          <td className="p-2">
                            <TextInput
                              type="number"
                              value={slab.minQty}
                              onChange={(e) => updatePriceSlab(idx, 'minQty', e.target.value)}
                              size="sm"
                            />
                          </td>
                          <td className="p-2">
                            <TextInput
                              type="number"
                              value={slab.singleSidePrice}
                              onChange={(e) => updatePriceSlab(idx, 'singleSidePrice', e.target.value)}
                              size="sm"
                            />
                          </td>
                          <td className="p-2">
                            <TextInput
                              type="number"
                              value={slab.doubleSidePrice}
                              onChange={(e) => updatePriceSlab(idx, 'doubleSidePrice', e.target.value)}
                              size="sm"
                            />
                          </td>
                          <td className="p-2">
                            <TextInput
                              type="number"
                              value={slab.singleSideDesignCharge ?? slab.designCharge ?? 200}
                              onChange={(e) => updatePriceSlab(idx, 'singleSideDesignCharge', e.target.value)}
                              size="sm"
                              className="text-purple-700 font-bold"
                            />
                          </td>
                          <td className="p-2">
                            <TextInput
                              type="number"
                              value={slab.doubleSideDesignCharge ?? ((slab.singleSideDesignCharge || slab.designCharge || 200) * 2)}
                              onChange={(e) => updatePriceSlab(idx, 'doubleSideDesignCharge', e.target.value)}
                              size="sm"
                              className="text-purple-700 font-bold"
                            />
                          </td>
                          <td className="p-2 text-right">
                            <button
                              type="button"
                              onClick={() => removePriceSlab(idx)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <HiTrash className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Tabs.Item>

          {/* TAB 8: ARTWORK & DESIGN STUDIO (PHASE 16) */}
          <Tabs.Item title="Artwork & Design Studio">
            <div className="space-y-8 pt-4">
              {/* Studio Header Banner */}
              <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 p-6 rounded-2xl text-white shadow-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="bg-yellow-400 text-black text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Phase 16 Engine
                    </span>
                    <h2 className="text-xl font-black mt-1 flex items-center gap-2">
                      <HiOutlineSparkles className="w-5 h-5 text-yellow-300" />
                      Artwork & Design Support Studio
                    </h2>
                    <p className="text-xs text-blue-200 mt-1 max-w-2xl leading-relaxed">
                      Configure pre-upload file specifications for customers with print-ready artwork, create product-specific design packages with transparent design charges, and build dynamic design brief questionnaires.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1.5 bg-white/10 rounded-lg text-xs font-semibold text-white/90 border border-white/20">
                      📦 {designPackages.length} Packages
                    </span>
                    <span className="px-3 py-1.5 bg-white/10 rounded-lg text-xs font-semibold text-white/90 border border-white/20">
                      📝 {designBriefFields.length} Brief Fields
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 1: WORKFLOW MODES */}
              <div className="bg-white p-5 rounded-2xl border shadow-xs space-y-4">
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                    <HiOutlineClipboardList className="w-4 h-4 text-blue-600" />
                    Customer Artwork Selection Modes
                  </h3>
                  <p className="text-xs text-gray-500">
                    Control which artwork paths are enabled for this product on the storefront product page.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${artworkSetting.enablePrintReady ? 'border-blue-500 bg-blue-50/40' : 'border-gray-200 bg-gray-50/50'}`}>
                    <input
                      type="checkbox"
                      checked={artworkSetting.enablePrintReady}
                      onChange={(e) => handleArtworkSettingChange('enablePrintReady', e.target.checked)}
                      className="mt-1 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-sm font-black text-gray-900">Option 1: I HAVE MY PRINT-READY FILE</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Enables customer file upload with format validation, resolution checks, and preflight checklist.
                      </div>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${artworkSetting.enableDesignSupport ? 'border-purple-500 bg-purple-50/40' : 'border-gray-200 bg-gray-50/50'}`}>
                    <input
                      type="checkbox"
                      checked={artworkSetting.enableDesignSupport}
                      onChange={(e) => handleArtworkSettingChange('enableDesignSupport', e.target.checked)}
                      className="mt-1 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <div className="text-sm font-black text-gray-900">Option 2: I NEED DESIGN SUPPORT</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Enables product design packages, dynamic brief questionnaire, and legal terms agreement.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* SECTION 2: OPTION 1 FILE REQUIREMENTS */}
              <div className="bg-white p-5 rounded-2xl border shadow-xs space-y-4">
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                    <HiOutlineDocumentText className="w-4 h-4 text-blue-600" />
                    Option 1: Print-Ready File Specifications & Checklist
                  </h3>
                  <p className="text-xs text-gray-500">
                    These guidelines are displayed to the customer in the storefront pre-upload checklist card.
                  </p>
                </div>

                {/* 1-Click Industry Spec Presets */}
                <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3">
                  <div className="text-xs font-black text-blue-900 mb-2 flex items-center gap-1.5">
                    <span>⚡ Quick Industry Specification Presets (1-Click Fill):</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setArtworkSetting((prev) => ({
                          ...prev,
                          printWidth: 90,
                          printHeight: 53,
                          sizeUnit: 'mm',
                          bleed: '3 mm on all sides',
                          safeMargin: '3 mm inside content safe mark',
                          resolutionDpi: 300,
                          colorMode: 'CMYK',
                          maxFileSizeMb: 10,
                          acceptedFormats: 'PDF, AI, CDR, PSD, PNG, JPG',
                          fontInstructions: 'Convert all text to curves/outlines or embed fonts',
                          specialInstructions: 'Keep all critical text, phone numbers, and logos at least 3mm inside the cut line to prevent clipping during industrial stack trimming.',
                        }))
                      }
                      className="px-2.5 py-1 text-xs font-bold bg-white text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 rounded-lg transition"
                    >
                      📇 Visiting Card (90×53mm)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setArtworkSetting((prev) => ({
                          ...prev,
                          printWidth: 210,
                          printHeight: 297,
                          sizeUnit: 'mm',
                          bleed: '3 mm on all sides',
                          safeMargin: '5 mm inside text and content area',
                          resolutionDpi: 300,
                          colorMode: 'CMYK',
                          maxFileSizeMb: 10,
                          acceptedFormats: 'PDF, AI, CDR, PSD, PNG, JPG',
                          fontInstructions: 'Convert all text to curves/outlines or embed fonts',
                          specialInstructions: 'Maintain a 5mm safe margin for all text and vital graphics away from trim marks. For folded flyers, allow 6mm clear space across folds.',
                        }))
                      }
                      className="px-2.5 py-1 text-xs font-bold bg-white text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 rounded-lg transition"
                    >
                      📄 A4 Flyer (210×297mm)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setArtworkSetting((prev) => ({
                          ...prev,
                          printWidth: 148,
                          printHeight: 210,
                          sizeUnit: 'mm',
                          bleed: '3 mm on all sides',
                          safeMargin: '5 mm inside text and content area',
                          resolutionDpi: 300,
                          colorMode: 'CMYK',
                          maxFileSizeMb: 10,
                          acceptedFormats: 'PDF, AI, CDR, PSD, PNG, JPG',
                          fontInstructions: 'Convert all text to curves/outlines or embed fonts',
                          specialInstructions: 'Keep all text and content 5mm away from cut edges.',
                        }))
                      }
                      className="px-2.5 py-1 text-xs font-bold bg-white text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 rounded-lg transition"
                    >
                      📑 A5 Flyer (148×210mm)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setArtworkSetting((prev) => ({
                          ...prev,
                          printWidth: 50,
                          printHeight: 50,
                          sizeUnit: 'mm',
                          bleed: '3 mm beyond die-cut line',
                          safeMargin: '3 mm inside kiss-cut boundary',
                          resolutionDpi: 300,
                          colorMode: 'CMYK',
                          maxFileSizeMb: 10,
                          acceptedFormats: 'PDF, AI, CDR, PSD, PNG, JPG',
                          fontInstructions: 'Convert all text to curves/outlines',
                          specialInstructions: 'For custom die-cut shapes, supply a vector cut contour line (100% Magenta or 0.25pt Hairline) on a separate layer or file.',
                        }))
                      }
                      className="px-2.5 py-1 text-xs font-bold bg-white text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 rounded-lg transition"
                    >
                      🏷️ Sticker (50×50mm)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setArtworkSetting((prev) => ({
                          ...prev,
                          printWidth: 85.6,
                          printHeight: 54,
                          sizeUnit: 'mm',
                          bleed: '2 mm on all sides',
                          safeMargin: '3 mm inside cut mark (8 mm from top slot hole)',
                          resolutionDpi: 300,
                          colorMode: 'CMYK',
                          maxFileSizeMb: 10,
                          acceptedFormats: 'PDF, AI, CDR, PSD, PNG, JPG',
                          fontInstructions: 'Convert all text to curves/outlines or embed fonts',
                          specialInstructions: 'Avoid placing employee photo or text over the lanyard slot punch hole area.',
                        }))
                      }
                      className="px-2.5 py-1 text-xs font-bold bg-white text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 rounded-lg transition"
                    >
                      🆔 ID Card (85.6×54mm)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setArtworkSetting((prev) => ({
                          ...prev,
                          printWidth: 148,
                          printHeight: 210,
                          sizeUnit: 'mm',
                          bleed: '3 mm on trimmed edges',
                          safeMargin: '12 mm on binding edge (left/top), 4 mm other sides',
                          resolutionDpi: 300,
                          colorMode: 'CMYK',
                          maxFileSizeMb: 10,
                          acceptedFormats: 'PDF, AI, CDR, PSD, PNG, JPG',
                          fontInstructions: 'Convert all text to curves/outlines or embed fonts',
                          specialInstructions: 'Leave 12mm clear space on the binding side for book stitching, perforation & binding tape.',
                        }))
                      }
                      className="px-2.5 py-1 text-xs font-bold bg-white text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 rounded-lg transition"
                    >
                      📖 Bill Book (A5)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <Label value="Accepted File Formats (Comma-separated)" />
                    <TextInput
                      value={artworkSetting.acceptedFormats}
                      onChange={(e) => handleArtworkSettingChange('acceptedFormats', e.target.value)}
                      placeholder="e.g. PDF, AI, CDR, PSD, PNG, JPG, TIFF"
                      size="sm"
                    />
                    <span className="text-[11px] text-gray-400">PDF, AI, and CDR are recommended for vector clarity.</span>
                  </div>

                  <div>
                    <Label value="Max File Size (MB)" />
                    <TextInput
                      type="number"
                      value={artworkSetting.maxFileSizeMb}
                      onChange={(e) => handleArtworkSettingChange('maxFileSizeMb', e.target.value)}
                      placeholder="100"
                      size="sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <Label value="Print Width" />
                    <TextInput
                      type="number"
                      step="0.01"
                      value={artworkSetting.printWidth || ''}
                      onChange={(e) => handleArtworkSettingChange('printWidth', e.target.value)}
                      placeholder="3.5"
                      size="sm"
                    />
                  </div>
                  <div>
                    <Label value="Print Height" />
                    <TextInput
                      type="number"
                      step="0.01"
                      value={artworkSetting.printHeight || ''}
                      onChange={(e) => handleArtworkSettingChange('printHeight', e.target.value)}
                      placeholder="2.0"
                      size="sm"
                    />
                  </div>
                  <div>
                    <Label value="Dimension Unit" />
                    <Select
                      value={artworkSetting.sizeUnit}
                      onChange={(e) => handleArtworkSettingChange('sizeUnit', e.target.value)}
                      size="sm"
                    >
                      <option value="inches">Inches (in)</option>
                      <option value="mm">Millimeters (mm)</option>
                      <option value="cm">Centimeters (cm)</option>
                      <option value="feet">Feet (ft)</option>
                      <option value="pixels">Pixels (px)</option>
                    </Select>
                  </div>
                  <div>
                    <Label value="Resolution (DPI)" />
                    <TextInput
                      type="number"
                      value={artworkSetting.resolutionDpi}
                      onChange={(e) => handleArtworkSettingChange('resolutionDpi', e.target.value)}
                      placeholder="300"
                      size="sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label value="Bleed Requirement" />
                    <TextInput
                      value={artworkSetting.bleed}
                      onChange={(e) => handleArtworkSettingChange('bleed', e.target.value)}
                      placeholder="e.g. 0.125 inches on all sides"
                      size="sm"
                    />
                  </div>
                  <div>
                    <Label value="Safe Margin" />
                    <TextInput
                      value={artworkSetting.safeMargin}
                      onChange={(e) => handleArtworkSettingChange('safeMargin', e.target.value)}
                      placeholder="e.g. 0.125 inches"
                      size="sm"
                    />
                  </div>
                  <div>
                    <Label value="Colour Mode" />
                    <Select
                      value={artworkSetting.colorMode}
                      onChange={(e) => handleArtworkSettingChange('colorMode', e.target.value)}
                      size="sm"
                    >
                      <option value="CMYK">CMYK (Standard Printing)</option>
                      <option value="RGB">RGB (Digital Screens)</option>
                      <option value="PANTONE">Pantone Spot Colors</option>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label value="Font & Text Instructions" />
                    <TextInput
                      value={artworkSetting.fontInstructions}
                      onChange={(e) => handleArtworkSettingChange('fontInstructions', e.target.value)}
                      placeholder="e.g. Convert all text to curves/outlines or embed fonts"
                      size="sm"
                    />
                  </div>
                  <div>
                    <Label value="Special Production Instructions" />
                    <TextInput
                      value={artworkSetting.specialInstructions}
                      onChange={(e) => handleArtworkSettingChange('specialInstructions', e.target.value)}
                      placeholder="e.g. Include cutting bleed marks in your exported PDF"
                      size="sm"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: OPTION 2 DESIGN PACKAGES */}
              <div className="bg-white p-5 rounded-2xl border shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                      <HiOutlineSparkles className="w-4 h-4 text-purple-600" />
                      Option 2: Product Design Packages & Pricing
                    </h3>
                    <p className="text-xs text-gray-500">
                      Customers who need design support select from these product-specific packages.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-gray-400">1-Click Presets:</span>
                    <Button size="xs" color="light" onClick={() => loadDesignPackagePreset('VISITING_CARD')}>
                      📇 Visiting Card
                    </Button>
                    <Button size="xs" color="light" onClick={() => loadDesignPackagePreset('BANNER')}>
                      🏷️ Banner
                    </Button>
                    <Button size="xs" color="light" onClick={() => loadDesignPackagePreset('FLYER')}>
                      📄 Flyer
                    </Button>
                    <Button size="xs" color="purple" onClick={addDesignPackage} className="font-bold">
                      <HiPlus className="w-3.5 h-3.5 mr-1" /> Add Package
                    </Button>
                  </div>
                </div>

                {designPackages.length === 0 ? (
                  <div className="p-8 text-center bg-gray-50 border-2 border-dashed rounded-2xl space-y-2">
                    <p className="text-xs text-gray-500 font-semibold">No design packages created for this product yet.</p>
                    <p className="text-[11px] text-gray-400">Click a preset button above to instantly load standard industry design tiers.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {designPackages.map((pkg, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border-2 transition space-y-3 ${pkg.isActive ? 'border-purple-200 bg-purple-50/20' : 'border-gray-200 bg-gray-50 opacity-60'}`}
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-black flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <div className="font-extrabold text-sm text-gray-900">
                              {pkg.packageName || `Package #${idx + 1}`}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="bg-purple-100 text-purple-800 text-[11px] font-bold px-2 py-0.5 rounded-md">
                                1-Side: ₹{pkg.designCharge || 0}
                              </span>
                              <span className="bg-indigo-100 text-indigo-800 text-[11px] font-bold px-2 py-0.5 rounded-md">
                                2-Side: ₹{pkg.doubleSideDesignCharge != null && pkg.doubleSideDesignCharge !== '' ? pkg.doubleSideDesignCharge : ((pkg.designCharge || 200) * 2)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <label className="inline-flex items-center cursor-pointer text-xs font-medium text-gray-700">
                              <input
                                type="checkbox"
                                checked={pkg.isActive !== false}
                                onChange={(e) => updateDesignPackage(idx, 'isActive', e.target.checked)}
                                className="mr-1.5 rounded text-purple-600 focus:ring-purple-500"
                              />
                              Active on Storefront
                            </label>

                            <button
                              type="button"
                              onClick={() => removeDesignPackage(idx)}
                              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                              title="Delete package"
                            >
                              <HiTrash className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          <div>
                            <Label value="Package Name *" />
                            <TextInput
                              value={pkg.packageName}
                              onChange={(e) => updateDesignPackage(idx, 'packageName', e.target.value)}
                              placeholder="e.g. Basic Design"
                              size="sm"
                              required
                            />
                          </div>
                          <div>
                            <Label value="Single-Side Design (₹) *" />
                            <TextInput
                              type="number"
                              value={pkg.designCharge}
                              onChange={(e) => updateDesignPackage(idx, 'designCharge', parseFloat(e.target.value) || 0)}
                              placeholder="200"
                              size="sm"
                              className="font-bold text-purple-700"
                              required
                            />
                          </div>
                          <div>
                            <Label value="Double-Side Design (₹)" />
                            <TextInput
                              type="number"
                              value={pkg.doubleSideDesignCharge != null && pkg.doubleSideDesignCharge !== '' ? pkg.doubleSideDesignCharge : ''}
                              onChange={(e) => updateDesignPackage(idx, 'doubleSideDesignCharge', e.target.value === '' ? null : parseFloat(e.target.value))}
                              placeholder="400"
                              size="sm"
                              className="font-bold text-indigo-700"
                            />
                          </div>
                          <div>
                            <Label value="Estimated Turnaround" />
                            <TextInput
                              value={pkg.estimatedTime}
                              onChange={(e) => updateDesignPackage(idx, 'estimatedTime', e.target.value)}
                              placeholder="e.g. 1 Business Day"
                              size="sm"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <Label value="Initial Concepts" />
                            <TextInput
                              type="number"
                              value={pkg.initialConcepts}
                              onChange={(e) => updateDesignPackage(idx, 'initialConcepts', parseInt(e.target.value, 10) || 1)}
                              placeholder="1"
                              size="sm"
                            />
                          </div>
                          <div>
                            <Label value="Revisions Included" />
                            <TextInput
                              type="number"
                              value={pkg.revisionsIncluded}
                              onChange={(e) => updateDesignPackage(idx, 'revisionsIncluded', parseInt(e.target.value, 10) || 1)}
                              placeholder="1"
                              size="sm"
                            />
                          </div>
                          <div>
                            <Label value="Extra Revision Rate (₹)" />
                            <TextInput
                              type="number"
                              value={pkg.additionalRevisionCharge}
                              onChange={(e) => updateDesignPackage(idx, 'additionalRevisionCharge', parseFloat(e.target.value) || 100)}
                              placeholder="100"
                              size="sm"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label value="Included Services (Comma-separated)" />
                            <TextInput
                              value={pkg.includedServices}
                              onChange={(e) => updateDesignPackage(idx, 'includedServices', e.target.value)}
                              placeholder="1 Concept, Typography, Content Placement, High-Res PDF"
                              size="sm"
                            />
                          </div>
                          <div>
                            <Label value="Excluded Services (Comma-separated)" />
                            <TextInput
                              value={pkg.excludedServices}
                              onChange={(e) => updateDesignPackage(idx, 'excludedServices', e.target.value)}
                              placeholder="Logo Design from Scratch, Complex Vector Art"
                              size="sm"
                            />
                          </div>
                        </div>

                        <div>
                          <Label value="Package Description / Summary" />
                          <TextInput
                            value={pkg.description}
                            onChange={(e) => updateDesignPackage(idx, 'description', e.target.value)}
                            placeholder="Brief description shown to customer on selection card"
                            size="sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 4: DYNAMIC DESIGN BRIEF FORM BUILDER */}
              <div className="bg-white p-5 rounded-2xl border shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                      <HiOutlineClipboardList className="w-4 h-4 text-indigo-600" />
                      Product-Specific Design Brief Form Builder
                    </h3>
                    <p className="text-xs text-gray-500">
                      Build the exact questionnaire shown to customers when requesting design support for this product.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-gray-400">1-Click Presets:</span>
                    <Button size="xs" color="light" onClick={() => loadDesignBriefPreset('VISITING_CARD')}>
                      📇 Visiting Card Brief
                    </Button>
                    <Button size="xs" color="light" onClick={() => loadDesignBriefPreset('BANNER')}>
                      🏷️ Banner Brief
                    </Button>
                    <Button size="xs" color="indigo" onClick={addDesignBriefField} className="font-bold">
                      <HiPlus className="w-3.5 h-3.5 mr-1" /> Add Field
                    </Button>
                  </div>
                </div>

                {designBriefFields.length === 0 ? (
                  <div className="p-8 text-center bg-gray-50 border-2 border-dashed rounded-2xl space-y-2">
                    <p className="text-xs text-gray-500 font-semibold">No design brief questions added yet.</p>
                    <p className="text-[11px] text-gray-400">Click a preset above to load an industry-standard questionnaire instantly.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {designBriefFields.map((f, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition space-y-2.5"
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-bold text-gray-900">
                              {f.fieldLabel || `Field #${idx + 1}`}
                            </span>
                            {f.isRequired && (
                              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                                Required
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <label className="inline-flex items-center cursor-pointer text-xs font-medium text-gray-600">
                              <input
                                type="checkbox"
                                checked={!!f.isRequired}
                                onChange={(e) => updateDesignBriefField(idx, 'isRequired', e.target.checked)}
                                className="mr-1.5 rounded text-indigo-600 focus:ring-indigo-500"
                              />
                              Mandatory
                            </label>

                            <button
                              type="button"
                              onClick={() => removeDesignBriefField(idx)}
                              className="text-red-500 hover:text-red-700 p-1"
                              title="Delete field"
                            >
                              <HiTrash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div>
                            <Label value="Field Label *" />
                            <TextInput
                              value={f.fieldLabel}
                              onChange={(e) => updateDesignBriefField(idx, 'fieldLabel', e.target.value)}
                              placeholder="e.g. Business Name"
                              size="sm"
                            />
                          </div>
                          <div>
                            <Label value="Field Key (Internal)" />
                            <TextInput
                              value={f.fieldKey}
                              onChange={(e) => updateDesignBriefField(idx, 'fieldKey', e.target.value)}
                              placeholder="e.g. business_name"
                              size="sm"
                            />
                          </div>
                          <div>
                            <Label value="Field Type" />
                            <Select
                              value={f.fieldType}
                              onChange={(e) => updateDesignBriefField(idx, 'fieldType', e.target.value)}
                              size="sm"
                            >
                              <option value="SINGLE_LINE_TEXT">Single Line Text</option>
                              <option value="MULTI_LINE_TEXT">Multi-Line Textarea</option>
                              <option value="FILE_UPLOAD">File Upload (Logo / Reference)</option>
                              <option value="PHONE">Phone / WhatsApp Number</option>
                              <option value="EMAIL">Email Address</option>
                              <option value="NUMBER">Number</option>
                              <option value="SELECT">Dropdown Menu</option>
                              <option value="RADIO">Radio Choices</option>
                              <option value="CHECKBOX">Checkbox Multi-Select</option>
                              <option value="DATE">Target Date</option>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <Label value="Placeholder Text" />
                            <TextInput
                              value={f.placeholder}
                              onChange={(e) => updateDesignBriefField(idx, 'placeholder', e.target.value)}
                              placeholder="e.g. Enter your company name as registered..."
                              size="sm"
                            />
                          </div>
                          <div>
                            <Label value="Help Text / Instructions for Customer" />
                            <TextInput
                              value={f.helpText}
                              onChange={(e) => updateDesignBriefField(idx, 'helpText', e.target.value)}
                              placeholder="e.g. This will appear on top in bold font"
                              size="sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 5: DESIGN TERMS & CONDITIONS */}
              <div className="bg-white p-5 rounded-2xl border shadow-xs space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                      <HiOutlineDocumentText className="w-4 h-4 text-gray-700" />
                      Design Support Terms & Conditions
                    </h3>
                    <p className="text-xs text-gray-500">
                      Customer must agree to these terms before submitting a design support order.
                    </p>
                  </div>

                  <Button size="xs" color="light" onClick={resetDesignTerms}>
                    🔄 Reset to Standard Terms
                  </Button>
                </div>

                <Textarea
                  rows={8}
                  value={artworkSetting.designTerms}
                  onChange={(e) => handleArtworkSettingChange('designTerms', e.target.value)}
                  placeholder="Enter markdown or text terms and conditions..."
                  className="font-mono text-xs"
                />
              </div>
            </div>
          </Tabs.Item>

          {/* TAB 9: AUDIT & REASON */}
          <Tabs.Item title="Price History Note">
            <div className="space-y-4 pt-4">
              <Label value="Reason for Price / Catalog Changes (Recorded to System Audit Trail)" />
              <TextInput
                name="priceChangeReason"
                value={formData.priceChangeReason}
                onChange={handleInputChange}
                placeholder="e.g. Updated paper material surcharge based on supplier rates"
              />
            </div>
          </Tabs.Item>
        </Tabs>
      </div>
    </div>
  );
}
