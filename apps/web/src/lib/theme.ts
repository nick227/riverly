import { useEffect, useState, useSyncExternalStore } from 'react'

export type ColorThemeId =
  | 'light'
  | 'dark'
  | 'slate'
  | 'sand'
  | 'forest'
  | 'material'
  | 'apple'
  | 'openai'
  | 'discord'
  | 'monokai'
  | 'brutalist'
  | 'hyper-modernism'
  | 'bauhaus'
  | 'dream-world'
  | 'editorial-magazine'
  | 'retro-terminal'
  | 'zen-minimalism'
  | 'nightmare-horror'
  | 'fjord'
  | 'workshop'
  | 'periwinkle'
  | 'wayfinder'
  | 'acid-opera'
  | 'cobalt-cabaret'
  | 'bubblegum-riot'
  | 'obsidian-gilt'

export type FontId = 'sans' | 'serif' | 'mono'
export type DensityId = 'compact' | 'comfortable' | 'spacious'
export type RadiusId = 'default' | 'sharp' | 'soft'

export interface ThemePreferences {
  theme: ColorThemeId
  font: FontId
  density: DensityId
  radius: RadiusId
  basePrefabId?: string
}

export interface ColorThemeMeta {
  id: ColorThemeId
  label: string
  scheme: 'light' | 'dark'
  description: string
  swatch: {
    bg: string
    surface: string
    border: string
    accent: string
    text: string
  }
}

export interface FontMeta {
  id: FontId
  label: string
  description: string
  previewText: string
}

export interface DensityMeta {
  id: DensityId
  label: string
  description: string
}

export interface RadiusMeta {
  id: RadiusId
  label: string
  description: string
}

