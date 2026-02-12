import nodemailer from 'nodemailer'
import type { Attachment } from 'nodemailer/lib/mailer'

// Email configuration from environment
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  from: process.env.SMTP_FROM || 'Aarshhmi <noreply@wizcoder.com>',
}

// Create transporter
const transporter = nodemailer.createTransport({
  host: emailConfig.host,
  port: emailConfig.port,
  secure: emailConfig.secure,
  auth: {
    user: emailConfig.auth.user,
    pass: emailConfig.auth.pass,
  },
})

// Email options interface
interface SendEmailOptions {
  // Required
  to: string | string[]
  subject: string
  html: string

  // Optional
  from?: string
  cc?: string | string[]
  bcc?: string | string[]
  replyTo?: string
  text?: string
  attachments?: Attachment[]
  headers?: Record<string, string>
  priority?: 'high' | 'normal' | 'low'
}

// Send email function
export const sendEmail = async (options: SendEmailOptions): Promise<boolean> => {
  try {
    // Check if SMTP is configured
    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
      console.log('='.repeat(60))
      console.log('EMAIL SERVICE: SMTP not configured, logging email instead')
      console.log('='.repeat(60))
      console.log(`To: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`)
      console.log(`Subject: ${options.subject}`)
      if (options.cc) console.log(`CC: ${Array.isArray(options.cc) ? options.cc.join(', ') : options.cc}`)
      if (options.bcc) console.log(`BCC: ${Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc}`)
      if (options.attachments) console.log(`Attachments: ${options.attachments.length} file(s)`)
      console.log('-'.repeat(60))
      console.log(options.html)
      console.log('='.repeat(60))
      return true
    }

    await transporter.sendMail({
      from: options.from || emailConfig.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      cc: options.cc,
      bcc: options.bcc,
      replyTo: options.replyTo,
      attachments: options.attachments,
      headers: options.headers,
      priority: options.priority,
    })

    const recipient = Array.isArray(options.to) ? options.to.join(', ') : options.to
    console.log(`Email sent successfully to: ${recipient}`)
    return true
  } catch (error) {
    console.error('Failed to send email:', error)
    return false
  }
}

// Export types
export type { SendEmailOptions, Attachment }
