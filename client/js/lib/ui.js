import { escapeHtml } from './html.mjs';

// Re-exported so components can keep importing all HTML helpers from ui.js.
export { escapeHtml };

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
