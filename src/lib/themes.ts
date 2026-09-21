export type ThemeId = 'midnight' | 'ocean' | 'forest' | 'sunset' | 'light';

export interface ThemePreset {
  id: ThemeId;
  name: string;
  description: string;
  swatches: [string, string, string];
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: 'midnight', name: 'Midnight', description: 'Grafite e ciano', swatches: ['#0f172a', '#1e293b', '#06b6d4'] },
  { id: 'ocean', name: 'Ocean', description: 'Azul profundo', swatches: ['#04111f', '#082b49', '#38bdf8'] },
  { id: 'forest', name: 'Forest', description: 'Verde escuro', swatches: ['#061814', '#0a2b23', '#34d399'] },
  { id: 'sunset', name: 'Sunset', description: 'Quente e vibrante', swatches: ['#211014', '#3b1d22', '#fb923c'] },
  { id: 'light', name: 'Light', description: 'Claro e limpo', swatches: ['#f8fafc', '#ffffff', '#0891b2'] },
];

export function nextTheme(theme: ThemeId): ThemeId {
  const index = THEME_PRESETS.findIndex((preset) => preset.id === theme);
  return THEME_PRESETS[(index + 1) % THEME_PRESETS.length].id;
}