export const COLOR_THEMES: ColorThemeMeta[] = [
  {
    id: 'light',
    label: 'Light',
    scheme: 'light',
    description: 'Crisp white canvas with signature river teal and slate accents',
    swatch: { bg: '#ffffff', surface: '#f7f7f7', border: '#e5e5e5', accent: '#1f6f7a', text: '#171717' },
  },
  {
    id: 'dark',
    label: 'Dark',
    scheme: 'dark',
    description: 'Deep obsidian surface with radiant cyan glow and high contrast',
    swatch: { bg: '#0f0f0f', surface: '#1c1c1c', border: '#3a3a3a', accent: '#6cc3cc', text: '#f2f2f2' },
  },
  {
    id: 'slate',
    label: 'Nordic Slate',
    scheme: 'dark',
    description: 'Calm cool blue-gray foundation with ice blue highlights',
    swatch: { bg: '#0d1117', surface: '#161b22', border: '#30363d', accent: '#58a6ff', text: '#f0f6fc' },
  },
  {
    id: 'sand',
    label: 'Warm Sand',
    scheme: 'light',
    description: 'Tactile architectural linen with rich terracotta and umber accents',
    swatch: { bg: '#fcfaf7', surface: '#f5f0e8', border: '#e6dfd3', accent: '#b85a3c', text: '#28241e' },
  },
  {
    id: 'forest',
    label: 'Alpine Pine',
    scheme: 'dark',
    description: 'Deep evergreen shadows with radiant emerald and warm brass',
    swatch: { bg: '#0b1410', surface: '#192721', border: '#23372f', accent: '#34d399', text: '#edf4f0' },
  },
  {
    id: 'material',
    label: 'Material',
    scheme: 'light',
    description: 'Tonal lilac surfaces, capsule actions, and measured elevation',
    swatch: { bg: '#fdf8fd', surface: '#f7f2fa', border: '#e7e0ec', accent: '#6750a4', text: '#1d192b' },
  },
  {
    id: 'apple',
    label: 'Apple',
    scheme: 'light',
    description: 'Cool porcelain, system typography, inset fields, and soft precision',
    swatch: { bg: '#f5f5f7', surface: '#ffffff', border: '#d2d2d7', accent: '#0071e3', text: '#1d1d1f' },
  },
  {
    id: 'openai',
    label: 'OpenAI',
    scheme: 'light',
    description: 'Warm neutral work surfaces, quiet borders, and clear rounded controls',
    swatch: { bg: '#f9f9f9', surface: '#ffffff', border: '#e5e5e5', accent: '#10a37f', text: '#0d0d0d' },
  },
  {
    id: 'discord',
    label: 'Discord',
    scheme: 'dark',
    description: 'Layered slate channels with blurple actions and friendly rounded edges',
    swatch: { bg: '#1e1f22', surface: '#2b2d31', border: '#3f4147', accent: '#5865f2', text: '#f2f3f5' },
  },
  {
    id: 'monokai',
    label: 'Monokai',
    scheme: 'dark',
    description: 'Editor charcoal, pink signals, lime actions, and cyan focus rings',
    swatch: { bg: '#1e1f1c', surface: '#272822', border: '#49483e', accent: '#a6e22e', text: '#f8f8f2' },
  },
  {
    id: 'brutalist',
    label: 'Brutalist',
    scheme: 'light',
    description: 'Ink on concrete, construction-yellow controls, and unapologetic hard shadows',
    swatch: { bg: '#e5e5e5', surface: '#ffffff', border: '#000000', accent: '#eab308', text: '#000000' },
  },
  {
    id: 'hyper-modernism',
    label: 'Hyper-modernism',
    scheme: 'dark',
    description: 'Midnight indigo, electric cyan edges, and wide, crisply spaced surfaces',
    swatch: { bg: '#090a16', surface: '#101328', border: '#232a56', accent: '#00f0ff', text: '#f0f4ff' },
  },
  {
    id: 'bauhaus',
    label: 'Bauhaus',
    scheme: 'light',
    description: 'Architectural ivory, primary red actions, cobalt focus, and geometric circles',
    swatch: { bg: '#f9f6f0', surface: '#ffffff', border: '#1a1a1a', accent: '#dc2626', text: '#1a1a1a' },
  },
  {
    id: 'dream-world',
    label: 'Dream World',
    scheme: 'light',
    description: 'Cloud-lilac surfaces, berry text, pill controls, and soft lavender shadows',
    swatch: { bg: '#f8f2fb', surface: '#ffffff', border: '#decce8', accent: '#b04289', text: '#3c1233' },
  },
  {
    id: 'editorial-magazine',
    label: 'Editorial Magazine',
    scheme: 'light',
    description: 'Porcelain paper, oxblood rules, book typography, and deliberate editorial spacing',
    swatch: { bg: '#fdfbf7', surface: '#ffffff', border: '#801828', accent: '#801828', text: '#1c1917' },
  },
  {
    id: 'retro-terminal',
    label: 'Retro-terminal',
    scheme: 'dark',
    description: 'Phosphor green on deep evergreen, monospace utility, and square cursor controls',
    swatch: { bg: '#09120b', surface: '#0e1e12', border: '#1e3e26', accent: '#22c55e', text: '#86efac' },
  },
  {
    id: 'zen-minimalism',
    label: 'Zen Minimalism',
    scheme: 'light',
    description: 'Rice-paper surfaces, inkstone type, moss accents, and spacious quiet rhythm',
    swatch: { bg: '#fbf9f4', surface: '#ffffff', border: '#ded8c8', accent: '#557245', text: '#24221f' },
  },
  {
    id: 'nightmare-horror',
    label: 'Nightmare Horror',
    scheme: 'dark',
    description: 'Bruised burgundy, bone-white serif type, and blood-red accents without flicker',
    swatch: { bg: '#140509', surface: '#220b12', border: '#4a1524', accent: '#dc2626', text: '#faf5f0' },
  },
  {
    id: 'fjord',
    label: 'Fjord',
    scheme: 'dark',
    description: 'Cool slate layers, glacier-blue actions, and precise humanist typography',
    swatch: { bg: '#0b131a', surface: '#13202b', border: '#263e52', accent: '#38bdf8', text: '#f0f7fb' },
  },
  {
    id: 'workshop',
    label: 'Workshop',
    scheme: 'dark',
    description: 'Warm charcoal, brass actions, sturdy outlines, and practical workshop rhythm',
    swatch: { bg: '#1c1a17', surface: '#292521', border: '#4f473e', accent: '#d97706', text: '#f5f2eb' },
  },
  {
    id: 'periwinkle',
    label: 'Periwinkle',
    scheme: 'light',
    description: 'Lavender-gray surfaces, plum typography, and rounded violet actions',
    swatch: { bg: '#f5f4f9', surface: '#ffffff', border: '#d4d0e6', accent: '#7c3aed', text: '#2e1065' },
  },
  {
    id: 'wayfinder',
    label: 'Wayfinder',
    scheme: 'light',
    description: 'Bright white, decisive navy rules, and clear blue actions with generous targets',
    swatch: { bg: '#ffffff', surface: '#f8fafc', border: '#1e3a8a', accent: '#2563eb', text: '#0f172a' },
  },
  {
    id: 'acid-opera',
    label: 'Acid Opera',
    scheme: 'dark',
    description: 'Aubergine velvet, chartreuse spotlights, theatrical serif type, and sweeping curves',
    swatch: { bg: '#15091a', surface: '#22102a', border: '#4d235e', accent: '#bef264', text: '#faf5ff' },
  },
  {
    id: 'cobalt-cabaret',
    label: 'Cobalt Cabaret',
    scheme: 'dark',
    description: 'An electric-blue stage, butter-yellow lettering, coral actions, and stepped poster shadows',
    swatch: { bg: '#071536', surface: '#0e2454', border: '#1e4594', accent: '#f43f5e', text: '#fef08a' },
  },
  {
    id: 'bubblegum-riot',
    label: 'Bubblegum Riot',
    scheme: 'light',
    description: 'Hot-pink paper, black ink, lemon actions, oversized block type, and cutout geometry',
    swatch: { bg: '#fdf2f8', surface: '#ffffff', border: '#111827', accent: '#eab308', text: '#111827' },
  },
  {
    id: 'obsidian-gilt',
    label: 'Obsidian Gilt',
    scheme: 'dark',
    description: 'Petrol-black lacquer, champagne gold, engraved rules, and architectural serif forms',
    swatch: { bg: '#06090d', surface: '#10161d', border: '#2b3542', accent: '#d4af37', text: '#f4efe6' },
  },
]

