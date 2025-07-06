import { URL } from 'url'

// Constants
const MAX_RESPONSE_SIZE = 1024 * 1024 // 1MB
const TIMEOUT_MS = 5000 // 5 seconds

// Private IP ranges to block (SSRF protection)
const PRIVATE_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^127\./,
  /^169\.254\./,
  /^fc00:/,
  /^fe80:/,
  /^::1$/,
  /^localhost$/i
]

// User agent to use for requests
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'

/**
 * Validates if a URL is safe to scrape
 */
function validateUrl(urlString) {
  try {
    const url = new URL(urlString)
    
    // Only allow HTTP and HTTPS
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { valid: false, error: 'Only HTTP and HTTPS URLs are allowed' }
    }
    
    // Check for private IP ranges
    const hostname = url.hostname.toLowerCase()
    if (PRIVATE_IP_RANGES.some(range => range.test(hostname))) {
      return { valid: false, error: 'Private IP addresses are not allowed' }
    }
    
    // Block some common problematic hostnames
    const blockedHosts = ['localhost', '0.0.0.0', '127.0.0.1']
    if (blockedHosts.includes(hostname)) {
      return { valid: false, error: 'This hostname is not allowed' }
    }
    
    return { valid: true, url }
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' }
  }
}

/**
 * Fetches HTML content from a URL with size and timeout limits
 */
async function fetchWithLimits(url) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      redirect: 'follow',
      method: 'GET'
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    // Check content type
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      throw new Error('URL does not return HTML content')
    }
    
    // Check content length
    const contentLength = response.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > MAX_RESPONSE_SIZE) {
      throw new Error(`Response too large (${contentLength} bytes, max ${MAX_RESPONSE_SIZE} bytes)`)
    }
    
    // Read response with size limit
    const reader = response.body.getReader()
    const chunks = []
    let totalLength = 0
    
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      totalLength += value.length
      if (totalLength > MAX_RESPONSE_SIZE) {
        throw new Error(`Response too large (max ${MAX_RESPONSE_SIZE} bytes)`)
      }
      
      chunks.push(value)
    }
    
    // Convert to text
    const uint8Array = new Uint8Array(totalLength)
    let offset = 0
    for (const chunk of chunks) {
      uint8Array.set(chunk, offset)
      offset += chunk.length
    }
    
    const html = new TextDecoder().decode(uint8Array)
    return html
    
  } catch (error) {
    clearTimeout(timeoutId)
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out')
    }
    
    throw error
  }
}

/**
 * Detects if content appears to be JavaScript-rendered
 */
function detectJsRenderedContent(html) {
  // Check for common JS frameworks and empty containers
  const jsFrameworkIndicators = [
    'id="__docusaurus"',
    'id="__next"',
    'id="__nuxt"',
    'id="app"',
    'id="root"',
    'data-reactroot',
    'ng-version'
  ]
  
  // Check for minimal body content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (bodyMatch) {
    const bodyContent = bodyMatch[1]
    // Remove scripts and styles from body content
    const cleanBodyContent = bodyContent
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<link[^>]*>/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
    
    // If body content is very small, likely JS-rendered
    if (cleanBodyContent.length < 100) {
      return true
    }
  }
  
  // Check for JS framework indicators
  return jsFrameworkIndicators.some(indicator => html.includes(indicator))
}

/**
 * Main serverless function handler
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  try {
    const { url } = req.query
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' })
    }
    
    // Validate URL
    const validation = validateUrl(url)
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error })
    }
    
    // Fetch HTML content
    const html = await fetchWithLimits(validation.url.href)
    
    // Check if content appears to be JavaScript-rendered
    const isJsRendered = detectJsRenderedContent(html)
    
    // Return successful response
    return res.status(200).json({
      html,
      url: validation.url.href,
      size: html.length,
      timestamp: new Date().toISOString(),
      isJsRendered,
      warning: isJsRendered ? 'This page appears to use JavaScript rendering. Content may be incomplete.' : null
    })
    
  } catch (error) {
    console.error('Scraping error:', error)
    
    // Handle specific error types
    if (error.message.includes('timeout')) {
      return res.status(504).json({ error: 'Request timed out' })
    }
    
    if (error.message.includes('too large')) {
      return res.status(413).json({ error: error.message })
    }
    
    if (error.message.includes('HTTP')) {
      return res.status(502).json({ error: error.message })
    }
    
    if (error.message.includes('not return HTML')) {
      return res.status(400).json({ error: error.message })
    }
    
    // Generic error response
    return res.status(500).json({ 
      error: 'Failed to scrape URL',
      details: error.message 
    })
  }
} 