// popup.js

// Elements references
const idleUI = document.getElementById('idleUI');
const recUI = document.getElementById('recUI');
const statusDiv = document.getElementById('status');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const copyBtn = document.getElementById('copyBtn');
const resetBtn = document.getElementById('resetBtn');

let countInterval = null;

// Show the “idle” UI (only Start button)
function showIdleUI() {
  idleUI.style.display = 'block';
  recUI.style.display = 'none';
  if (countInterval) {
    clearInterval(countInterval);
    countInterval = null;
  }
}

// Show the “recording” UI (counter + Stop + Copy + Reset)
function showRecUI() {
  idleUI.style.display = 'none';
  recUI.style.display = 'block';

  // Immediately query and display current count
  updateCount();

  // Refresh the counter every second while popup is open
  if (!countInterval) {
    countInterval = setInterval(updateCount, 1000);
  }
}

// Fetch background “status” to decide which UI to show
function queryStatus() {
  chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
    if (response && response.status === 'recording') {
      showRecUI();
    } else {
      showIdleUI();
    }
  });
}

// Fetch background “count” and update #status text
function updateCount() {
  chrome.runtime.sendMessage({ action: 'getCount' }, (response) => {
    const c = response && typeof response.count === 'number' ? response.count : 0;
    statusDiv.textContent = 'Recorded: ' + c;
  });
}

// Start button handler
startBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'startRecording' }, (response) => {
    // Once background acknowledges, switch UI
    showRecUI();
  });
});

// Stop button handler
stopBtn.addEventListener('click', () => {
  // 1. Tell background to stop capturing
  chrome.runtime.sendMessage({ action: 'stopRecording' }, (resp) => {
    // 2. Then immediately fetch the entire buffer and copy it
    chrome.runtime.sendMessage({ action: 'getData' }, (response) => {
      if (response && typeof response.data === 'string') {
        navigator.clipboard
          .writeText(response.data)
          .catch((err) => console.error('Clipboard write failed:', err))
          .finally(() => {
            // 3. After copying, revert to idle UI
            showIdleUI();
          });
      } else {
        // If no data for some reason, just revert
        showIdleUI();
      }
    });
  });
});

// Copy button handler (when recording is ongoing)
copyBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'getData' }, (response) => {
    if (response && typeof response.data === 'string') {
      navigator.clipboard
        .writeText(response.data)
        .catch((err) => console.error('Clipboard write failed:', err));
    }
  });
});

// Reset button handler (when recording is ongoing)
resetBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'reset' }, (response) => {
    // Once reset is done, update counter to 0
    statusDiv.textContent = 'Recorded: 0';
  });
});

// When the popup HTML loads, immediately ask background for status
document.addEventListener('DOMContentLoaded', () => {
  queryStatus();
});
