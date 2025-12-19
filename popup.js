let intervalId = null;

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

document.getElementById("start").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {

      window._shortsAutoScrollStop = false;

      function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      }

      function waitForVideo() {
        return new Promise(resolve => {
          const check = setInterval(() => {
            const video = document.querySelector("video");
            if (video) {
              clearInterval(check);
              resolve(video);
            }
          }, 100);
        });
      }

      async function getVideoDuration(video) {
        if (!video.duration || isNaN(video.duration) || video.duration === Infinity) {
          await new Promise(resolve => video.addEventListener("loadedmetadata", resolve, { once: true }));
        }
        return video.duration;
      }

      async function autoScrollShorts() {
        while (!window._shortsAutoScrollStop) {
          const video = await waitForVideo();
          const duration = await getVideoDuration(video);

          video.play();

          window._shortsStartTime = Date.now();
          window._shortsDuration = duration;

          await sleep(duration * 1000);

          // Simulate ArrowDown to go to next short
          document.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'ArrowDown',
            code: 'ArrowDown',
            keyCode: 40,
            which: 40,
            bubbles: true,
          }));

          await sleep(1000); // wait for next short to load
        }
      }

      autoScrollShorts();
    }
  });

  // Timer update in popup
  if (intervalId) clearInterval(intervalId);
  const timerDiv = document.getElementById("timer");

  intervalId = setInterval(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        if (!window._shortsStartTime || !window._shortsDuration) return 0;
        const elapsed = (Date.now() - window._shortsStartTime) / 1000;
        const remaining = Math.max(0, window._shortsDuration - elapsed);
        return remaining;
      },
    }, (res) => {
      if (!res || !res[0]) return;
      timerDiv.textContent = formatTime(res[0].result);
    });
  }, 500);
});

document.getElementById("stop").addEventListener("click", async () => {
  clearInterval(intervalId);
  document.getElementById("timer").textContent = "00:00";

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      window._shortsAutoScrollStop = true;
    }
  });
});
