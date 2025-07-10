chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageContent') {
    const pageText = document.body.innerText || document.body.textContent || '';
    sendResponse({ content: pageText });
    return true; // keep this for async support
  }
});
