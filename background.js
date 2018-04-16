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
const COMMENTED = 'COMMENTED'

function mapToObject (map) {
  const object = {}
  for (let [name, value] of map) {
    object[name] = value
  }
  return object
}

const routePull = pull => {
  let reviewers = new Map()
  pull.requested_reviewers.forEach(v => reviewers.set(v.login, v))
  if (pull.requested_reviewers.some(r => r.login === gitLogin)) {
    // I am a reviewer on this PR. I *think* we may be able to just call it here and put it in
    // your inbox, since you disappear from requested_reviewers once you submit a review.
    pull.reviewers = mapToObject(reviewers)
    data.inbox.push(pull)
    return
  }
  const isMyPull = pull.user.login === gitLogin
  getReviews(pull).then(reviews => {
    console.log(pull.url, 'reviews', reviews)
    getComments(pull).then(comments => {
      // TODO: These comments are just the main PR comments, not specific commit comments. It would
      // be nice to get those comments as well.
      console.log(pull.url, 'comments', comments)

      let entries = [...reviews, ...comments]
        .sort((a, b) => new Date(a.submitted_at || a.updated_at) >
          new Date(b.submitted_at || b.updated_at))
      console.log(pull.url, 'entries', entries)
      let myBall = false, theirBall = isMyPull
      let currentState = OPEN
      let iAmOnPull = reviewers.has(gitLogin) || isMyPull

      if (isMyPull && pull.requested_reviewers.length == 0 && pull.state === 'open' &&
        reviews.length === 0) {
        // My PR does not have a reviewer, and has not had any review activity. I think this
        // means this is a new PR, without a reviewer, so put it in the inbox
        myBall = true
      }
      for (const entry of entries) {
        body = entry.body.replace(/^>.*$/mg, '').toLowerCase()
        const isMyEntry = entry.user.login === gitLogin
        const authorOwnsPull = entry.user.login === pull.user.login
        if (entry.user.login !== pull.user.login) {
          reviewers.set(entry.user.login, entry.user)
        }
        if (entry.state === CHANGES_REQUESTED) {
          iAmOnPull |= isMyEntry
          if (isMyPull) {
            myBall = true
          } else if (isMyEntry) {
            myBall = false
          }
          theirBall = isMyEntry
          currentState = CHANGES_REQUESTED
        } else if (entry.state === APPROVED) {
          iAmOnPull |= isMyEntry
          myBall = isMyPull
          theirBall = isMyEntry
          currentState = APPROVED
        } else if (body.includes('ptal')) {
          iAmOnPull |= isMyEntry
          if (body.includes('ptal @')) {
            myBall = body.includes(gitLogin)
          }
          else {
            // PTAL: if the current entry author owns the PR, and their is no specific
            // at mention, then everyone else on the pr should get the ball.
            // if the current entry author is not the pr owner, then only the author should
            // get the ball (if their is no  mention)
            if (isMyEntry || !iAmOnPull) {
              myBall = false
            } else if (authorOwnsPull) {
              myBall = true
            } else if (!authorOwnsPull && isMyPull) {
              myBall = true
            } else {
              myBall = false
            }
          }
          theirBall = iAmOnPull && !myBall && isMyEntry
        } else if (body.includes('lgtm')) {
          iAmOnPull |= isMyEntry
          myBall = isMyPull && !isMyEntry
          theirBall = !isMyPull && isMyEntry
        } else if (entry.state === COMMENTED) {
          iAmOnPull |= isMyEntry
        }
      }
      pull.reviewers = mapToObject(reviewers)
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
