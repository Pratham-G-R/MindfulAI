import os
import re

app_js_path = os.path.join(os.path.dirname(__file__), 'public', 'js', 'app.js')

with open(app_js_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Auth properties to constructor
content = content.replace(
    "this.currentView = 'chat';",
    "this.apiUrl = ''; // Set to backend URL if deploying frontend separately\n    this.jwtToken = localStorage.getItem('mindfulai_token') || null;\n    this.authMode = 'login'; // login or signup\n    this.currentView = 'chat';"
)

# 2. Add auth methods to initialization
content = content.replace(
    "this.loadThemePreference();",
    "this.loadThemePreference();\n    this.checkAuth();"
)

# 3. Add apiCall wrapper and Auth methods
auth_methods = """
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
"""

content = content.replace(
    "// ═══════════════════════════════════════════════════════════════════════\n  // NAVIGATION",
    auth_methods + "\n  // ═══════════════════════════════════════════════════════════════════════\n  // NAVIGATION"
)

# 4. Replace fetch calls with this.apiCall
content = re.sub(r"await\s+fetch\(\s*['\"](/api/[^'\"]+)['\"]", r"await this.apiCall('\1'", content)
content = re.sub(r"await\s+fetch\(\s*url\s*", r"await this.apiCall(url", content)
content = re.sub(r"await\s+fetch\(\s*`(/api/[^`]+)`", r"await this.apiCall(`\1`", content)

with open(app_js_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("app.js updated successfully via python")
