import { useMemo } from 'react'
import { Check, RotateCcw, Sparkles } from 'lucide-react'
import { cx } from '@/lib/cx'
import { Card } from '@/components/patterns/Card'
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

export function AppearanceSettings() {
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

  // Group prefabs by group for structured dropdown navigation
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
    <div className="stack gap-6">
      {/* Header card with quick reset */}
      <div className="row row--between items-center flex-wrap gap-4">
        <Button variant="secondary" onClick={resetDefaults} className="row items-center gap-1.5 text--xs">
          <RotateCcw size={13} />
          <span>Reset to defaults</span>
        </Button>
      </div>

      {/* 1. Prefabbed Themes Section */}
      <Card>
        <div className="stack gap-4">
          <div className="row row--between items-start flex-wrap gap-3">
            <div>
              <div className="row items-center gap-2 mb-1">
                <Sparkles size={17} className="text--accent" />
                <h3 className="heading heading--4">Themes</h3>
              </div>
            </div>
          </div>

          {/* Dropdown Selector */}
          <div className="stack gap-2">
            <div className="row items-center gap-3 flex-wrap">
              <div style={{ flex: '1 1 320px' }}>
                <select
                  id="prefab-select"
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
          </div>

        </div>

      {/* 2. Color Themes (Overrides Palette) */}
        <div className="stack gap-4 mt-6">

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
                    <strong className="text text--sm text--strong">{t.label}</strong>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </Card>

      {/* 3. Typography */}
      <Card>
        <div className="stack gap-4">
          <div>
            <h3 className="heading heading--4">Typography</h3>
            <p className="text text--xs text--muted">
              Select font style for primary headers and data fields across the application.
            </p>
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            {FONT_PRESETS.map((f) => {
              const isSelected = font === f.id
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFont(f.id)}
                  className="stack gap-2 p-3 text-left"
                  style={{
                    borderRadius: 'var(--radius-md)',
                    border: isSelected ? '2px solid var(--color-accent)' : 'var(--border-width) solid var(--color-border)',
                    background: 'var(--color-surface)',
                    boxShadow: isSelected ? '0 0 0 1px var(--color-accent)' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  <div className="row row--between items-center">
                    <strong className="text text--sm text--strong">{f.label}</strong>
                    {isSelected && <Check size={14} className="text--accent" />}
                  </div>
                  <span className="text text--xs text--muted">{f.description}</span>
                  <div className="mt-1 p-2" style={{ background: 'var(--color-surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontFamily: f.id === 'mono' ? 'var(--font-mono)' : f.id === 'serif' ? 'Georgia, serif' : 'var(--font-body)', fontSize: 'var(--text-sm)' }}>
                      {f.previewText}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </Card>

      {/* 4. Density & Corner Geometry */}
      <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <Card>
          <div className="stack gap-3">
            <div>
              <h3 className="heading heading--4">Interface Density</h3>
              <p className="text text--xs text--muted">Adjust padding, button heights, and data density.</p>
            </div>
            <div className="segmented">
              {DENSITY_PRESETS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDensity(d.id)}
                  className={cx('segmented__item', density === d.id && 'is-active')}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <div className="stack gap-3">
            <div>
              <h3 className="heading heading--4">Corner Geometry</h3>
              <p className="text text--xs text--muted">Adjust edge radius on cards, buttons, and inputs.</p>
            </div>
            <div className="segmented">
              {RADIUS_PRESETS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRadius(r.id)}
                  className={cx('segmented__item', radius === r.id && 'is-active')}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
