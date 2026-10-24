/** Curated aisle catalog for one-tap shopping adds. */

export type ShoppingAisleId =
  | 'dairy'
  | 'bakery'
  | 'produce'
  | 'protein'
  | 'drinks'
  | 'pantry'
  | 'frozen'
  | 'home'

export type ShoppingSeed = {
  key: string
  aisle: ShoppingAisleId
  /** Default amount when quick-adding; null = no qty. */
  amount?: number | null
  unit?: 'pcs' | 'kg' | 'g' | 'l' | 'ml' | null
}

export const SHOPPING_AISLES: ShoppingAisleId[] = [
  'dairy',
  'bakery',
  'produce',
  'protein',
  'drinks',
  'pantry',
  'frozen',
  'home',
]

export const SHOPPING_SEEDS: ShoppingSeed[] = [
  { key: 'milk', aisle: 'dairy', amount: 1, unit: 'l' },
  { key: 'yogurt', aisle: 'dairy', amount: 1, unit: 'pcs' },
  { key: 'cheese', aisle: 'dairy', amount: 1, unit: 'pcs' },
  { key: 'butter', aisle: 'dairy', amount: 1, unit: 'pcs' },
  { key: 'cream', aisle: 'dairy', amount: 1, unit: 'pcs' },

  { key: 'bread', aisle: 'bakery', amount: 1, unit: 'pcs' },
  { key: 'buns', aisle: 'bakery', amount: 1, unit: 'pcs' },
  { key: 'tortilla', aisle: 'bakery', amount: 1, unit: 'pcs' },
  { key: 'croissant', aisle: 'bakery', amount: 2, unit: 'pcs' },

  { key: 'bananas', aisle: 'produce', amount: 1, unit: 'kg' },
  { key: 'apples', aisle: 'produce', amount: 1, unit: 'kg' },
  { key: 'tomatoes', aisle: 'produce', amount: 0.5, unit: 'kg' },
  { key: 'cucumbers', aisle: 'produce', amount: 2, unit: 'pcs' },
  { key: 'greens', aisle: 'produce', amount: 1, unit: 'pcs' },
  { key: 'onions', aisle: 'produce', amount: 1, unit: 'kg' },
  { key: 'potatoes', aisle: 'produce', amount: 2, unit: 'kg' },
  { key: 'lemons', aisle: 'produce', amount: 2, unit: 'pcs' },

  { key: 'eggs', aisle: 'protein', amount: 10, unit: 'pcs' },
  { key: 'chicken', aisle: 'protein', amount: 1, unit: 'kg' },
  { key: 'fish', aisle: 'protein', amount: 0.5, unit: 'kg' },
  { key: 'meat', aisle: 'protein', amount: 0.5, unit: 'kg' },
  { key: 'tofu', aisle: 'protein', amount: 1, unit: 'pcs' },

  { key: 'coffee', aisle: 'drinks', amount: 1, unit: 'pcs' },
  { key: 'tea', aisle: 'drinks', amount: 1, unit: 'pcs' },
  { key: 'water', aisle: 'drinks', amount: 6, unit: 'pcs' },
  { key: 'juice', aisle: 'drinks', amount: 1, unit: 'l' },
  { key: 'soda', aisle: 'drinks', amount: 1, unit: 'l' },

  { key: 'pasta', aisle: 'pantry', amount: 1, unit: 'pcs' },
  { key: 'rice', aisle: 'pantry', amount: 1, unit: 'kg' },
  { key: 'oil', aisle: 'pantry', amount: 1, unit: 'l' },
  { key: 'sugar', aisle: 'pantry', amount: 1, unit: 'kg' },
  { key: 'salt', aisle: 'pantry', amount: 1, unit: 'pcs' },
  { key: 'flour', aisle: 'pantry', amount: 1, unit: 'kg' },
  { key: 'cereal', aisle: 'pantry', amount: 1, unit: 'pcs' },
  { key: 'sauce', aisle: 'pantry', amount: 1, unit: 'pcs' },

  { key: 'iceCream', aisle: 'frozen', amount: 1, unit: 'pcs' },
  { key: 'frozenVeg', aisle: 'frozen', amount: 1, unit: 'pcs' },
  { key: 'pizza', aisle: 'frozen', amount: 1, unit: 'pcs' },
  { key: 'dumplings', aisle: 'frozen', amount: 1, unit: 'pcs' },

  { key: 'soap', aisle: 'home', amount: 1, unit: 'pcs' },
  { key: 'paper', aisle: 'home', amount: 1, unit: 'pcs' },
  { key: 'detergent', aisle: 'home', amount: 1, unit: 'pcs' },
  { key: 'trashBags', aisle: 'home', amount: 1, unit: 'pcs' },
  { key: 'sponges', aisle: 'home', amount: 1, unit: 'pcs' },
]

export function aisleLabelKey(id: ShoppingAisleId) {
  return `shopping.aisle.${id}` as const
}

export function seedLabelKey(key: string) {
  return `shopping.seed.${key}` as const
}
