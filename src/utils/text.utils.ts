// Text processing utilities

/**
 * Clean HTML tags and normalize whitespace
 */
export function cleanHtml(html: string): string {
  return (html || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300)
}

/**
 * Clean bracket tags and parentheses from titles
 * Removes patterns like [D], [R], (Project), etc.
 */
export function cleanTitle(title: string): string {
  let cleaned = title.trim()
  
  // Remove bracket tags like [D], [R], [Project], [Research], etc. at the start
  cleaned = cleaned.replace(/^\[[A-Za-z0-9\s]+\]\s*/g, '')
  cleaned = cleaned.replace(/^\s*\[[A-Za-z0-9\s]+\]\s*/g, '')
  
  // Remove parentheses tags like (D), (R), (Project), etc. at the start
  cleaned = cleaned.replace(/^\([A-Za-z0-9\s]+\)\s*/g, '')
  cleaned = cleaned.replace(/^\s*\([A-Za-z0-9\s]+\)\s*/g, '')
  
  // Remove multiple consecutive brackets/parentheses
  cleaned = cleaned.replace(/^(\[[A-Za-z0-9\s]+\]\s*)+/g, '')
  cleaned = cleaned.replace(/^(\([A-Za-z0-9\s]+\)\s*)+/g, '')
  
  cleaned = cleaned.trim()
  
  return cleaned || title // Fallback to original if cleaning removes everything
}
