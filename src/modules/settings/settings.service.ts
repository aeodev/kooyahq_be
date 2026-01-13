import { settingsRepository } from './settings.repository'
import type { ThemeSettings, Settings } from './settings.model'

export type ThemeSettingsWithMandatory = {
  light: ThemeSettings['light']
  dark: ThemeSettings['dark']
  themeMandatory: boolean
}

export const settingsService = {
  async getSettings(): Promise<Settings> {
    return settingsRepository.getSettings()
  },

  async getThemeSettings(): Promise<ThemeSettingsWithMandatory> {
    const settings = await settingsRepository.getSettings()
    return {
      ...settings.theme,
      themeMandatory: settings.themeMandatory,
    }
  },

  async updateThemeSettings(theme: ThemeSettings, userId: string): Promise<ThemeSettingsWithMandatory> {
    // Validate theme structure
    if (!theme.light || !theme.dark) {
      throw new Error('Theme must include both light and dark modes')
    }

    const requiredColors = ['primary', 'secondary', 'accent', 'destructive', 'muted', 'background', 'foreground', 'border']
    
    for (const mode of ['light', 'dark'] as const) {
      for (const color of requiredColors) {
        if (!theme[mode][color as keyof ThemeSettings[typeof mode]]) {
          throw new Error(`Missing required color: ${mode}.${color}`)
        }
      }
    }

    const updated = await settingsRepository.updateTheme(theme, userId)
    return {
      ...updated.theme,
      themeMandatory: updated.themeMandatory,
    }
  },

  async updateThemeMandatory(themeMandatory: boolean, userId: string): Promise<ThemeSettingsWithMandatory> {
    const updated = await settingsRepository.updateThemeMandatory(themeMandatory, userId)
    return {
      ...updated.theme,
      themeMandatory: updated.themeMandatory,
    }
  },
}

