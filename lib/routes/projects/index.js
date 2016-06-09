var path = require('path');
var util = require('util');
var express = require('express');
var router = new express.Router();
var Datastore = require('nedb');
var moment = require('moment');

function CollectBasicDetailsCommand(id, x) {
  return {
    $set: {
      title: x.title,
      markdown: x.markdown,
      tags: x.tags,
    },
  };
}

function CompleteSurveyCommand(x) {
  return {
    $set: {
      answer1: x.answer1,
    },
  };
}

function AcceptTermsOfEngagementCommand(x) {
  return {
    $set: {
      acceptTransferOfIP: x.acceptTransferOfIP,
      status: 'Awaiting approval',
    },
  };
}

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

const projectUrl = (id, stage) => '/projects/' + id + (stage || '');
const projectDraftUrl = (id) => projectUrl(id, '/draft');
const projectReviewUrl = (id) => projectUrl(id, '/review');
const projectSurveyUrl = (id) => projectUrl(id, '/survey');
const projectSubmitUrl = (id) => projectUrl(id, '/submit');

const render = (res, view) => (model) => res.render(view, model) && res;
const renderProjectList = (res) => render(res, 'projects/list');
const renderProject = (res) => render(res, 'projects/details');
const renderDraft = (res) => render(res, 'projects/draft');
const renderReview = (res) => render(res, 'projects/review');
const renderSurvey = (res) => render(res, 'projects/survey');
const renderSubmit = (res) => render(res, 'projects/submit');

const redirect = (res, route) => () => res.redirect(route) && res;

const failWithError = (res, next) => (err) =>
  res.status(400) && next(new Error(typeof err === 'string' ? err : err.message));

const errorCheck = (resolve, reject) => (err, data) =>
  err ? reject(err) : resolve(data);

const dbinsert = (x) => new Promise((resolve, reject) =>
  router.db.insert(x, errorCheck(resolve, reject)));

const dbfind = (f) => new Promise((resolve, reject) =>
  router.db.find(f, errorCheck(resolve, reject)));

const dbfindOne = (f) => new Promise((resolve, reject) =>
  router.db.findOne(f, errorCheck(resolve, reject)));

const dbupdate = (f, x) => new Promise((resolve, reject) =>
  router.db.update(f, x, errorCheck(resolve, reject)))
    .then(dbfind(f));

const removeProject = (res, next, id) =>
  dbupdate({ _id: id }, { $set: { deleted: true } })
    .then(redirect(res, '/projects/'))
    .catch(failWithError(res, next));

const createProjectListModel = () => (r) => ({
    inDraft: map(r[0], (x) => new ProjectViewModel(x)),
    triaged: map(r[1], (x) => new ProjectViewModel(x)),
    future: map(r[2], (x) => new ProjectViewModel(x)),
    wip: map(r[3], (x) => new ProjectViewModel(x)),
    paused: map(r[4], (x) => new ProjectViewModel(x)),
    candidatesForLab: map(r[5], (x) => new ProjectViewModel(x)),
    consultationOnly: map(r[6], (x) => new ProjectViewModel(x)),
    published: map(r[7], (x) => new ProjectViewModel(x)),
  });


const createProjectModel = () => (project) => ({
    project: new ProjectViewModel(project),
  });

const createDraftModel = () => (draft) => ({
    draft: (draft),
  });

const createReviewModel = () => (draft) => ({
    draft: (draft),
  });

const createSurveyModel = () => (draft) => ({
    draft: (draft),
  });

