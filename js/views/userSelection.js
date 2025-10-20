// js/views/userSelection.js
import { qs, qsa } from '../utils/uiUtils.js';
import * as progressService from '../services/progressService.js';
import { state } from '../main.js'; // Assuming main.js exports state

export function renderUserSelection(renderAppCallback) {
  const wrap = document.createElement('section');
  wrap.className = 'screen screen-user-selection flex flex-col items-center justify-center min-h-[calc(100vh-200px)]'; // Center content vertically

  const users = progressService.getUsers();

  let userListHTML = '<p class="text-neutral-400">No users found. Please add one.</p>';
  if (users.length > 0) {
    userListHTML = users.map(user => `
      <button class="btn btn-primary w-full max-w-xs user-select-btn" data-user-id="${user}">
        ${user}
      </button>
    `).join('');
  }

  wrap.innerHTML = `
    <div class="card bg-white/5 border border-white/10 text-center max-w-md w-full">
      <h1 class="text-3xl font-bold text-white mb-6">Select User Profile</h1>
      <div class="user-list space-y-3 mb-6">
        ${userListHTML}
      </div>
      <hr class="border-white/10 my-6">
      <h2 class="text-xl font-semibold text-white mb-4">Add New User</h2>
      <div class="flex flex-col sm:flex-row gap-2 max-w-xs mx-auto">
        <input type="text" id="new-user-name" class="flex-grow bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand" placeholder="Enter name...">
        <button id="add-user-btn" class="btn btn-primary">Add User</button>
      </div>
       <div id="delete-user-section" class="mt-6 ${users.length === 0 ? 'hidden' : ''}">
         <hr class="border-white/10 my-6">
         <h2 class="text-xl font-semibold text-white mb-4">Delete User</h2>
         <div class="flex flex-col sm:flex-row gap-2 max-w-xs mx-auto">
              <select id="delete-user-select" class="flex-grow bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand">
                  <option value="">-- Select User --</option>
                  ${users.map(user => `<option value="${user}">${user}</option>`).join('')}
              </select>
              <button id="delete-user-btn" class="btn bg-red-600 hover:bg-red-700">Delete</button>
          </div>
      </div>
    </div>
  `;

  // Event Listeners
  qsa('.user-select-btn', wrap).forEach(button => {
    button.addEventListener('click', () => {
      const userId = button.dataset.userId;
      if (progressService.setCurrentUser(userId)) {
        state.currentUser = userId; // Update global state
        renderAppCallback(); // Re-render the main app view
      }
    });
  });

  const addUserButton = qs('#add-user-btn', wrap);
  const newUserInput = qs('#new-user-name', wrap);
  addUserButton.addEventListener('click', () => {
    const newUserName = newUserInput.value.trim();
    if (newUserName) {
      if (progressService.addUser(newUserName)) {
        // Optionally select the new user immediately:
         if (progressService.setCurrentUser(newUserName)) {
             state.currentUser = newUserName; // Update global state
             renderAppCallback(); // Re-render the main app view
         } else {
              // Refresh user selection screen if not auto-selected
              renderAppCallback(true); // Pass flag to indicate just refreshing user selection
         }
      } else {
        alert(`User "${newUserName}" already exists or is invalid.`);
      }
    } else {
      alert('Please enter a name for the new user.');
    }
  });

  // Listener for Enter key in the input field
  newUserInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault(); // Prevent potential form submission if wrapped in form
      addUserButton.click(); // Trigger the add user button click
    }
  });

   // Delete User Listener
    const deleteUserButton = qs('#delete-user-btn', wrap);
    const deleteUserSelect = qs('#delete-user-select', wrap);
    deleteUserButton.addEventListener('click', () => {
        const userToDelete = deleteUserSelect.value;
        if (userToDelete) {
            if (confirm(`Are you sure you want to delete the user "${userToDelete}"? This action cannot be undone.`)) {
                if (progressService.deleteUser(userToDelete)) {
                    renderAppCallback(true); // Refresh user selection screen
                } else {
                    alert(`Failed to delete user "${userToDelete}".`);
                }
            }
        } else {
            alert('Please select a user to delete.');
        }
    });


  return wrap;
}