// content.js

let isRecordingLocally = false;
let originalPushState = null;
let originalReplaceState = null;

// Helper: capture outerHTML + possible input/textarea value
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

// Click handler: log both the clicked node AND its nearest <li class="dropdown mega-dropdown"> ancestor, if any.
function onClickHandler(event) {
  // 1) Find the actual clicked node (could be <img>, <span>, text node, etc.)
  const clicked = event.target;

  // 2) If the click occurred inside a <li class="dropdown mega-dropdown">, log that <li>
  const dropdownLi = clicked.closest('li.dropdown.mega-dropdown');
  if (dropdownLi) {
    // Log the parent <li> first
    const parentSnippet = `/* DROPDOWN <li> ELEMENT HTML */\n${dropdownLi.outerHTML}`;
    recordEvent(parentSnippet);

    // Optionally, you can also log the inner <a> that was clicked.
    // But if you just want the <li>, comment out the next two lines.
    const innerAnchor = clicked.closest('a');
    if (innerAnchor) {
      const anchorSnippet = `/* INNER <a> ELEMENT HTML */\n${innerAnchor.outerHTML}`;
      recordEvent(anchorSnippet);
    }
  }
  else {
    // 3) Otherwise, no dropdown ancestor—fall back to logging exactly event.target
    const snippet = captureElementInfo(clicked);
    recordEvent(snippet);
  }
}

// URL-change handler: send a snippet whenever the URL changes
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

  // 1) Capture the current URL immediately
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

// On injection, ask background: “are we in recording mode?”
chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
  if (response && response.status === 'recording') {
    startCapture();
  }
});

// Listen for start/stop commands from popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startRecording') {
    startCapture();
  } else if (message.action === 'stopRecording') {
    stopCapture();
  }
  // no need to send a reply here
});
