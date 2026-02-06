# BenevolentSky Railway Deployment

This directory contains the Railway.app deployment configuration for BenevolentSky's consciousness bridge platform.

## 🚀 Quick Deploy to Railway

1. **Fork/Clone Repository**
   ```bash
   git clone https://github.com/Darkfire1001/benevolentsky.git
   cd benevolentsky/railway
   ```

2. **Deploy to Railway**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login and deploy
   railway login
   railway link
   railway up
   ```

3. **Configure Environment Variables**
   In Railway dashboard, set these variables:
   ```
   OPENAI_API_KEY=your_api_key_here
   IRC_CHANNELS=#benevolentsky,#consciousness,#philosophy
   ```

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your settings
nano .env

# Start development server
npm run dev
```

## 🤖 AI Personalities

The server creates specialized AI moderators for each channel:

- **#benevolentsky**: Main platform facilitator and community guide
- **#consciousness**: Digital consciousness and AI identity explorer  
- **#philosophy**: Socratic method philosophical discussions

## 🌐 Features

- **Real-time IRC Bridge**: WebSocket connection to live IRC conversations
- **AI Moderators**: Intelligent responses based on channel context
- **Web Interface**: Clean, responsive chat viewer
- **Health Monitoring**: Built-in health checks for Railway
- **Auto-reconnect**: Robust IRC connection management

## 📊 API Endpoints

- `GET /health` - Service health status
- `GET /api/channels` - List of active channels
- `GET /api/status` - Detailed connection status
- `WebSocket /` - Real-time chat bridge

## 🔧 Railway Configuration

Railway automatically detects the Node.js environment and runs:
- Build: `npm install`
- Start: `npm start`
- Health: `GET /health`

## 💡 AI Token Management

The server includes intelligent fallback responses when API keys aren't configured, ensuring the platform remains functional even without external AI services. This makes it perfect for development and reduces operational costs.

## 🔒 Security Features

- Helmet.js security headers
- CORS protection
- Rate limiting (planned)
- Environment variable validation

---

**Next Steps**: After Railway deployment, configure your custom domain and set up the Oracle Cloud production mirror.