// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function renderStatus(statusText) {
  document.getElementById('status').textContent = statusText
}

var gitLogin = 'bennidhamma'
var githubOrg = 'themaven-net'
//#var accessToken = '4b59f60f56a39ed04f27a948458e611cfb38c6ff'
var accessToken = 'f23061ca32a7623b97ee8ed8cc19647a160f755d'
var api = url => `https://api.github.com/${url}`
var call = (url, qs) => fetch(`${url}?access_token=${accessToken}${qs ? '&' + qs : ''}`)
  .then(r => r.json())

var getRepos = () => call(api(`orgs/${githubOrg}/repos`))

var getPulls = repoName => call(api(`repos/${githubOrg}/${repoName}/pulls`))

var getComments = pull => call(`${pull.review_comments_url}`,
  'per_page=50&sort=created&direction=desc')

var data = {
  repos: [],
  inbox: [],
  outbox: [],
}

var renderPull = pull => `<div class="pr">
  <header>${pull.title}</header>
  <a href="${pull.url}">${pull.url}</a>
</div>`

var render = () => {
  var inbox = document.getElementById('inbox')
  var outbox = document.getElementById('outbox')
  var inboxHTML = '<h1>Inbox</h1>' + data.inbox.map(renderPull).join('\n')
  var outboxHTML = '<h1>Outbox</h1>' + data.outbox.map(renderPull).join('\n')
  inbox.innerHTML = inboxHTML
  outbox.innerHTML = outboxHTML
}

var mostRecentPtal = comments => comments.find(c => c.body.toLower().includes('ptal'))

var routePull = pull => {
  if (pull.user.login === gitLogin) {
    // I started this PR.
    getComments(pull).then(comments => {
      var ptal = mostRecentPtal(comments)
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
      var ptal = mostRecentPtal(comments)
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
  getRepos().then(repos => {
    for (let repo of repos) {
      data.repos.push(repo)
      getPulls(repo.name).then(pulls => {
        console.log('pulls: ', pulls)
        repo.pulls = pulls
        pulls.forEach(routePull)
      })
    }
  })
});
