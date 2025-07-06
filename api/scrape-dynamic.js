/* eslint-env node */
import { URL } from 'url'
import puppeteer from 'puppeteer'

// Constants
const MAX_RESPONSE_SIZE = 1024 * 1024 // 1MB
const TIMEOUT_MS = 10000 // 10 seconds for dynamic content
const VIEWPORT_WIDTH = 1920
const VIEWPORT_HEIGHT = 1080

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
 * Scrapes content using Puppeteer for dynamic content
 */
async function scrapeWithPuppeteer(url) {
  let browser = null
  let page = null
  
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-zygote',
        '--single-process',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    })
    
    page = await browser.newPage()
    
    // Set viewport
    await page.setViewport({
      width: VIEWPORT_WIDTH,
      height: VIEWPORT_HEIGHT
    })
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')
    
    // Navigate to page with timeout
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: TIMEOUT_MS
    })
    
    // Wait for potential dynamic content
    await page.waitForTimeout(2000)
    
    // Get full HTML content
    const html = await page.content()
    
    // Check size limit
    if (html.length > MAX_RESPONSE_SIZE) {
      throw new Error(`Response too large (${html.length} bytes, max ${MAX_RESPONSE_SIZE} bytes)`)
    }
    
    // Get additional metadata
    const title = await page.title()
    const screenshot = await page.screenshot({
      type: 'png',
      encoding: 'base64',
      clip: {
        x: 0,
        y: 0,
        width: Math.min(VIEWPORT_WIDTH, 1200),
        height: Math.min(VIEWPORT_HEIGHT, 800)
      }
    })
    
    return {
      html,
      title,
      screenshot: `data:image/png;base64,${screenshot}`,
      renderTime: new Date().toISOString()
    }
    
  } finally {
    if (page) await page.close()
    if (browser) await browser.close()
  }
}

/**
 * Main serverless function handler for dynamic scraping
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
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
    
    // Scrape with Puppeteer
    const result = await scrapeWithPuppeteer(validation.url.href)
    
    // Return successful response
    return res.status(200).json({
      html: result.html,
      title: result.title,
      screenshot: result.screenshot,
      url: validation.url.href,
      size: result.html.length,
      timestamp: new Date().toISOString(),
      renderTime: result.renderTime,
      isDynamic: true,
      method: 'puppeteer'
    })
    
  } catch (error) {
    console.error('Dynamic scraping error:', error)
    
    // Handle specific error types
    if (error.message.includes('timeout')) {
      return res.status(504).json({ error: 'Request timed out' })
    }
    
    if (error.message.includes('too large')) {
      return res.status(413).json({ error: error.message })
    }
    
    if (error.message.includes('net::ERR_')) {
      return res.status(502).json({ error: 'Failed to load page' })
    }
    
    // Generic error response
    return res.status(500).json({ 
      error: 'Failed to scrape URL with dynamic rendering',
      details: error.message 
    })
  }
} 