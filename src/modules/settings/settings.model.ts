import { Schema, model, models, type Document } from 'mongoose'

export interface ThemeColors {
  primary: string
  secondary: string
  accent: string
  destructive: string
  muted: string
  background: string
  foreground: string
  border: string
}

export interface ThemeSettings {
  light: ThemeColors
  dark: ThemeColors
}

export interface SettingsDocument extends Document {
  key: 'global'
  theme: ThemeSettings
  themeMandatory: boolean
  updatedBy?: Schema.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const themeColorsSchema = new Schema<ThemeColors>(
  {
    primary: { type: String, required: true },
    secondary: { type: String, required: true },
    accent: { type: String, required: true },
    destructive: { type: String, required: true },
    muted: { type: String, required: true },
    background: { type: String, required: true },
    foreground: { type: String, required: true },
    border: { type: String, required: true },
  },
  { _id: false }
)

const settingsSchema = new Schema<SettingsDocument>(
  {
    key: { type: String, required: true, unique: true, default: 'global' },
    theme: {
      light: { type: themeColorsSchema, required: true },
      dark: { type: themeColorsSchema, required: true },
    },
    themeMandatory: { type: Boolean, default: false },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

export const SettingsModel = models.Settings ?? model<SettingsDocument>('Settings', settingsSchema)

export type Settings = {
  id: string
  key: 'global'
  theme: ThemeSettings
  themeMandatory: boolean
  updatedBy: string | null
  createdAt: string
  updatedAt: string
}

export function toSettings(doc: SettingsDocument): Settings {
  return {
    id: doc.id,
    key: doc.key,
    theme: doc.theme,
    themeMandatory: doc.themeMandatory ?? false,
    updatedBy: doc.updatedBy ? doc.updatedBy.toString() : null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}