const createSubmitModel = () => (draft) => ({
    draft: (draft),
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

const newDraft = (req, res, next) =>
  dbinsert({ status: 'in draft' })
    .then((x) => redirect(res, projectDraftUrl(x._id))())
    .catch(failWithError(res, next));

const provideBasicDetails = (req, res, next) =>
  dbfindOne({ _id: req.params.id, status: 'in draft' })
    .then(logToConsole(2))
    .then(createDraftModel(req.params))
    .then(renderDraft(res))
    .catch(failWithError(res, next));

const collectBasicDetails = (req, res, next) => {
  var upd = new CollectBasicDetailsCommand(req.params.id, req.body);

  switch (req.body.action) {
    case 'continue':
      return dbupdate({ _id: req.params.id }, upd)
        .then(logToConsole(4))
        .then(redirect(res, projectReviewUrl(req.params.id)))
        .catch(failWithError(res, next));
    case 'save':
      return dbupdate({ _id: req.params.id }, upd)
        .then(logToConsole(5))
        .then(redirect(res, 'back'))
        .catch(failWithError(res, next));
    case 'delete':
      return removeProject(res, next, req.params.id);
    default:
      return redirect(res, '/projects/')();
  }
};

const reviewBasicDetails = (req, res, next) =>
  dbfind({ _id: req.params.id, status: 'in draft' })
    .then(createReviewModel(req.params))
    .then(renderReview(res))
    .catch(failWithError(res, next));

const acceptBasicDetails = (req, res, next) => {
  switch (req.body.action) {
    case 'continue':
      return redirect(res, projectSurveyUrl(req.params.id))();
    case 'save':
      return redirect(res, 'back');
    case 'delete':
      return removeProject(res, next, req.params.id);
    default:
      return redirect(res, projectDraftUrl(req.params.id))();
  }
};

const provideSurvey = (req, res, next) =>
  dbfind({ _id: req.params.id, status: 'in draft' })
    .then(createSurveyModel(req.params))
    .then(renderSurvey(res))
    .catch(failWithError(res, next));

const completeSurvey = (req, res, next) => {
  switch (req.body.action) {
    case 'continue':
      return dbupdate({ _id: req.params.id }, new CompleteSurveyCommand(req.body))
        .then(redirect(res, projectSubmitUrl(req.params.id)))
        .catch(failWithError(res, next));
    case 'save':
      return dbupdate({ _id: req.params.id }, new CompleteSurveyCommand(req.body))
        .then(redirect(res, 'back'))
        .catch(failWithError(res, next));
    case 'delete':
      return removeProject(res, next, req.params.id);
    default:
      return redirect(res, projectReviewUrl(req.params.id))();
  }
};

const provideTermsOfEngagement = (req, res, next) =>
  dbfind({ _id: req.params.id, status: 'in draft' })
    .then(createSubmitModel(req.params))
    .then(renderSubmit(res))
    .catch(failWithError(res, next));

const acceptTermsOfEngagement = (req, res, next) => {
  switch (req.body.action) {
    case 'continue':
      return dbupdate({ _id: req.params.id }, new AcceptTermsOfEngagementCommand(req.body))
        .then(redirect(res, projectUrl(req.params.id)))
        .catch(failWithError(res, next));
    case 'save':
      return dbupdate({ _id: req.params.id }, new AcceptTermsOfEngagementCommand(req.body))
        .then(redirect(res, 'back'))
        .catch(failWithError(res, next));
    case 'delete':
      return removeProject(res, next, req.params.id);
    default:
      return redirect(res, projectSurveyUrl(req.params.id))();
  }
};

const displayProjectDetails = (req, res, next) =>
  dbfindOne({ _id: req.params.id })
    .then(createProjectModel(req.params))
    .then(renderProject(res))
    .catch(failWithError(res, next));

const supportProject = (req, res) => redirect(res, 'back');

const followProject = (req, res) => redirect(res, 'back');

// public
router.get('/draft/', newDraft);
router.get('/:id/draft', provideBasicDetails);
router.post('/:id/draft', collectBasicDetails);
router.get('/:id/review', reviewBasicDetails);
router.post('/:id/review', acceptBasicDetails);
router.get('/:id/survey', provideSurvey);
router.post('/:id/survey', completeSurvey);
router.get('/:id/submit', provideTermsOfEngagement);
router.post('/:id/submit', acceptTermsOfEngagement);
router.post('/:id/support', supportProject);
router.post('/:id/follow', followProject);

router.get('/:id/', displayProjectDetails);

// exports
module.exports = router;
