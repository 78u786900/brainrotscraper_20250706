import { useState } from 'react'
import { Download, Copy, Trash2, ExternalLink, Loader2, AlertCircle, AlertTriangle } from 'lucide-react'

function App() {
  const [url, setUrl] = useState('')
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [isJsRendered, setIsJsRendered] = useState(false)
  const [dynamicMode, setDynamicMode] = useState(false)
  const [activeTab, setActiveTab] = useState('html')
  const [contentAnalysis, setContentAnalysis] = useState(null)

  const validateUrl = (urlString) => {
    try {
      const urlObj = new URL(urlString.trim())
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
    } catch {
      return false
    }
  }

  const analyzeContent = (html) => {
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
    const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i)
    const h1Matches = html.match(/<h1[^>]*>([^<]*)<\/h1>/gi) || []
    const linkMatches = html.match(/<a[^>]*href="[^"]*"[^>]*>/gi) || []
    const imgMatches = html.match(/<img[^>]*>/gi) || []
    
    return {
      title: titleMatch ? titleMatch[1] : '未找到標題',
      description: descMatch ? descMatch[1] : '未找到描述',
      headings: h1Matches.length,
      links: linkMatches.length,
      images: imgMatches.length,
      size: html.length,
      hasJs: html.includes('<script'),
      framework: detectFramework(html)
    }
  }
  
  const detectFramework = (html) => {
    if (html.includes('__docusaurus')) return 'Docusaurus'
    if (html.includes('__next')) return 'Next.js'
    if (html.includes('__nuxt')) return 'Nuxt.js'
    if (html.includes('data-reactroot')) return 'React'
    if (html.includes('ng-version')) return 'Angular'
    if (html.includes('data-v-')) return 'Vue.js'
    return '未知'
  }

  const handleScrape = async () => {
    const trimmedUrl = url.trim()
    
    if (!trimmedUrl) {
      setError('Please enter a URL')
      return
    }

    if (!validateUrl(trimmedUrl)) {
      setError('Please enter a valid HTTP or HTTPS URL')
      return
    }

    setError('')
    setWarning('')
    setLoading(true)
    setHtml('')

    try {
      const apiEndpoint = dynamicMode ? '/api/scrape-dynamic' : '/api/scrape'
      const response = await fetch(`${apiEndpoint}?url=${encodeURIComponent(trimmedUrl)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to scrape URL')
      }

      setHtml(data.html)
      setIsJsRendered(data.isJsRendered || false)
      setWarning(data.warning || '')
      
      // Analyze content
      const analysis = analyzeContent(data.html)
      setContentAnalysis(analysis)
    } catch (err) {
      setError(err.message || 'An error occurred while scraping the URL')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(html)
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'scraped-page.html'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleClear = () => {
    setHtml('')
    setError('')
    setWarning('')
    setIsJsRendered(false)
    setContentAnalysis(null)
    setActiveTab('html')
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleScrape()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Link to HTML Scraper
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Paste any URL and get the raw HTML markup instantly
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            No sign-up required • Free to use • Static HTML only
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <label htmlFor="url-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Paste a URL to scrape
          </label>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <ExternalLink className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="url-input"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="https://example.com"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                disabled={loading}
              />
            </div>
            <button
              onClick={handleScrape}
              disabled={loading || !url.trim()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors duration-200 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {dynamicMode ? 'Rendering...' : 'Scraping...'}
                </>
              ) : (
                'Scrape'
              )}
            </button>
          </div>
          
          {/* Dynamic Mode Toggle */}
          <div className="mt-4 flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={dynamicMode}
                onChange={(e) => setDynamicMode(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Dynamic Mode (JavaScript Rendering)
              </span>
            </label>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {dynamicMode ? '⚡ Slower but captures JS-rendered content' : '🚀 Fast static HTML only'}
            </div>
          </div>

          {error && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}
        </div>

        {/* Results Section */}
        {html && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            {/* Warning Section */}
            {warning && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                <AlertTriangle className="w-5 h-5" />
                <div>
                  <p className="font-medium">JavaScript-Rendered Content Detected</p>
                  <p className="text-sm">{warning}</p>
                  {isJsRendered && (
                    <p className="text-sm mt-1">
                      💡 For complete content, consider using a tool that supports JavaScript rendering like Puppeteer.
                    </p>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Scraped HTML
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200 flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download .html
                </button>
                <button
                  onClick={handleClear}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear
                </button>
              </div>
            </div>

            <div className="border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900">
              {/* Tab Headers */}
              <div className="flex border-b border-gray-300 dark:border-gray-600">
                <button 
                  onClick={() => setActiveTab('html')}
                  className={`px-4 py-2 text-sm font-medium ${activeTab === 'html' ? 'text-blue-600 border-b-2 border-blue-600 bg-white dark:bg-gray-800' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                >
                  Raw HTML
                </button>
                <button 
                  onClick={() => setActiveTab('preview')}
                  className={`px-4 py-2 text-sm font-medium ${activeTab === 'preview' ? 'text-blue-600 border-b-2 border-blue-600 bg-white dark:bg-gray-800' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                >
                  Preview
                </button>
                <button 
                  onClick={() => setActiveTab('analysis')}
                  className={`px-4 py-2 text-sm font-medium ${activeTab === 'analysis' ? 'text-blue-600 border-b-2 border-blue-600 bg-white dark:bg-gray-800' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                >
                  Analysis Report
                </button>
              </div>
              
              {/* Content Area */}
              {activeTab === 'html' && (
                <textarea
                  readOnly
                  value={html}
                  rows={20}
                  className="w-full p-4 text-sm font-mono text-gray-900 dark:text-gray-100 resize-y bg-transparent border-0 focus:ring-0"
                  placeholder="Scraped HTML will appear here..."
                />
              )}
              
              {activeTab === 'preview' && (
                <div className="p-4 h-96 overflow-auto">
                  <iframe
                    srcDoc={html}
                    className="w-full h-full border-0"
                    title="HTML Preview"
                    sandbox="allow-same-origin"
                  />
                </div>
              )}
              
              {activeTab === 'analysis' && contentAnalysis && (
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">Basic Info</h4>
                      <div className="text-sm space-y-1">
                        <p><span className="font-medium">Title:</span> {contentAnalysis.title}</p>
                        <p><span className="font-medium">Framework:</span> {contentAnalysis.framework}</p>
                        <p><span className="font-medium">File Size:</span> {(contentAnalysis.size / 1024).toFixed(1)} KB</p>
                        <p><span className="font-medium">Contains JavaScript:</span> {contentAnalysis.hasJs ? 'Yes' : 'No'}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">Content Stats</h4>
                      <div className="text-sm space-y-1">
                        <p><span className="font-medium">Heading Count:</span> {contentAnalysis.headings}</p>
                        <p><span className="font-medium">Link Count:</span> {contentAnalysis.links}</p>
                        <p><span className="font-medium">Image Count:</span> {contentAnalysis.images}</p>
                      </div>
                    </div>
                  </div>
                  {contentAnalysis.description !== '未找到描述' && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">Page Description</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{contentAnalysis.description}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              {html.length.toLocaleString()} characters • {Math.round(html.length / 1024)} KB
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p className="mb-2">
            <strong>Disclaimer:</strong> You are responsible for complying with target site&apos;s Terms of Service.
          </p>
          <p>
            This tool only fetches static HTML content. JavaScript-rendered content is not included.
          </p>
        </div>
      </div>
    </div>
  )
}

export default App 