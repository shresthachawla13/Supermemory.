const SUPABASE_URL_KEY = 'supabase_url';
const SUPABASE_ANON_KEY_KEY = 'supabase_anon_key';
const AUTH_TOKEN_KEY = 'auth_token';
const APP_URL_KEY = 'app_url';

const configForm = document.getElementById('configForm');
const authForm = document.getElementById('authForm');
const signedInStatus = document.getElementById('signedInStatus');
const statusMessage = document.getElementById('statusMessage');
const saveConfigBtn = document.getElementById('saveConfigBtn');
const signInBtn = document.getElementById('signInBtn');
const signOutBtn = document.getElementById('signOutBtn');
const toggleAuthBtn = document.getElementById('toggleAuthBtn');

let isSignUp = false;

async function init() {
  const config = await chrome.storage.sync.get([
    SUPABASE_URL_KEY,
    SUPABASE_ANON_KEY_KEY,
    AUTH_TOKEN_KEY,
    APP_URL_KEY,
  ]);

  if (config[SUPABASE_URL_KEY]) {
    document.getElementById('supabaseUrl').value = config[SUPABASE_URL_KEY];
  }

  if (config[SUPABASE_ANON_KEY_KEY]) {
    document.getElementById('supabaseAnonKey').value = config[SUPABASE_ANON_KEY_KEY];
  }

  if (config[APP_URL_KEY]) {
    document.getElementById('appUrl').value = config[APP_URL_KEY];
  }

  if (config[AUTH_TOKEN_KEY]) {
    showSignedIn();
  } else {
    showSignedOut();
  }
}

function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status ${type}`;
  statusMessage.classList.remove('hidden');

  setTimeout(() => {
    statusMessage.classList.add('hidden');
  }, 4000);
}

function showSignedIn() {
  authForm.classList.add('hidden');
  signedInStatus.classList.remove('hidden');
}

function showSignedOut() {
  authForm.classList.remove('hidden');
  signedInStatus.classList.add('hidden');
}

configForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  saveConfigBtn.disabled = true;
  saveConfigBtn.textContent = 'Saving...';

  const supabaseUrl = document.getElementById('supabaseUrl').value.trim();
  const supabaseAnonKey = document.getElementById('supabaseAnonKey').value.trim();
  const appUrl = document.getElementById('appUrl').value.trim();

  try {
    await chrome.storage.sync.set({
      [SUPABASE_URL_KEY]: supabaseUrl,
      [SUPABASE_ANON_KEY_KEY]: supabaseAnonKey,
      [APP_URL_KEY]: appUrl,
    });

    showStatus('Configuration saved successfully!', 'success');
  } catch (error) {
    showStatus('Failed to save configuration', 'error');
  } finally {
    saveConfigBtn.disabled = false;
    saveConfigBtn.textContent = 'Save Configuration';
  }
});

signInBtn.addEventListener('click', async () => {
  signInBtn.disabled = true;
  signInBtn.textContent = isSignUp ? 'Creating account...' : 'Signing in...';

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    const config = await chrome.storage.sync.get([SUPABASE_URL_KEY, SUPABASE_ANON_KEY_KEY]);

    if (!config[SUPABASE_URL_KEY] || !config[SUPABASE_ANON_KEY_KEY]) {
      throw new Error('Please configure Supabase settings first');
    }

    const endpoint = isSignUp ? 'signup' : 'token?grant_type=password';
    const response = await fetch(`${config[SUPABASE_URL_KEY]}/auth/v1/${endpoint}`, {
      method: 'POST',
      headers: {
        'apikey': config[SUPABASE_ANON_KEY_KEY],
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error_description || data.msg || 'Authentication failed');
    }

    if (data.access_token) {
      await chrome.storage.sync.set({
        [AUTH_TOKEN_KEY]: data.access_token,
      });

      showStatus(isSignUp ? 'Account created!' : 'Signed in successfully!', 'success');
      showSignedIn();

      document.getElementById('email').value = '';
      document.getElementById('password').value = '';
    } else {
      throw new Error('No access token received');
    }
  } catch (error) {
    showStatus(error.message, 'error');
  } finally {
    signInBtn.disabled = false;
    signInBtn.textContent = isSignUp ? 'Sign Up' : 'Sign In';
  }
});

signOutBtn.addEventListener('click', async () => {
  try {
    await chrome.storage.sync.remove(AUTH_TOKEN_KEY);
    showStatus('Signed out successfully', 'success');
    showSignedOut();
  } catch (error) {
    showStatus('Failed to sign out', 'error');
  }
});

toggleAuthBtn.addEventListener('click', () => {
  isSignUp = !isSignUp;
  signInBtn.textContent = isSignUp ? 'Sign Up' : 'Sign In';
  toggleAuthBtn.textContent = isSignUp ? 'Have an account? Sign in' : 'Need an account? Sign up';
});

init();
