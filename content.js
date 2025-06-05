// content.js

let isRecordingLocally = false;
let originalPushState = null;
let originalReplaceState = null;

// Helper: grab outerHTML + input/textarea value (if any)
function captureElementInfo(el) {
  const html = el.outerHTML;
  let info = `/* ELEMENT HTML */\n${html}`;

  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
    const val = el.value;
    info += `\n/* VALUE */\n${val}`;
  }

  return info;
}

// Send a snippet to the background script
function recordEvent(data) {
  chrome.runtime.sendMessage({ action: 'recordEvent', data });
}

// Click‐handler: capture outerHTML + value and send to background
function onClickHandler(event) {
  const el = event.target;
  const snippet = captureElementInfo(el);
  recordEvent(snippet);
}

// URL‐change handler: send a snippet whenever the URL changes
function onUrlChange() {
  const snippet = `/* URL CHANGE */\n${location.href}`;
  recordEvent(snippet);
}

// Hook into pushState/replaceState for SPA navigations
function overrideHistoryMethods() {
  originalPushState = history.pushState;
  originalReplaceState = history.replaceState;

  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    onUrlChange();
  };

  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args);
    onUrlChange();
  };
}

// Restore original history methods when stopping
function restoreHistoryMethods() {
  if (originalPushState) {
    history.pushState = originalPushState;
    originalPushState = null;
  }
  if (originalReplaceState) {
    history.replaceState = originalReplaceState;
    originalReplaceState = null;
  }
}

// Start listening to clicks + URL changes
function startCapture() {
  if (isRecordingLocally) return;
  isRecordingLocally = true;

  // 1) Capture the current URL right away
  onUrlChange();

  // 2) Listen to future click events
  document.addEventListener('click', onClickHandler, true);

  // 3) Listen for SPA navigations
  overrideHistoryMethods();
  window.addEventListener('popstate', onUrlChange, true);
  window.addEventListener('hashchange', onUrlChange, true);
}

// Stop listening
function stopCapture() {
  if (!isRecordingLocally) return;
  isRecordingLocally = false;

  document.removeEventListener('click', onClickHandler, true);
  window.removeEventListener('popstate', onUrlChange, true);
  window.removeEventListener('hashchange', onUrlChange, true);
  restoreHistoryMethods();
}

// Ask the background script: are we currently recording?
chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
  if (response && response.status === 'recording') {
    startCapture();
  }
});

// Listen for “startRecording” / “stopRecording” messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startRecording') {
    startCapture();
  } else if (message.action === 'stopRecording') {
    stopCapture();
  }
  // We don’t need to send any response back here
});
