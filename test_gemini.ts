import { GoogleGenerativeAI } from '@google/generative-ai'
import fs from 'fs'

async function run() {
  require('dotenv').config()
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,
    }
  })

  console.log("Reading PDF...")
  const buffer = fs.readFileSync('/Users/adeeljabbar/Downloads/Gold Crust  (1).pdf')

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
    - EXTRACT EVERY SINGLE LINE ITEM. Scan all pages. Do NOT truncate, abbreviate, or summarize the lineItems array under ANY circumstances.
    - Items may not have explicit table headers. Look carefully for any lists of purchased products, baked goods, goods, or supplies (especially for bakeries like Gold Crust).
    - If there's no "vendorItemCode", use "" instead of making one up.
    - For vendorPhone, vendorEmail, vendorAddress: extract from the vendor/company header area of the invoice (fax numbers count as phone if no phone number is present).
    - vendorAddress should be the full street address of the vendor company (NOT the sold-to or ship-to address).
  `

  console.log("Asking Gemini to extract data...")
  try {
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
    console.log("Raw Response:")
    console.log(rawText)

    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    const cleanJson = jsonMatch ? jsonMatch[0] : rawText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
    const parsed = JSON.parse(cleanJson)
    console.log("Extracted Items Count:", parsed.lineItems?.length)
    console.log("Vendor Name:", parsed.vendorName)
  } catch (err: any) {
    console.error("Failed!", err)
  }
}

run()
