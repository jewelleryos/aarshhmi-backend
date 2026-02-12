import * as XLSX from 'xlsx'

export interface ParsedCSV {
  headers: string[]
  rows: Record<string, string | number>[]
}

export const csvUtils = {
  /**
   * Read CSV file and return headers and data rows
   */
  readCsv(buffer: ArrayBuffer): ParsedCSV {
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]

    if (!sheet || !sheet['!ref']) {
      return { headers: [], rows: [] }
    }

    // Get headers from first row
    const range = XLSX.utils.decode_range(sheet['!ref'])
    const headers: string[] = []

    for (let col = range.s.c; col <= range.e.c; col++) {
      const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: col })]
      headers.push(cell ? String(cell.v).trim() : '')
    }

    // Get data rows (skip header row)
    const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet, {
      defval: '',
      raw: false, // Get all values as strings for consistent parsing
    })

    return { headers, rows }
  },

  /**
   * Create CSV string from data array
   */
  createCsv(data: Record<string, unknown>[], headers?: string[]): string {
    const ws = XLSX.utils.json_to_sheet(data, { header: headers })
    return XLSX.utils.sheet_to_csv(ws)
  },

  /**
   * Validate that headers exactly match expected headers
   * Throws error if mismatch
   */
  validateHeaders(actual: string[], expected: readonly string[]): void {
    if (actual.length !== expected.length) {
      throw new Error(
        `Invalid headers. Expected exactly ${expected.length} columns: ${expected.join(', ')}. Got ${actual.length} columns: ${actual.join(', ')}.`
      )
    }

    for (let i = 0; i < expected.length; i++) {
      const actualHeader = actual[i]?.toLowerCase().trim()
      const expectedHeader = expected[i].toLowerCase()

      if (actualHeader !== expectedHeader) {
        throw new Error(
          `Invalid header at column ${i + 1}. Expected '${expected[i]}', got '${actual[i]}'.`
        )
      }
    }
  },

  /**
   * Parse a numeric value from CSV cell
   * Returns NaN if not a valid number
   */
  parseNumber(value: string | number | undefined): number {
    if (value === undefined || value === '') {
      return NaN
    }
    const num = typeof value === 'number' ? value : parseFloat(String(value).trim())
    return num
  },

  /**
   * Parse a string value from CSV cell
   */
  parseString(value: string | number | undefined): string {
    if (value === undefined || value === null) {
      return ''
    }
    return String(value).trim()
  },
}
