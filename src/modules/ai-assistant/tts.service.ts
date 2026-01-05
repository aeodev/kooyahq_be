import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly'
import { env } from '../../config/env'

// Initialize Polly client with credentials from S3 config
const pollyClient = new PollyClient({
  region: env.polly.region,
  credentials: env.s3.accessKeyId && env.s3.secretAccessKey
    ? {
        accessKeyId: env.s3.accessKeyId,
        secretAccessKey: env.s3.secretAccessKey,
      }
    : undefined, // Will use default credential chain if not provided
})

export type PollyVoice = 'Joanna' | 'Matthew' | 'Amy' | 'Brian' | 'Emma' | 'Ivy' | 'Joey' | 'Kendra' | 'Kimberly' | 'Salli'

export interface SynthesizeSpeechOptions {
  voiceId?: PollyVoice
  engine?: 'neural' | 'standard'
}

/**
 * Synthesize speech from text using Amazon Polly
 * @param text - The text to convert to speech
 * @param options - Optional voice and engine settings
 * @returns Base64 encoded MP3 audio
 */
export async function synthesizeSpeech(
  text: string,
  options: SynthesizeSpeechOptions = {}
): Promise<string> {
  const { voiceId = 'Joanna', engine = 'neural' } = options

  // Skip if text is empty or just whitespace
  if (!text.trim()) {
    throw new Error('Cannot synthesize empty text')
  }

  const command = new SynthesizeSpeechCommand({
    Text: text,
    OutputFormat: 'mp3',
    VoiceId: voiceId,
    Engine: engine,
  })

  const response = await pollyClient.send(command)

  if (!response.AudioStream) {
    throw new Error('No audio stream returned from Polly')
  }

  // Collect audio stream chunks
  const chunks: Uint8Array[] = []
  for await (const chunk of response.AudioStream as AsyncIterable<Uint8Array>) {
    chunks.push(chunk)
  }

  // Convert to base64
  const buffer = Buffer.concat(chunks)
  return buffer.toString('base64')
}

/**
 * Check if Polly TTS is available (credentials configured)
 */
export function isPollyAvailable(): boolean {
  return Boolean(env.s3.accessKeyId && env.s3.secretAccessKey)
}

