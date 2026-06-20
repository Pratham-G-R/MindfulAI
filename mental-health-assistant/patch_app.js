const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, 'public', 'js', 'app.js');
let content = fs.readFileSync(appJsPath, 'utf8');

// 1. Add Auth properties to constructor
content = content.replace(
  "this.currentView = 'chat';",
  `this.apiUrl = ''; // Set to backend URL if deploying frontend separately
    this.jwtToken = localStorage.getItem('mindfulai_token') || null;
    this.authMode = 'login'; // login or signup
    this.currentView = 'chat';`
);

// 2. Add auth methods to initialization
content = content.replace(
  "this.loadThemePreference();",
  `this.loadThemePreference();
    this.checkAuth();`
);

// 3. Add apiCall wrapper and Auth methods
const authMethods = `
  // ═══════════════════════════════════════════════════════════════════════
  // AUTHENTICATION & API WRAPPER
  // ═══════════════════════════════════════════════════════════════════════

  checkAuth() {
    if (!this.jwtToken) {
      document.getElementById('authOverlay').classList.add('active');
      document.getElementById('app').style.display = 'none';
    } else {
      document.getElementById('authOverlay').classList.remove('active');
      document.getElementById('app').style.display = 'flex';
      this.loadChatHistory(); // Load user-specific data
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
      'Authorization': \`Bearer \${this.jwtToken}\`
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
`;

content = content.replace(
  "// ═══════════════════════════════════════════════════════════════════════\n  // NAVIGATION",
  authMethods + "\n  // ═══════════════════════════════════════════════════════════════════════\n  // NAVIGATION"
);

// 4. Replace fetch calls with this.apiCall
// Using regex to carefully replace fetch('/api/...) with this.apiCall('/api/...)
content = content.replace(/await fetch\(\s*['"`](\/api\/[^'"`]+)['"`]/g, "await this.apiCall('$1'");
content = content.replace(/await fetch\(\s*url\s*/g, "await this.apiCall(url"); // specifically for the journal url var
content = content.replace(/await fetch\(\s*`(\/api\/[^`]+)`/g, "await this.apiCall(`$1`");

fs.writeFileSync(appJsPath, content, 'utf8');
console.log('app.js updated successfully');
