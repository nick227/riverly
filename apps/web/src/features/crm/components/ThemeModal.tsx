import { useMemo } from 'react'
import { Check, Palette, RotateCcw, Sparkles } from 'lucide-react'
import { Overlay } from '@/components/patterns/Overlay'
import { Button } from '@/components/primitives/Controls'
import {
  COLOR_THEMES,
  FONT_PRESETS,
  DENSITY_PRESETS,
  RADIUS_PRESETS,
  PREFAB_THEMES,
  useRandomPaletteOverrides,
  useThemePreferences,
} from '@/lib/theme'

export function ThemeModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const {
    theme,
    font,
    density,
    radius,
    activePrefab,
    basePrefab,
    isCustom,
    applyPrefab,
    setTheme,
    setFont,
    setDensity,
    setRadius,
    resetDefaults,
  } = useThemePreferences()

  const randomPalettes = useRandomPaletteOverrides(theme, 5)

  // Group prefabs by group for dropdown
  const groupedPrefabs = useMemo(() => {
    const groups = new Map<string, typeof PREFAB_THEMES>()
    for (const p of PREFAB_THEMES) {
      const list = groups.get(p.group) ?? []
      list.push(p)
      groups.set(p.group, list)
    }
    return Array.from(groups.entries())
  }, [])

  const dropdownValue = activePrefab ? activePrefab.id : 'custom'
  const activeColorTheme = COLOR_THEMES.find((c) => c.id === theme)
  const activeFontPreset = FONT_PRESETS.find((f) => f.id === font)
  const activeDensityPreset = DENSITY_PRESETS.find((d) => d.id === density)
  const activeRadiusPreset = RADIUS_PRESETS.find((r) => r.id === radius)

  return (
    <Overlay
      open={open}
      onRequestClose={onClose}
      variant="wide"
      title={
        <div className="row items-center gap-2">
          <Palette size={18} className="text--muted" />
          <span>Theme &amp; Appearance</span>
        </div>
      }
      footer={
        <div className="row row--between items-center w-full">
          <Button variant="ghost" onClick={resetDefaults} className="row items-center gap-1.5 text--xs">
            <RotateCcw size={13} />
            <span>Reset to defaults</span>
          </Button>
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      <div className="stack gap-6">
        {/* Section 0: Prefabbed Themes Dropdown */}
        <section
          className="stack gap-3"
          style={{
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--color-surface-subtle)',
            border: 'var(--border-width) solid var(--color-border)',
          }}
        >
          <div className="row row--between items-start flex-wrap gap-2">
            <div>
              <div className="row items-center gap-2 mb-1">
                <Sparkles size={16} className="text--accent" />
                <h3 className="heading heading--4">Themes</h3>
              </div>
            </div>
          </div>

          <div className="row items-center gap-2 flex-wrap">
            <div style={{ flex: '1 1 260px' }}>
              <select
                id="modal-prefab-select"
                className="select w-full"
                value={dropdownValue}
                onChange={(e) => {
                  const val = e.target.value
                  if (val && val !== 'custom') {
                    applyPrefab(val)
                  }
                }}
                style={{
                  fontWeight: 500,
                }}
              >
                {isCustom && (
                  <option value="custom" disabled>
                    Custom (Overridden from {basePrefab?.name || 'preset'})
                  </option>
                )}
                {groupedPrefabs.map(([group, prefabs]) => (
                  <optgroup key={group} label={group}>
                    {prefabs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Section 1: Color Palette */}
        <section className="stack gap-3">
          <div>
            <div className="row items-center gap-2 mb-0.5">
              <h3 className="heading heading--4">Color Theme</h3>
              <span className="text text--xs text--muted">(Overrides palette)</span>
            </div>
            <p className="text text--xs text--muted">
              Select a color palette. Contrast is tuned for clarity across all light and dark modes.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))',
              gap: 'var(--space-3)',
            }}
          >
            {randomPalettes.map((t) => {
              const isSelected = theme === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-2-5)',
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: isSelected
                      ? '2px solid var(--color-accent)'
                      : 'var(--border-width) solid var(--color-border)',
                    background: 'var(--color-surface)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'border-color var(--duration-fast) var(--ease), box-shadow var(--duration-fast) var(--ease)',
                    boxShadow: isSelected ? '0 0 0 1px var(--color-accent)' : 'none',
                  }}
                >
                  {/* Swatch preview card */}
                  <div
                    style={{
                      height: 52,
                      borderRadius: 'var(--radius-sm)',
                      background: t.swatch.bg,
                      border: `1px solid ${t.swatch.border}`,
                      padding: 'var(--space-2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Simulated mini card */}
                    <div
                      style={{
                        background: t.swatch.surface,
                        border: `1px solid ${t.swatch.border}`,
                        borderRadius: 4,
                        padding: '4px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: t.swatch.accent,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: t.swatch.text,
                          lineHeight: 1,
                        }}
                      >
                        {t.label.split(' ')[0]}
                      </span>
                    </div>

                    <div className="row items-center gap-1">
                      <span
                        style={{
                          fontSize: 9,
                          textTransform: 'uppercase',
                          fontWeight: 700,
                          letterSpacing: '0.04em',
                          color: t.swatch.text,
                          opacity: 0.6,
                        }}
                      >
                        {t.scheme}
                      </span>
                      {isSelected && (
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            background: t.swatch.accent,
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Check size={11} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="row row--between items-center">
                      <strong className="text text--sm text--strong">{t.label}</strong>
                    </div>
                    <p className="text text--xs text--muted mt-0.5" style={{ lineHeight: 1.4 }}>
                      {t.description}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      </div>
    </Overlay>
  )
}