export const FONT_PRESETS: FontMeta[] = [
  {
    id: 'sans',
    label: 'Modern Sans',
    description: 'Clean, legible UI sans-serif tailored for dashboard speed',
    previewText: 'Aa Bb Gg 123',
  },
  {
    id: 'serif',
    label: 'Editorial Serif',
    description: 'Distinguished Charter editorial style for contracts & proposals',
    previewText: 'Aa Bb Gg 123',
  },
  {
    id: 'mono',
    label: 'Craft Mono',
    description: 'Technical monospace precision for estimators and field audits',
    previewText: 'Aa Bb Gg 123',
  },
]

export const DENSITY_PRESETS: DensityMeta[] = [
  {
    id: 'compact',
    label: 'Compact',
    description: 'Tighter spacing and denser tables for maximum data visibility',
  },
  {
    id: 'comfortable',
    label: 'Comfortable',
    description: 'Balanced default spacing for optimal everyday readability',
  },
  {
    id: 'spacious',
    label: 'Spacious',
    description: 'Relaxed proportions with generous breathing room for presentations',
  },
]

export const RADIUS_PRESETS: RadiusMeta[] = [
  {
    id: 'sharp',
    label: 'Sharp',
    description: 'Crisp industrial architectural corners (2px - 6px)',
  },
  {
    id: 'default',
    label: 'Balanced',
    description: 'Modern rounded corners (6px - 14px)',
  },
  {
    id: 'soft',
    label: 'Soft',
    description: 'Pill-like, friendly rounded geometry (10px - 20px)',
  },
]

