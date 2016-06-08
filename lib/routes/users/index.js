var path = require('path');
var util = require('util');
var express = require('express');
var router = new express.Router();
var Datastore = require('nedb');
var moment = require('moment');

function UserViewModel(x) {
  this._id = x.user || x;
  this.username = x.user || x;
}

function UserProjectViewModel(x) {
  this._id = x._id;
  this.title = x.title;
  this.status = x.status;
  this.summary = x.summary;
  this.user = x.user;
  this.created = moment(x.created).fromNow();
  this.expiring = moment(x.created).add(28, 'days').diff(moment(), 'days');
  this.votes = x.votes;
  this.followers = x.followers;
}

const createDatastore = (x, type) => new Datastore({ filename: path.join(x, type), autoload: true });

const map = (a, m) => {
  var out = [];
  if (!util.isArray(a)) {
    return out;
  }

  a.forEach((x) => out.push(m(x)));
  return out;
};

const render = (res, view) => (model) => res.render(view, model) && res;
const renderUserList = (res) => render(res, 'users/list');
const renderUser = (res) => render(res, 'users/profile');

const redirect = (res, route) => () => res.redirect(route) && res;

const failWithError = (res, next) => (err) =>
  res.status(400) && next(new Error(typeof err === 'string' ? err : err.message));

const errorCheck = (resolve, reject) => (err, data) =>
  err ? reject(err) : resolve(data);

const dbfind = (f) => new Promise((resolve, reject) =>
  router.db.find(f, errorCheck(resolve, reject)));

const createUserListModel = () => (r) => ({
    users: map(r, (x) => new UserViewModel(x)),
  });

const createUserModel = (x) => (projects) => ({
    user: new UserViewModel(x),
    projects: map(projects, (x) => new UserProjectViewModel(x)),
  });

const logToConsole = (n) => (x) => {
  console.log(n, '>>', JSON.stringify(x, null, '  '));
  return x;
};

// middleware

const setup = (req, res, next) =>
  (router.db = router.db || createDatastore(req.app.locals.params.DATA_PATH || './.data', 'projects.db')) && next();

router.use(setup);

// public

const reduceToUserList = (projects) => {
  var users = [];

  projects.forEach((x) => !~users.indexOf(x.user) && users.push(x.user));

  return users;
};

const displayUserDetails = (req, res, next) =>
  dbfind({ user: req.params.user })     // need to display all statuses for user
    .then(createUserModel(req.params))
    .then(renderUser(res))
    .catch(failWithError(res, next));

const followUser = (req, res) => redirect(res, 'back');

const displayUserLists = (req, res, next) =>
  dbfind({})
    .then(reduceToUserList)
    .then(createUserListModel(req.params))
    .then(renderUserList(res))
    .catch(failWithError(res, next));

// public
router.get('/', displayUserLists);
router.get('/:user', displayUserDetails);
router.post(':user/follow', followUser);

// private methods

// exports

module.exports = router;
