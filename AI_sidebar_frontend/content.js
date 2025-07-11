console.log('Content script loaded on:', window.location.href);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  if (request.action === 'getPageContent') {
    const pageText = document.body.innerText || document.body.textContent || '';
    console.log('Extracted page content length:', pageText.length);
    console.log('Page content preview:', pageText.substring(0, 100));
    sendResponse({ content: pageText });
    return true; // keep this for async support
  }
});
