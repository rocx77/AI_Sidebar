chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageContent') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0]?.id, { action: 'extractContent' }, (response) => {
        if (chrome.runtime.lastError || !response) {
          sendResponse({ content: '' });
        } else {
          sendResponse(response);
        }
      });
    });
    return true;
  } else if (request.action === 'refreshContextMenu') {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: 'openSidebar',
        title: 'Open AI Assistant Sidebar',
        contexts: ['all']
      });
      chrome.contextMenus.create({
        id: 'summarizeSelection',
        title: 'Summarize Selected Text with AI',
        contexts: ['selection']
      });
    });
  }
});

chrome.contextMenus.create({
  id: 'openSidebar',
  title: 'Open AI Assistant Sidebar',
  contexts: ['all']
});
chrome.contextMenus.create({
  id: 'summarizeSelection',
  title: 'Summarize Selected Text with AI',
  contexts: ['selection']
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'openSidebar') {
    chrome.sidePanel.setOptions({
      tabId: tab.id,
      path: 'sidebar.html',
      enabled: true
    });
  } else if (info.menuItemId === 'summarizeSelection' && info.selectionText) {
    chrome.runtime.sendMessage({
      action: 'summarizeSelectedText',
      content: info.selectionText
    });
  }
});