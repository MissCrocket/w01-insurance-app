// js/utils/uiUtils.js
export function qs(sel, parent = document) {
  return parent.querySelector(sel);
}

export function qsa(sel, parent = document) {
  return Array.from(parent.querySelectorAll(sel));
}

export function announce(text) {
  const el = document.getElementById("aria-live");
  if (!el) return;
  el.textContent = "";
  requestAnimationFrame(() => {
    el.textContent = text;
  });
}

export function focusFirst(el) {
  const focusable = el.querySelector(
    'h1, h2, h3, button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  (focusable || el).focus();
}

export function showToast(message, duration = 3000) {
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-5 right-5 bg-neutral-800 text-white py-2 px-4 rounded-lg shadow-lg z-50 animate-pulse';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
      toast.classList.remove('animate-pulse');
  }, 100);

  setTimeout(() => {
    toast.remove();
  }, duration);
}