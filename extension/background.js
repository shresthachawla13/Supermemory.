chrome.runtime.onInstalled.addListener(() => {
  console.log('ContextVault extension installed');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'capture') {
    chrome.storage.sync.get(['supabase_url', 'supabase_anon_key', 'auth_token'], async (config) => {
      if (!config.supabase_url || !config.auth_token) {
        sendResponse({ error: 'Not configured or authenticated' });
        return;
      }

      try {
        const response = await fetch(`${config.supabase_url}/functions/v1/capture`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.auth_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request.data),
        });

        const data = await response.json();

        if (!response.ok) {
          sendResponse({ error: data.error || 'Failed to capture' });
        } else {
          sendResponse({ success: true, data });
        }
      } catch (error) {
        sendResponse({ error: error.message });
      }
    });

    return true;
  }
});
