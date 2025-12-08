// Spam filtering utilities

const SPAM_KEYWORDS = [
  'buy github accounts',
  'buy accounts',
  'sell accounts',
  'bulk email',
  'email marketing service',
  'mailcannon',
  'mailcannon.pro',
  'buy followers',
  'buy likes',
  'cheap accounts',
  'verified accounts for sale',
  'github accounts online',
  'reliable bulk email',
  'high deliverability',
  'smtp service',
  'github accounts',
  'accounts online',
  'bulk email sending',
]

const SPAM_DOMAINS = [
  'mailcannon.pro',
  'buygithubaccounts',
]

const SPAM_PATTERNS = [
  /buy.*github.*accounts?/i,
  /buy.*accounts?/i,
  /sell.*accounts?/i,
  /bulk\s+email/i,
  /email\s+marketing/i,
  /for\s+sale/i,
  /cheap.*accounts?/i,
  /mailcannon/i,
  /reliable\s+bulk\s+email/i,
  /high\s+deliverability/i,
  /smtp.*service/i,
  /github.*accounts?.*online/i,
  /accounts?.*online/i,
  /bulk.*email.*sending/i,
]

const URL_SPAM_PATTERNS = [
  /buy.*accounts/i,
  /mailcannon/i,
  /bulk.*email/i,
]

/**
 * Check if content is spam/scam
 */
export function isSpam(title: string, content: string, url: string): boolean {
  const text = `${title} ${content}`.toLowerCase().trim()
  const urlLower = url.toLowerCase().trim()
  
  // Check URL for spam domains
  if (SPAM_DOMAINS.some(domain => urlLower.includes(domain))) {
    console.log(`[SPAM FILTER] Blocked by domain: ${url}`)
    return true
  }
  
  // Check for spam keywords
  for (const keyword of SPAM_KEYWORDS) {
    if (text.includes(keyword)) {
      console.log(`[SPAM FILTER] Blocked by keyword "${keyword}": ${title}`)
      return true
    }
  }
  
  // Check spam patterns
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(text)) {
      console.log(`[SPAM FILTER] Blocked by pattern "${pattern}": ${title}`)
      return true
    }
  }
  
  // Check URL patterns
  for (const pattern of URL_SPAM_PATTERNS) {
    if (pattern.test(urlLower)) {
      console.log(`[SPAM FILTER] Blocked by URL pattern "${pattern}": ${url}`)
      return true
    }
  }
  
  return false
}
