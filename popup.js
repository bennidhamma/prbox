function renderStatus(statusText) {
  document.getElementById('status').textContent = statusText
}

let accessToken = ''
let gitLogin = ''
let githubOrg = ''
const api = url => `https://api.github.com/${url}`
const call = (url, qs) => fetch(`${url}?access_token=${accessToken}${qs ? '&' + qs : ''}`)
  .then(r => r.json())

const getRepos = () => call(api(`orgs/${githubOrg}/repos`))

const getPulls = repoName => call(api(`repos/${githubOrg}/${repoName}/pulls`))

const getComments = pull => call(`${pull.review_comments_url}`,
  'per_page=50&sort=created&direction=desc')

const data = {
  repos: [],
  inbox: [],
  outbox: [],
}

const renderPull = pull => `<div class="pr">
  <header>${pull.title}</header>
  <a href="${pull.html_url}">
    ${pull.html_url}
  </a>
</div>`

const render = () => {
  const inbox = document.getElementById('inbox')
  const outbox = document.getElementById('outbox')
  const inboxHTML = '<h1>Inbox</h1>' + data.inbox.map(renderPull).join('\n')
  const outboxHTML = '<h1>Outbox</h1>' + data.outbox.map(renderPull).join('\n')
  inbox.innerHTML = inboxHTML
  outbox.innerHTML = outboxHTML
}

const mostRecentPtal = comments => comments.find(c => c.body.toLowerCase().includes('ptal'))

const routePull = pull => {
  if (pull.user.login === gitLogin) {
    // I started this PR.
    getComments(pull).then(comments => {
      const ptal = mostRecentPtal(comments)
      if (!ptal || ptal.user.login === gitLogin) {
        data.outbox.push(pull)
      } else {
        data.inbox.push(pull)
      }
      render()
    })
  } else if (pull.requested_reviewers.some(r => r.login === gitLogin)) {
    // I am a reviewer on this PR.
    getComments(pull).then(comments => {
      let ptal = mostRecentPtal(comments)
      if (!ptal || ptal.user.login !== gitLogin) {
        data.inbox.push(pull)
      } else {
        data.outbox.push(pull)
      }
      render()
    })
  }
}

document.addEventListener('DOMContentLoaded', function() {
  chrome.storage.sync.get({
    login: '',
    accessToken: '',
    githubOrg: ''
  }, function(config) {
    accessToken = config.accessToken
    gitLogin = config.login
    githubOrg = config.githubOrg
    getRepos().then(repos => {
      for (let repo of repos) {
        data.repos.push(repo)
        getPulls(repo.name).then(pulls => {
          repo.pulls = pulls
          pulls.forEach(routePull)
        })
      }
    })
  })
})

document.addEventListener('click', e => {
  if (e.target.localName === 'a') {
    chrome.tabs.create({url: e.target.href})
  }
})
