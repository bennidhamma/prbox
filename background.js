let accessToken = ''
let gitLogin = ''
let githubOrg = ''
const api = url => `https://api.github.com/${url}`
const call = (url, qs) => fetch(`${url}?access_token=${accessToken}${qs ? '&' + qs : ''}`)
  .then(r => r.json())

const getRepos = () => call(api(`orgs/${githubOrg}/repos`))

const getPulls = repoName => call(api(`repos/${githubOrg}/${repoName}/pulls`))

const getReviews = pull => call(`${pull.url}/reviews`)

const getComments = pull => call(`${pull.comments_url}`,
  'per_page=50&sort=created&direction=desc')

let data = {
  repos: [],
  inbox: [],
  outbox: [],
}

const loadData = () => {
  data = {
    repos: [],
    inbox: [],
    outbox: [],
  }
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
}

const OPEN = 'OPEN'
const CHANGES_REQUESTED = 'CHANGES_REQUESTED'
const APPROVED = 'APPROVED'

const routePull = pull => {
  if (pull.requested_reviewers.some(r => r.login === gitLogin)) {
    // I am a reviewer on this PR. I *think* we may be able to just call it here and put it in
    // your inbox, since you disappear from requested_reviewers once you submit a review.
    data.inbox.push(pull)
    return
  }
  const isMyPull = pull.user.login === gitLogin
  getReviews(pull).then(reviews => {
    console.log(pull.url, 'reviews', reviews)
    getComments(pull).then(comments => {
      console.log(pull.url, 'comments', comments)
      let entries = [...reviews, ...comments]
        .sort((a, b) => new Date(a.submitted_at || a.updated_at) >
          new Date(b.submitted_at || b.updated_at))
      console.log(pull.url, 'entries', entries)
      let myBall = false, theirBall = isMyPull
      let currentState = OPEN
      let iAmOnPull = false
      for(const entry of entries) {
        const isMyEntry = entry.user.login === gitLogin
        const authorOwnsPull = entry.user.login === pull.user.login
        if (entry.state === CHANGES_REQUESTED) {
          iAmOnPull |= isMyEntry
          myBall = isMyPull
          theirBall = isMyEntry
          currentState = CHANGES_REQUESTED
        } else if (entry.state === APPROVED) {
          iAmOnPull |= isMyEntry
          myBall = isMyPull
          theirBall = isMyEntry
          currentState = APPROVED
        } else if (entry.body.toLowerCase().includes('ptal')) {
          iAmOnPull |= isMyEntry
          myBall = (iAmOnPull && !isMyEntry && (isMyPull || authorOwnsPull)) ||
            entry.body.toLowerCase().includes(gitLogin)
          theirBall = isMyEntry
        } else if (entry.body.toLowerCase().includes('lgtm')) {
          iAmOnPull |= isMyEntry
          myBall = isMyPull && !isMyEntry
          theirBall = !isMyPull && isMyEntry
        }
      }
      if (myBall) {
        data.inbox.push(pull)
      } else if (theirBall) {
        data.outbox.push(pull)
      }
      update()
    })
  })
}

const update = () => {
  chrome.storage.local.set({ data })
  if (chrome.browserAction) {
    chrome.browserAction.setBadgeText({text: data.inbox.length ? '' + data.inbox.length : ''})
  }
  chrome.runtime.sendMessage({cmd: 'render', data})
}

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create('check', {periodInMinutes: 5});
  loadData()
})

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('check', {periodInMinutes: 5});
  loadData()
})

chrome.alarms.onAlarm.addListener(() => {
  loadData()
})

chrome.runtime.onMessage.addListener(request => {
  if (request.cmd == "loadData")
    loadData()
});
