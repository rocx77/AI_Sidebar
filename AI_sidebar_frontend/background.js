chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageContent') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab) {
        sendResponse({ content: '' });
        return;
      }
      
      // First try to inject the content script
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      }).then(() => {
        // Then send the message
        chrome.tabs.sendMessage(tab.id, { action: 'getPageContent' }, (response) => {
          if (chrome.runtime.lastError || !response) {
            sendResponse({ content: '' });
          } else {
            sendResponse(response);
          }
        });
      }).catch(() => {
        // If injection fails, try sending message directly
        chrome.tabs.sendMessage(tab.id, { action: 'getPageContent' }, (response) => {
          if (chrome.runtime.lastError || !response) {
            sendResponse({ content: '' });
          } else {
            sendResponse(response);
          }
        });
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

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'openSidebar',
      title: 'Open Sidebar',
      contexts: ['all']
    });

    chrome.contextMenus.create({
      id: 'summarizeSelection',
      title: 'Summarize Selection',
      contexts: ['selection']
    });
  });
});
