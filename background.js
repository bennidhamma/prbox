let accessToken = ''
let gitLogin = ''
let githubOrg = ''
const api = url => `https://api.github.com/${url}`
const call = (url, qs, page = 1) =>
  fetch(`${url}?per_page=100&page=${page}${qs ? '&' + qs : ''}`, {
    headers: new Headers({
      'Authorization': 'token ' + accessToken
    })
  })
  .then(r => r.json())

const getRepos = page => call(api(`orgs/${githubOrg}/repos`), null, page)

const getPulls = repoName => call(api(`repos/${githubOrg}/${repoName}/pulls`))

const getReviews = pull => call(`${pull.url}/reviews`)

const getComments = pull => call(`${pull.comments_url}`,
  'per_page=50&sort=created&direction=desc')

const getPullDetail = pull => call(pull.url)

let data = {
  repos: [],
  inbox: [],
  outbox: [],
}

var needsUpdate = false

const loadData = () => {
  data = {
    repos: [],
    inbox: [],
    outbox: [],
  }
  needsUpdate = true
  chrome.storage.sync.get({
    login: '',
    accessToken: '',
    githubOrg: '',
    repos: []
  }, function(config) {
    accessToken = config.accessToken
    gitLogin = config.login
    githubOrg = config.githubOrg
    repos = config.repos.map(n => ({name: n}))
    if (repos.length === 0) {
      for (var i = 1; i < 5; i++) {
        getRepos(i).then(repos => {
          console.log('repos: ', repos)
          if (repos.message === 'Not Found')
            return
        })
      }
    }
    for (let repo of repos) {
      data.repos.push(repo)
      getPulls(repo.name).then(pulls => {
        repo.pulls = pulls
        pulls.forEach(routePull)
      }).then(() => setTimeout(() => needsUpdate && update(), 4000))
    }
  })
}

const OPEN = 'OPEN'
const CHANGES_REQUESTED = 'CHANGES_REQUESTED'
const APPROVED = 'APPROVED'
const DISMISSED = 'DISMISSED'
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
    addPullToInbox(pull)
    return
  }
  const isMyPull = pull.user.login === gitLogin
  getReviews(pull).then(reviews => {
    console.log(pull.url, 'reviews', reviews)
    getComments(pull).then(async comments => {
      // TODO: These comments are just the main PR comments, not specific commit comments. It would
      // be nice to get those comments as well.
      console.log(pull.url, 'comments', comments)

      let entries = [...reviews, ...comments]
        .sort((a, b) => new Date(a.submitted_at || a.updated_at) -
          new Date(b.submitted_at || b.updated_at))
      console.log(pull.url, 'entries', entries)
      let myBall = false, theirBall = isMyPull
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
        const isAuthorEntry = entry.user.login === pull.user.login
        iAmOnPull |= isMyEntry
        if (entry.user.login !== pull.user.login) {
          reviewers.set(entry.user.login, entry.user)
        }
        if (entry.state === CHANGES_REQUESTED) {
          if (isMyPull) {
            myBall = true
          } else if (isMyEntry) {
            myBall = false
          }
          theirBall = isMyEntry
        } else if (entry.state === DISMISSED) {
          myBall = isMyEntry
          theirBall = iAmOnPull && !isMyEntry
        } else if (entry.state === APPROVED) {
          myBall = isMyPull
          theirBall = isMyEntry
        } else if (body.includes('ptal')) {
          if (body.includes('ptal @')) {
            myBall = body.includes(gitLogin)
          }
          else {
            // PTAL: if the current entry author owns the PR, and their is no specific
            // at mention, then everyone else on the pr should get the ball.
            // if the current entry author is not the pr owner, then only the author should
            // get the ball (if their is no  mention)
            myBall = iAmOnPull && (isAuthorEntry ^ isMyPull)
          }
          theirBall = iAmOnPull && !myBall && isMyEntry
        } else if (body.includes('lgtm')) {
          myBall = isMyPull && !isMyEntry
          theirBall = !isMyPull && isMyEntry
        } else if (entry.state === COMMENTED || !entry.state) {
           myBall |= body.includes('@' + gitLogin)
        }
      }
      pull.reviewers = mapToObject(reviewers)
      var doUpdate = false
      if (myBall) {
        await addPullToInbox(pull)
      } else if (theirBall) {
        data.outbox.push(pull)
        doUpdate = true
      }
      doUpdate && update()
    })
  })
}

const addPullToInbox = async pull => {
  var pullDetails = await getPullDetail(pull)
  pull.lines = pullDetails.additions + pullDetails.deletions
  data.inbox.push(pull)
  update()
}

const update = () => {
  needsUpdate = false
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
