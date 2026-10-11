export interface StubbleMarketTier {
  id: string
  name: string
  shortName: string
  minPrice: number
  maxPrice: number
  benchmarkPrice: number
  priceUnit: string
  sourceForm: string
  icon: string
  description: string
  suitableIndustries: string[]
  recommendedGrade: string
}

export const STUBBLE_MARKET_TIERS: Record<string, StubbleMarketTier> = {
  farm_gate_loose: {
    id: 'farm_gate_loose',
    name: 'Direct Farm-Gate Loose Straw',
    shortName: 'Farm-Gate Loose',
    minPrice: 500,
    maxPrice: 700,
    benchmarkPrice: 600,
    priceUnit: '₹500 to ₹700 / tonne (₹170–₹300 / quintal)',
    sourceForm: 'Loose in-field straw, direct field margins collection',
    icon: '🚜',
    description: 'Sold directly at field gate to nearby biomass plants, bio-CNG plants, or local buyers.',
    suitableIndustries: ['biomass_plant', 'cbg_biogas', 'local_buyer'],
    recommendedGrade: 'grade_b',
  },
  brick_kiln: {
    id: 'brick_kiln',
    name: 'Brick Kilns and Local Industrial Use',
    shortName: 'Brick Kilns & Furnaces',
    minPrice: 600,
    maxPrice: 1400,
    benchmarkPrice: 1000,
    priceUnit: '₹600 to ₹1,400 / tonne',
    sourceForm: 'Loose bundles or rough baled stubble',
    icon: '🧱',
    description: 'Coal replacement fuel in local brick kilns and low-pressure industrial boilers.',
    suitableIndustries: ['brick_kiln', 'industrial_furnace'],
    recommendedGrade: 'grade_b',
  },
  delivered_bales: {
    id: 'delivered_bales',
    name: 'Delivered Bales (Short Distance 15–50 km)',
    shortName: 'Delivered Bales',
    minPrice: 1330,
    maxPrice: 3000,
    benchmarkPrice: 1850,
    priceUnit: '₹1,330 to ₹3,000 / tonne',
    sourceForm: 'Mechanized square / round bales (cutting, baling, storage & transport included)',
    icon: '📦',
    description: 'Mechanized baling for paper mills, packaging manufacturing, and regional biomass depots.',
    suitableIndustries: ['paper_mill', 'packaging', 'biomass_depot'],
    recommendedGrade: 'grade_a_sms',
  },
  processed_pellets: {
    id: 'processed_pellets',
    name: 'Processed Stubble Pellets & Briquettes',
    shortName: 'NTPC Pellets & Briquettes',
    minPrice: 4320,
    maxPrice: 5500,
    benchmarkPrice: 4800,
    priceUnit: '₹4,320 to ₹5,500+ / tonne',
    sourceForm: 'High-density pelletized / briquetted fuel cylinders',
    icon: '⚡',
    description: 'High-calorific industrial fuel meeting NTPC government thermal power co-firing tenders.',
    suitableIndustries: ['thermal_power', 'ntpc_tender', 'cement_plant'],
    recommendedGrade: 'grade_a_sms',
  },
  commercial_feed_grade: {
    id: 'commercial_feed_grade',
    name: 'Commercial / Cattle Feed-Grade Bales',
    shortName: 'Cattle Feed Grade Bales',
    minPrice: 4800,
    maxPrice: 8500,
    benchmarkPrice: 6200,
    priceUnit: '₹4,800 to ₹8,500 / tonne (₹2 to ₹28 / kg)',
    sourceForm: 'Tightly packaged, golden clean, dust-free bales via industrial platforms',
    icon: '🐄',
    description: 'Premium animal fodder for commercial dairy farms, gaushalas, and mushroom cultivation.',
    suitableIndustries: ['cattle_feed', 'dairy_farm', 'mushroom_cultivation'],
    recommendedGrade: 'grade_a_plus',
  },
}

