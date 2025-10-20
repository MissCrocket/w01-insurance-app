// js/views/userSelection.js
import { qs, qsa } from '../utils/uiUtils.js';
import * as progressService from '../services/progressService.js';
import { state } from '../main.js';

export function renderUserSelection(renderAppCallback) {
  const wrap = document.createElement('section');
  wrap.className = 'screen screen-user-selection flex flex-col items-center justify-center min-h-[calc(100vh-200px)]';

  const users = progressService.getUsers();

  let userListHTML = '<p class="text-neutral-400">No users found. Please add one.</p>';
  if (users.length > 0) {
    userListHTML = users.map(user => `
      <div class="user-profile" data-user-id="${user.id}">
        <div class="user-avatar theme-${user.theme}">${user.avatar}</div>
        <span class="user-name">${user.id}</span>
        <button class="delete-user-btn" data-user-id="${user.id}" aria-label="Delete ${user.id}">&times;</button>
      </div>
    `).join('');
  }

  wrap.innerHTML = `
    <div class="text-center max-w-md w-full">
      <h1 class="text-3xl font-bold text-white mb-6">Select User Profile</h1>
      <div class="user-grid">
        ${userListHTML}
      </div>
    </div>
    <button id="open-add-user-modal-btn" class="fab">+</button>
  `;

  // Event Listeners
  qsa('.user-profile', wrap).forEach(profile => {
    profile.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-user-btn')) {
        return;
      }
      const userId = profile.dataset.userId;
      if (progressService.setCurrentUser(userId)) {
        state.currentUser = userId;
        renderAppCallback();
      }
    });
  });

  qsa('.delete-user-btn', wrap).forEach(button => {
    button.addEventListener('click', () => {
      const userId = button.dataset.userId;
      if (confirm(`Are you sure you want to delete the user "${userId}"? This action cannot be undone.`)) {
        if (progressService.deleteUser(userId)) {
          renderAppCallback(true);
        } else {
          alert(`Failed to delete user "${userId}".`);
        }
      }
    });
  });

  return wrap;
}