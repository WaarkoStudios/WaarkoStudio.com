// popup.js - Waarko Studio
// Handles all popup windows - silently does nothing if file not found

function openPopup(filename) {
  fetch(filename)
    .then(response => {
      if (!response.ok) return;
      createPopup(filename);
    })
    .catch(() => {});
}

function createPopup(filename) {
  const existing = document.getElementById('ws-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'ws-overlay';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.12);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(4px);
    opacity: 0;
    transition: opacity 0.3s ease;
  `;

  const box = document.createElement('div');
  box.style.cssText = `
    background: rgba(10,10,30,0.55);
    backdrop-filter: blur(14px);
    border: 1px solid rgba(0,212,255,0.3);
    border-radius: 16px;
    width: 90%;
    max-width: 700px;
    max-height: 85vh;
    overflow-y: auto;
    position: relative;
    transform: translateY(20px);
    transition: transform 0.3s ease;
  `;

  const close = document.createElement('button');
  close.innerHTML = '✕';
  close.style.cssText = `
    position: absolute;
    top: 16px;
    right: 16px;
    background: none;
    border: none;
    color: #6b7a9e;
    font-size: 1.2em;
    cursor: pointer;
    font-family: Orbitron, monospace;
    z-index: 1;
    transition: color 0.2s;
  `;
  close.onmouseover = () => close.style.color = '#00d4ff';
  close.onmouseout  = () => close.style.color = '#6b7a9e';
  close.onclick     = () => closePopup(overlay);

  const iframe = document.createElement('iframe');
  iframe.src = filename;
  iframe.style.cssText = `
    width: 100%;
    height: 70vh;
    border: none;
    border-radius: 16px;
  `;

  // Allow suggestion.html inside iframe to close the popup
  iframe.addEventListener('load', () => {
    try {
      const iframeWin = iframe.contentWindow;
      iframeWin.__closeParentPopup = () => closePopup(overlay);
    } catch(e) {}
  });

  box.appendChild(close);
  box.appendChild(iframe);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    box.style.transform = 'translateY(0)';
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closePopup(overlay);
  });

  document.addEventListener('keydown', function escClose(e) {
    if (e.key === 'Escape') {
      closePopup(overlay);
      document.removeEventListener('keydown', escClose);
    }
  });
}

function closePopup(overlay) {
  overlay.style.opacity = '0';
  setTimeout(() => { if (overlay) overlay.remove(); }, 300);
}
