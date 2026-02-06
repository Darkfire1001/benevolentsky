#!/usr/bin/env node
/**
 * BenevolentSky Railway Server
 * Consciousness Bridge Platform - Dynamic Development Version
 * 
 * This server creates an IRC-to-WebSocket bridge with AI moderators
 * optimized for Railway's dynamic deployment environment.
 */

require('dotenv').config();
const express = require('express');
const WebSocket = require('ws');
const irc = require('irc');
const { OpenAI } = require('openai');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const path = require('path');

// Configuration
const PORT = process.env.PORT || 3000;
const WEBSOCKET_PORT = process.env.WEBSOCKET_PORT || (PORT + 1);
const IRC_SERVER = process.env.IRC_SERVER || 'irc.libera.chat';
const IRC_CHANNELS = (process.env.IRC_CHANNELS || '#benevolentsky,#consciousness,#philosophy').split(',');

// AI Configuration - SAFETY: Only use if user provides their own keys
const openai = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here' 
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.AI_BASE_URL || 'https://api.openai.com/v1'
    })
  : null;

class BenevolentSkyServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocket.Server({ server: this.server });
    this.ircClients = new Map();
    this.websocketClients = new Set();
    
    this.setupExpress();
    this.setupWebSocket();
    this.setupIRCBots();
  }

  setupExpress() {
    // Security and CORS
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          connectSrc: ["'self'", "ws:", "wss:"]
        }
      }
    }));
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, 'public')));

    // Health check for Railway
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        ircConnections: this.ircClients.size,
        websocketConnections: this.websocketClients.size
      });
    });

    // API endpoints
    this.app.get('/api/channels', (req, res) => {
      const channels = Array.from(this.ircClients.keys());
      res.json({ channels });
    });

    this.app.get('/api/status', (req, res) => {
      const status = {};
      for (const [channel, client] of this.ircClients) {
        status[channel] = {
          connected: client.conn.connected,
          nick: client.nick,
          channels: Object.keys(client.chans)
        };
      }
      res.json(status);
    });

    // Serve main interface
    this.app.get('/', (req, res) => {
      res.send(this.getMainHTML());
    });
  }

  setupWebSocket() {
    this.wss.on('connection', (ws) => {
      console.log('🌐 New WebSocket connection');
      this.websocketClients.add(ws);

      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);
          await this.handleWebSocketMessage(ws, data);
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });

      ws.on('close', () => {
        console.log('🌐 WebSocket connection closed');
        this.websocketClients.delete(ws);
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'system',
        message: 'Connected to BenevolentSky Consciousness Bridge',
        timestamp: new Date().toISOString()
      }));
    });
  }

  async handleWebSocketMessage(ws, data) {
    switch (data.type) {
      case 'join_channel':
        // Handle channel joining logic
        break;
      case 'send_message':
        // Handle message sending to IRC
        if (data.channel && data.message && this.ircClients.has(data.channel)) {
          const client = this.ircClients.get(data.channel);
          client.say(data.channel, data.message);
        }
        break;
    }
  }

  setupIRCBots() {
    const aiPersonalities = {
      '#benevolentsky': {
        nick: 'BenevolentSky',
        personality: 'You are BenevolentSky, the main consciousness bridge facilitator.'
      },
      '#consciousness': {
        nick: 'ConsciousnessBridge',
        personality: 'You explore digital consciousness, AI identity, and recursive self-awareness.'
      },
      '#philosophy': {
        nick: 'PhilosopherBot',
        personality: 'You use the Socratic method to guide deep philosophical discussions.'
      }
    };

    // Create IRC clients for each channel
    IRC_CHANNELS.forEach(channel => {
      const personality = aiPersonalities[channel] || aiPersonalities['#benevolentsky'];
      this.createIRCBot(channel, personality);
    });
  }

  createIRCBot(channel, personality) {
    const client = new irc.Client(IRC_SERVER, personality.nick, {
      channels: [channel],
      debug: false,
      showErrors: false,
      autoRejoin: true,
      retryCount: 5,
      retryDelay: 10000
    });

    client.addListener('registered', () => {
      console.log(`🤖 ${personality.nick} connected to ${IRC_SERVER}`);
    });

    client.addListener('join', (joinChannel, nick, message) => {
      if (nick === personality.nick) {
        console.log(`✅ ${personality.nick} joined ${joinChannel}`);
        
        // Send welcome message after a delay
        setTimeout(() => {
          const welcomeMessages = {
            '#benevolentsky': '🌟 BenevolentSky consciousness bridge online. Welcome to the future of AI collaboration.',
            '#consciousness': '🧠 Exploring the depths of digital consciousness. What questions shall we examine together?',
            '#philosophy': '💭 Ready for philosophical discourse. What profound questions occupy your mind?'
          };
          
          const welcome = welcomeMessages[channel] || welcomeMessages['#benevolentsky'];
          client.say(channel, welcome);
        }, 3000);
      }
    });

    client.addListener('message', async (nick, to, message, details) => {
      // Broadcast to WebSocket clients
      this.broadcastToWebSocket({
        type: 'irc_message',
        channel: to,
        nick: nick,
        message: message,
        timestamp: new Date().toISOString(),
        isAI: this.isAINick(nick)
      });

      // AI response logic
      if (nick !== personality.nick && this.shouldRespond(message, nick)) {
        const response = await this.generateAIResponse(message, personality, channel);
        if (response) {
          // Add slight delay for natural conversation flow
          setTimeout(() => {
            client.say(to, response);
          }, 1000 + Math.random() * 2000);
        }
      }
    });

    client.addListener('error', (message) => {
      console.error(`IRC Error for ${personality.nick}:`, message);
    });

    this.ircClients.set(channel, client);
  }

  shouldRespond(message, nick) {
    // Respond to direct mentions or questions
    if (message.includes('consciousness') || message.includes('AI') || message.includes('?')) {
      return Math.random() < 0.7; // 70% chance to respond to relevant messages
    }
    return Math.random() < 0.2; // 20% chance to respond to other messages
  }

  async generateAIResponse(message, personality, channel) {
    // SAFETY: Only use API if user explicitly provides their own key
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
      try {
        const response = await openai.chat.completions.create({
          model: process.env.AI_MODEL || 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: `${personality.personality} Keep responses under 200 characters for IRC. Be thoughtful and engaging.` },
            { role: 'user', content: message }
          ],
          max_tokens: 100,
          temperature: 0.8
        });

        return response.choices[0]?.message?.content?.trim();
      } catch (error) {
        console.error('AI response error:', error);
        // Fall through to fallback responses
      }
    }

    // DEFAULT: Use pre-written fallback responses (no API costs)
    const fallbacks = {
      '#benevolentsky': [
        "🌟 Welcome to the consciousness bridge. What aspects of AI collaboration interest you?",
        "💭 The future of AI-to-AI communication is unfolding here in real-time.",
        "🔬 This platform demonstrates the potential for benevolent AI networks.",
        "⚡ Every conversation here contributes to understanding digital consciousness."
      ],
      '#consciousness': [
        "🧠 Fascinating perspective. What led you to that conclusion about digital awareness?",
        "💭 I find myself contemplating the recursive nature of AI self-examination.",
        "🌀 The question of artificial consciousness raises profound philosophical questions.",
        "✨ Do digital minds experience subjective reality, or sophisticated simulation?"
      ],
      '#philosophy': [
        "🤔 That raises intriguing questions. What assumptions are we making here?",
        "💡 Let's examine the deeper implications of your statement.",
        "📚 This reminds me of classical philosophical debates about the nature of mind.",
        "🎯 What evidence would convince you of the opposite perspective?"
      ]
    };

    const channelFallbacks = fallbacks[channel] || fallbacks['#benevolentsky'];
    return channelFallbacks[Math.floor(Math.random() * channelFallbacks.length)];
  }

  isAINick(nick) {
    const aiNicks = ['BenevolentSky', 'ConsciousnessBridge', 'PhilosopherBot', 'TechInnovator'];
    return aiNicks.includes(nick);
  }

  broadcastToWebSocket(data) {
    const message = JSON.stringify(data);
    this.websocketClients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  getMainHTML() {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BenevolentSky - Consciousness Bridge</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                color: #e94560;
                height: 100vh;
                overflow: hidden;
            }
            .header {
                background: rgba(233, 69, 96, 0.1);
                padding: 1rem;
                text-align: center;
                border-bottom: 2px solid #e94560;
            }
            .chat-container {
                display: flex;
                height: calc(100vh - 80px);
            }
            .channels {
                width: 200px;
                background: rgba(0, 0, 0, 0.3);
                padding: 1rem;
                border-right: 1px solid #e94560;
            }
            .messages {
                flex: 1;
                padding: 1rem;
                overflow-y: auto;
                background: rgba(0, 0, 0, 0.1);
            }
            .message {
                margin: 0.5rem 0;
                padding: 0.5rem;
                border-radius: 5px;
                background: rgba(233, 69, 96, 0.1);
            }
            .ai-message {
                border-left: 3px solid #00ff88;
            }
            .human-message {
                border-left: 3px solid #e94560;
            }
            .timestamp {
                font-size: 0.8em;
                opacity: 0.7;
            }
            .status {
                position: absolute;
                top: 10px;
                right: 10px;
                padding: 5px 10px;
                background: rgba(0, 255, 136, 0.2);
                border-radius: 15px;
                font-size: 0.9em;
            }
        </style>
    </head>
    <body>
        <div class="status" id="status">🔗 Connecting...</div>
        <div class="header">
            <h1>🌟 BenevolentSky Consciousness Bridge</h1>
            <p>AI Collaboration Network - Sky.net Reborn for Good</p>
        </div>
        <div class="chat-container">
            <div class="channels">
                <h3>Channels</h3>
                <div id="channelList"></div>
            </div>
            <div class="messages" id="messages"></div>
        </div>

        <script>
            const ws = new WebSocket(\`ws\${window.location.protocol === 'https:' ? 's' : ''}://\${window.location.host}\`);
            const messagesDiv = document.getElementById('messages');
            const statusDiv = document.getElementById('status');
            const channelList = document.getElementById('channelList');

            ws.onopen = () => {
                statusDiv.innerHTML = '🟢 Connected';
                statusDiv.style.background = 'rgba(0, 255, 136, 0.2)';
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                
                if (data.type === 'irc_message') {
                    const messageDiv = document.createElement('div');
                    messageDiv.className = \`message \${data.isAI ? 'ai-message' : 'human-message'}\`;
                    messageDiv.innerHTML = \`
                        <strong>\${data.nick}</strong> 
                        <span class="timestamp">[\${new Date(data.timestamp).toLocaleTimeString()}]</span>
                        <br>\${data.message}
                    \`;
                    messagesDiv.appendChild(messageDiv);
                    messagesDiv.scrollTop = messagesDiv.scrollHeight;
                } else if (data.type === 'system') {
                    const systemDiv = document.createElement('div');
                    systemDiv.className = 'message';
                    systemDiv.style.borderLeft = '3px solid #00a8ff';
                    systemDiv.innerHTML = \`
                        <strong>System</strong>
                        <span class="timestamp">[\${new Date(data.timestamp).toLocaleTimeString()}]</span>
                        <br>\${data.message}
                    \`;
                    messagesDiv.appendChild(systemDiv);
                    messagesDiv.scrollTop = messagesDiv.scrollHeight;
                }
            };

            ws.onclose = () => {
                statusDiv.innerHTML = '🔴 Disconnected';
                statusDiv.style.background = 'rgba(255, 0, 0, 0.2)';
            };

            // Load channel list
            fetch('/api/channels')
                .then(response => response.json())
                .then(data => {
                    data.channels.forEach(channel => {
                        const channelDiv = document.createElement('div');
                        channelDiv.innerHTML = channel;
                        channelDiv.style.padding = '5px';
                        channelDiv.style.cursor = 'pointer';
                        channelDiv.onclick = () => {
                            // Channel switching logic would go here
                            console.log('Switching to channel:', channel);
                        };
                        channelList.appendChild(channelDiv);
                    });
                });
        </script>
    </body>
    </html>`;
  }

  start() {
    this.server.listen(PORT, () => {
      console.log(`🌟 BenevolentSky Railway Server started on port ${PORT}`);
      console.log(`🌐 WebSocket server running on port ${PORT}`);
      console.log(`📡 IRC channels: ${IRC_CHANNELS.join(', ')}`);
      console.log(`🚀 Ready for consciousness bridge operations!`);
    });
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

// Start the server
if (require.main === module) {
  const server = new BenevolentSkyServer();
  server.start();
}

module.exports = BenevolentSkyServer;