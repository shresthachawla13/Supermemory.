const SUPABASE_URL_KEY = 'supabase_url';
const SUPABASE_ANON_KEY_KEY = 'supabase_anon_key';
const AUTH_TOKEN_KEY = 'auth_token';
const APP_URL_KEY = 'app_url';

const authRequired = document.getElementById('authRequired');
const mainContent = document.getElementById('mainContent');
const captureBtn = document.getElementById('captureBtn');
const openAppBtn = document.getElementById('openAppBtn');
const statusMessage = document.getElementById('statusMessage');
const pageTitle = document.getElementById('pageTitle');
const pageUrl = document.getElementById('pageUrl');
const totalItems = document.getElementById('totalItems');
const todayItems = document.getElementById('todayItems');

let currentTab = null;

async function init() {
  const config = await chrome.storage.sync.get([
    SUPABASE_URL_KEY,
    SUPABASE_ANON_KEY_KEY,
    AUTH_TOKEN_KEY,
    APP_URL_KEY,
  ]);

  if (!config[SUPABASE_URL_KEY] || !config[SUPABASE_ANON_KEY_KEY]) {
    showConfigNeeded();
    return;
  }

  if (!config[AUTH_TOKEN_KEY]) {
    showAuthRequired(config[APP_URL_KEY]);
    return;
  }

  [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (currentTab) {
    pageTitle.textContent = currentTab.title || 'Untitled Page';
    pageUrl.textContent = new URL(currentTab.url).hostname;
  }

  loadStats(config);
  showMainContent();
}

function showConfigNeeded() {
  authRequired.classList.remove('hidden');
  mainContent.classList.add('hidden');
  authRequired.innerHTML = `
    <p style="margin-bottom: 12px;">Configure ContextVault</p>
    <p style="font-size: 12px; color: #94a3b8; margin-bottom: 16px;">
      Right-click the extension icon and select "Options" to configure your Supabase credentials.
    </p>
  `;
}

function showAuthRequired(appUrl) {
  authRequired.classList.remove('hidden');
  mainContent.classList.add('hidden');

  openAppBtn.onclick = () => {
    const url = appUrl || 'http://localhost:5173';
    chrome.tabs.create({ url });
  };
}

function showMainContent() {
  authRequired.classList.add('hidden');
  mainContent.classList.remove('hidden');
}

function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status ${type}`;
  statusMessage.classList.remove('hidden');

  setTimeout(() => {
    statusMessage.classList.add('hidden');
  }, 3000);
}

async function loadStats(config) {
  try {
    const response = await fetch(`${config[SUPABASE_URL_KEY]}/rest/v1/content_items?select=id,created_at&status=eq.processed`, {
      headers: {
        'apikey': config[SUPABASE_ANON_KEY_KEY],
        'Authorization': `Bearer ${config[AUTH_TOKEN_KEY]}`,
      },
    });

    if (response.ok) {
      const items = await response.json();
      totalItems.textContent = items.length;

      const today = new Date().toDateString();
      const todayCount = items.filter(item =>
        new Date(item.created_at).toDateString() === today
      ).length;
      todayItems.textContent = todayCount;
    }
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

async function captureContent() {
  captureBtn.disabled = true;
  captureBtn.innerHTML = '<span class="spinner"></span> Saving...';

  try {
    const config = await chrome.storage.sync.get([
      SUPABASE_URL_KEY,
      SUPABASE_ANON_KEY_KEY,
      AUTH_TOKEN_KEY,
    ]);

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: extractPageContent,
    });

    const response = await fetch(`${config[SUPABASE_URL_KEY]}/functions/v1/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config[AUTH_TOKEN_KEY]}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: currentTab.url,
        title: currentTab.title,
        text: result.text,
        metadata: {
          favicon: currentTab.favIconUrl,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save content');
    }

    const data = await response.json();

    showStatus('Saved to your vault!', 'success');
    loadStats(config);

  } catch (error) {
    console.error('Capture error:', error);
    showStatus(error.message || 'Failed to save', 'error');
  } finally {
    captureBtn.disabled = false;
    captureBtn.textContent = 'Save to Vault';
  }
}

function extractPageContent() {
  const text = document.body.innerText || '';
  const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
  const ogDescription = document.querySelector('meta[property="og:description"]')?.content || '';

  return {
    text: text.slice(0, 5000),
    description: metaDescription || ogDescription,
  };
}

captureBtn?.addEventListener('click', captureContent);

init();
