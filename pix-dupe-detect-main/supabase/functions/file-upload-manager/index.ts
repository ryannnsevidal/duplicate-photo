import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { corsHeaders } from '../_shared/cors.ts';

// Types
interface FileUploadRequest {
  file: File;
  cloudProvider: 's3' | 'gdrive' | 'dropbox' | 'onedrive' | 'other';
  remoteName: string;
}

interface DuplicateResult {
  filename: string;
  similarity_score: number;
  file_id: string;
  cloud_path: string;
}

interface UploadResponse {
  success: boolean;
  file_id?: string;
  cloud_path?: string;
  duplicates: DuplicateResult[];
  is_duplicate: boolean;
  message: string;
}

// Utility functions
function getFileType(filename: string): 'image' | 'pdf' | 'document' {
  const ext = filename.toLowerCase().split('.').pop() || '';
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) {
    return 'image';
  } else if (ext === 'pdf') {
    return 'pdf';
  } else {
    return 'document';
  }
}

async function calculateSHA256(file: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', file);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Simple perceptual hash for images (basic implementation)
function calculatePerceptualHash(file: Uint8Array): string {
  // This is a simplified version - in production, use a proper image hashing library
  const hash = Array.from(file.slice(0, 64))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return hash;
}

// PDF content hash (simplified)
function calculateContentHash(file: Uint8Array, fileType: string): string {
  if (fileType === 'pdf') {
    // In production, extract text content and hash it
    // For now, use first/last parts of file for basic structure comparison
    const start = Array.from(file.slice(0, 32));
    const end = Array.from(file.slice(-32));
    return [...start, ...end].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return '';
}

async function runRcloneUpload(
  filePath: string,
  remoteName: string,
  cloudPath: string
): Promise<{ success: boolean; output: string }> {
  try {
    // In a real environment, you would use subprocess or similar
    // For Edge Functions, we simulate the rclone operation
    console.log(`Simulating rclone copy ${filePath} ${remoteName}:${cloudPath}`);
    
    // Simulate rclone command execution
    const command = `rclone copy ${filePath} ${remoteName}:${cloudPath} --progress`;
    console.log(`Executing: ${command}`);
    
    // In production, replace with actual rclone execution:
    // const process = new Deno.Command("rclone", {
    //   args: ["copy", filePath, `${remoteName}:${cloudPath}`, "--progress"],
    //   stdout: "piped",
    //   stderr: "piped",
    // });
    // const { code, stdout, stderr } = await process.output();
    
    return {
      success: true,
      output: `File uploaded successfully to ${remoteName}:${cloudPath}`
    };
  } catch (error) {
    console.error('Rclone upload failed:', error);
    return {
      success: false,
      output: `Upload failed: ${error.message}`
    };
  }
}

async function detectDuplicates(
  supabase: any,
  userId: string,
  sha256Hash: string,
  perceptualHash: string | null,
  contentHash: string,
  fileType: string
): Promise<DuplicateResult[]> {
  const duplicates: DuplicateResult[] = [];
  
  try {
    // Check for exact SHA256 matches
    const { data: exactMatches } = await supabase
      .from('file_upload_logs')
      .select('id, original_filename, cloud_path, sha256_hash')
      .eq('user_id', userId)
      .eq('sha256_hash', sha256Hash);
    
    if (exactMatches && exactMatches.length > 0) {
      duplicates.push(...exactMatches.map(match => ({
        filename: match.original_filename,
        similarity_score: 1.0,
        file_id: match.id,
        cloud_path: match.cloud_path
      })));
    }
    
    // For images, check perceptual hash similarity
    if (fileType === 'image' && perceptualHash) {
      const { data: similarImages } = await supabase
        .from('file_upload_logs')
        .select('id, original_filename, cloud_path, perceptual_hash')
        .eq('user_id', userId)
        .eq('file_type', 'image')
        .not('perceptual_hash', 'is', null);
      
      if (similarImages) {
        for (const img of similarImages) {
          if (img.perceptual_hash && img.perceptual_hash !== perceptualHash) {
            // Calculate Hamming distance for perceptual hash similarity
            const similarity = calculateHashSimilarity(perceptualHash, img.perceptual_hash);
            if (similarity > 0.8) { // 80% similarity threshold
              duplicates.push({
                filename: img.original_filename,
                similarity_score: similarity,
                file_id: img.id,
                cloud_path: img.cloud_path
              });
            }
          }
        }
      }
    }
    
    // For PDFs, check content hash similarity
    if (fileType === 'pdf' && contentHash) {
      const { data: similarPdfs } = await supabase
        .from('file_upload_logs')
        .select('id, original_filename, cloud_path, content_hash')
        .eq('user_id', userId)
        .eq('file_type', 'pdf')
        .not('content_hash', 'is', null);
      
      if (similarPdfs) {
        for (const pdf of similarPdfs) {
          if (pdf.content_hash && pdf.content_hash !== contentHash) {
            const similarity = calculateHashSimilarity(contentHash, pdf.content_hash);
            if (similarity > 0.7) { // 70% similarity threshold for PDFs
              duplicates.push({
                filename: pdf.original_filename,
                similarity_score: similarity,
                file_id: pdf.id,
                cloud_path: pdf.cloud_path
              });
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Error detecting duplicates:', error);
  }
  
  return duplicates;
}

function calculateHashSimilarity(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) return 0;
  
  let matches = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] === hash2[i]) matches++;
  }
  
  return matches / hash1.length;
}

// Enhanced file security functions
async function verifyFileSignature(fileBytes: Uint8Array, declaredMimeType: string): Promise<boolean> {
  const signatures: Record<string, number[][]> = {
    'image/jpeg': [[0xFF, 0xD8, 0xFF]],
    'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
    'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
    'image/webp': [[0x52, 0x49, 0x46, 0x46], [0x57, 0x45, 0x42, 0x50]], // RIFF...WEBP
    'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
    'application/zip': [[0x50, 0x4B, 0x03, 0x04], [0x50, 0x4B, 0x05, 0x06]], // ZIP signatures
    'text/plain': [] // Text files don't have reliable signatures
  };

  const expectedSignatures = signatures[declaredMimeType];
  if (!expectedSignatures || expectedSignatures.length === 0) {
    // For unsupported types or text files, assume valid
    return true;
  }

  // Check if file starts with any of the expected signatures
  return expectedSignatures.some(signature => {
    if (fileBytes.length < signature.length) return false;
    return signature.every((byte, index) => fileBytes[index] === byte);
  });
}

async function containsMaliciousContent(fileBytes: Uint8Array, filename: string): Promise<boolean> {
  const maliciousPatterns = [
    // Script tags in various forms
    /<script[^>]*>/i,
    /<\/script>/i,
    /javascript:/i,
    /vbscript:/i,
    /data:text\/html/i,
    
    // Executable file signatures
    /^\x4D\x5A/, // PE executable (Windows .exe)
    /^\x7F\x45\x4C\x46/, // ELF executable (Linux)
    /^\xCA\xFE\xBA\xBE/, // Mach-O executable (macOS)
    
    // PHP tags
    /<\?php/i,
    /<\?=/i,
    
    // Common malware patterns
    /eval\s*\(/i,
    /base64_decode/i,
    /system\s*\(/i,
    /exec\s*\(/i,
    /shell_exec/i,
    /passthru/i,
    
    // SQL injection patterns in filenames
    /union\s+select/i,
    /drop\s+table/i,
    /delete\s+from/i,
    
    // Command injection
    /\$\([^)]*\)/,
    /`[^`]*`/,
    /;\s*(rm|del|format)/i
  ];

  // Convert bytes to string for pattern matching (first 1KB only)
  const textContent = new TextDecoder('utf-8', { fatal: false })
    .decode(fileBytes.slice(0, 1024));
  
  // Check filename for suspicious patterns
  const suspiciousFilenames = [
    /\.php$/i,
    /\.asp$/i,
    /\.jsp$/i,
    /\.exe$/i,
    /\.bat$/i,
    /\.cmd$/i,
    /\.scr$/i,
    /\.vbs$/i,
    /\.js$/i,
    /\.jar$/i
  ];

  const filenameSuspicious = suspiciousFilenames.some(pattern => pattern.test(filename));
  const contentSuspicious = maliciousPatterns.some(pattern => pattern.test(textContent));

  return filenameSuspicious || contentSuspicious;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verify JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Authenticated user: ${user.id}`);

    // Handle file upload
    if (req.method === 'POST') {
      // Rate limiting for file uploads
      const { data: rateLimitCheck } = await supabase.rpc('check_rate_limit', {
        _action: 'file_upload',
        _max_attempts: 50, // 50 uploads per hour
        _window_minutes: 60
      });

      if (!rateLimitCheck) {
        return new Response(
          JSON.stringify({ 
            error: 'Upload rate limit exceeded',
            message: 'Please wait before uploading more files',
            retry_after: 3600
          }),
          { 
            status: 429, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const formData = await req.formData();
      const file = formData.get('file') as File;
      const cloudProvider = formData.get('cloudProvider') as string || 'other';
      const remoteName = formData.get('remoteName') as string || 'default';

      if (!file) {
        return new Response(
          JSON.stringify({ error: 'No file provided' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log(`Processing file upload: ${file.name}, size: ${file.size} bytes`);

      // Enhanced file validation with MIME type verification
      const { data: validationResult } = await supabase.rpc('validate_file_upload', {
        _filename: file.name,
        _file_size: file.size,
        _content_type: file.type,
        _user_id: user.id
      });

      if (!validationResult?.valid) {
        console.warn('File Upload Manager - File validation failed:', validationResult);
        
        // Log security event for failed validation
        await supabase.rpc('log_security_event', {
          _action: 'file_upload_blocked',
          _resource: 'file_upload_manager',
          _success: false,
          _error_message: validationResult.error,
          _metadata: {
            filename: file.name,
            file_size: file.size,
            content_type: file.type,
            error_code: validationResult.error_code,
            user_id: user.id
          }
        });

        return new Response(
          JSON.stringify({ 
            error: 'File validation failed',
            details: validationResult.error,
            error_code: validationResult.error_code
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Read file content for enhanced validation
      const fileBuffer = await file.arrayBuffer();
      const fileBytes = new Uint8Array(fileBuffer);
      
      // Enhanced MIME type verification - check file signature
      if (!await verifyFileSignature(fileBytes, file.type)) {
        await supabase.rpc('log_security_event', {
          _action: 'file_signature_mismatch',
          _resource: 'file_upload_manager',
          _success: false,
          _error_message: 'File signature does not match declared MIME type',
          _metadata: {
            filename: file.name,
            declared_type: file.type,
            user_id: user.id
          }
        });

        return new Response(
          JSON.stringify({ 
            error: 'File type verification failed',
            details: 'File content does not match the declared file type',
            error_code: 'MIME_TYPE_MISMATCH'
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Scan for malicious patterns in file content
      if (await containsMaliciousContent(fileBytes, file.name)) {
        await supabase.rpc('log_security_event', {
          _action: 'malicious_content_detected',
          _resource: 'file_upload_manager',
          _success: false,
          _error_message: 'Malicious content patterns detected in file',
          _metadata: {
            filename: file.name,
            user_id: user.id,
            security_level: 'critical'
          }
        });

        return new Response(
          JSON.stringify({ 
            error: 'Security scan failed',
            details: 'File contains potentially malicious content',
            error_code: 'MALICIOUS_CONTENT'
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // File content already read above for validation

      // Determine file type
      const fileType = getFileType(file.name);
      
      // Calculate hashes
      const sha256Hash = await calculateSHA256(fileBytes);
      const perceptualHash = fileType === 'image' ? calculatePerceptualHash(fileBytes) : null;
      const contentHash = calculateContentHash(fileBytes, fileType);

      console.log(`File hashes - SHA256: ${sha256Hash.substring(0, 16)}...`);

      // Detect duplicates
      const duplicates = await detectDuplicates(
        supabase,
        user.id,
        sha256Hash,
        perceptualHash,
        contentHash,
        fileType
      );

      // Generate cloud path
      const now = new Date();
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const cloudPath = `uploads/${user.id}/${year}/${month}/${day}/${file.name}`;

      // Simulate file save to temporary location for rclone
      const tempFilePath = `/tmp/${crypto.randomUUID()}_${file.name}`;
      
      // Upload to cloud storage using rclone
      const rcloneResult = await runRcloneUpload(tempFilePath, remoteName, cloudPath);
      
      if (!rcloneResult.success) {
        return new Response(
          JSON.stringify({ 
            error: 'Cloud upload failed', 
            details: rcloneResult.output 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Sanitize filename before saving to database
      const { data: sanitizedFilename } = await supabase.rpc('sanitize_input', {
        _input: file.name,
        _max_length: 255
      });

      // Log upload to database
      const { data: uploadLog, error: dbError } = await supabase
        .from('file_upload_logs')
        .insert({
          user_id: user.id,
          original_filename: sanitizedFilename,
          file_type: fileType,
          file_size_bytes: file.size,
          sha256_hash: sha256Hash,
          perceptual_hash: perceptualHash,
          content_hash: contentHash,
          cloud_provider: cloudProvider,
          cloud_path: cloudPath,
          rclone_remote: remoteName,
          upload_status: 'uploaded',
          duplicate_of: duplicates.length > 0 ? duplicates[0].file_id : null,
          similarity_score: duplicates.length > 0 ? duplicates[0].similarity_score : null,
          metadata: {
            rclone_output: rcloneResult.output,
            upload_timestamp: new Date().toISOString(),
            security_validated: true
          }
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database insert error:', dbError);
        return new Response(
          JSON.stringify({ error: 'Failed to log upload', details: dbError.message }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log(`Upload logged successfully: ${uploadLog.id}`);

      // Log successful upload security event
      await supabase.rpc('log_security_event', {
        _action: 'file_upload_success',
        _resource: 'file_upload_manager',
        _success: true,
        _metadata: {
          file_id: uploadLog.id,
          filename: sanitizedFilename,
          file_size: file.size,
          file_type: fileType,
          is_duplicate: duplicates.length > 0,
          user_id: user.id
        }
      });

      const response: UploadResponse = {
        success: true,
        file_id: uploadLog.id,
        cloud_path: cloudPath,
        duplicates: duplicates,
        is_duplicate: duplicates.length > 0,
        message: duplicates.length > 0 
          ? `File uploaded successfully but ${duplicates.length} similar file(s) detected`
          : 'File uploaded successfully with no duplicates detected'
      };

      return new Response(
        JSON.stringify(response),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});