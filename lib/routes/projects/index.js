var path = require('path');
var express = require('express');
var router = new express.Router();
var Datastore = require('nedb');

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
      type: 'project',
    },
  };
}

const createDatastore = (x, type) => new Datastore({ filename: path.join(x, type), autoload: true });

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

const createProjectListModel = () => (r) => ({
    projects: r[0],
    drafts: r[1],
  });

const createProjectModel = () => (project) => ({
    project: project,
  });

const createDraftModel = () => (draft) => ({
    draft: draft,
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

const removeProject = (res, next, id) =>
  dbupdate({ _id: id }, { $set: { deleted: true } })
    .then(redirect(res, '/projects/'))
    .catch(failWithError(res, next));

const getListOfProjects = (req, res, next) =>
  Promise.all([
    dbfind({ type: 'project' }),
    dbfind({ type: 'draft' }),
  ])
  .then(createProjectListModel(req.params))
  .then(renderProjectList(res))
  .catch(failWithError(res, next));

const newDraft = (req, res, next) =>
  dbinsert({ type: 'draft' })
    .then(logToConsole(1))
    .then((x) => redirect(res, projectDraftUrl(x._id))())
    .catch(failWithError(res, next));

const provideBasicDetails = (req, res, next) =>
  dbfindOne({ _id: req.params.id, type: 'draft' })
    .then(logToConsole(2))
    .then(createDraftModel(req.params))
    .then(logToConsole(3))
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
  dbfind({ _id: req.params.id, type: 'draft' })
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
  dbfind({ _id: req.params.id, type: 'draft' })
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
  dbfind({ _id: req.params.id, type: 'draft' })
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
  dbfind({ _id: req.params.id, type: 'project' })
    .then(createProjectModel(req.params))
    .then(renderProject(res))
    .catch(failWithError(res, next));

const supportProject = (req, res) => redirect(res, 'back');

// public
router.get('/', getListOfProjects);
router.get('/draft', newDraft);
router.get('/:id/draft', provideBasicDetails);
router.post('/:id/draft', collectBasicDetails);
router.get('/:id/review', reviewBasicDetails);
router.post('/:id/review', acceptBasicDetails);
router.get('/:id/survey', provideSurvey);
router.post('/:id/survey', completeSurvey);
router.get('/:id/submit', provideTermsOfEngagement);
router.post('/:id/submit', acceptTermsOfEngagement);
router.get('/:id', displayProjectDetails);
router.post('/:id/support', supportProject);

// exports
module.exports = router;
