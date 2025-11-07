export function extractMentions(content: string): string[] {
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







