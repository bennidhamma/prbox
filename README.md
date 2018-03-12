In the olden days, our team had a simple little tool to give us all the ability to easily stay on top of pull requests, from the convenience of a little chrome extension. Now, once more, we can have that peace of mind with github.
The tool is called PRbox, and you can find it on github at https://github.com/bennidhamma/prbox

Installation
First, clone it:

$ git clone https://github.com/bennidhamma/prbox

Second, open up your chrome extensions and ensure developer mode is clicked:

https://s3-us-west-2.amazonaws.com/maven-user-photos/viewfromthepeak/pages/VnDOi\_UY5kahZ1fKz-1dAA/TRVqKCre6E-rkY3YOU4HQQ

Once that is done, click "Load unpacked extension":

https://s3-us-west-2.amazonaws.com/maven-user-photos/viewfromthepeak/pages/VnDOi\_UY5kahZ1fKz-1dAA/zMME6d0qlkutT0CgNSufsQ

Now, navigate to your prbox directory you just cloned from git:

https://s3-us-west-2.amazonaws.com/maven-user-photos/viewfromthepeak/pages/VnDOi\_UY5kahZ1fKz-1dAA/zbtndGu28ECUMjIUAj2-uQ


Now, to configure, click options:

https://s3-us-west-2.amazonaws.com/maven-user-photos/viewfromthepeak/pages/VnDOi\_UY5kahZ1fKz-1dAA/LUrNKATX2EiBxw4-6gpHPw


Enter your github login, username, and a github personal access token :

https://s3-us-west-2.amazonaws.com/maven-user-photos/viewfromthepeak/pages/VnDOi\_UY5kahZ1fKz-1dAA/DMuRDSmrQkS\_GEg45jXGDg

The scopes you'll need are repo, notifications, and user.

And you should be good to go!

How To Use


A PR is considered to be in your inbox if:

- This PR is new and you have been requested to be a reviewer
- This PR is yours and someone has reviewed it and requested changes
- This PR is yours but you have not yet added a reviewer
- You are a reviewer who requested changes and the author of the PR has asked you to take a look again at the PR
- You are the owner and your PR has been approved
- Someone who is not you has used the phrase "PTAL". In particular, if your github login is included in the same message that will cause it to be put in your inbox.
- A PR is considered to be in your outbox in any other situation, as long as you are either the author or have previously contributed to the PR.

But how does it work?
We make a call to the organization to get all the repos for that org. Then we get all open pulls for each repo. Then we fetch all of the reviews and comments for each PR and build a chronological list of events for each PR. The logic above is applied sequentially to each entry in this list, and whoever ends the walkthrough with responsibility has the pull put in their inbox.
