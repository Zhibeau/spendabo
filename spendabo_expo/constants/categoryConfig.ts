// Maps category IDs (from service layer) and category names (from UI design) to icon config.
// Icon names are Feather icons (from @expo/vector-icons).

export interface CategoryConfig {
  icon: string;
  bg: string;
  iconColor: string;
}

// Keyed by category ID (matches service layer CATEGORIES)
export const CATEGORY_CONFIG_BY_ID: Record<string, CategoryConfig> = {
  groceries:     { icon: 'shopping-cart', bg: '#FDF0D5', iconColor: '#2F3E46' },
  dining:        { icon: 'coffee',        bg: '#F4C2C2', iconColor: '#2F3E46' },
  transport:     { icon: 'navigation',    bg: '#FDF0D5', iconColor: '#2F3E46' },
  shopping:      { icon: 'shopping-bag',  bg: '#F4C2C2', iconColor: '#2F3E46' },
  entertainment: { icon: 'music',         bg: '#C1D3FE', iconColor: '#2F3E46' },
  utilities:     { icon: 'zap',           bg: '#C1D3FE', iconColor: '#2F3E46' },
  health:        { icon: 'heart',         bg: '#F4C2C2', iconColor: '#2F3E46' },
  coffee:        { icon: 'coffee',        bg: '#F4C2C2', iconColor: '#2F3E46' },
  income:        { icon: 'trending-up',   bg: '#E8F0E9', iconColor: '#84A98C' },
  uncategorized: { icon: 'help-circle',   bg: '#E8E8E5', iconColor: '#8A9A9D' },
};

// Keyed by display name (used in Budgets screen which uses the UI design's data)
export const CATEGORY_CONFIG_BY_NAME: Record<string, CategoryConfig> = {
  Dining:        { icon: 'coffee',        bg: '#F4C2C2', iconColor: '#2F3E46' },
  Groceries:     { icon: 'shopping-cart', bg: '#FDF0D5', iconColor: '#2F3E46' },
  Bills:         { icon: 'home',          bg: '#C1D3FE', iconColor: '#2F3E46' },
  Transport:     { icon: 'navigation',    bg: '#FDF0D5', iconColor: '#2F3E46' },
  Shopping:      { icon: 'shopping-bag',  bg: '#F4C2C2', iconColor: '#2F3E46' },
  Entertainment: { icon: 'music',         bg: '#C1D3FE', iconColor: '#2F3E46' },
  Health:        { icon: 'heart',         bg: '#F4C2C2', iconColor: '#2F3E46' },
  Other:         { icon: 'zap',           bg: '#E8E8E5', iconColor: '#2F3E46' },
};

export function getCategoryConfigById(id: string | null): CategoryConfig {
  if (!id) return CATEGORY_CONFIG_BY_ID.uncategorized;
  return CATEGORY_CONFIG_BY_ID[id] ?? CATEGORY_CONFIG_BY_ID.uncategorized;
}

export function getCategoryConfigByName(name: string): CategoryConfig {
  return CATEGORY_CONFIG_BY_NAME[name] ?? CATEGORY_CONFIG_BY_NAME.Other;
}
