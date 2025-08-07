import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import mammoth from 'mammoth'
import csv from 'csv-parser'
import { Readable } from 'stream'
import pdf from 'pdf-parse'
import { getUserFromRequest } from '@/lib/auth'
import { rateLimiter, RATE_LIMITS } from '@/lib/simple-rate-limiter'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.csv', '.json']

export async function POST(request: NextRequest) {
  try {
    // 🔒 SECURITY: Rate limiting for uploads
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
    if (!rateLimiter(`upload_${clientIP}`, RATE_LIMITS.UPLOAD)) {
      return NextResponse.json(
        { error: 'Too many upload attempts. Please slow down.' },
        { status: 429 }
      )
    }

    // 🔒 SECURITY: Require authentication
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    // 🔒 SECURITY: File validation
    const fileExtension = path.extname(file.name).toLowerCase()
    
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return NextResponse.json(
        { error: `File type ${fileExtension} not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}` },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // Convert File to Buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    let extractedText = ''

    try {
      switch (fileExtension) {
        case '.pdf':
          try {
            const pdfData = await pdf(buffer)
            extractedText = pdfData.text
            
            // Clean up common PDF artifacts
            extractedText = extractedText
              .replace(/\f/g, '\n') // Replace form feeds with newlines
              .replace(/(.)\1{10,}/g, '$1') // Remove excessive repeated characters
              .replace(/\s+/g, ' ') // Normalize whitespace
              .trim()
              
            if (!extractedText || extractedText.length < 50) {
              throw new Error('PDF appears to be empty or contains mostly images')
            }
          } catch (pdfError) {
            console.error('PDF parsing error:', pdfError)
            return NextResponse.json(
              { 
                error: 'Failed to extract text from PDF. This may be a scanned document or contain primarily images.',
                suggestion: 'Try converting the PDF to text first, or use the "Text" input option to paste content manually.',
                details: pdfError instanceof Error ? pdfError.message : 'Unknown PDF error'
              },
              { status: 400 }
            )
          }
          break

        case '.docx':
          const docxData = await mammoth.extractRawText({ buffer })
          extractedText = docxData.value
          break

        case '.txt':
          extractedText = buffer.toString('utf-8')
          break

        case '.csv':
          // For CSV, we'll convert it to a readable format
          const csvText = buffer.toString('utf-8')
          const rows: any[] = []
          
          await new Promise<void>((resolve, reject) => {
            const readable = Readable.from([csvText])
            
            readable
              .pipe(csv())
              .on('data', (row: any) => rows.push(row))
              .on('end', () => resolve())
              .on('error', reject)
          })

          // Convert CSV rows to readable text
          extractedText = rows.map(row => 
            Object.entries(row).map(([key, value]) => `${key}: ${value}`).join(', ')
          ).join('\n')
          break

        default:
          return NextResponse.json(
            { error: `Unsupported file type: ${fileExtension}` },
            { status: 400 }
          )
      }

      // Final validation
      if (!extractedText || extractedText.trim().length < 10) {
        return NextResponse.json(
          { 
            error: 'File appears to be empty or contains insufficient text content (minimum 10 characters required)',
            extractedLength: extractedText.length,
            fileName: file.name
          },
          { status: 400 }
        )
      }

      console.log(`✅ Successfully processed ${file.name}: ${extractedText.length} characters extracted`)

      return NextResponse.json({
        success: true,
        content: extractedText,
        fileName: file.name,
        fileSize: file.size,
        contentLength: extractedText.length,
        fileType: fileExtension,
        wordCount: extractedText.split(/\s+/).length
      })

    } catch (extractionError) {
      console.error('File extraction error:', extractionError)
      return NextResponse.json(
        { 
          error: 'Failed to extract text from file. Please check file format and try again.',
          details: extractionError instanceof Error ? extractionError.message : 'Unknown error',
          fileType: fileExtension,
          fileName: file.name
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error during file upload',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'File upload endpoint ready',
    supportedTypes: ALLOWED_EXTENSIONS,
    maxSize: `${MAX_FILE_SIZE / 1024 / 1024}MB`,
    status: 'active'
  })
}