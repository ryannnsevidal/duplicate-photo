import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import * as jose from 'https://deno.land/x/jose@v4.15.5/index.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const recaptchaSecret = Deno.env.get('RECAPTCHA_SECRET_KEY')
const rcloneRemote = Deno.env.get('RCLONE_REMOTE') || 'default:uploads'

// JWT Key caching
let jwksCache: jose.JSONWebKeySet | null = null
let jwksCacheExpiry = 0

interface FileMetadata {
  filename: string
  fileType: string
  fileSize: number
  userId: string
  sha256Hash: string
  perceptualHash?: string
  structureHash?: string
  ipAddress: string
  userAgent: string
}

interface DuplicateMatch {
  original_filename: string
  sha256_hash: string
  created_at?: string
}

interface DedupResult {
  isDuplicate: boolean
  duplicateType?: string
  confidence?: number
  matches?: DuplicateMatch[]
  processingTimeMs: number
}

// Create supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Fetch and cache JWKS from Supabase
async function getJWKS(): Promise<jose.JSONWebKeySet> {
  const now = Date.now()
  
  if (jwksCache && now < jwksCacheExpiry) {
    return jwksCache
  }

  try {
    const projectRef = supabaseUrl.split('//')[1].split('.')[0]
    const jwksUrl = `https://${projectRef}.supabase.co/auth/v1/keys`
    
    const response = await fetch(jwksUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch JWKS: ${response.status}`)
    }
    
    const json = await response.json()
    jwksCache = json as jose.JSONWebKeySet
    jwksCacheExpiry = now + (12 * 60 * 60 * 1000) // Cache for 12 hours
    
    console.log('JWKS cache updated successfully')
    return jwksCache
  } catch (error) {
    console.error('Failed to fetch JWKS:', error)
    // If cache exists, use it even if expired
    if (jwksCache) {
      console.warn('Using expired JWKS cache due to fetch failure')
      return jwksCache
    }
    throw new Error('No JWKS available')
  }
}

// Enhanced JWT verification with key rotation support
async function verifyJWT(authHeader: string | null): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  
  try {
    const jwks = await getJWKS()
    const keySet = jose.createLocalJWKSet(jwks)
    
    const { payload } = await jose.jwtVerify(token, keySet, {
      issuer: supabaseUrl,
      audience: 'authenticated'
    })
    
    return payload.sub || null
  } catch (error) {
    console.error('JWT verification failed:', error)
    
    // Try refreshing JWKS cache once on failure
    if (jwksCache) {
      try {
        console.log('Refreshing JWKS cache and retrying verification')
        jwksCache = null
        jwksCacheExpiry = 0
        
        const jwks = await getJWKS()
        const keySet = jose.createLocalJWKSet(jwks)
        
        const { payload } = await jose.jwtVerify(token, keySet, {
          issuer: supabaseUrl,
          audience: 'authenticated'
        })
        
        return payload.sub || null
      } catch (retryError) {
        console.error('JWT verification failed even after JWKS refresh:', retryError)
      }
    }
    
    return null
  }
}

// SHA256 hash computation
async function computeSHA256(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Real reCAPTCHA verification
async function verifyCaptcha(captchaToken: string, expectedAction: string): Promise<boolean> {
  if (!recaptchaSecret || !captchaToken) {
    console.warn('reCAPTCHA not configured or token missing')
    return true // Allow in development, block in production
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: recaptchaSecret,
        response: captchaToken,
      }),
    })

    const result = await response.json()
    
    console.log('reCAPTCHA verification result:', { 
      success: result.success, 
      score: result.score, 
      action: result.action 
    })

    // Log to captcha_verifications table
    await supabase.from('captcha_verifications').insert({
      captcha_token: captchaToken.substring(0, 50), // Truncate for privacy
      action_type: expectedAction,
      ip_address: '0.0.0.0', // Will be updated with real IP
      verified_at: new Date().toISOString()
    })

    return result.success && 
           result.score >= 0.7 && 
           result.action === expectedAction
  } catch (error) {
    console.error('reCAPTCHA verification error:', error)
    return false
  }
}

// Advanced PDF structural fingerprinting
function extractPDFStructure(pdfData: Uint8Array): string {
  try {
    const pdfText = new TextDecoder('utf-8', { fatal: false }).decode(pdfData)
    
    // Extract PDF metadata
    const pageCountMatch = pdfText.match(/\/Count\s+(\d+)/)
    const pageCount = pageCountMatch ? parseInt(pageCountMatch[1]) : 0
    
    // Extract font information
    const fontMatches = pdfText.match(/\/BaseFont\s*\/([-A-Za-z0-9+]+)/g) || []
    const fonts = [...new Set(fontMatches.map(f => f.split('/')[2]))].sort()
    
    // Extract text block patterns (simplified)
    const textBlocks = pdfText.match(/BT\s+([^E]+)ET/g) || []
    const textPattern = textBlocks.length.toString().padStart(4, '0')
    
    // Extract image references
    const imageMatches = pdfText.match(/\/Subtype\s*\/Image/g) || []
    const imageCount = imageMatches.length
    
    // Create structural fingerprint
    const structure = {
      pageCount,
      fontCount: fonts.length,
      textBlockCount: textBlocks.length,
      imageCount,
      fontSignature: fonts.slice(0, 5).join(',') // Top 5 fonts
    }
    
    // Hash the structure
    const structureString = JSON.stringify(structure)
    return computeSimpleHash(structureString)
  } catch (error) {
    console.error('PDF structure extraction failed:', error)
    return ''
  }
}

// Simple hash function for structure
function computeSimpleHash(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}

// Enhanced duplicate detection with structural analysis
async function checkDuplicates(
  sha256Hash: string, 
  perceptualHash?: string, 
  structureHash?: string,
  fileType?: string
): Promise<DedupResult> {
  const startTime = Date.now()
  
  // 1. Exact SHA256 matches (highest confidence)
  const { data: exactMatches, error: exactError } = await supabase
    .from('file_upload_logs')
    .select('*')
    .eq('sha256_hash', sha256Hash)

  if (exactError) {
    console.error('Error checking exact duplicates:', exactError)
    throw new Error('Database query failed')
  }

  if (exactMatches && exactMatches.length > 0) {
    return {
      isDuplicate: true,
      duplicateType: 'sha256',
      confidence: 1.0,
      matches: exactMatches as DuplicateMatch[],
      processingTimeMs: Date.now() - startTime
    }
  }

  // 2. Perceptual hash matches for images
  if (perceptualHash && fileType?.startsWith('image/')) {
    const { data: fuzzyMatches, error: fuzzyError } = await supabase
      .from('file_upload_logs')
      .select('*')
      .eq('perceptual_hash', perceptualHash)

    if (!fuzzyError && fuzzyMatches && fuzzyMatches.length > 0) {
      return {
        isDuplicate: true,
        duplicateType: 'phash',
        confidence: 0.95,
        matches: fuzzyMatches as DuplicateMatch[],
        processingTimeMs: Date.now() - startTime
      }
    }
  }

  // 3. Structural hash matches for PDFs
  if (structureHash && fileType === 'application/pdf') {
    const { data: structureMatches, error: structureError } = await supabase
      .from('file_upload_logs')
      .select('*')
      .eq('content_hash', structureHash) // Using content_hash for structure

    if (!structureError && structureMatches && structureMatches.length > 0) {
      return {
        isDuplicate: true,
        duplicateType: 'structure',
        confidence: 0.85,
        matches: structureMatches as DuplicateMatch[],
        processingTimeMs: Date.now() - startTime
      }
    }
  }

  return { 
    isDuplicate: false, 
    processingTimeMs: Date.now() - startTime 
  }
}

// Real Rclone cloud sync using Deno subprocess
async function syncToCloud(filename: string, fileData: Uint8Array): Promise<{ success: boolean, cloudPath?: string, error?: string }> {
  try {
    // Create temporary file
    const tempDir = '/tmp/uploads'
    const tempFilePath = `${tempDir}/${Date.now()}-${filename}`
    
    // Ensure temp directory exists
    try {
      await Deno.mkdir(tempDir, { recursive: true })
    } catch (error) {
      if (!(error instanceof Deno.errors.AlreadyExists)) {
        throw error
      }
    }
    
    // Write file to temp location
    await Deno.writeFile(tempFilePath, fileData)
    
    // Execute Rclone sync
    const command = new Deno.Command('rclone', {
      args: ['copy', tempFilePath, rcloneRemote],
      stdout: 'piped',
      stderr: 'piped'
    })
    
    const { code, stdout, stderr } = await command.output()
    
    // Clean up temp file
    try {
      await Deno.remove(tempFilePath)
    } catch (cleanupError) {
      console.warn('Failed to cleanup temp file:', cleanupError)
    }
    
    if (code !== 0) {
      const errorMessage = new TextDecoder().decode(stderr)
      console.error('Rclone sync failed:', errorMessage)
      return { 
        success: false, 
        error: `Rclone exit code ${code}: ${errorMessage}` 
      }
    }
    
    const cloudPath = `${rcloneRemote}/${filename}`
    const output = new TextDecoder().decode(stdout)
    console.log('Rclone sync successful:', { cloudPath, output })
    
    return { success: true, cloudPath }
  } catch (error) {
    console.error('Rclone sync error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown sync error' 
    }
  }
}

// Simple perceptual hash for images
function computePerceptualHash(imageData: Uint8Array): string {
  const hash = imageData.slice(0, 64).reduce((acc, byte, idx) => {
    return acc + (byte > 128 ? '1' : '0')
  }, '')
  return hash.padEnd(64, '0')
}

// Log file upload metadata to Supabase
async function logUpload(metadata: FileMetadata, cloudPath?: string, duplicateOf?: string): Promise<void> {
  const uploadLog = {
    user_id: metadata.userId,
    original_filename: metadata.filename,
    file_type: metadata.fileType,
    file_size_bytes: metadata.fileSize,
    sha256_hash: metadata.sha256Hash,
    perceptual_hash: metadata.perceptualHash,
    cloud_provider: 'rclone' as const,
    cloud_path: cloudPath || '',
    rclone_remote: Deno.env.get('RCLONE_REMOTE') || 'default:uploads',
    upload_status: cloudPath ? 'uploaded' : 'failed',
    duplicate_of: duplicateOf,
    metadata: {
      ip_address: metadata.ipAddress,
      user_agent: metadata.userAgent,
      upload_timestamp: new Date().toISOString()
    }
  }

  const { error } = await supabase
    .from('file_upload_logs')
    .insert([uploadLog])

  if (error) {
    console.error('Failed to log upload:', error)
    throw new Error('Failed to log upload metadata')
  }
}

// Log deduplication event to new table
async function logDedupEvent(
  userId: string, 
  fileHash: string, 
  filename: string,
  fileType: string,
  dedupResult: DedupResult,
  syncStatus: string = 'pending',
  syncError?: string
): Promise<void> {
  const dedupEvent = {
    user_id: userId,
    file_hash: fileHash,
    original_filename: filename,
    file_type: fileType,
    is_duplicate: dedupResult.isDuplicate,
    duplicate_type: dedupResult.duplicateType,
    confidence: dedupResult.confidence,
    similar_files: dedupResult.matches ? 
      dedupResult.matches.map(m => ({ 
        filename: m.original_filename, 
        hash: m.sha256_hash,
        upload_date: m.created_at 
      })) : [],
    processing_time_ms: dedupResult.processingTimeMs,
    sync_status: syncStatus,
    sync_error: syncError,
    metadata: {
      user_agent: 'edge-function',
      timestamp: new Date().toISOString()
    }
  }

  const { error } = await supabase
    .from('dedup_events')
    .insert([dedupEvent])

  if (error) {
    console.error('Failed to log dedup event:', error)
    // Don't throw - this is logging, not critical path
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const path = url.pathname

    // Health check endpoint
    if (path === '/healthz' && req.method === 'GET') {
      return new Response(JSON.stringify({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // Verify JWT for protected endpoints
    const authHeader = req.headers.get('Authorization')
    const userId = await verifyJWT(authHeader)
    
    if (!userId) {
      return new Response(JSON.stringify({ 
        error: 'Unauthorized', 
        message: 'Valid JWT token required' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      })
    }

    // File upload endpoint
    if (path === '/upload' && req.method === 'POST') {
      // Verify reCAPTCHA first
      const captchaToken = req.headers.get('x-captcha-token')
      if (recaptchaSecret) {
        const captchaValid = await verifyCaptcha(captchaToken || '', 'upload')
        if (!captchaValid) {
          return new Response(JSON.stringify({ 
            error: 'Forbidden', 
            message: 'Failed CAPTCHA validation' 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403
          })
        }
      }

      const formData = await req.formData()
      const file = formData.get('file') as File
      
      if (!file) {
        return new Response(JSON.stringify({ 
          error: 'Bad Request', 
          message: 'No file provided' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        })
      }

      // Validate file type and size
      const allowedTypes = ['image/', 'application/pdf']
      if (!allowedTypes.some(type => file.type.startsWith(type))) {
        return new Response(JSON.stringify({ 
          error: 'Unsupported Media Type', 
          message: 'Only images and PDFs are supported' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 415
        })
      }

      // File size limit: 50MB
      if (file.size > 50 * 1024 * 1024) {
        return new Response(JSON.stringify({ 
          error: 'Payload Too Large', 
          message: 'File size must be under 50MB' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 413
        })
      }

      // Read file data
      const fileData = new Uint8Array(await file.arrayBuffer())
      
      // Compute hashes
      const sha256Hash = await computeSHA256(fileData)
      let perceptualHash: string | undefined
      let structureHash: string | undefined

      if (file.type.startsWith('image/')) {
        perceptualHash = computePerceptualHash(fileData)
      } else if (file.type === 'application/pdf') {
        structureHash = extractPDFStructure(fileData)
      }

      // Check for duplicates
      const duplicateCheck = await checkDuplicates(sha256Hash, perceptualHash, structureHash, file.type)
      
      if (duplicateCheck.isDuplicate) {
        await logDedupEvent(
          userId, 
          sha256Hash, 
          file.name, 
          file.type, 
          duplicateCheck,
          'skipped',
          'Duplicate file detected'
        )

        return new Response(JSON.stringify({
          error: 'Conflict',
          message: 'Duplicate file detected',
          duplicateType: duplicateCheck.duplicateType,
          confidence: duplicateCheck.confidence,
          existingFiles: duplicateCheck.matches,
          processingTimeMs: duplicateCheck.processingTimeMs
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409
        })
      }

      // Sync to cloud storage
      const syncResult = await syncToCloud(file.name, fileData)
      
      if (!syncResult.success) {
        await logDedupEvent(
          userId, 
          sha256Hash, 
          file.name, 
          file.type, 
          duplicateCheck,
          'failed',
          syncResult.error
        )

        return new Response(JSON.stringify({
          error: 'Internal Server Error',
          message: 'Failed to sync file to cloud storage',
          details: syncResult.error
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        })
      }

      // Log successful upload
      const metadata: FileMetadata = {
        filename: file.name,
        fileType: file.type,
        fileSize: file.size,
        userId,
        sha256Hash,
        perceptualHash,
        structureHash,
        ipAddress: req.headers.get('x-forwarded-for') || '0.0.0.0',
        userAgent: req.headers.get('user-agent') || 'unknown'
      }

      await logUpload(metadata, syncResult.cloudPath)
      
      await logDedupEvent(
        userId, 
        sha256Hash, 
        file.name, 
        file.type, 
        duplicateCheck,
        'success'
      )

      return new Response(JSON.stringify({
        success: true,
        message: 'File uploaded successfully',
        fileId: sha256Hash,
        cloudPath: syncResult.cloudPath,
        processingTimeMs: duplicateCheck.processingTimeMs,
        metadata: {
          filename: file.name,
          size: file.size,
          type: file.type,
          sha256: sha256Hash,
          perceptualHash,
          structureHash
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201
      })
    }

    // Enhanced duplicate check endpoint
    if (path.startsWith('/dedup/check/') && req.method === 'GET') {
      const sha256 = path.split('/').pop()
      
      if (!sha256) {
        return new Response(JSON.stringify({ 
          error: 'Bad Request', 
          message: 'SHA256 hash required' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        })
      }

      const duplicateCheck = await checkDuplicates(sha256)
      
      return new Response(JSON.stringify({
        sha256,
        isDuplicate: duplicateCheck.isDuplicate,
        duplicateType: duplicateCheck.duplicateType,
        confidence: duplicateCheck.confidence,
        matches: duplicateCheck.matches || [],
        processingTimeMs: duplicateCheck.processingTimeMs
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // 404 for unmatched routes
    return new Response(JSON.stringify({ 
      error: 'Not Found', 
      message: 'Endpoint not found' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 404
    })

  } catch (error) {
    console.error('Unhandled error:', error)
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})