import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

const SSH_KEY_ENCRYPTION_PREFIX = 'enc:v1:'
const SSH_KEY_ENCRYPTION_ENV = 'SERVER_MANAGEMENT_SSH_KEY_SECRET'
const SSH_KEY_IV_LENGTH = 12
const SSH_KEY_TAG_LENGTH = 16
const OPENSSH_MAGIC = Buffer.from('openssh-key-v1\0')
const PEM_HEADER_REGEX = /-----BEGIN [^-]+-----/
const PEM_FOOTER_REGEX = /-----END [^-]+-----/
const PEM_LINE_LENGTH = 70

function getEncryptionKey(): Buffer {
  const secret = process.env[SSH_KEY_ENCRYPTION_ENV]
  if (!secret) {
    throw new Error(`${SSH_KEY_ENCRYPTION_ENV} is not set`)
  }
  return createHash('sha256').update(secret).digest()
}

export function hasSshKeyEncryptionSecret(): boolean {
  return Boolean(process.env[SSH_KEY_ENCRYPTION_ENV])
}

export function normalizeSshKey(input?: string): string | undefined {
  if (input === undefined || input === null) return undefined
  const normalized = input
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()
  if (!normalized) return undefined
  if (normalized.startsWith(SSH_KEY_ENCRYPTION_PREFIX)) {
    return normalized
  }
  const headerMatch = normalized.match(PEM_HEADER_REGEX)
  const footerMatch = normalized.match(PEM_FOOTER_REGEX)
  if (headerMatch && footerMatch) {
    const header = headerMatch[0]
    const footer = footerMatch[0]
    const startIndex = normalized.indexOf(header) + header.length
    const endIndex = normalized.indexOf(footer)
    if (endIndex > startIndex) {
      const body = normalized.slice(startIndex, endIndex).replace(/\s+/g, '')
      const wrapped = body.match(new RegExp(`.{1,${PEM_LINE_LENGTH}}`, 'g')) || []
      if (wrapped.length > 0) {
        return [header, ...wrapped, footer].join('\n')
      }
      return [header, footer].join('\n')
    }
  }
  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  if (lines.length === 0) return undefined
  return lines.join('\n')
}

function extractPemBody(pem: string): string {
  return pem
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('-----'))
    .join('')
}

function readLengthPrefixedString(buffer: Buffer, offset: number) {
  if (offset + 4 > buffer.length) {
    throw new Error('Invalid OpenSSH key data')
  }
  const length = buffer.readUInt32BE(offset)
  const start = offset + 4
  const end = start + length
  if (end > buffer.length) {
    throw new Error('Invalid OpenSSH key data')
  }
  return {
    value: buffer.subarray(start, end).toString('utf8'),
    nextOffset: end,
  }
}

function isOpenSshKeyEncrypted(pem: string): boolean {
  try {
    const body = extractPemBody(pem)
    if (!body) return false
    const decoded = Buffer.from(body, 'base64')
    if (decoded.length < OPENSSH_MAGIC.length) return false
    if (!decoded.subarray(0, OPENSSH_MAGIC.length).equals(OPENSSH_MAGIC)) return false
    const { value: ciphername } = readLengthPrefixedString(decoded, OPENSSH_MAGIC.length)
    return ciphername !== 'none'
  } catch {
    return false
  }
}

export function isEncryptedPrivateKey(pem: string): boolean {
  const normalized = normalizeSshKey(pem)
  if (!normalized) return false
  if (normalized.includes('BEGIN ENCRYPTED PRIVATE KEY')) return true
  if (normalized.includes('Proc-Type: 4,ENCRYPTED')) return true
  if (normalized.includes('BEGIN OPENSSH PRIVATE KEY')) {
    return isOpenSshKeyEncrypted(normalized)
  }
  return false
}

export function encryptSshKey(plain: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(SSH_KEY_IV_LENGTH)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  const payload = Buffer.concat([iv, tag, encrypted]).toString('base64')
  return `${SSH_KEY_ENCRYPTION_PREFIX}${payload}`
}

export function decryptSshKey(value?: string): string | undefined {
  if (!value) return undefined
  if (!value.startsWith(SSH_KEY_ENCRYPTION_PREFIX)) return value
  const raw = value.slice(SSH_KEY_ENCRYPTION_PREFIX.length)
  const payload = Buffer.from(raw, 'base64')
  const iv = payload.subarray(0, SSH_KEY_IV_LENGTH)
  const tag = payload.subarray(SSH_KEY_IV_LENGTH, SSH_KEY_IV_LENGTH + SSH_KEY_TAG_LENGTH)
  const encrypted = payload.subarray(SSH_KEY_IV_LENGTH + SSH_KEY_TAG_LENGTH)
  const decipher = createDecipheriv('aes-256-gcm', getEncryptionKey(), iv)
  decipher.setAuthTag(tag)
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString('utf8')
}

export function prepareSshKeyForStorage(input?: string): { stored?: string; plain?: string } {
  const normalized = normalizeSshKey(input)
  if (!normalized) return {}
  if (normalized.startsWith(SSH_KEY_ENCRYPTION_PREFIX)) {
    return { stored: normalized, plain: decryptSshKey(normalized) }
  }
  return { stored: encryptSshKey(normalized), plain: normalized }
}
