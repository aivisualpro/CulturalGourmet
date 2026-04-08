import pdfParseModule from 'pdf-parse'

export interface ParsedLineItem {
  lineNumber: number
  vendorItemCode: string
  description: string
  quantity: number
  unit: string
  unitPrice: number
  taxAmount: number
  extendedPrice: number
  pack?: string
  size?: string
  category?: string
}

export interface ParsedInvoice {
  vendorName: string
  invoiceNumber: string
  invoiceDate?: string
  deliveryDate?: string
  paymentDueDate?: string
  poNumber?: string
  orderNumber?: string
  customerNumber?: string
  soldToName?: string
  soldToAddress?: string
  shipToName?: string
  shipToAddress?: string
  lineItems: ParsedLineItem[]
  subTotal: number
  taxTotal: number
  otherCharges: number
  invoiceTotal: number
  totalItems: number
  pageCount: number
  rawText: string
}

// ─── Vendor Detection ─────────────────────────────────────────────────────────
function detectVendor(text: string): string {
  const upper = text.toUpperCase()
  if (upper.includes('J.J. MCDONNELL') || upper.includes('JJMCDONNELL') || upper.includes('EXCELLENCE IN SEAFOOD')) return 'JJ_MCDONNELL'
  if (upper.includes('SYSCO')) return 'SYSCO'
  if (upper.includes('RESTAURANT DEPOT')) return 'RESTAURANT_DEPOT'
  if (upper.includes('US FOODS') || upper.includes('USF')) return 'US_FOODS'
  return 'GENERIC'
}

// ─── Helper: Parse currency string to float ───────────────────────────────────
function parseCurrency(val: string): number {
  if (!val) return 0
  const cleaned = val.replace(/[$,\s]/g, '').trim()
  const num = Number.parseFloat(cleaned)
  return Number.isNaN(num) ? 0 : num
}

// ─── Helper: Parse date ───────────────────────────────────────────────────────
function parseDate(val: string): string | undefined {
  if (!val) return undefined
  // Handles MM/DD/YY, MM/DD/YYYY, M/D/YY
  const match = val.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (!match) return undefined
  let year = Number.parseInt(match[3])
  if (year < 100) year += 2000
  const month = match[1].padStart(2, '0')
  const day = match[2].padStart(2, '0')
  return `${year}-${month}-${day}`
}

