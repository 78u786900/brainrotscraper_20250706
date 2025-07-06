# Link to HTML Scraper

A simple, fast, and secure web scraper that fetches raw HTML content from any public URL. No sign-up required, no API keys needed.

## 🚀 Features

- **Simple Interface**: Just paste a URL and click "Scrape"
- **Dual Scraping Modes**: 
  - 🚀 **Static Mode**: Fast HTML-only scraping
  - ⚡ **Dynamic Mode**: JavaScript-rendered content with Puppeteer
- **Smart Detection**: Automatically detects JavaScript-rendered pages
- **Copy & Download**: Easy-to-use copy to clipboard and download functionality
- **Security First**: Built-in SSRF protection and input validation
- **Mobile Friendly**: Responsive design that works on all devices
- **Free to Use**: No registration, no API keys, completely free

## 🛠 Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Vercel Serverless Functions (Node.js)
- **Icons**: Lucide React
- **Deployment**: Vercel

## 🏃‍♂️ Quick Start

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd brainrotscraper
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

### Production Build

```bash
npm run build
```

## 🚀 Deployment

This project is designed to be deployed on Vercel:

1. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```

2. **Or connect your GitHub repository to Vercel**
   - Push your code to GitHub
   - Connect the repository in Vercel dashboard
   - Automatic deployments on every push

## 📡 API Reference

### Static Scrape Endpoint

```
GET /api/scrape?url={URL}
```

**Parameters:**
- `url` (required): The URL to scrape (must be HTTP or HTTPS)

**Success Response (200):**
```json
{
  "html": "<!DOCTYPE html>...",
  "url": "https://example.com",
  "size": 1024,
  "timestamp": "2023-07-05T10:30:00.000Z",
  "isJsRendered": true,
  "warning": "This page appears to use JavaScript rendering. Content may be incomplete."
}
```

### Dynamic Scrape Endpoint

```
GET /api/scrape-dynamic?url={URL}
```

**Parameters:**
- `url` (required): The URL to scrape (must be HTTP or HTTPS)

**Success Response (200):**
```json
{
  "html": "<!DOCTYPE html>...",
  "title": "Page Title",
  "screenshot": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "url": "https://example.com",
  "size": 1024,
  "timestamp": "2023-07-05T10:30:00.000Z",
  "renderTime": "2023-07-05T10:30:05.000Z",
  "isDynamic": true,
  "method": "puppeteer"
}
```

**Error Responses:**
- `400`: Invalid URL or blocked domain
- `413`: Response too large (>1MB)
- `504`: Request timeout
- `502`: HTTP error from target server

## 🔒 Security Features

- **SSRF Protection**: Blocks private IP ranges and localhost
- **Input Validation**: Strict URL validation
- **Size Limits**: Maximum 1MB response size
- **Timeout Protection**: 5-second request timeout
- **Content Type Validation**: Only accepts HTML content

## 🛡️ Privacy & Legal

- **No Data Storage**: HTML content is not stored on servers
- **Stateless**: Each request is independent
- **User Responsibility**: Users must comply with target site's Terms of Service
- **Respect robots.txt**: Please check robots.txt before scraping

## 🎯 Use Cases

- **Web Development**: Inspect HTML structure of websites
- **SEO Analysis**: Analyze meta tags and page structure
- **Research**: Gather HTML content for analysis
- **Testing**: Verify website markup
- **Learning**: Study HTML structure of different websites

## 📋 Limitations

- **Static HTML Only**: Does not execute JavaScript
- **No Authentication**: Cannot access login-protected pages
- **File Size Limit**: Maximum 1MB response size
- **Timeout**: 5-second request timeout
- **Rate Limiting**: May be rate-limited by target servers

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🐛 Issues & Support

If you encounter any issues or have questions:

1. Check the [Issues](../../issues) page
2. Create a new issue with detailed information
3. Include the URL you're trying to scrape (if appropriate)

## 🔮 Future Enhancements

- [ ] JavaScript-rendered content support (Puppeteer)
- [ ] User history and saved scrapes
- [ ] API rate limiting dashboard
- [ ] HTML to Markdown conversion
- [ ] PDF export functionality
- [ ] Batch URL processing

---

**Version**: 1.0.0  
**Last Updated**: July 2023 