export const QUALITY_GRADES = [
  {
    id: 'grade_a_plus',
    name: 'Grade A+ Premium Golden (Feed Quality)',
    shortLabel: 'Grade A+ Premium',
    moisture: '< 12% moisture',
    description: 'Bright golden, clean, zero mold, weed-free, dirt & stone free. Best for commercial cattle feed and mushroom growing.',
    typicalRange: '₹4,800 – ₹8,500/t',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  {
    id: 'grade_a_sms',
    name: 'Grade A Standard (Combine SMS Chopped)',
    shortLabel: 'Grade A (SMS Chopped)',
    moisture: '12% – 15% moisture',
    description: 'Uniformly chopped by combine Straw Management System. Ideal for high-density baling, paper mills, and pellets.',
    typicalRange: '₹1,330 – ₹3,000/t',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  {
    id: 'grade_b',
    name: 'Grade B Industrial (Loose Field Straw)',
    shortLabel: 'Grade B Industrial',
    moisture: '15% – 20% moisture',
    description: 'Clean paddy straw, loose field collection. Perfect for power plant biomass boilers, brick kilns, and local furnaces.',
    typicalRange: '₹600 – ₹1,400/t',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  {
    id: 'grade_c',
    name: 'Grade C Basic / High Moisture',
    shortLabel: 'Grade C Basic',
    moisture: '> 20% moisture',
    description: 'Rain-dampened or unraked rough stubble. Best for bio-CNG anaerobic digesters, mulching, and composting.',
    typicalRange: '₹500 – ₹700/t',
    badgeClass: 'bg-stone-100 text-stone-700 border-stone-300',
  },
]

export const INTENDED_PURPOSES = [
  {
    id: 'cattle_feed',
    name: 'Cattle Feed & Dairy Farming',
    marketTierId: 'commercial_feed_grade',
    priceGuide: '₹4,800 – ₹8,500/t (₹2–₹28/kg)',
    benchmark: 6200,
    icon: '🐄',
    compatibleBuyers: ['dairy_farm', 'livestock', 'commercial'],
  },
  {
    id: 'thermal_power',
    name: 'Power Plants & NTPC Biomass Co-firing',
    marketTierId: 'processed_pellets',
    priceGuide: '₹4,320 – ₹5,500+/t',
    benchmark: 4800,
    icon: '⚡',
    compatibleBuyers: ['biomass', 'thermal_power', 'cement_plant'],
  },
  {
    id: 'paper_packaging',
    name: 'Paper Mills & Cardboard Packaging',
    marketTierId: 'delivered_bales',
    priceGuide: '₹1,330 – ₹3,000/t (Delivered Bales)',
    benchmark: 1850,
    icon: '📦',
    compatibleBuyers: ['mill', 'packaging'],
  },
  {
    id: 'brick_kiln',
    name: 'Brick Kilns & Industrial Furnaces',
    marketTierId: 'brick_kiln',
    priceGuide: '₹600 – ₹1,400/t',
    benchmark: 1000,
    icon: '🧱',
    compatibleBuyers: ['kiln', 'industrial_furnace'],
  },
  {
    id: 'biomass_plant',
    name: 'Direct Farm-Gate Biomass Plants & Bio-CNG',
    marketTierId: 'farm_gate_loose',
    priceGuide: '₹500 – ₹700/t (Farm-Gate Pickup)',
    benchmark: 600,
    icon: '🚜',
    compatibleBuyers: ['biomass', 'cbg', 'local_buyer'],
  },
]

export function getEstimatedBenchmarkPrice(
  stubbleForm: string,
  qualityGrade: string,
  purposes: string[]
): number {
  if (stubbleForm === 'processed_pellets') {
    return 4800
  }
  if (stubbleForm === 'farm_gate_loose' || qualityGrade === 'grade_b' || qualityGrade === 'grade_c') {
    if (purposes.includes('brick_kiln')) return 800
    return 600
  }
  if (stubbleForm === 'brick_kiln') {
    return 1000
  }
  if (qualityGrade === 'grade_a_plus' || purposes.includes('cattle_feed')) {
    return 2200
  }
  // Standard delivered bales
  return 1850
}
