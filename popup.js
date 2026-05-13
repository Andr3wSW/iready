document.getElementById('run').onclick = async () => {
  const out = document.getElementById('out');
  const apiKeyInput = document.getElementById('apiKey');
  const promptInput = document.getElementById('prompt');

  const key = apiKeyInput.value.trim();
  const userPrompt = promptInput.value.trim() || 'Solve this problem step by step.';

  if (!key) {
    out.innerText = 'Please enter your Gemini API key.';
    return;
  }

  out.innerText = 'Capturing screen...';

  try {
    // Save key
    await chrome.storage.local.set({ geminiApiKey: key });

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Screenshot visible tab
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'png'
    });

    const base64 = dataUrl.split(',')[1];

    out.innerText = 'Sending to Gemini...';

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are a math assistant. Solve the problem shown in the image. User request: ${userPrompt}`
              },
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: base64
                }
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Request failed');
    }

    const aiResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response received.';

    out.innerHTML = marked.parse(aiResponse);

  } catch (err) {
    console.error(err);
    out.innerText = 'Error: ' + err.message;
  }
};

window.addEventListener('DOMContentLoaded', async () => {
  const { geminiApiKey } = await chrome.storage.local.get('geminiApiKey');
  if (geminiApiKey) {
    document.getElementById('apiKey').value = geminiApiKey;
  }
});
