// background.js

let isRecording = false;
let recordedSnippets = [];
let count = 0;
const SEPARATOR = '\n-----\n';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'startRecording':
      // Reset everything and flip on recording flag
      isRecording = true;
      recordedSnippets = [];
      count = 0;
      sendResponse({ status: 'started' });
      break;

    case 'stopRecording':
      // Just flip off recording; buffer remains intact until next start
      isRecording = false;
      sendResponse({ status: 'stopped' });
      break;

    case 'recordEvent':
      // Only record if we're in “recording” mode
      if (isRecording && typeof message.data === 'string') {
        recordedSnippets.push(message.data);
        count++;
      }
      break;

    case 'getStatus':
      // Let caller know if we are recording or idle
      sendResponse({ status: isRecording ? 'recording' : 'idle' });
      break;

    case 'getCount':
      sendResponse({ count });
      break;

    case 'getData':
      // Return the entire joined buffer
      sendResponse({ data: recordedSnippets.join(SEPARATOR) });
      break;

    case 'reset':
      // Clear buffer and counter but remain in whatever mode we are
      recordedSnippets = [];
      count = 0;
      sendResponse({ status: 'reset' });
      break;

    default:
      // Unknown action: do nothing
      break;
  }

  // Return true so we can respond asynchronously if needed. Here, responses are sync.
  return true;
});
