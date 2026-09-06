import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const INDUSTRY_OPTION_MASTERS = [
  // 1. Size / Dimensions
  {
    code: 'size',
    name: 'Size / Dimensions',
    description: 'Finished cut size and dimensions for print items',
    optionType: 'SELECT',
    isAddon: false,
    displayOrder: 1,
    values: [
      { code: 'std_bc_35x2', label: '3.5 × 2 inches (Standard)', displayOrder: 1 },
      { code: 'square_bc_25x25', label: '2.5 × 2.5 inches (Square)', displayOrder: 2 },
      { code: 'slim_bc_35x175', label: '3.5 × 1.75 inches (Slim Profile)', displayOrder: 3 },
      { code: 'sticker_2x2', label: '2 × 2 inches', displayOrder: 4 },
      { code: 'sticker_3x3', label: '3 × 3 inches', displayOrder: 5 },
      { code: 'sticker_4x4', label: '4 × 4 inches', displayOrder: 6 },
      { code: 'banner_4x2ft', label: '4 × 2 ft (8 Sq.ft)', displayOrder: 7 },
      { code: 'banner_6x3ft', label: '6 × 3 ft (18 Sq.ft)', displayOrder: 8 },
      { code: 'banner_8x4ft', label: '8 × 4 ft (32 Sq.ft)', displayOrder: 9 },
      { code: 'banner_10x4ft', label: '10 × 4 ft (40 Sq.ft)', displayOrder: 10 },
      { code: 'custom_sqft', label: 'Custom Dimensions (Per Sq.ft)', displayOrder: 11 },
    ],
  },

  // 2. Paper & Stock Material
  {
    code: 'material',
    name: 'Material & Stock',
    description: 'Base substrate paper stock, vinyl, or flex media',
    optionType: 'SELECT',
    isAddon: false,
    displayOrder: 2,
    values: [
      { code: 'art_card_350', label: '350 GSM Premium Art Card', defaultModifierValue: 0, displayOrder: 1 },
      { code: 'velvet_card_400', label: '400 GSM Royal Velvet Matte Board', defaultModifierValue: 60, displayOrder: 2 },
      { code: 'luxury_sandwich_800', label: '800 GSM Heavyweight Sandwich Board', defaultModifierValue: 250, displayOrder: 3 },
      { code: 'waterproof_synthetic', label: 'Non-Tearable Waterproof Synthetic', defaultModifierValue: 120, displayOrder: 4 },
      { code: 'gloss_vinyl_sticker', label: 'Premium Gloss Vinyl Sticker', defaultModifierValue: 0, displayOrder: 5 },
      { code: 'matte_vinyl_sticker', label: 'Smooth Matte Vinyl Sticker', defaultModifierValue: 0, displayOrder: 6 },
      { code: 'transparent_film', label: 'Ultra-Clear Transparent Film Label', defaultModifierValue: 80, displayOrder: 7 },
      { code: 'kraft_paper', label: 'Vintage Brown Kraft Paper Label', defaultModifierValue: 50, displayOrder: 8 },
      { code: 'flex_std_280', label: 'Standard Frontlit Flex (280 GSM)', defaultModifierValue: 0, displayOrder: 9 },
      { code: 'flex_star_340', label: 'Star Flex High Density (340 GSM)', defaultModifierValue: 150, displayOrder: 10 },
      { code: 'vinyl_banner', label: 'Self-Adhesive Heavy Vinyl Banner', defaultModifierValue: 200, displayOrder: 11 },
      { code: 'canvas_fabric', label: 'Cotton Canvas Exhibition Fabric', defaultModifierValue: 350, displayOrder: 12 },
    ],
  },

  // 3. Print Side
  {
    code: 'printing_side',
    name: 'Print Side',
    description: 'Single side or double side full color printing',
    optionType: 'SELECT',
    isAddon: false,
    displayOrder: 3,
    values: [
      { code: 'single_side', label: 'Single Side (Front Only)', defaultModifierValue: 0, displayOrder: 1 },
      { code: 'double_side', label: 'Double Side (Front & Back)', defaultModifierValue: 100, displayOrder: 2 },
    ],
  },

  // 4. Lamination & Finishing
  {
    code: 'finishing',
    name: 'Finishing & Coating',
    description: 'Surface lamination, texture coatings, and luxury foil finishes',
    optionType: 'SELECT',
    isAddon: false,
    displayOrder: 4,
    values: [
      { code: 'thermal_matte', label: 'Thermal Matte Lamination', defaultModifierValue: 0, displayOrder: 1 },
      { code: 'high_gloss', label: 'High Gloss Lamination', defaultModifierValue: 0, displayOrder: 2 },
      { code: 'raised_spot_uv', label: 'Raised 3D Spot UV Texture', defaultModifierValue: 250, displayOrder: 3 },
      { code: 'gold_foil', label: 'Metallic Gold Foil Stamping', defaultModifierValue: 350, displayOrder: 4 },
      { code: 'silver_foil', label: 'Metallic Silver Foil Stamping', defaultModifierValue: 350, displayOrder: 5 },
      { code: 'waterproof_lamination', label: 'Waterproof Scratch-Resistant Film', defaultModifierValue: 40, displayOrder: 6 },
      { code: 'holographic_sheen', label: 'Holographic Rainbow Sheen', defaultModifierValue: 180, displayOrder: 7 },
      { code: 'none_raw', label: 'No Lamination (Raw Finish)', defaultModifierValue: 0, displayOrder: 8 },
    ],
  },

  // 5. Custom Shape & Die-Cut (for Stickers)
  {
    code: 'custom_shape',
    name: 'Custom Shape & Cut',
    description: 'Cut profile: standard straight cut, circular, or custom die-cut contour',
    optionType: 'SELECT',
    isAddon: false,
    displayOrder: 5,
    values: [
      { code: 'square_cut', label: 'Standard Square / Rectangle Cut', defaultModifierValue: 0, displayOrder: 1 },
      { code: 'circle_round', label: 'Circular Round Cut', defaultModifierValue: 50, displayOrder: 2 },
      { code: 'contour_diecut', label: 'Custom Contour Die-Cut (Kiss Cut)', defaultModifierValue: 120, displayOrder: 3 },
      { code: 'oval_cut', label: 'Oval Shape Profile', defaultModifierValue: 60, displayOrder: 4 },
    ],
  },

  // 6. Printing Method (for Banners & Signages)
  {
    code: 'printing_method',
    name: 'Printing Method',
    description: 'Print resolution technology and ink system',
    optionType: 'SELECT',
    isAddon: false,
    displayOrder: 6,
    values: [
      { code: 'eco_solvent_hd', label: 'Eco-Solvent HD Print (1440 DPI)', defaultModifierValue: 0, displayOrder: 1 },
      { code: 'uv_weatherproof', label: 'UV Direct Weatherproof Print (Long Life)', defaultModifierValue: 150, displayOrder: 2 },
      { code: 'digital_offset', label: 'Commercial Offset 4-Color High Speed', defaultModifierValue: 0, displayOrder: 3 },
    ],
  },

  // 7. Banner Finishing & Mounts
  {
    code: 'banner_finishing',
    name: 'Banner Mounts & Edge Finishing',
    description: 'Eyelets, reinforced borders, pole pockets, and hardware',
    optionType: 'SELECT',
    isAddon: false,
    displayOrder: 7,
    values: [
      { code: 'eyelets_all_corners', label: 'Brass Eyelets on All Corners', defaultModifierValue: 50, displayOrder: 1 },
      { code: 'hemmed_edges', label: 'Reinforced Hemmed Edge Seam', defaultModifierValue: 40, displayOrder: 2 },
      { code: 'pole_pockets', label: 'Top & Bottom Pole Pockets (for pipes)', defaultModifierValue: 80, displayOrder: 3 },
      { code: 'standee_hardware', label: 'Aluminum Roll-Up Standee Cassette', defaultModifierValue: 650, displayOrder: 4 },
      { code: 'none_mounts', label: 'Cut to Size Only (No Hardware)', defaultModifierValue: 0, displayOrder: 5 },
    ],
  },

  // 8. Add-ons & Die-Cuts (Addon Modifiers)
  {
    code: 'card_addons',
    name: 'Card Add-ons & Corners',
    description: 'Optional aesthetic upgrades for business cards',
    optionType: 'CHECKBOX',
    isAddon: true,
    displayOrder: 8,
    values: [
      { code: 'round_corner_6mm', label: '6mm Rounded Corners Die-Cut', defaultModifierType: 'FLAT', defaultModifierValue: 150, displayOrder: 1 },
      { code: 'die_cut_custom_edge', label: 'Custom Die-Cut Profile Edge', defaultModifierType: 'FLAT', defaultModifierValue: 300, displayOrder: 2 },
      { code: 'embossed_texture', label: 'Blind Embossed Logo Raised Effect', defaultModifierType: 'FLAT', defaultModifierValue: 400, displayOrder: 3 },
    ],
  },
];

