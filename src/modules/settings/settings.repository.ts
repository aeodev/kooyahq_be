import { SettingsModel, type ThemeSettings, toSettings, type Settings } from './settings.model'

// Default theme values matching current index.css
const DEFAULT_LIGHT_THEME = {
  primary: '142 71% 29%',
  secondary: '140 24% 92%',
  accent: '138 35% 90%',
  destructive: '0 84.2% 60.2%',
  muted: '150 10% 95%',
  background: '0 0% 100%',
  foreground: '240 10% 3.9%',
  border: '150 12% 88%',
}

const DEFAULT_DARK_THEME = {
  primary: '142 70% 45%',
  secondary: '147 22% 27%',
  accent: '150 25% 29%',
  destructive: '0 62.8% 30.6%',
  muted: '230 8% 23%',
  background: '240 6% 11%',
  foreground: '140 40% 96%',
  border: '220 12% 23%',
}

const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  light: DEFAULT_LIGHT_THEME,
  dark: DEFAULT_DARK_THEME,
}

export const settingsRepository = {
  async getSettings(): Promise<Settings> {
    let settings = await SettingsModel.findOne({ key: 'global' })

    if (!settings) {
      // Create default settings if none exist
      settings = await SettingsModel.create({
        key: 'global',
        theme: DEFAULT_THEME_SETTINGS,
      })
    }

    return toSettings(settings)
  },

  async updateTheme(theme: ThemeSettings, userId: string): Promise<Settings> {
    const settings = await SettingsModel.findOneAndUpdate(
      { key: 'global' },
      {
        $set: {
          theme,
          updatedBy: userId,
        },
      },
      { new: true, upsert: true }
    )

    return toSettings(settings)
  },
}

