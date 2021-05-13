// Saves options to chrome.storage
function save_options() {
  var login = document.getElementById('login').value;
  var accessToken = document.getElementById('accessToken').value;
  var githubOrg = document.getElementById('githubOrg').value;
  var repos = document.getElementById('repos').value.split(',');
  chrome.storage.sync.set({
    login,
    accessToken,
    githubOrg,
    repos
  }, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 1500);
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  // Use default value color = 'red' and likesColor = true.
  chrome.storage.sync.get({
    login: '',
    accessToken: '',
    githubOrg: '',
    repos: []
  }, function(items) {
    document.getElementById('login').value = items.login;
    document.getElementById('accessToken').value = items.accessToken;
    document.getElementById('githubOrg').value = items.githubOrg;
    document.getElementById('repos').value = items.repos;
  });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
