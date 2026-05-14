const runBtn = document.getElementById('run');
const diagnosticBtn = document.getElementById('diagnostic');
const outputDiv = document.getElementById('out');
const apiKeyInput = document.getElementById('apiKey');
const promptInput = document.getElementById('prompt');

let diagnosticMode = false;

// Load saved API key
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const { geminiApiKey } = await chrome.storage.local.get('geminiApiKey');

    if (geminiApiKey) {
      apiKeyInput.value = geminiApiKey;
    }
  } catch (err) {
    console.error(err);
  }
});

// Toggle diagnostic mode
diagnosticBtn.addEventListener('click', () => {
  diagnosticMode = !diagnosticMode;

  if (diagnosticMode) {
    diagnosticBtn.textContent = 'DISABLE DIAGNOSTIC MODE';
    outputDiv.textContent = 'Diagnostic Mode Activated. Smarter Model is In Use';
  } else {
    diagnosticBtn.textContent = 'ENABLE DIAGNOSTIC MODE';
    outputDiv.textContent = 'Diagnostic Mode Disabled.';
  }
});

// Main run button
runBtn.addEventListener('click', async () => {
  const key = apiKeyInput.value.trim();

  const userPrompt =
    promptInput.value.trim() ||
    'Solve this problem step by step.';

  if (!key) {
    outputDiv.innerText = 'Please enter your Gemini API key.';
    return;
  }

  outputDiv.innerText = 'Capturing screen...';

  try {
    // Save API key
    await chrome.storage.local.set({
      geminiApiKey: key
    });

    // Get active tab
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    // Capture screenshot
    const dataUrl = await chrome.tabs.captureVisibleTab(
      tab.windowId,
      {
        format: 'png'
      }
    );

    const base64 = dataUrl.split(',')[1];

    outputDiv.innerText = 'Sending to Gemini...';

    // Diagnostic mode uses stronger model
    const model = diagnosticMode
      ? 'gemini-2.5-pro'
      : 'gemini-2.5-flash';

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

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
                text:
                  `You are a math assistant. Solve the problem shown in the image. User request: ${userPrompt}`
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
      throw new Error(
        data.error?.message || 'Request failed'
      );
    }

    const aiResponse =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      'No response received.';

    outputDiv.innerHTML = marked.parse(aiResponse);

  } catch (err) {
    console.error(err);
    outputDiv.innerText = 'Error: ' + err.message;
  }
});
