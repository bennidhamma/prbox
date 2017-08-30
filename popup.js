// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function renderStatus(statusText) {
  document.getElementById('status').textContent = statusText
}

var gitLogin = 'bennidhamma'
var githubOrg = 'themaven-net'
var accessToken = '4b59f60f56a39ed04f27a948458e611cfb38c6ff'
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

var render = () => {
  var inbox = document.getElementById('inbox')
  var outbox = document.getElementById('outbox')
  var prs = ''
  for(let repo of data.repos) {
    if (!repo.pulls) {
      continue
    }
    for(var pull of repo.pulls) {
      prs += `<div>${pull.title}</div>`
    }
  }
  inbox.innerHTML = prs
}

var routePull = pull => {
  if (pull.user.login === gitLogin) {
    // I started this PR.
  } else if (pull.requests.some(r => r.login === gitLogin)) {
    // I am a reviewer on this PR.
  }
}

document.addEventListener('DOMContentLoaded', function() {
  getRepos().then(repos => {
    for (let repo of repos) {
      data.repos.push(repo)
      getPulls(repo.name).then(pulls => {
        console.log('pulls: ', pulls)
        repo.pulls = pulls
        render()
      })
    }
  })
});
