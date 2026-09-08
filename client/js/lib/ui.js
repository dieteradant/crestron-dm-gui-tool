const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

// Device console output is untrusted input, so anything interpolated into
// innerHTML has to go through here.
export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

export function skeletonRows(count = 4, className = 'skeleton-row') {
  const rows = Array.from({ length: count }, () => `<div class="skeleton ${className}"></div>`).join('');
  return `<div class="skeleton-stack" aria-busy="true" aria-live="polite">${rows}</div>`;
}

export function emptyState(title, hint = '') {
  return `
    <div class="empty-state">
      <div class="empty-state-title">${escapeHtml(title)}</div>
      ${hint ? `<div class="empty-state-hint">${escapeHtml(hint)}</div>` : ''}
    </div>
  `;
}

export function errorState(message) {
  return `<div class="error-msg" role="alert"><span aria-hidden="true">!</span><span>${escapeHtml(message)}</span></div>`;
}