// ─── JJ McDonnell Parser ──────────────────────────────────────────────────────
function parseJJMcDonnell(text: string): Partial<ParsedInvoice> {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  let invoiceNumber = ''
  let invoiceDate: string | undefined
  let paymentDueDate: string | undefined
  let orderNumber = ''
  let customerNumber = ''
  let soldToLines: string[] = []
  let subTotal = 0
  let otherCharges = 0
  let invoiceTotal = 0

  // Invoice number and date pattern: "179201  03/09/26"
  for (const line of lines) {
    const invMatch = line.match(/(\d{5,8})\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/)
    if (invMatch && !invoiceNumber) {
      invoiceNumber = invMatch[1]
      invoiceDate = parseDate(invMatch[2])
    }

    // Payment due
    const dueMatch = line.match(/PAYMENT DUE BY\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i)
    if (dueMatch) paymentDueDate = parseDate(dueMatch[1])
    const dueMatch2 = line.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})\s*$/)
    if (dueMatch2 && !paymentDueDate && line.toLowerCase().includes('due')) paymentDueDate = parseDate(dueMatch2[1])

    // Order number (first number column)
    const orderMatch = line.match(/^(\d{6})\s+\d{1,2}\/\d{1,2}\/\d{2,4}\s+([A-Z0-9]+)/i)
    if (orderMatch && !orderNumber) {
      orderNumber = orderMatch[1]
      customerNumber = orderMatch[2]
    }

    // Sold to
    if (line.match(/SOLD TO:/i)) {
      const idx = lines.indexOf(line)
      for (let i = idx + 1; i < Math.min(idx + 5, lines.length); i++) {
        if (lines[i] && !lines[i].match(/SHIP TO:|TEL:|FAX:|CONTACT:/i)) {
          soldToLines.push(lines[i])
        }
        else break
      }
    }

    // Totals
    const subMatch = line.match(/SUB\s*TOTAL\s+([\d,]+\.?\d*)/i)
    if (subMatch) subTotal = parseCurrency(subMatch[1])

    const otherMatch = line.match(/ENVIRO\s*SC.*?([\d,]+\.?\d*)$/i)
    if (otherMatch) otherCharges += parseCurrency(otherMatch[1])

    const totalMatch = line.match(/^TOTAL\s+([\d,]+\.?\d*)$/i)
    if (totalMatch) invoiceTotal = parseCurrency(totalMatch[1])
    const totalMatch2 = line.match(/TOTAL\s+([\d,]+\.?\d*)\s*$/i)
    if (totalMatch2 && invoiceTotal === 0) invoiceTotal = parseCurrency(totalMatch2[1])
  }

  // Line items: Pattern "ITEMCODE  DESCRIPTION  QTY LBS  PRICE  AMOUNT"
  // e.g. "SAL225  SALMON ATL FIL DTRM SCALE 3-4#  60.30 LBS  7.35  443.21"
  const lineItems: ParsedLineItem[] = []
  const itemPattern = /^([A-Z0-9-]{3,15})\s+(.+?)\s+([\d.]+)\s+(LBS|CS|EA|OZ|GAL|DZ|PKG|CRT|CAN|BOX|BAG|JR|CT|PK)\s+([\d.]+)\s+([\d,]+\.?\d*)$/i

  let lineNum = 0
  for (const line of lines) {
    const m = line.match(itemPattern)
    if (m) {
      lineNum++
      lineItems.push({
        lineNumber: lineNum,
        vendorItemCode: m[1].toUpperCase(),
        description: m[2].trim(),
        quantity: Number.parseFloat(m[3]),
        unit: m[4].toUpperCase(),
        unitPrice: parseCurrency(m[5]),
        taxAmount: 0,
        extendedPrice: parseCurrency(m[6]),
      })
    }
  }

  return {
    vendorName: 'J.J. McDonnell & Co.',
    invoiceNumber,
    invoiceDate,
    paymentDueDate,
    orderNumber,
    customerNumber,
    soldToName: soldToLines[0] || '',
    soldToAddress: soldToLines.slice(1).join(', '),
    lineItems,
    subTotal,
    taxTotal: 0,
    otherCharges,
    invoiceTotal,
    totalItems: lineItems.length,
  }
}