export async function seedComprehensiveOptionMasters() {
  console.log('⚡ Seeding / Verifying Comprehensive Industry Option Masters in PostgreSQL...');
  let totalMasters = 0;
  let totalValues = 0;

  for (const m of INDUSTRY_OPTION_MASTERS) {
    const master = await prisma.optionMaster.upsert({
      where: { code: m.code },
      create: {
        code: m.code,
        name: m.name,
        description: m.description,
        optionType: m.optionType,
        isAddon: m.isAddon,
        displayOrder: m.displayOrder,
        isActive: true,
      },
      update: {
        name: m.name,
        description: m.description,
        optionType: m.optionType,
        isAddon: m.isAddon,
        displayOrder: m.displayOrder,
        isActive: true,
      },
    });
    totalMasters++;

    for (const v of m.values) {
      await prisma.optionMasterValue.upsert({
        where: {
          masterId_code: {
            masterId: master.id,
            code: v.code,
          },
        },
        create: {
          masterId: master.id,
          code: v.code,
          label: v.label,
          defaultModifierType: v.defaultModifierType || 'FLAT',
          defaultModifierValue: v.defaultModifierValue || 0,
          displayOrder: v.displayOrder,
          isActive: true,
        },
        update: {
          label: v.label,
          defaultModifierType: v.defaultModifierType || 'FLAT',
          defaultModifierValue: v.defaultModifierValue || 0,
          displayOrder: v.displayOrder,
          isActive: true,
        },
      });
      totalValues++;
    }
  }

  console.log(`✔ Successfully ensured ${totalMasters} Option Masters and ${totalValues} Master Values in database.`);
  return { totalMasters, totalValues };
}

// If invoked directly from terminal
if (process.argv[1]?.endsWith('seedComprehensiveOptionMasters.js')) {
  seedComprehensiveOptionMasters()
    .catch((err) => {
      console.error('Error seeding option masters:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
