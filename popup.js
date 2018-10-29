function renderStatus(statusText) {
  document.getElementById('status').textContent = statusText
}

const compareUsers = (a, b) => {
  if (a.login < b.login) {
    return -1
  }
  if (a.login > b.login) {
    return 1
  }
  return 0
}

const comparePrs = (a, b) => {
  return new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at)
}

const renderAvatar = user => `<img src="https://avatars0.githubusercontent.com/u/${user.id}?s=40&v=4">`

const renderUser = user => `<span>${renderAvatar(user)} ${user.login}</span>`

const renderUpdated = pull => {
  if (pull.created_at === pull.updated_at) {
    return ''
  }
  return `,<br/>updated<span class="timeago" datetime="${pull.updated_at}">${pull.updated_at}</span>`
}

const renderPull = pull => `<a class="pr-link" href="${pull.html_url}">
  <div class="pr">
    <header><big>#${pull.number}</big> - ${pull.title}</header>
    <div class="info repo"><strong>Repo:</strong>${pull.head.repo.name}</div>
    <div class="info user author">
      <strong>Author:</strong>${renderUser(pull.user)}
    </div>
    <div class="times">
      Opened<span class="timeago" datetime="${pull.created_at}">${pull.created_at}</span>${renderUpdated(pull)}
    </div>
    <div class="info user reviewers">
      <strong>Reviewers:</strong>
      ${pull.reviewers ? Object.values(pull.reviewers).sort(compareUsers).map(renderUser).join(' ') : 'None'}
    </div>
  </div>
</a>`

const render = data => {
  const inbox = document.getElementById('inbox')
  const outbox = document.getElementById('outbox')
  const inboxPRs = new Map()
  const outboxPRs = new Map()

  data.inbox.forEach(pr => inboxPRs.set(pr.number, pr))
  data.outbox.forEach(pr => outboxPRs.set(pr.number, pr))
  const sortedInbox = [...inboxPRs.values()].sort(comparePrs)
  const sortedOutbox = [...outboxPRs.values()].sort(comparePrs)
  const inboxHTML = '<h1>Inbox</h1>' + sortedInbox.map(renderPull).join('\n')
  const outboxHTML = '<h1>Outbox</h1>' + sortedOutbox.map(renderPull).join('\n')
  inbox.innerHTML = inboxHTML
  outbox.innerHTML = outboxHTML
  timeago().render(document.querySelectorAll('.timeago'))
}

document.addEventListener('DOMContentLoaded', function() {
  chrome.storage.local.get({
    data: null
  }, function({data}) {
    if (data) {
      render(data)
    }
    chrome.runtime.sendMessage({cmd: 'loadData'})
  })
})

function openPR(e) {
  if (e.target.localName === 'a') {
    chrome.tabs.create({url: e.target.href})
  }
}

document.addEventListener('click', e => {
  var el = e.target
  while (el && el.localName !== 'a') {
    el = el.parentElement
  }
  if (el && el.localName === 'a') {
    chrome.tabs.create({url: el.href})
  }
})

chrome.runtime.onMessage.addListener(request => {
  if (request.cmd == "render")
    render(request.data)
});
