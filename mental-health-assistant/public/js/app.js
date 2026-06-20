/**
 * MindfulAI - Frontend Application
 * 
 * Main application controller handling all views, chat, mood tracking,
 * breathing exercises, journaling, and settings functionality.
 * Built with vanilla JavaScript (no frameworks).
 */

class MindfulAI {
  constructor() {
    // ─── State ────────────────────────────────────────────────────────
    this.apiUrl = ''; // Set to backend URL if deploying frontend separately
    this.jwtToken = localStorage.getItem('mindfulai_token') || null;
    this.authMode = 'login'; // login or signup
    this.currentView = 'chat';
    this.chatHistory = [];
    this.sessionId = this.loadSessionId();
    this.selectedMood = null;
    this.selectedMoodScore = null;
    this.isBreathing = false;
    this.breathingInterval = null;
    this.breathingTimeout = null;
    this.breathingStartTime = null;
    this.breathingCycles = 0;
    this.currentTechnique = '4-7-8';
    this.isSending = false;

    // ─── Breathing Techniques ─────────────────────────────────────────
    this.techniques = {
      '4-7-8': { name: 'Relaxing Breath', phases: [{ phase: 'Inhale', duration: 4 }, { phase: 'Hold', duration: 7 }, { phase: 'Exhale', duration: 8 }] },
      'box': { name: 'Box Breathing', phases: [{ phase: 'Inhale', duration: 4 }, { phase: 'Hold', duration: 4 }, { phase: 'Exhale', duration: 4 }, { phase: 'Hold', duration: 4 }] },
      'calm': { name: 'Calm Breathing', phases: [{ phase: 'Inhale', duration: 4 }, { phase: 'Exhale', duration: 6 }] }
    };

    // ─── Sentiment Words (client-side fallback) ───────────────────────
    this.positiveWords = ['happy', 'good', 'great', 'wonderful', 'amazing', 'love', 'better', 'thank', 'grateful', 'excited', 'hope', 'joy', 'peace', 'calm', 'relax', 'positive', 'beautiful', 'strong', 'brave', 'proud'];
    this.negativeWords = ['sad', 'bad', 'terrible', 'awful', 'hate', 'angry', 'depressed', 'anxious', 'worried', 'scared', 'lonely', 'hurt', 'pain', 'cry', 'stress', 'hopeless', 'worthless', 'tired', 'exhausted', 'numb'];

    // ─── Initialize ───────────────────────────────────────────────────
    this.init();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════

  init() {
    this.initNavigation();
    this.initChat();
    this.initMoodTracker();
    this.initBreathing();
    this.initJournal();
    this.initSettings();
    this.loadChatHistory();
    this.loadThemePreference();
    this.checkAuth();
    console.log('🧠 MindfulAI initialized successfully');
  }

  
  // ═══════════════════════════════════════════════════════════════════════
  // AUTHENTICATION & API WRAPPER
  // ═══════════════════════════════════════════════════════════════════════

  checkAuth() {
    const overlay = document.getElementById('authOverlay');
    const appContainer = document.getElementById('app');
    
    if (!this.jwtToken) {
      if (overlay) overlay.classList.add('active');
      if (appContainer) appContainer.style.display = 'none';
    } else {
      if (overlay) overlay.classList.remove('active');
      if (appContainer) appContainer.style.display = 'flex';
    }
  }

  switchAuthTab(mode) {
    this.authMode = mode;
    document.getElementById('tabLogin').classList.toggle('active', mode === 'login');
    document.getElementById('tabSignup').classList.toggle('active', mode === 'signup');
    document.getElementById('authSubmitBtn').textContent = mode === 'login' ? 'Log In' : 'Sign Up';
    document.getElementById('authError').textContent = '';
  }

  async handleAuth() {
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const errorEl = document.getElementById('authError');
    const btn = document.getElementById('authSubmitBtn');

    btn.disabled = true;
    errorEl.textContent = '';

    try {
      const endpoint = this.authMode === 'login' ? '/api/auth/login' : '/api/auth/signup';
      const response = await fetch(this.apiUrl + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      this.jwtToken = data.token;
      localStorage.setItem('mindfulai_token', this.jwtToken);
      
      // Clear forms
      document.getElementById('authPassword').value = '';
      
      this.checkAuth();
      this.showToast('Welcome to MindfulAI', 'success');
      
      // Load user-specific data after login
      this.loadChatHistory();
      if(this.currentView === 'mood') this.loadMoodHistory();
      if(this.currentView === 'journal') this.loadEntries();

    } catch (err) {
      errorEl.textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  }

  logout() {
    this.jwtToken = null;
    localStorage.removeItem('mindfulai_token');
    
    // Clear session state
    this.chatHistory = [];
    document.getElementById('chatMessages').innerHTML = '';
    
    this.checkAuth();
    this.showToast('Logged out successfully', 'info');
  }

  async apiCall(endpoint, options = {}) {
    if (!this.jwtToken) throw new Error('Not authenticated');

    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${this.jwtToken}`
    };

    const response = await fetch(this.apiUrl + endpoint, {
      ...options,
      headers
    });

    if (response.status === 401 || response.status === 403) {
      this.logout();
      throw new Error('Session expired');
    }

    return response;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // NAVIGATION & VIEW MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════

  initNavigation() {
    // Sidebar navigation items
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const viewName = item.dataset.view;
        this.switchView(viewName);
      });
    });

    // Mobile menu
    const menuToggle = document.getElementById('menuToggle');
    const overlay = document.getElementById('sidebarOverlay');

    menuToggle?.addEventListener('click', () => this.handleMobileMenu());
    overlay?.addEventListener('click', () => this.closeMobileMenu());
  }

  switchView(viewName) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewName);
    });

    // Update views
    document.querySelectorAll('.view').forEach(view => {
      view.classList.remove('active');
    });

    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) {
      targetView.classList.add('active');
      this.currentView = viewName;
    }

    // Load view-specific data
    if (viewName === 'mood') this.loadMoodHistory();
    if (viewName === 'journal') this.loadEntries();
    if (viewName === 'breathing') this.loadBreathingStats();

    // Close mobile menu
    this.closeMobileMenu();
  }

  handleMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('menuToggle');
    const overlay = document.getElementById('sidebarOverlay');

    sidebar.classList.toggle('open');
    toggle.classList.toggle('active');
    overlay.classList.toggle('active');
  }

  closeMobileMenu() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('menuToggle')?.classList.remove('active');
    document.getElementById('sidebarOverlay')?.classList.remove('active');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CHAT MODULE
  // ═══════════════════════════════════════════════════════════════════════

  initChat() {
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');

    // Send on Enter
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Enable/disable send button
    input?.addEventListener('input', () => {
      sendBtn.disabled = !input.value.trim();
      this.autoResizeTextarea(input);
    });

    // Send button click
    sendBtn?.addEventListener('click', () => this.sendMessage());

    // Suggested prompts
    document.querySelectorAll('.prompt-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        input.value = chip.dataset.prompt;
        sendBtn.disabled = false;
        this.sendMessage();
      });
    });
  }

  async sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input?.value.trim();
    if (!text || this.isSending) return;

    this.isSending = true;

    // Hide welcome screen
    const welcome = document.getElementById('chatWelcome');
    if (welcome) welcome.style.display = 'none';

    // Append user message
    this.appendMessage('user', text);
    this.chatHistory.push({ role: 'user', content: text });

    // Clear input
    input.value = '';
    document.getElementById('sendBtn').disabled = true;
    this.autoResizeTextarea(input);

    // Show typing indicator
    this.showTypingIndicator();

    try {
      const response = await this.apiCall('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId: this.sessionId,
          history: this.chatHistory.slice(-10)
        })
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const data = await response.json();

      this.hideTypingIndicator();
      this.appendMessage('assistant', data.response);
      this.chatHistory.push({ role: 'assistant', content: data.response });

      if (data.sessionId) this.sessionId = data.sessionId;

      // Crisis alert
      if (data.crisis?.detected) {
        this.showToast('⚠️ If you are in crisis, please call 988 or text HOME to 741741', 'warning');
      }

    } catch (error) {
      console.error('Chat error:', error);
      this.hideTypingIndicator();

      // Fallback response (client-side)
      const fallback = this.getClientFallbackResponse(text);
      this.appendMessage('assistant', fallback);
      this.chatHistory.push({ role: 'assistant', content: fallback });
    }

    this.saveChatHistory();
    this.isSending = false;
  }

  appendMessage(role, content) {
    const container = document.getElementById('chatMessages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;

    const avatar = role === 'assistant' ? '🧠' : '👤';
    const formattedContent = this.formatMessageContent(content);
    const timeStr = this.formatTimestamp(new Date());

    msgDiv.innerHTML = `
      <div class="message-avatar">${avatar}</div>
      <div>
        <div class="message-bubble">${formattedContent}</div>
        <div class="message-time">${timeStr}</div>
      </div>
    `;

    container.appendChild(msgDiv);
    this.scrollToBottom();
  }

  formatMessageContent(text) {
    let html = this.sanitizeHTML(text);
    // Bold: **text**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic: *text*
    html = html.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    // Numbered lists
    html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<li>$2</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/gs, (match) => `<ol>${match}</ol>`);
    // Bullet lists
    html = html.replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/gs, (match) => {
      if (!match.includes('<ol>')) return `<ul>${match}</ul>`;
      return match;
    });
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  showTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
      indicator.style.display = 'flex';
      this.scrollToBottom();
    }
  }

  hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.style.display = 'none';
  }

  scrollToBottom() {
    const container = document.getElementById('chatContainer');
    if (container) {
      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 50);
    }
  }

  autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 140) + 'px';
  }

  loadChatHistory() {
    try {
      const saved = localStorage.getItem('mindfulai_chat_history');
      if (saved) {
        this.chatHistory = JSON.parse(saved);
        if (this.chatHistory.length > 0) {
          const welcome = document.getElementById('chatWelcome');
          if (welcome) welcome.style.display = 'none';
          this.chatHistory.forEach(msg => {
            this.appendMessage(msg.role, msg.content);
          });
        }
      }
    } catch (e) {
      console.error('Failed to load chat history:', e);
    }
  }

  saveChatHistory() {
    try {
      // Keep last 50 messages
      const toSave = this.chatHistory.slice(-50);
      localStorage.setItem('mindfulai_chat_history', JSON.stringify(toSave));
    } catch (e) {
      console.error('Failed to save chat history:', e);
    }
  }

  loadSessionId() {
    let id = localStorage.getItem('mindfulai_session_id');
    if (!id) {
      id = this.generateId();
      localStorage.setItem('mindfulai_session_id', id);
    }
    return id;
  }

  performSentimentAnalysis(text) {
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    const positive = [];
    const negative = [];

    words.forEach(word => {
      if (this.positiveWords.includes(word)) { score++; positive.push(word); }
      if (this.negativeWords.includes(word)) { score--; negative.push(word); }
    });

    return {
      score,
      mood: score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral',
      positive,
      negative
    };
  }

  getClientFallbackResponse(message) {
    const lower = message.toLowerCase();
    const responses = {
      anxiety: "I can sense you're feeling anxious. Try this: Take a slow, deep breath in for 4 counts, hold for 4, and breathe out for 6 counts. Repeat this 4 times. You can also try our **Breathing Exercises** feature for guided sessions. What's on your mind?",
      stress: "It sounds like you're under a lot of stress. Remember, it's okay to take a step back. Try the **5-4-3-2-1 grounding technique**: Name 5 things you see, 4 you touch, 3 you hear, 2 you smell, 1 you taste. Would you like to talk more about what's causing this stress?",
      sad: "I'm sorry you're feeling this way. Your feelings are valid. Sometimes writing down our thoughts can help process them — you might find our **Journal** feature helpful. Remember, difficult feelings are temporary. What would help you feel a little better right now?",
      sleep: "Sleep difficulties can be really frustrating. Try the **4-7-8 breathing technique** before bed (available in our Breathing section). Also, keeping a consistent sleep schedule and avoiding screens 30 minutes before bed can help. What's been keeping you up?",
      lonely: "Feeling lonely is more common than you might think, and it takes courage to acknowledge it. You're reaching out right now, which is a positive step. Consider connecting with someone you trust, even if it's just a brief message. You matter, and there are people who care about you.",
      angry: "Anger is a natural emotion — it often signals that something important to us has been affected. Try the **STOP technique**: Stop, Take a breath, Observe your feelings, Proceed mindfully. Physical movement like a short walk can also help. What triggered these feelings?",
      panic: "If you're feeling panicked, let's ground you right now. **Place both feet on the floor**, feel the ground beneath you. Breathe in slowly for 4 counts, out for 6. This feeling will pass — you're safe. Would you like to try a guided breathing exercise?"
    };

    for (const [keyword, response] of Object.entries(responses)) {
      if (lower.includes(keyword)) return response;
    }

    return "Thank you for sharing that with me. I'm here to listen and support you. Sometimes just expressing our thoughts can be healing. Would you like to explore a specific topic, try a **breathing exercise**, or write in your **journal**? I'm here for whatever you need. 💙";
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MOOD TRACKER MODULE
  // ═══════════════════════════════════════════════════════════════════════

  initMoodTracker() {
    // Mood emoji selection
    document.querySelectorAll('.mood-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedMood = btn.dataset.mood;
        this.selectedMoodScore = parseInt(btn.dataset.score);
        document.getElementById('logMoodBtn').disabled = false;
      });
    });

    // Log mood button
    document.getElementById('logMoodBtn')?.addEventListener('click', () => this.logMood());

    // Chart period buttons
    document.querySelectorAll('.chart-period').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.chart-period').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.loadMoodHistory(parseInt(btn.dataset.days));
      });
    });
  }

  async logMood() {
    if (!this.selectedMood) return;

    const note = document.getElementById('moodNote')?.value || '';

    try {
      await this.apiCall('/api/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mood: this.selectedMood,
          moodScore: this.selectedMoodScore,
          note: note
        })
      });

      this.showToast(`Mood logged: ${this.selectedMood}`, 'success');

      // Reset
      document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
      document.getElementById('moodNote').value = '';
      document.getElementById('logMoodBtn').disabled = true;
      this.selectedMood = null;
      this.selectedMoodScore = null;

      // Reload data
      this.loadMoodHistory();
      this.loadMoodStats();

    } catch (error) {
      console.error('Failed to log mood:', error);
      this.showToast('Mood logged locally', 'info');
      // Save to localStorage as fallback
      this.saveMoodLocally(this.selectedMood, this.selectedMoodScore, note);
    }
  }

  saveMoodLocally(mood, score, note) {
    const moods = JSON.parse(localStorage.getItem('mindfulai_moods') || '[]');
    moods.push({ mood, mood_score: score, note, created_at: new Date().toISOString() });
    localStorage.setItem('mindfulai_moods', JSON.stringify(moods));
  }

  async loadMoodHistory(days = 30) {
    try {
      const response = await this.apiCall(`/api/mood/history?days=${days}`);
      const data = await response.json();

      if (data.entries && data.entries.length > 0) {
        document.getElementById('noMoodData').style.display = 'none';
        this.renderMoodChart(data.entries);
      } else {
        document.getElementById('noMoodData').style.display = 'block';
        // Try local data
        this.renderLocalMoodChart(days);
      }
      this.loadMoodStats();
    } catch (error) {
      console.error('Failed to load mood history:', error);
      this.renderLocalMoodChart(days);
    }
  }

  renderLocalMoodChart(days) {
    const moods = JSON.parse(localStorage.getItem('mindfulai_moods') || '[]');
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const filtered = moods.filter(m => new Date(m.created_at) >= cutoff);
    if (filtered.length > 0) {
      document.getElementById('noMoodData').style.display = 'none';
      this.renderMoodChart(filtered);
    }
  }

  renderMoodChart(entries) {
    const canvas = document.getElementById('moodChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = 250 * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = '250px';
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = 250;
    const padding = { top: 30, right: 30, bottom: 40, left: 50 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Sort by date
    const sorted = [...entries].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    if (sorted.length === 0) return;

    const scores = sorted.map(e => e.mood_score);
    const maxScore = 5;
    const minScore = 1;

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 5; i++) {
      const y = padding.top + chartH - ((i - minScore) / (maxScore - minScore)) * chartH;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();

      // Y-axis labels
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '11px Inter';
      ctx.textAlign = 'right';
      const labels = ['😢', '😔', '😐', '🙂', '😄'];
      ctx.font = '14px serif';
      ctx.fillText(labels[i - 1], padding.left - 10, y + 5);
    }

    // Data points and line
    const points = sorted.map((entry, i) => ({
      x: padding.left + (i / Math.max(sorted.length - 1, 1)) * chartW,
      y: padding.top + chartH - ((entry.mood_score - minScore) / (maxScore - minScore)) * chartH,
      score: entry.mood_score
    }));

    // Gradient fill under line
    if (points.length > 1) {
      const gradient = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
      gradient.addColorStop(0, 'rgba(124, 140, 248, 0.3)');
      gradient.addColorStop(1, 'rgba(124, 140, 248, 0.0)');

      ctx.beginPath();
      ctx.moveTo(points[0].x, h - padding.bottom);
      points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(points[points.length - 1].x, h - padding.bottom);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Line
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const xc = (points[i - 1].x + points[i].x) / 2;
        const yc = (points[i - 1].y + points[i].y) / 2;
        ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.strokeStyle = '#7c8cf8';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // Data points
    points.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#7c8cf8';
      ctx.fill();
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // X-axis labels (dates)
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '10px Inter';
    ctx.textAlign = 'center';
    const step = Math.max(1, Math.floor(sorted.length / 7));
    sorted.forEach((entry, i) => {
      if (i % step === 0 || i === sorted.length - 1) {
        const date = new Date(entry.created_at);
        const label = `${date.getMonth() + 1}/${date.getDate()}`;
        const x = padding.left + (i / Math.max(sorted.length - 1, 1)) * chartW;
        ctx.fillText(label, x, h - padding.bottom + 20);
      }
    });
  }

  async loadMoodStats() {
    try {
      const response = await this.apiCall('/api/mood/stats');
      const data = await response.json();

      document.getElementById('avgMoodScore').textContent = data.averageScore || '—';
      document.getElementById('totalMoodEntries').textContent = data.totalEntries || 0;

      if (data.moodDistribution && data.moodDistribution.length > 0) {
        document.getElementById('topMood').textContent = data.moodDistribution[0].mood;
      }

      if (data.weeklyTrend && data.weeklyTrend.length >= 2) {
        const last = data.weeklyTrend[data.weeklyTrend.length - 1]?.avg_score || 0;
        const prev = data.weeklyTrend[data.weeklyTrend.length - 2]?.avg_score || 0;
        document.getElementById('moodTrend').textContent = last > prev ? '📈 Up' : last < prev ? '📉 Down' : '➡️ Stable';
      }
    } catch (e) {
      // Use local data for stats
      const moods = JSON.parse(localStorage.getItem('mindfulai_moods') || '[]');
      if (moods.length > 0) {
        const avg = moods.reduce((sum, m) => sum + m.mood_score, 0) / moods.length;
        document.getElementById('avgMoodScore').textContent = avg.toFixed(1);
        document.getElementById('totalMoodEntries').textContent = moods.length;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // BREATHING EXERCISES MODULE
  // ═══════════════════════════════════════════════════════════════════════

  initBreathing() {
    // Technique selection
    document.querySelectorAll('.technique-card').forEach(card => {
      card.addEventListener('click', () => {
        if (this.isBreathing) return;
        document.querySelectorAll('.technique-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.currentTechnique = card.dataset.technique;
      });
    });

    // Start/Stop buttons
    document.getElementById('startBreathingBtn')?.addEventListener('click', () => this.startBreathing());
    document.getElementById('stopBreathingBtn')?.addEventListener('click', () => this.stopBreathing());
  }

  startBreathing() {
    if (this.isBreathing) return;
    this.isBreathing = true;
    this.breathingCycles = 0;
    this.breathingStartTime = Date.now();

    document.getElementById('startBreathingBtn').style.display = 'none';
    document.getElementById('stopBreathingBtn').style.display = 'inline-flex';
    document.querySelectorAll('.technique-card').forEach(c => c.style.pointerEvents = 'none');

    this.runBreathingCycle();
    this.updateBreathingDuration();
  }

  runBreathingCycle() {
    if (!this.isBreathing) return;

    const technique = this.techniques[this.currentTechnique];
    let phaseIndex = 0;

    const runPhase = () => {
      if (!this.isBreathing) return;

      const phase = technique.phases[phaseIndex];
      const circle = document.getElementById('breathCircle');
      const phaseEl = document.getElementById('breathPhase');
      const timerEl = document.getElementById('breathTimer');

      phaseEl.textContent = phase.phase;

      // Set animation class
      circle.className = 'breath-circle';
      if (phase.phase === 'Inhale') {
        circle.style.transition = `transform ${phase.duration}s ease-in-out`;
        circle.style.transform = 'scale(1)';
      } else if (phase.phase === 'Exhale') {
        circle.style.transition = `transform ${phase.duration}s ease-in-out`;
        circle.style.transform = 'scale(0.6)';
      }
      // Hold: no scale change

      // Countdown timer
      let remaining = phase.duration;
      timerEl.textContent = remaining;

      this.breathingInterval = setInterval(() => {
        remaining--;
        if (remaining >= 0) {
          timerEl.textContent = remaining;
        }
      }, 1000);

      // Next phase
      this.breathingTimeout = setTimeout(() => {
        clearInterval(this.breathingInterval);
        phaseIndex++;

        if (phaseIndex >= technique.phases.length) {
          // Cycle complete
          this.breathingCycles++;
          document.getElementById('breathCycles').textContent = this.breathingCycles;
          phaseIndex = 0;
        }

        runPhase();
      }, phase.duration * 1000);
    };

    // Initial state
    const circle = document.getElementById('breathCircle');
    circle.style.transform = 'scale(0.6)';
    setTimeout(() => runPhase(), 500);
  }

  updateBreathingDuration() {
    const update = () => {
      if (!this.isBreathing) return;
      const elapsed = Math.floor((Date.now() - this.breathingStartTime) / 1000);
      const mins = Math.floor(elapsed / 60);
      const secs = elapsed % 60;
      document.getElementById('breathDuration').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
      requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  stopBreathing() {
    this.isBreathing = false;
    clearInterval(this.breathingInterval);
    clearTimeout(this.breathingTimeout);

    const circle = document.getElementById('breathCircle');
    circle.style.transition = 'transform 0.5s ease';
    circle.style.transform = 'scale(1)';
    circle.className = 'breath-circle';

    document.getElementById('breathPhase').textContent = 'Ready';
    document.getElementById('breathTimer').textContent = '0';
    document.getElementById('startBreathingBtn').style.display = 'inline-flex';
    document.getElementById('stopBreathingBtn').style.display = 'none';
    document.querySelectorAll('.technique-card').forEach(c => c.style.pointerEvents = 'auto');

    // Log session
    const duration = Math.floor((Date.now() - this.breathingStartTime) / 1000);
    if (duration > 10) {
      this.logBreathingSession(this.currentTechnique, duration);
      this.showToast(`Great job! ${this.breathingCycles} cycles completed 🎉`, 'success');
    }
  }

  async logBreathingSession(technique, duration) {
    try {
      await this.apiCall('/api/breathing/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technique, duration, completed: true })
      });
    } catch (e) {
      console.error('Failed to log breathing session:', e);
    }
  }

  async loadBreathingStats() {
    try {
      const response = await this.apiCall('/api/breathing/stats');
      const data = await response.json();
      document.getElementById('breathStreak').textContent = data.currentStreak || 0;
    } catch (e) {
      // Silently fail
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // JOURNAL MODULE
  // ═══════════════════════════════════════════════════════════════════════

  initJournal() {
    document.getElementById('saveJournalBtn')?.addEventListener('click', () => this.saveEntry());
    document.getElementById('gratitudePromptBtn')?.addEventListener('click', () => this.getGratitudePrompt());
    document.getElementById('reflectionPromptBtn')?.addEventListener('click', () => this.getReflectionQuestion());

    // Search with debounce
    const searchInput = document.getElementById('journalSearch');
    searchInput?.addEventListener('input', this.debounce(() => {
      this.loadEntries(searchInput.value);
    }, 400));
  }

  async saveEntry() {
    const title = document.getElementById('journalTitle')?.value.trim();
    const content = document.getElementById('journalContent')?.value.trim();
    const tagsStr = document.getElementById('journalTags')?.value.trim();
    const gratitude = document.getElementById('journalGratitude')?.value.trim();

    if (!title || !content) {
      this.showToast('Please add a title and content', 'warning');
      return;
    }

    const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];

    try {
      await this.apiCall('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, tags, gratitude })
      });

      this.showToast('Journal entry saved ✍️', 'success');
      this.clearJournalForm();
      this.loadEntries();

    } catch (error) {
      console.error('Failed to save entry:', error);
      // Save locally
      const entries = JSON.parse(localStorage.getItem('mindfulai_journal') || '[]');
      entries.unshift({
        id: this.generateId(),
        title, content, tags, gratitude,
        created_at: new Date().toISOString()
      });
      localStorage.setItem('mindfulai_journal', JSON.stringify(entries));
      this.showToast('Entry saved locally', 'info');
      this.clearJournalForm();
      this.loadEntries();
    }
  }

  clearJournalForm() {
    document.getElementById('journalTitle').value = '';
    document.getElementById('journalContent').value = '';
    document.getElementById('journalTags').value = '';
    document.getElementById('journalGratitude').value = '';
    document.getElementById('promptDisplay').style.display = 'none';
  }

  async loadEntries(search = '') {
    const container = document.getElementById('journalEntries');
    const noData = document.getElementById('noJournalData');

    try {
      const url = search ? `/api/journal?search=${encodeURIComponent(search)}` : '/api/journal';
      const response = await this.apiCall(url);
      const data = await response.json();

      if (data.entries && data.entries.length > 0) {
        noData.style.display = 'none';
        this.renderJournalEntries(data.entries);
      } else {
        // Try local entries
        this.renderLocalEntries(search);
      }
    } catch (e) {
      this.renderLocalEntries(search);
    }
  }

  renderLocalEntries(search = '') {
    let entries = JSON.parse(localStorage.getItem('mindfulai_journal') || '[]');
    const noData = document.getElementById('noJournalData');

    if (search) {
      entries = entries.filter(e =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.content.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (entries.length > 0) {
      noData.style.display = 'none';
      this.renderJournalEntries(entries);
    } else {
      noData.style.display = 'block';
    }
  }

  renderJournalEntries(entries) {
    const container = document.getElementById('journalEntries');
    const noData = document.getElementById('noJournalData');

    // Remove existing cards but keep noData
    container.querySelectorAll('.journal-entry-card').forEach(c => c.remove());

    if (entries.length === 0) {
      noData.style.display = 'block';
      return;
    }

    noData.style.display = 'none';

    entries.forEach(entry => {
      const card = document.createElement('div');
      card.className = 'journal-entry-card';

      const tags = (entry.tags || []).map(t => `<span class="entry-tag">${this.sanitizeHTML(t)}</span>`).join('');
      const gratitude = entry.gratitude ? `<div class="entry-gratitude">🙏 ${this.sanitizeHTML(entry.gratitude)}</div>` : '';

      card.innerHTML = `
        <div class="entry-header">
          <span class="entry-title">${this.sanitizeHTML(entry.title)}</span>
          <span class="entry-date">${this.formatTimestamp(new Date(entry.created_at))}</span>
        </div>
        <div class="entry-content">${this.sanitizeHTML(entry.content)}</div>
        ${tags ? `<div class="entry-tags">${tags}</div>` : ''}
        ${gratitude}
        <div class="entry-actions">
          <button class="entry-action-btn delete" onclick="app.deleteEntry('${entry.id}')">Delete</button>
        </div>
      `;

      container.appendChild(card);
    });
  }

  async deleteEntry(id) {
    if (!confirm('Delete this journal entry?')) return;

    try {
      await this.apiCall(`/api/journal/${id}`, { method: 'DELETE' });
      this.showToast('Entry deleted', 'info');
      this.loadEntries();
    } catch (e) {
      // Delete locally
      let entries = JSON.parse(localStorage.getItem('mindfulai_journal') || '[]');
      entries = entries.filter(e => e.id !== id);
      localStorage.setItem('mindfulai_journal', JSON.stringify(entries));
      this.loadEntries();
    }
  }

  async getGratitudePrompt() {
    const prompts = [
      "What's one small thing that made you smile today?",
      "Who is someone you're grateful to have in your life?",
      "What's a simple pleasure you enjoyed recently?",
      "What's something about your health you appreciate?",
      "What's a skill or ability you're thankful for?",
      "What's something in nature that brought you peace?",
      "Who showed you kindness this week?",
      "What's a comfort you might take for granted?",
      "What's a memory that always warms your heart?",
      "What's one thing you love about where you live?"
    ];

    try {
      const response = await this.apiCall('/api/journal/prompts/gratitude');
      const data = await response.json();
      this.showPrompt(data.prompt);
    } catch (e) {
      this.showPrompt(prompts[Math.floor(Math.random() * prompts.length)]);
    }
  }

  async getReflectionQuestion() {
    const questions = [
      "How are you really feeling right now, beneath the surface?",
      "What's been occupying your mind the most lately?",
      "What boundary do you need to set or reinforce?",
      "What would you tell your younger self about what you're going through?",
      "What are you avoiding, and why might that be?",
      "What does self-compassion look like for you today?",
      "What patterns have you noticed in your thoughts this week?",
      "What do you need more of in your life right now?",
      "How have your emotions changed throughout today?",
      "What are you most proud of about yourself right now?"
    ];

    try {
      const response = await this.apiCall('/api/journal/prompts/reflection');
      const data = await response.json();
      this.showPrompt(data.question);
    } catch (e) {
      this.showPrompt(questions[Math.floor(Math.random() * questions.length)]);
    }
  }

  showPrompt(text) {
    const display = document.getElementById('promptDisplay');
    const promptText = document.getElementById('promptText');
    if (display && promptText) {
      promptText.textContent = text;
      display.style.display = 'block';
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SETTINGS MODULE
  // ═══════════════════════════════════════════════════════════════════════

  initSettings() {
    // Theme toggle
    const themeCheckbox = document.getElementById('themeCheckbox');
    themeCheckbox?.addEventListener('change', () => this.toggleTheme());

    // Export chat
    document.getElementById('exportChatBtn')?.addEventListener('click', () => this.exportChat());

    // Clear chat
    document.getElementById('clearChatBtn')?.addEventListener('click', () => this.clearChat());

    // Export all
    document.getElementById('exportAllBtn')?.addEventListener('click', () => this.exportAllData());
  }

  toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);

    const checkbox = document.getElementById('themeCheckbox');
    if (checkbox) checkbox.checked = newTheme === 'dark';

    this.saveThemePreference(newTheme);
  }

  saveThemePreference(theme) {
    localStorage.setItem('mindfulai_theme', theme);
  }

  loadThemePreference() {
    const theme = localStorage.getItem('mindfulai_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    const checkbox = document.getElementById('themeCheckbox');
    if (checkbox) checkbox.checked = theme === 'dark';
  }

  exportChat() {
    const text = this.chatHistory.map(msg =>
      `[${msg.role === 'user' ? 'You' : 'MindfulAI'}]: ${msg.content}`
    ).join('\n\n---\n\n');

    this.downloadFile('MindfulAI_Chat_Export.txt', text);
    this.showToast('Chat exported successfully', 'success');
  }

  clearChat() {
    if (!confirm('Are you sure you want to clear all chat history? This cannot be undone.')) return;

    this.chatHistory = [];
    localStorage.removeItem('mindfulai_chat_history');
    document.getElementById('chatMessages').innerHTML = '';
    document.getElementById('chatWelcome').style.display = 'flex';
    this.showToast('Chat history cleared', 'info');
  }

  exportAllData() {
    const data = {
      chatHistory: this.chatHistory,
      moods: JSON.parse(localStorage.getItem('mindfulai_moods') || '[]'),
      journal: JSON.parse(localStorage.getItem('mindfulai_journal') || '[]'),
      exportDate: new Date().toISOString()
    };

    this.downloadFile('MindfulAI_Data_Export.json', JSON.stringify(data, null, 2));
    this.showToast('All data exported', 'success');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════════════

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  formatTimestamp(date) {
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  debounce(fn, delay) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  generateId() {
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
  }

  downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// ─── Initialize App ─────────────────────────────────────────────────────────
const app = new MindfulAI();