export interface PrefabTheme {
  id: string
  label: string
  name: string
  group: 'Design systems' | 'Expressive' | 'Density' | 'Community inspired' | 'Art house' | 'Defaults'
  category: string
  description: string
  preferences: {
    theme: ColorThemeId
    font: FontId
    density: DensityId
    radius: RadiusId
  }
}

export const PREFAB_THEMES: PrefabTheme[] = [
  // Riverly Defaults
  {
    id: 'river-classic',
    label: 'Default',
    name: 'Default',
    group: 'Defaults',
    category: 'Defaults',
    description: 'Signature clean architectural light theme with teal accents and balanced spacing.',
    preferences: { theme: 'light', font: 'sans', density: 'comfortable', radius: 'default' },
  },
  {
    id: 'river-dark',
    label: 'Default Dark',
    name: 'Default Dark',
    group: 'Defaults',
    category: 'Defaults',
    description: 'Deep obsidian workspace with high-contrast cyan glow for focused work.',
    preferences: { theme: 'dark', font: 'sans', density: 'comfortable', radius: 'default' },
  },

  // Design systems
  {
    id: 'material',
    label: 'Material',
    name: 'Material',
    group: 'Design systems',
    category: 'Design systems',
    description: 'Tonal lilac surfaces, capsule actions, and measured elevation.',
    preferences: { theme: 'material', font: 'sans', density: 'comfortable', radius: 'soft' },
  },
  {
    id: 'apple',
    label: 'Apple',
    name: 'Apple',
    group: 'Design systems',
    category: 'Design systems',
    description: 'Cool porcelain, system typography, inset fields, and soft precision.',
    preferences: { theme: 'apple', font: 'sans', density: 'comfortable', radius: 'default' },
  },
  {
    id: 'openai',
    label: 'OpenAI',
    name: 'OpenAI',
    group: 'Design systems',
    category: 'Design systems',
    description: 'Warm neutral work surfaces, quiet borders, and clear rounded controls.',
    preferences: { theme: 'openai', font: 'sans', density: 'comfortable', radius: 'default' },
  },
  {
    id: 'discord',
    label: 'Discord',
    name: 'Discord',
    group: 'Design systems',
    category: 'Design systems',
    description: 'Layered slate channels with blurple actions and friendly rounded edges.',
    preferences: { theme: 'discord', font: 'sans', density: 'comfortable', radius: 'soft' },
  },

  // Expressive
  {
    id: 'monokai',
    label: 'Monokai',
    name: 'Monokai',
    group: 'Expressive',
    category: 'Expressive',
    description: 'Editor charcoal, pink signals, lime actions, and cyan focus rings.',
    preferences: { theme: 'monokai', font: 'mono', density: 'compact', radius: 'sharp' },
  },
  {
    id: 'brutalist',
    label: 'Brutalist',
    name: 'Brutalist',
    group: 'Expressive',
    category: 'Expressive',
    description: 'Ink on concrete, construction-yellow controls, and unapologetic hard shadows.',
    preferences: { theme: 'brutalist', font: 'sans', density: 'comfortable', radius: 'sharp' },
  },
  {
    id: 'hyper-modernism',
    label: 'Hyper-modernism',
    name: 'Hyper-modernism',
    group: 'Expressive',
    category: 'Expressive',
    description: 'Midnight indigo, electric cyan edges, and wide, crisply spaced surfaces.',
    preferences: { theme: 'hyper-modernism', font: 'sans', density: 'spacious', radius: 'sharp' },
  },
  {
    id: 'bauhaus',
    label: 'Bauhaus',
    name: 'Bauhaus',
    group: 'Expressive',
    category: 'Expressive',
    description: 'Architectural ivory, primary red actions, cobalt focus, and geometric circles.',
    preferences: { theme: 'bauhaus', font: 'sans', density: 'comfortable', radius: 'soft' },
  },
  {
    id: 'dream-world',
    label: 'Dream World',
    name: 'Dream World',
    group: 'Expressive',
    category: 'Expressive',
    description: 'Cloud-lilac surfaces, berry text, pill controls, and soft lavender shadows.',
    preferences: { theme: 'dream-world', font: 'sans', density: 'comfortable', radius: 'soft' },
  },
  {
    id: 'editorial-magazine',
    label: 'Editorial Magazine',
    name: 'Editorial Magazine',
    group: 'Expressive',
    category: 'Expressive',
    description: 'Porcelain paper, oxblood rules, book typography, and deliberate editorial spacing.',
    preferences: { theme: 'editorial-magazine', font: 'serif', density: 'spacious', radius: 'default' },
  },
  {
    id: 'retro-terminal',
    label: 'Retro-terminal',
    name: 'Retro-terminal',
    group: 'Expressive',
    category: 'Expressive',
    description: 'Phosphor green on deep evergreen, monospace utility, and square cursor-like controls.',
    preferences: { theme: 'retro-terminal', font: 'mono', density: 'compact', radius: 'sharp' },
  },
  {
    id: 'zen-minimalism',
    label: 'Zen Minimalism',
    name: 'Zen Minimalism',
    group: 'Expressive',
    category: 'Expressive',
    description: 'Rice-paper surfaces, inkstone type, moss accents, and spacious quiet rhythm.',
    preferences: { theme: 'zen-minimalism', font: 'serif', density: 'spacious', radius: 'soft' },
  },
  {
    id: 'nightmare-horror',
    label: 'Nightmare Horror',
    name: 'Nightmare Horror',
    group: 'Expressive',
    category: 'Expressive',
    description: 'Bruised burgundy, bone-white serif type, and blood-red accents without flicker.',
    preferences: { theme: 'nightmare-horror', font: 'serif', density: 'comfortable', radius: 'sharp' },
  },

  // Density
  {
    id: 'ultra-large',
    label: 'Ultra Large',
    name: 'Ultra Large',
    group: 'Density',
    category: 'Density',
    description: 'Large readable type, generous controls, and roomy navigation without zoom hacks.',
    preferences: { theme: 'light', font: 'sans', density: 'spacious', radius: 'default' },
  },
  {
    id: 'ultra-compact',
    label: 'Ultra Compact',
    name: 'Ultra Compact',
    group: 'Density',
    category: 'Density',
    description: 'A precise graphite workspace with tight rhythm and stable, readable labels.',
    preferences: { theme: 'slate', font: 'sans', density: 'compact', radius: 'sharp' },
  },

  // Community inspired
  {
    id: 'fjord',
    label: 'Fjord',
    name: 'Fjord',
    group: 'Community inspired',
    category: 'Community inspired',
    description: 'Cool slate layers, glacier-blue actions, and precise humanist typography.',
    preferences: { theme: 'fjord', font: 'sans', density: 'comfortable', radius: 'default' },
  },
  {
    id: 'workshop',
    label: 'Workshop',
    name: 'Workshop',
    group: 'Community inspired',
    category: 'Community inspired',
    description: 'Warm charcoal, brass actions, sturdy outlines, and practical workshop rhythm.',
    preferences: { theme: 'workshop', font: 'sans', density: 'compact', radius: 'sharp' },
  },
  {
    id: 'periwinkle',
    label: 'Periwinkle',
    name: 'Periwinkle',
    group: 'Community inspired',
    category: 'Community inspired',
    description: 'Lavender-gray surfaces, plum typography, and rounded violet actions.',
    preferences: { theme: 'periwinkle', font: 'sans', density: 'comfortable', radius: 'soft' },
  },
  {
    id: 'wayfinder',
    label: 'Wayfinder',
    name: 'Wayfinder',
    group: 'Community inspired',
    category: 'Community inspired',
    description: 'Bright white, decisive navy rules, and clear blue actions with generous targets.',
    preferences: { theme: 'wayfinder', font: 'sans', density: 'spacious', radius: 'default' },
  },

  // Art house
  {
    id: 'acid-opera',
    label: 'Acid Opera',
    name: 'Acid Opera',
    group: 'Art house',
    category: 'Art house',
    description: 'Aubergine velvet, chartreuse spotlights, theatrical serif type, and sweeping curves.',
    preferences: { theme: 'acid-opera', font: 'serif', density: 'spacious', radius: 'soft' },
  },
  {
    id: 'cobalt-cabaret',
    label: 'Cobalt Cabaret',
    name: 'Cobalt Cabaret',
    group: 'Art house',
    category: 'Art house',
    description: 'An electric-blue stage, butter-yellow lettering, coral actions, and stepped poster shadows.',
    preferences: { theme: 'cobalt-cabaret', font: 'sans', density: 'comfortable', radius: 'sharp' },
  },
  {
    id: 'bubblegum-riot',
    label: 'Bubblegum Riot',
    name: 'Bubblegum Riot',
    group: 'Art house',
    category: 'Art house',
    description: 'Hot-pink paper, black ink, lemon actions, oversized block type, and cutout geometry.',
    preferences: { theme: 'bubblegum-riot', font: 'sans', density: 'comfortable', radius: 'sharp' },
  },
  {
    id: 'obsidian-gilt',
    label: 'Obsidian Gilt',
    name: 'Obsidian Gilt',
    group: 'Art house',
    category: 'Art house',
    description: 'Petrol-black lacquer, champagne gold, engraved rules, and architectural serif forms.',
    preferences: { theme: 'obsidian-gilt', font: 'serif', density: 'spacious', radius: 'sharp' },
  },
]

