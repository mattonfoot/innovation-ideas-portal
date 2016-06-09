var path = require('path');
var util = require('util');
var express = require('express');
var router = new express.Router();
var Datastore = require('nedb');
var moment = require('moment');

function ProjectViewModel(x) {
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
const renderProjectList = (res) => render(res, 'projects/list');

const failWithError = (res, next) => (err) =>
  res.status(400) && next(new Error(typeof err === 'string' ? err : err.message));

const errorCheck = (resolve, reject) => (err, data) =>
  err ? reject(err) : resolve(data);

const dbfind = (f) => new Promise((resolve, reject) =>
  router.db.find(f, errorCheck(resolve, reject)));

const createProjectListModel = () => (r) => ({
    triaged: map(r.triaged, (x) => new ProjectViewModel(x)),
    wip: map(r.wip, (x) => new ProjectViewModel(x)),
    paused: map(r.paused, (x) => new ProjectViewModel(x)),
    candidatesForLab: map(r.candidatesForLab, (x) => new ProjectViewModel(x)),
    consultationOnly: map(r.consultationOnly, (x) => new ProjectViewModel(x)),
    published: map(r.published, (x) => new ProjectViewModel(x)),
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

const displayProjectList = (req, res, next) =>
  Promise.all([
    dbfind({ status: 'triaged' }),
    dbfind({ status: 'wip' }),
    dbfind({ status: 'paused' }),
    dbfind({ status: 'candidates for lab' }),
    dbfind({ status: 'consultation only' }),
    dbfind({ status: 'published' }),
  ])
  .then((x) => ({
    triaged: x[0],
    wip: x[1],
    paused: x[2],
    candidatesForLab: x[3],
    consultationOnly: x[4],
    published: x[5],
  }))
  .then(createProjectListModel(req.params))
  .then(renderProjectList(res))
  .catch(failWithError(res, next));

// public
router.get('/', displayProjectList);

// exports
module.exports = router;
