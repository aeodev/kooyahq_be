import sgMail from '@sendgrid/mail'
import { env } from '../config/env'

// Initialize SendGrid client
sgMail.setApiKey(env.sendgrid.apiKey)

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

/**
 * Send email using SendGrid
 * @param options Email options
 * @returns Promise resolving to SendGrid response
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  try {
    const msg = {
      to: options.to,
      from: env.sendgrid.fromEmail,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML tags for text fallback
    }

    await sgMail.send(msg)
  } catch (error) {
    console.error('SendGrid email error:', error)
    // Re-throw to allow caller to handle
    throw error
  }
}

/**
 * Send email to multiple recipients
 * @param options Email options with array of recipients
 * @returns Promise resolving to SendGrid response
 */
export async function sendBulkEmail(options: SendEmailOptions): Promise<void> {
  try {
    const recipients = Array.isArray(options.to) ? options.to : [options.to]
    
    // SendGrid allows up to 1000 recipients per request
    const batchSize = 1000
    const batches: string[][] = []
    
    for (let i = 0; i < recipients.length; i += batchSize) {
      batches.push(recipients.slice(i, i + batchSize))
    }

    // Send emails in batches
    await Promise.all(
      batches.map((batch) =>
        sendEmail({
          ...options,
          to: batch,
        })
      )
    )
  } catch (error) {
    console.error('SendGrid bulk email error:', error)
    throw error
  }
}

