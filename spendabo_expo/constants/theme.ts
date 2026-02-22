// Spendabo design tokens – sage green palette
export const Colors = {
  background: '#FAFAF7',
  text: '#2F3E46',
  textMuted: '#8A9A9D',
  primary: '#84A98C',
  primaryForeground: '#FFFFFF',
  card: '#FFFFFF',
  accent: '#E8F0E9',
  inputBg: '#F2F2EF',
  border: 'rgba(0, 0, 0, 0.06)',
  softPeach: '#F4C2C2',
  paleYellow: '#FDF0D5',
  mistyBlue: '#C1D3FE',
  mutedGray: '#E8E8E5',
  destructive: '#E07A5F',
  warning: '#F4A261',
  // Tab bar
  tabActive: '#84A98C',
  tabInactive: '#A8A29E',
};

export const cardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.03,
  shadowRadius: 20,
  elevation: 2,
} as const;

export const primaryShadow = {
  shadowColor: '#84A98C',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.35,
  shadowRadius: 24,
  elevation: 8,
} as const;
