import puppeteer from 'puppeteer'
import type { PDFOptions } from 'puppeteer'

// ============================================
// PDF Generation Service
// Converts HTML string → PDF buffer using Puppeteer
// ============================================

// Reusable browser instance (lazy-initialized, shared across requests)
let browserInstance: Awaited<ReturnType<typeof puppeteer.launch>> | null = null

async function getBrowser() {
  if (!browserInstance || !browserInstance.connected) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    })
  }
  return browserInstance
}

export interface GeneratePdfInput {
  html: string
  options?: PDFOptions
}

export const pdfService = {
  /**
   * Generate a PDF buffer from an HTML string
   *
   * @param input.html - Full HTML string (including <html>, <head>, <style>, <body>)
   * @param input.options - Puppeteer PDF options (optional)
   * @returns PDF as Buffer
   *
   * Usage:
   *   const pdfBuffer = await pdfService.generatePdf({
   *     html: '<html><body><h1>Invoice</h1></body></html>',
   *     options: { format: 'A4', margin: { top: '20mm', bottom: '20mm' } }
   *   })
   */
  async generatePdf(input: GeneratePdfInput): Promise<Buffer> {
    const browser = await getBrowser()
    const page = await browser.newPage()

    try {
      await page.setContent(input.html, { waitUntil: 'networkidle0' })

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '15mm',
          right: '15mm',
          bottom: '15mm',
          left: '15mm',
        },
        ...input.options,
      })

      return Buffer.from(pdfBuffer)
    } finally {
      await page.close()
    }
  },

  /**
   * Close the browser instance (call on server shutdown if needed)
   */
  async closeBrowser() {
    if (browserInstance && browserInstance.connected) {
      await browserInstance.close()
      browserInstance = null
    }
  },
}
