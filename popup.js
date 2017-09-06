function renderStatus(statusText) {
  document.getElementById('status').textContent = statusText
}

const renderPull = pull => `<div class="pr">
  <header>${pull.title}</header>
  <a href="${pull.html_url}">
    ${pull.html_url}
  </a>
</div>`

const render = data => {
  const inbox = document.getElementById('inbox')
  const outbox = document.getElementById('outbox')
  const inboxHTML = '<h1>Inbox</h1>' + data.inbox.map(renderPull).join('\n')
  const outboxHTML = '<h1>Outbox</h1>' + data.outbox.map(renderPull).join('\n')
  inbox.innerHTML = inboxHTML
  outbox.innerHTML = outboxHTML
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

document.addEventListener('click', e => {
  if (e.target.localName === 'a') {
    chrome.tabs.create({url: e.target.href})
  }
})

chrome.runtime.onMessage.addListener(request => {
  if (request.cmd == "render")
    render(request.data)
});
