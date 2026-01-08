export const COLORS = {
  primary: '#15803d', // Green 700
  primaryDark: '#14532d', // Green 900
  primaryLight: '#22c55e', // Green 500
  secondary: '#f0fdf4', // Green 50
  accent: '#dcfce7', // Green 100
  text: '#1f2937', // Gray 800
  textDark: '#111827', // Gray 900
  textLight: '#6b7280', // Gray 500
  textMuted: '#9ca3af', // Gray 400
  background: '#f9fafb', // Gray 50
  white: '#ffffff',
  border: '#e5e7eb', // Gray 200
}

// Brand Assets - Using PNG format for email client compatibility (webp not supported in Outlook)
export const LOGO_URL = 'https://res.cloudinary.com/ddqmsq56q/image/upload/f_png/kooya-logo-white_v9yowu'

// Frontend URL for "View in App" button
export const FRONTEND_URL = process.env.CLIENT_URL?.split(',')[0] || 'https://app.kooya.ph'
