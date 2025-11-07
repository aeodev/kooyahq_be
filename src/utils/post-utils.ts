export function detectMentions(content: string): string[] {
  const mentionRegex = /@(\w+)/g
  const matches = content.matchAll(mentionRegex)
  const mentions: string[] = []
  
  for (const match of matches) {
    if (match[1]) {
      mentions.push(match[1].toLowerCase())
    }
  }
  
  return [...new Set(mentions)]
}

export function validateTags(tags: string[]): boolean {
  if (!Array.isArray(tags)) {
    return false
  }
  
  return tags.every((tag) => {
    return typeof tag === 'string' && tag.trim().length > 0 && tag.length <= 50
  })
}