export function findMatchingPrefab(prefs: ThemePreferences): PrefabTheme | undefined {
  return PREFAB_THEMES.find(
    (p) =>
      p.preferences.theme === prefs.theme &&
      p.preferences.font === prefs.font &&
      p.preferences.density === prefs.density &&
      p.preferences.radius === prefs.radius
  )
}

const STORAGE_KEY_PREFS = 'riverly.theme_preferences'
const STORAGE_KEY_LEGACY = 'riverly.theme'

const DEFAULT_PREFS: ThemePreferences = {
  theme: 'light',
  font: 'sans',
  density: 'comfortable',
  radius: 'default',
  basePrefabId: 'river-classic',
}

const listeners = new Set<() => void>()

function getInitialPreferences(): ThemePreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFS
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFS)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        theme: parsed.theme || 'light',
        font: parsed.font || 'sans',
        density: parsed.density || 'comfortable',
        radius: parsed.radius || 'default',
        basePrefabId: parsed.basePrefabId || 'river-classic',
      }
    }
    const legacy = localStorage.getItem(STORAGE_KEY_LEGACY)
    if (legacy === 'dark' || legacy === 'light') {
      return { ...DEFAULT_PREFS, theme: legacy, basePrefabId: legacy === 'dark' ? 'river-dark' : 'river-classic' }
    }
  } catch {
    /* fallback to defaults */
  }

  // Check initial DOM attribute
  const domTheme = (document.documentElement.dataset.theme as ColorThemeId) || 'light'
  return { ...DEFAULT_PREFS, theme: domTheme, basePrefabId: domTheme === 'dark' ? 'river-dark' : 'river-classic' }
}

