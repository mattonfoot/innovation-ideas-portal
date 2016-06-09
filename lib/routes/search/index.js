var path = require('path');
var util = require('util');
var express = require('express');
var router = new express.Router();
var Datastore = require('nedb');
var moment = require('moment');

function SearchResultViewModel(x) {
  this._id = x._id;
  this.title = x.title;
  this.status = x.status;
  this.link = x.link;
  this.summary = x.summary;
  this.description = x.description;
  this.user = x.user;
  this.tags = x.tags;
  this.created = moment(x.created).fromNow();
  this.updated = moment(x.updated).fromNow();
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
const renderSearchResults = (res) => render(res, 'search/results');

const failWithError = (res, next) => (err) =>
  res.status(400) && next(new Error(typeof err === 'string' ? err : err.message));

const errorCheck = (resolve, reject) => (err, data) =>
  err ? reject(err) : resolve(data);

const dbfind = (f) => new Promise((resolve, reject) =>
  router.db.find(f, errorCheck(resolve, reject)));

const createSearchResultsViewModel = () => (r) => ({
    projects: map(r, (x) => new SearchResultViewModel(x)),
    users: [],
  });

const logToConsole = (n) => (x) => {
  console.log(n, '>>', JSON.stringify(x, null, '  '));
  return x;
};

const createSearchQuery = (params) => new Promise((resolve) => {
  var q = {};

  if (params.status) {
    q.status = params.status;
  } else {
    q.$not = { status: 'in draft' };
  }

  resolve(q);
});

const searchProjects = (q) =>
  dbfind(q);

// middleware

const setup = (req, res, next) =>
  (router.db = router.db || createDatastore(req.app.locals.params.DATA_PATH || './.data', 'projects.db')) && next();

router.use(setup);

// public

/*
  list all statuses and create links for filtering
  list all tags and create links for filtering
  staff picks
  trending this month

  sort by
*/
const displaySearchResults = (req, res, next) =>
  createSearchQuery(req.query)
    .then(logToConsole('q'))
    .then(searchProjects)
    .then(createSearchResultsViewModel(req.params))
    .then(renderSearchResults(res))
    .catch(failWithError(res, next));

// public
router.get('/', displaySearchResults);

// exports
module.exports = router;
