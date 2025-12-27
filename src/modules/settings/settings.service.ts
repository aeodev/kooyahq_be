import { settingsRepository } from './settings.repository'
import type { ThemeSettings } from './settings.model'

export const settingsService = {
  async getThemeSettings(): Promise<ThemeSettings> {
    const settings = await settingsRepository.getSettings()
    return settings.theme
  },

  async updateThemeSettings(theme: ThemeSettings, userId: string): Promise<ThemeSettings> {
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
    return updated.theme
  },
}

