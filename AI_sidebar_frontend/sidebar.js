const chatContainer = document.getElementById('chat-container');
const queryInput = document.getElementById('query');
const submitButton = document.getElementById('submit');
const terminateButton = document.getElementById('terminate');
let chatHistory = [];
let currentSessionId = null;

// Greet on load
(async () => {
  const response = await sendToBackend({ action: 'greet', name: 'Rajesh' });
  logToBackend("Greet handler called");

  if (response?.status === 'success' && response?.response) {
    addMessage("AI", response.response);
  } else {
    addMessage("AI", "Welcome Rajesh! (offline)");
  }
})();

// Add message to UI
function addMessage(sender, text) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender === 'You' ? 'user-message' : 'ai-message'}`;
  const content = document.createElement('span');
  content.textContent = text;
  messageDiv.appendChild(content);
  chatContainer.appendChild(messageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  chatHistory.push({ sender, text });
  chrome.storage.local.set({ chatHistory });
  return messageDiv; // Return the created element
}

// Restore chat history
chrome.storage.local.get(['chatHistory'], (result) => {
  if (result.chatHistory) {
    chatHistory = result.chatHistory;
    chatHistory.forEach(msg => addMessage(msg.sender, msg.text));
  }
});

// Utility to chunk text
function chunkText(text, size = 1500) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

// Handle "submit" click
submitButton.addEventListener('click', async () => {
  const query = queryInput.value.trim();
  if (!query) return;

  submitButton.disabled = true;
  addMessage('You', query);
  queryInput.value = '';

  const loading = addMessage('AI', 'Thinking sir...');

  let timeoutId = setTimeout(() => {
    loading.remove();
    addMessage('AI', '⏱️ Request timed out. Please try again.');
    submitButton.disabled = false;
    logToBackend("Timeout: No response after 10 seconds");
  }, 10000); // 10 seconds

  try {
    const response = await sendToBackend({ action: 'ask', question: query });

    // Stop the timeout if response is received
    clearTimeout(timeoutId);
    loading.remove();

    if (response?.status === 'success' && response?.response) {
      logToBackend("got to the ask button handler");
      addMessage('AI', response.response);
    } else {
      addMessage('AI', 'Error: No valid response from backend.');
    }
  } catch (err) {
    clearTimeout(timeoutId);
    loading.remove();
    addMessage('AI', '⚠️ An error occurred.');
    console.error("Ask handler error:", err);
  }

  submitButton.disabled = false;
});

// Handle Ctrl+Enter
queryInput.addEventListener('keydown', async (e) => {
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault();
    submitButton.click();
  }
});

// Handle "Summarize" button
document.getElementById('summarize').addEventListener('click', async () => {
  submitButton.disabled = true;
  addMessage('You', 'summarize');
  const loadingMessage = addMessage('AI', 'Reading page content...');

  try {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        loadingMessage.remove();
        addMessage('AI', 'Error: Could not access tabs');
        submitButton.disabled = false;
        return;
      }

      chrome.tabs.sendMessage(tabs[0].id, { action: 'getPageContent' }, async (response) => {
        if (chrome.runtime.lastError) {
          loadingMessage.remove();
          addMessage('AI', 'Error: Could not communicate with page');
          submitButton.disabled = false;
          return;
        }

        if (response && response.content) {
          console.log('Page content received:', response.content.substring(0, 100) + '...');
          const chunks = chunkText(response.content);
          currentSessionId = Date.now().toString(); // Generate unique session ID
          
          console.log(`Processing ${chunks.length} chunks with session ID: ${currentSessionId}`);
          loadingMessage.textContent = `Processing ${chunks.length} chunks...`;
          
          // Show terminate button
          terminateButton.classList.remove('hidden');

          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            console.log(`Sending chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);
            
            const chunkResponse = await sendToBackend({ 
              action: 'summarize', 
              content: chunk,
              chunk_index: i,
              total_chunks: chunks.length,
              session_id: currentSessionId
            });
            
            console.log(`Chunk ${i + 1} response:`, chunkResponse);
            logToBackend(`Summarize chunk ${i + 1}/${chunks.length} response: ${JSON.stringify(chunkResponse)}`);
            
            if (chunkResponse?.status === 'success') {
              if (chunkResponse?.is_final) {
                // This is the final response with the complete summary
                console.log('Final summary received:', chunkResponse.response);
                loadingMessage.remove();
                addMessage('AI', chunkResponse.response);
                currentSessionId = null;
                terminateButton.classList.add('hidden');
                break;
              } else {
                // Update loading message for intermediate chunks
                loadingMessage.textContent = `Processed ${i + 1}/${chunks.length} chunks...`;
              }
            } else {
              console.error('Chunk processing failed:', chunkResponse);
              loadingMessage.remove();
              addMessage('AI', 'Error: Failed to process chunks');
              currentSessionId = null;
              terminateButton.classList.add('hidden');
              break;
            }
          }
        } else {
          loadingMessage.remove();
          addMessage('AI', 'Error: Could not retrieve page content');
        }

        submitButton.disabled = false;
        currentSessionId = null;
        terminateButton.classList.remove('active');
      });
    });
  } catch (error) {
    loadingMessage.remove();
    addMessage('AI', 'Error: An unexpected error occurred');
    submitButton.disabled = false;
  }
});

// Terminate button
terminateButton.addEventListener('click', async () => {
  if (currentSessionId) {
    console.log('Terminating session:', currentSessionId);
    
    try {
      const response = await sendToBackend({ 
        action: 'terminate', 
        session_id: currentSessionId 
      });
      
      if (response?.status === 'success') {
        addMessage('AI', 'Generation stopped by user');
      }
    } catch (error) {
      console.error('Error terminating session:', error);
    }
    
    currentSessionId = null;
    terminateButton.classList.remove('active');
    submitButton.disabled = false;
  }
});

// New Chat
document.getElementById('newChat').addEventListener('click', async () => {
  chatContainer.innerHTML = '';
  chatHistory = [];
  chrome.storage.local.set({ chatHistory });

  const response = await sendToBackend({ action: 'greet', name: 'Rajesh' });
  logToBackend("New chat greet triggered");

  if (response?.status === 'success' && response?.response) {
    addMessage("AI", response.response);
  } else {
    addMessage("AI", "Hello Rajesh!");
  }
});

// Respond to context menu or external message
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'summarizeSelectedText') {
    addMessage('You', msg.content);
    sendToBackend({ action: 'summarize', content: msg.content }).then(res => {
      if (res?.status === 'success' && res?.response) {
        addMessage('AI', res.response);
      } else {
        addMessage('AI', 'No valid summary returned.');
      }
    });
  }
});

// Send request to backend
async function sendToBackend(data) {
  try {
    const response = await fetch('http://127.0.0.1:5000/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    console.error('Backend error:', err);
    return { status: 'error', response: 'Offline mode: No backend response' };
  }
}

// Send frontend log to backend
async function logToBackend(message) {
  await fetch('http://127.0.0.1:5000/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });
}