// ─── Sysco Parser ─────────────────────────────────────────────────────────────
function parseSysco(text: string): Partial<ParsedInvoice> {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  let invoiceNumber = ''
  let deliveryDate: string | undefined
  let customerNumber = ''
  let soldToName = ''
  let soldToAddress = ''
  let shipToName = ''
  let subTotal = 0
  let taxTotal = 0
  let invoiceTotal = 0
  let otherCharges = 0
  let currentCategory = ''

  // Extract header info
  for (const line of lines) {
    // Invoice number 
    const invMatch = line.match(/INVOICE\s*(?:NO\.?|NUMBER|#)?\s*(\d{7,12})/i)
    if (invMatch && !invoiceNumber) invoiceNumber = invMatch[1]

    // Delivery date
    const delvMatch = line.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/g)
    if (delvMatch && !deliveryDate) deliveryDate = parseDate(delvMatch[0])

    // Customer number
    const custMatch = line.match(/CUSTOMER\s+(\d{5,8})/i)
    if (custMatch && !customerNumber) customerNumber = custMatch[1]

    // Sold-to (first non-sysco address block)
    if (!soldToName && line.match(/CRAB\s+CAB/i)) {
      soldToName = line
      const idx = lines.indexOf(line)
      const addr = lines.slice(idx + 1, idx + 3).filter((l: string) => l.match(/^\d|\bHWY\b|\bRD\b|\bAVE\b|\bST\b/i))
      soldToAddress = addr.join(', ')
    }

    // Totals
    const subMatch = line.match(/^SUB\s*TOTAL\s*([\d,]+\.?\d*)$/i)
    if (subMatch) subTotal = parseCurrency(subMatch[1])
    const taxMatch = line.match(/^TAX\s*(?:TOTAL)?\s*([\d,]+\.?\d*)$/i)
    if (taxMatch) taxTotal = parseCurrency(taxMatch[1])
    const totalMatch = line.match(/^INVOICE\s*TOTAL\s*([\d,]+\.?\d*)$/i)
    if (totalMatch) invoiceTotal = parseCurrency(totalMatch[1])
    const fuelMatch = line.match(/FUEL\s+SURCHARGE\s+([\d,.]+)/i)
    if (fuelMatch) otherCharges += parseCurrency(fuelMatch[1])
    const ccMatch = line.match(/CREDIT\s+CARD\s+(?:SRC|SRCH?RG|CHARGE)\s+([\d,.]+)/i)
    if (ccMatch) otherCharges += parseCurrency(ccMatch[1])
  }

  // Sysco line items are complex — multi-column tabular
  // Pattern: QTY PACK SIZE DESCRIPTION ITEMCODE UNITPRICE TAX EXT
  // e.g. "C  1  CS  361LB  WHLFIMP BUTTER SOLID SLTD USDA AA  3078  3030816 103.65  1.04  103.65"
  const lineItems: ParsedLineItem[] = []
  let lineNum = 0

  // Category headers (e.g. "DAIRY", "SEAFOOD", "FROZEN")
  const categoryKeywords = ['DAIRY', 'SEAFOOD', 'FROZEN', 'CANNED', 'DRY', 'PRODUCE', 'CHEMICAL', 'JANITORIAL', 'PAPER', 'DISPOSABLE', 'SUPPLY', 'EQUIPMENT']

  for (const line of lines) {
    // Check for category
    const upperLine = line.toUpperCase().trim()
    if (categoryKeywords.some(k => upperLine === k || upperLine.replace(/\s*&\s*/g, ' ').includes(k))) {
      currentCategory = line.trim()
      continue
    }

    // Skip GROUP TOTAL lines
    if (line.match(/GROUP\s+TOTAL/i)) continue
    if (line.match(/ORDER\s+SUMMARY/i)) continue

    // Sysco line: starts with optional flag (C/D/F), qty, CS/DZ/etc, size, description, item codes, prices
    // "C  1  CS  361LB  WHLFIMP BUTTER SOLID SLTD USDA AA  3078  3030816  103.65  1.04  103.65  *"
    const syscoLine = line.match(
      /^[CDFE]?\s*(\d+)\s+(CS|DZ|EA|LB|GAL|BTL|PKG|BG|CT|PK|CF|OZ)\s+([\d.]+\s*(?:LB|OZ|GAL|IN|DZ|SH|EA)?)\s+(.+?)\s+(\d{4,8})\s+(?:\d{4,8}\s+)?([\d.]+)\s+([\d.]+)\s+([\d,]+\.?\d*)/i,
    )

    if (syscoLine) {
      lineNum++
      const qty = Number.parseFloat(syscoLine[1])
      const unitPrice = parseCurrency(syscoLine[6])
      const tax = parseCurrency(syscoLine[7])
      const ext = parseCurrency(syscoLine[8])
      lineItems.push({
        lineNumber: lineNum,
        vendorItemCode: syscoLine[5].trim(),
        description: syscoLine[4].trim(),
        quantity: qty,
        unit: syscoLine[2].toUpperCase(),
        unitPrice,
        taxAmount: tax,
        extendedPrice: ext || (qty * unitPrice),
        pack: syscoLine[1],
        size: syscoLine[3].trim(),
        category: currentCategory || undefined,
      })
      continue
    }

    // Fallback simpler Sysco pattern (no leading flag)
    const syscoSimple = line.match(
      /^(\d+)\s+(CS|DZ|EA|LB|GAL|BTL|PKG|BG|CT|CF)\s+(.+?)\s+(\d{4,8})\s+([\d.]+)\s+([\d.]+)\s+([\d,]+\.?\d*)/i,
    )
    if (syscoSimple) {
      lineNum++
      lineItems.push({
        lineNumber: lineNum,
        vendorItemCode: syscoSimple[4].trim(),
        description: syscoSimple[3].trim(),
        quantity: Number.parseFloat(syscoSimple[1]),
        unit: syscoSimple[2].toUpperCase(),
        unitPrice: parseCurrency(syscoSimple[5]),
        taxAmount: parseCurrency(syscoSimple[6]),
        extendedPrice: parseCurrency(syscoSimple[7]),
        category: currentCategory || undefined,
      })
    }
  }

  return {
    vendorName: 'Sysco',
    invoiceNumber,
    deliveryDate,
    customerNumber,
    soldToName,
    soldToAddress,
    shipToName: soldToName,
    lineItems,
    subTotal,
    taxTotal,
    otherCharges,
    invoiceTotal,
    totalItems: lineItems.length,
  }
}

// ─── Generic Parser (fallback) ────────────────────────────────────────────────
function parseGeneric(text: string, vendorHint: string): Partial<ParsedInvoice> {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  let invoiceNumber = ''
  let invoiceDate: string | undefined
  let subTotal = 0
  let taxTotal = 0
  let invoiceTotal = 0
  const lineItems: ParsedLineItem[] = []
  let lineNum = 0

  for (const line of lines) {
    const invMatch = line.match(/(?:INVOICE|INV)[\s#.:]*(\d{4,12})/i)
    if (invMatch && !invoiceNumber) invoiceNumber = invMatch[1]

    const dateMatch = line.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/)
    if (dateMatch && !invoiceDate) invoiceDate = parseDate(dateMatch[1])

    const subMatch = line.match(/(?:SUB[\s-]?TOTAL|SUBTOTAL)[:\s]*([\d,]+\.?\d*)/i)
    if (subMatch) subTotal = parseCurrency(subMatch[1])

    const taxMatch = line.match(/(?:TAX|HST|GST|VAT)[:\s]*([\d,]+\.?\d*)/i)
    if (taxMatch) taxTotal = parseCurrency(taxMatch[1])

    const totalMatch = line.match(/(?:TOTAL|AMOUNT DUE)[:\s]*([\d,]+\.?\d*)\s*$/i)
    if (totalMatch) invoiceTotal = parseCurrency(totalMatch[1])

    // Generic line item: CODE DESCRIPTION QTY UNIT PRICE AMOUNT
    const itemMatch = line.match(/^([A-Z]{1,5}\d{2,8})\s+(.+?)\s+([\d.]+)\s+([\w]+)\s+([\d.]+)\s+([\d,]+\.?\d*)$/)
    if (itemMatch) {
      lineNum++
      lineItems.push({
        lineNumber: lineNum,
        vendorItemCode: itemMatch[1],
        description: itemMatch[2].trim(),
        quantity: Number.parseFloat(itemMatch[3]),
        unit: itemMatch[4].toUpperCase(),
        unitPrice: parseCurrency(itemMatch[5]),
        taxAmount: 0,
        extendedPrice: parseCurrency(itemMatch[6]),
      })
    }
  }

  return {
    vendorName: vendorHint || 'Unknown Vendor',
    invoiceNumber: invoiceNumber || `INV-${Date.now()}`,
    invoiceDate,
    lineItems,
    subTotal,
    taxTotal,
    otherCharges: 0,
    invoiceTotal,
    totalItems: lineItems.length,
  }
}

// ─── Main Export ─────────────────────────────────────────────────────────────
export async function parsePurchaseOrderPdf(buffer: Buffer, originalFileName: string): Promise<ParsedInvoice> {
  const geminiApiKey = process.env.GEMINI_API_KEY

  // If we have an API key, use Google Gemini (Vertex AI equivalent) for exact structural extraction
  if (geminiApiKey) {
    try {
      // Dynamic import to prevent crashing if not installed or used
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const genAI = new GoogleGenerativeAI(geminiApiKey)
      
      // Use the latest pro/flash model for multi-modal (PDF) logic
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        }
      })

      const prompt = `
        You are an intelligent data extraction assistant. I have provided a PDF invoice/purchase order.
        Extract the structured text exactly as seen in the PDF.
        Return ONLY valid JSON matching this schema:
        {
          "vendorName": string,
          "vendorPhone": string,
          "vendorEmail": string,
          "vendorAddress": string,
          "vendorWebsite": string,
          "invoiceNumber": string,
          "invoiceDate": "YYYY-MM-DD",
          "deliveryDate": "YYYY-MM-DD",
          "paymentDueDate": "YYYY-MM-DD",
          "poNumber": string,          
          "orderNumber": string,
          "customerNumber": string,
          "soldToName": string,
          "soldToAddress": string,
          "shipToName": string,
          "shipToAddress": string,
          "subTotal": number,
          "taxTotal": number,
          "otherCharges": number,
          "invoiceTotal": number,
          "totalItems": number,
          "lineItems": [
            {
              "lineNumber": number,
              "vendorItemCode": string,
              "description": string,
              "quantity": number,
              "unit": string,
              "unitPrice": number,
              "taxAmount": number,
              "extendedPrice": number,
              "pack": string,
              "size": string,
              "category": string
            }
          ]
        }
        IMPORTANT RULES:
        - Do not make up numbers. Use 0 for missing numbers and "" for missing strings.
        - Parse the line items exactly. Ensure quantity, unitPrice, and extendedPrice match exactly.
        - If there's no "vendorItemCode", use "" instead of making one up.
        - For vendorPhone, vendorEmail, vendorAddress: extract from the vendor/company header area of the invoice (fax numbers count as phone if no phone number is present).
        - vendorAddress should be the full street address of the vendor company (NOT the sold-to or ship-to address).
      `

      const result = await model.generateContent([
        {
          inlineData: {
            data: buffer.toString('base64'),
            mimeType: 'application/pdf'
          }
        },
        prompt
      ])

      const rawText = result.response.text()
      const cleanJson = rawText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
      const parsedJson = JSON.parse(cleanJson)
      
      return {
        ...parsedJson,
        totalItems: parsedJson.lineItems?.length || 0,
        pageCount: 1, // Fallback since Gemini doesn't report page count trivially
        rawText: 'Extracted via Google AI (Vertex AI)'
      } as ParsedInvoice

    } catch (err: any) {
      console.warn('[Gemini AI] PDF parsing failed, falling back to legacy regex engine:', err?.message)
      // Fall through to legacy parsing if API fails
    }
  }

  // ─── Legacy Engine Fallback ──────────────────────────────────────────────────
  // pdf-parse v1 uses a function-based API: pdfParse(buffer).then(data => data.text)
  const pdfParse: any = pdfParseModule
  const textResult = typeof pdfParse === 'function' ? await pdfParse(buffer) : await pdfParse.default(buffer)

  const rawText = textResult.text || ''
  const pageCount = textResult.numpages || 1
  const vendorType = detectVendor(rawText)

  let parsed: Partial<ParsedInvoice>

  switch (vendorType) {
    case 'JJ_MCDONNELL':
      parsed = parseJJMcDonnell(rawText)
      break
    case 'SYSCO':
      parsed = parseSysco(rawText)
      break
    default: {
      // Fallback: try to extract vendor name from text
      const vendorLine = rawText.split('\n').find((l: string) => l.trim().length > 3 && !l.match(/invoice|date|page/i))
      parsed = parseGeneric(rawText, vendorLine?.trim() || 'Unknown Vendor')
    }
  }

  // Ensure we always have a vendor name
  if (!parsed.vendorName) parsed.vendorName = originalFileName.replace(/\.pdf$/i, '') || 'Unknown Vendor'

  // Recalculate invoice total if missing
  if (!parsed.invoiceTotal && parsed.subTotal) {
    parsed.invoiceTotal = (parsed.subTotal || 0) + (parsed.taxTotal || 0) + (parsed.otherCharges || 0)
  }

  return {
    vendorName: parsed.vendorName || 'Unknown Vendor',
    invoiceNumber: parsed.invoiceNumber || '',
    invoiceDate: parsed.invoiceDate,
    deliveryDate: parsed.deliveryDate,
    paymentDueDate: parsed.paymentDueDate,
    poNumber: parsed.poNumber,
    orderNumber: parsed.orderNumber,
    customerNumber: parsed.customerNumber,
    soldToName: parsed.soldToName,
    soldToAddress: parsed.soldToAddress,
    shipToName: parsed.shipToName,
    shipToAddress: parsed.shipToAddress,
    lineItems: parsed.lineItems || [],
    subTotal: parsed.subTotal || 0,
    taxTotal: parsed.taxTotal || 0,
    otherCharges: parsed.otherCharges || 0,
    invoiceTotal: parsed.invoiceTotal || 0,
    totalItems: parsed.lineItems?.length || 0,
    pageCount,
    rawText,
  }
}
