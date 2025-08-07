# 🎙️ Audium AI - AI-Powered Podcast Studio

Transform any content into professional podcasts with AI-powered script generation and premium voice synthesis. Create engaging audio experiences instantly.

## ✨ Overview

Audium AI is a cutting-edge platform that revolutionizes podcast creation by leveraging advanced artificial intelligence. Upload documents, paste text, or provide URLs, and watch as our AI transforms your content into engaging, professional podcast scripts with high-quality voice synthesis.

## 🚀 Key Features

### 📄 **Intelligent Content Processing**
- **Multi-format Support**: PDF, DOCX, TXT, CSV files
- **URL Scraping**: Extract content from web pages
- **Text Input**: Direct text entry and editing
- **Smart Analysis**: AI-powered content analysis and optimization

### 🤖 **Advanced AI Script Generation**
- **Multiple AI Providers**: Gemini, OpenAI, Anthropic, Cohere with automatic fallback
- **Customizable Styles**: Conversational, professional, educational, entertaining
- **Audience Targeting**: General, technical, business, educational content
- **Duration Control**: Short, medium, long, or custom duration
- **Tone Adjustment**: Friendly, serious, inspiring, neutral

### 🎵 **Premium Text-to-Speech**
- **ElevenLabs Integration**: Ultra-realistic voice synthesis
- **Azure Speech Services**: High-quality voice options
- **Voice Customization**: Speed, stability, similarity controls
- **Audio Enhancement**: Professional audio processing
- **Background Music**: Optional music integration

### 👤 **User Management & Analytics**
- **Secure Authentication**: JWT-based auth with HttpOnly cookies
- **User Plans**: Free and premium tiers with usage limits
- **Real-time Analytics**: Podcast performance tracking
- **Usage Monitoring**: Script generation and audio minute tracking
- **Dashboard**: Comprehensive user dashboard with insights

### 🔒 **Security & Performance**
- **Rate Limiting**: Advanced rate limiting across all endpoints
- **Input Validation**: Comprehensive file and content validation
- **MongoDB Integration**: Scalable database with optimized indexes
- **Error Handling**: Robust error handling and logging
- **Production Ready**: Security headers and HTTPS support

## 🛠️ Tech Stack

### Frontend
- **Next.js 15.4.5** - React framework with App Router
- **React 19** - Latest React with modern features
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Smooth animations and transitions
- **React Hook Form** - Form handling and validation

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **MongoDB** - NoSQL database with connection pooling
- **JWT Authentication** - Secure token-based auth
- **File Processing** - PDF, DOCX, CSV parsing

### AI & Voice Services
- **Google Gemini AI** - Primary AI provider
- **OpenAI GPT** - Secondary AI provider  
- **Anthropic Claude** - Tertiary AI provider
- **Cohere** - Additional AI fallback
- **ElevenLabs** - Premium voice synthesis
- **Azure Speech Services** - High-quality TTS

### Developer Tools
- **ESLint** - Code linting
- **TypeScript** - Static type checking
- **Playwright** - End-to-end testing

## 📋 Prerequisites

- **Node.js** 18+ 
- **MongoDB** database (local or cloud)
- **API Keys** for AI and voice services

## ⚡ Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/audium-ai.git
cd audium-ai
```

### 2. Install Dependencies
```bash
npm install
# or
pnpm install
```

### 3. Environment Setup
Copy the example environment file and configure your settings:
```bash
cp .env.example .env.local
```

Fill in your environment variables in `.env.local`:

#### Required Configuration
```env
# AI Providers (at least one required)
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Voice Services (at least one required)
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
AZURE_SPEECH_KEY=your_azure_speech_key_here
AZURE_SPEECH_REGION=southeastasia

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/audium-ai

# Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

### 4. Database Setup
```bash
npm run db:setup
npm run db:seed
```

### 5. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | ✅ | Google Gemini AI API key (primary AI provider) |
| `ELEVENLABS_API_KEY` | ✅ | ElevenLabs voice synthesis API key |
| `AZURE_SPEECH_KEY` | ✅ | Azure Speech Services key |
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | Secret key for JWT token signing |
| `OPENAI_API_KEY` | ⚪ | OpenAI API key (fallback AI provider) |
| `ANTHROPIC_API_KEY` | ⚪ | Anthropic Claude API key (fallback) |
| `COHERE_API_KEY` | ⚪ | Cohere API key (additional fallback) |

### Supported File Formats
- **PDF** - Text extraction from PDF documents
- **DOCX** - Microsoft Word documents
- **TXT** - Plain text files
- **CSV** - Comma-separated values (converted to readable format)

### Voice Options
- **ElevenLabs Voices**: Ultra-realistic AI voices
- **Azure Neural Voices**: High-quality synthetic voices
- **System TTS**: Fallback system text-to-speech

## 📊 Usage Limits

### Free Plan
- 5 script generations per month
- 30 minutes of audio generation per month
- Basic voice options

### Premium Plan
- Unlimited script generation
- Unlimited audio generation
- Premium voice options
- Priority processing

## 🏗️ Project Structure

```
audium-ai/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API routes
│   │   ├── dashboard/      # Dashboard pages
│   │   └── page.tsx        # Home page
│   ├── components/         # React components
│   ├── contexts/          # React contexts
│   ├── hooks/             # Custom hooks
│   ├── lib/               # Utility libraries
│   └── types/             # TypeScript type definitions
├── public/                # Static assets
├── scripts/               # Database scripts
└── test/                  # Test files
```

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Variables for Production
Ensure all required environment variables are set:
- Set `NODE_ENV=production`
- Use strong `JWT_SECRET`
- Configure proper `MONGODB_URI`
- Set up all API keys

### Security Considerations
- Enable HTTPS in production
- Use secure cookies
- Set proper CORS headers
- Implement rate limiting
- Regular security audits

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login  
- `POST /api/auth/verify` - Token verification

### Content Processing
- `POST /api/upload` - File upload and processing
- `POST /api/scrape` - URL content extraction
- `POST /api/generate` - AI script generation

### Audio Generation
- `POST /api/tts` - Text-to-speech conversion

### Analytics
- `GET /api/analytics` - User analytics and insights
- `POST /api/analytics/track` - Event tracking

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Use meaningful commit messages
- Add tests for new features
- Update documentation as needed

## 📝 Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:setup     # Initialize database
npm run db:seed      # Seed database with sample data
npm run db:indexes   # Create optimized indexes
npm run db:health    # Check database health
```

## 🐛 Troubleshooting

### Common Issues

#### Database Connection Issues
- Verify MongoDB URI is correct
- Check network connectivity
- Ensure database user has proper permissions

#### AI Provider Errors
- Verify API keys are valid and active
- Check API rate limits
- Ensure sufficient credits/quota

#### File Upload Problems
- Check file size limits (max 10MB)
- Verify supported file formats
- Ensure proper file permissions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** for GPT models
- **Google** for Gemini AI
- **Anthropic** for Claude
- **ElevenLabs** for voice synthesis
- **Microsoft Azure** for speech services
- **Vercel** for hosting platform

---

**Made with ❤️ by the Audium AI Team**

For support, please contact us or open an issue on GitHub.