let currentPreferences: ThemePreferences = getInitialPreferences()

function applyToDOM(prefs: ThemePreferences) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.dataset.theme = prefs.theme
  root.dataset.font = prefs.font
  root.dataset.density = prefs.density
  root.dataset.radius = prefs.radius
}

// Ensure DOM attributes are always applied immediately on module evaluation
applyToDOM(currentPreferences)

export function updateThemePreferences(updates: Partial<ThemePreferences>) {
  currentPreferences = { ...currentPreferences, ...updates }
  applyToDOM(currentPreferences)

  try {
    localStorage.setItem(STORAGE_KEY_PREFS, JSON.stringify(currentPreferences))
    localStorage.setItem(STORAGE_KEY_LEGACY, currentPreferences.theme)
  } catch {
    /* storage unavailable in private mode */
  }

  listeners.forEach((cb) => cb())
}

export function useThemePreferences() {
  const preferences = useSyncExternalStore((cb) => {
    listeners.add(cb)
    return () => listeners.delete(cb)
  }, () => currentPreferences)

  const activePrefab = findMatchingPrefab(preferences)
  const basePrefab = preferences.basePrefabId
    ? PREFAB_THEMES.find((p) => p.id === preferences.basePrefabId) || null
    : null
  const isCustom = !activePrefab

  const applyPrefab = (prefabId: string) => {
    const target = PREFAB_THEMES.find((p) => p.id === prefabId)
    if (target) {
      updateThemePreferences({
        ...target.preferences,
        basePrefabId: target.id,
      })
    }
  }

  return {
    preferences,
    theme: preferences.theme,
    font: preferences.font,
    density: preferences.density,
    radius: preferences.radius,
    basePrefabId: preferences.basePrefabId,
    activePrefab,
    basePrefab,
    isCustom,
    applyPrefab,
    setTheme: (theme: ColorThemeId) => updateThemePreferences({ theme }),
    setFont: (font: FontId) => updateThemePreferences({ font }),
    setDensity: (density: DensityId) => updateThemePreferences({ density }),
    setRadius: (radius: RadiusId) => updateThemePreferences({ radius }),
    setPreferences: updateThemePreferences,
    resetDefaults: () => {
      const defaultPrefab = PREFAB_THEMES.find((p) => p.id === 'river-classic')
      if (defaultPrefab) {
        updateThemePreferences({
          ...defaultPrefab.preferences,
          basePrefabId: defaultPrefab.id,
        })
      } else {
        updateThemePreferences(DEFAULT_PREFS)
      }
    },
  }
}

