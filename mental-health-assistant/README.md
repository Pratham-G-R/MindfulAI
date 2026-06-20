# 🧠 MindfulAI — LLM-Powered Virtual Mental Health Support Assistant

A compassionate, AI-powered mental health support companion built with Node.js, Express, and Groq LLM API. MindfulAI provides empathetic conversational support, mood tracking, guided breathing exercises, journaling, and crisis detection — all within a beautiful, calming interface.

> ⚠️ **Disclaimer:** MindfulAI is an AI-powered wellness tool and is **not a substitute** for professional mental health treatment. If you are in crisis, please contact emergency services or a crisis helpline.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 💬 **AI Chat** | Empathetic conversations powered by Groq LLM (Llama 3.3 70B) with therapeutic fallback responses |
| 📊 **Mood Tracker** | Emoji-based mood logging with Canvas-rendered charts and statistical insights |
| 🫁 **Breathing Exercises** | Guided 4-7-8, Box Breathing, and Calm Breathing with animated visual circle |
| 📓 **Journal** | Personal journaling with gratitude prompts, reflection questions, search, and tags |
| 🛟 **Resources** | Crisis helplines, CBT techniques, and daily wellness tips |
| 🔍 **Sentiment Analysis** | Real-time emotional analysis of user messages with crisis keyword detection |
| 🌙 **Dark/Light Theme** | Premium glassmorphism UI with animated gradient backgrounds |
| 📱 **Responsive** | Fully mobile-responsive single-page application |

---

## 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| **Node.js** (v18+) | Server runtime |
| **Express.js** (v4.18) | Web framework |
| **SQLite** (better-sqlite3) | Embedded database |
| **Groq SDK** | LLM API client (Llama 3.3 70B) |
| **Sentiment.js** | Text sentiment analysis |
| **HTML5/CSS3/JavaScript** | Frontend (vanilla, no frameworks) |
| **Helmet** | Security headers |
| **Express Rate Limit** | API rate limiting |

---

## 📋 Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher
- **Groq API Key** (free at [console.groq.com](https://console.groq.com)) — _optional, app works without it using fallback responses_

---

## 🚀 Installation

```bash
# 1. Clone or download the project
cd mental-health-assistant

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env and add your Groq API key (optional)

# 4. Start the server
npm start

# Or for development with auto-reload:
npm run dev
```

Open your browser to **http://localhost:3000**

---

## 🔑 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3000 | Server port |
| `GROQ_API_KEY` | No | — | Groq API key for LLM responses |
| `NODE_ENV` | No | development | Environment mode |

> **Note:** The app works fully without a Groq API key — it uses intelligent rule-based fallback responses that provide therapeutic support for anxiety, depression, stress, sleep issues, and more.

---

## 📡 API Documentation

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Send message & get AI response |
| GET | `/api/chat/history/:sessionId` | Get chat history |
| DELETE | `/api/chat/history/:sessionId` | Clear chat history |

### Mood
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/mood` | Log a mood entry |
| GET | `/api/mood/history` | Get mood history (?days=30) |
| GET | `/api/mood/stats` | Get mood statistics |

### Journal
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/journal` | Create journal entry |
| GET | `/api/journal` | List entries (?search=&limit=&offset=) |
| GET | `/api/journal/:id` | Get single entry |
| PUT | `/api/journal/:id` | Update entry |
| DELETE | `/api/journal/:id` | Delete entry |
| GET | `/api/journal/prompts/gratitude` | Random gratitude prompt |
| GET | `/api/journal/prompts/reflection` | Random reflection question |

### Breathing
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/breathing/session` | Log a session |
| GET | `/api/breathing/stats` | Get session statistics |

---

## 📁 Project Structure

```
mental-health-assistant/
├── public/                    # Frontend static files
│   ├── index.html             # Single-page application
│   ├── css/
│   │   └── style.css          # Design system & styles
│   └── js/
│       └── app.js             # Frontend application logic
├── server/                    # Backend
│   ├── server.js              # Express server entry point
│   ├── database.js            # SQLite database module
│   ├── routes/
│   │   ├── chat.js            # Chat API endpoints
│   │   ├── mood.js            # Mood tracking endpoints
│   │   ├── journal.js         # Journal CRUD endpoints
│   │   └── breathing.js       # Breathing session endpoints
│   └── services/
│       ├── llm.js             # Groq LLM integration + fallbacks
│       └── sentiment.js       # Sentiment analysis service
├── data/                      # SQLite database (auto-created)
├── package.json
├── .env.example
├── .env
└── README.md
```

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- [Groq](https://groq.com) for ultra-fast LLM inference
- [Meta AI](https://ai.meta.com) for Llama 3.3 model
- Mental health professionals whose research informs the therapeutic techniques used in this project

---

**Remember:** You are not alone. If you or someone you know is struggling, please reach out:
- **988 Suicide & Crisis Lifeline:** Call or text 988 (US)
- **Crisis Text Line:** Text HOME to 741741
- **iCall (India):** 9152987821
- **Emergency:** 911 (US) / 112 (India/EU)