/** Hook to provide a random selection of 5 palette overrides, keeping the active theme visible */
export function useRandomPaletteOverrides(currentTheme: ColorThemeId, count = 5): ColorThemeMeta[] {
  const [palettes, setPalettes] = useState<ColorThemeMeta[]>(() => {
    const fallback = COLOR_THEMES[0] as ColorThemeMeta
    const current: ColorThemeMeta = COLOR_THEMES.find((c) => c.id === currentTheme) ?? fallback
    const others = COLOR_THEMES.filter((c) => c.id !== current.id).sort(() => Math.random() - 0.5)
    return [current, ...others.slice(0, count - 1)].sort(() => Math.random() - 0.5)
  })

  useEffect(() => {
    setPalettes((prev) => {
      if (prev.some((p) => p.id === currentTheme)) return prev
      const current = COLOR_THEMES.find((c) => c.id === currentTheme)
      if (!current) return prev
      const remaining = prev.filter((p) => p.id !== current.id)
      return [current, ...remaining.slice(0, count - 1)].sort(() => Math.random() - 0.5)
    })
  }, [currentTheme, count])

  return palettes
}

/** Legacy hook maintained for full backwards compatibility with existing UI toggles */
export function useTheme() {
  const { theme, setTheme } = useThemePreferences()
  const activeMeta = COLOR_THEMES.find((c) => c.id === theme)
  const scheme: 'light' | 'dark' = activeMeta?.scheme ?? (theme === 'dark' ? 'dark' : 'light')

  return {
    theme: scheme,
    activeThemeId: theme,
    toggle: () => {
      // Toggle between default light and dark counterparts
      setTheme(scheme === 'dark' ? 'light' : 'dark')
    },
  }
}

