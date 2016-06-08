var path = require('path');
var util = require('util');
var express = require('express');
var router = new express.Router();
var Datastore = require('nedb');
var xmlParser = require('xml-to-json');

const createDatastore = (x, type) => new Datastore({ filename: path.join(x, type), autoload: true });

const map = (a, m) => {
  var out = [];
  if (!util.isArray(a)) {
    return out;
  }

  a.forEach((x) => out.push(m(x)));
  return out;
};

const redirect = (res, route) => () => res.redirect(route) && res;

const failWithError = (res, next) => (err) => {
  if (typeof err === 'string') {
    err = new Error(err);
  }

  res.status(400);
  next(err);
};

const errorCheck = (resolve, reject) => (err, data) =>
  err ? reject(err) : resolve(data);

const dbinsert = (x) => new Promise((resolve, reject) =>
  router.db.insert(x, errorCheck(resolve, reject)));

const xml2json = (src) => new Promise((resolve, reject) =>
  xmlParser({ input: src, output: './.data/jira.json' }, errorCheck(resolve, reject)));

const withCustomFieldValue = (field, x) => {
  switch (field.customfieldname) {
    case 'Sprint':
      x.status = field.customfieldvalues.customfieldvalue.__text.toLowerCase();
      break;
    case 'Story Points':
      x.complexity = field.customfieldvalues.customfieldvalue;
      break;
    case 'Epic Name':
      (x.tags = x.tags || []).push(field.customfieldvalues.customfieldvalue);
      break;
  }

  return x;
};

const withCustomFieldValues = (fields, x) => {
  if (fields && fields[0] && fields[0].customfield) {
    fields[0].customfield.forEach((field) => withCustomFieldValue(field, x));
  }

  return x;
};

const withJiraType = (type, x) => {
  if (type) {
    (x.tags = x.tags || []).push(type.__text);
  }

  return x;
};

const withJiraStatus = (status, x) => {
  switch (status.toLowerCase()) {
    case 'closed':
      x.status = 'published';
      break;
    case 'in progress':
      x.status = 'in progress';
      break;
  }

  return x;
};

const feedItemToProject = (x) =>
  withJiraType(x.type._,
    withJiraStatus(x.status._,
      withCustomFieldValues(x.customfields, {
        title: x.summary,
        status: 'in draft',
        link: x.link,
        description: x.description,
        user: x.reporter && x.reporter.$.username,
        tags: map(x.labels && x.labels.label || [], (t) => t.toString().replace(/_/g, ' ')),
        created: new Date(x.created),
        updated: new Date(x.updated),
        votes: x.votes,
        followers: x.watches,
      })));

const mapFeedItemsToProjects = (feed) =>
  map(feed, feedItemToProject);

const logToConsole = (n) => (x) => {
  console.log(n, '>>', JSON.stringify(x, null, '  '));
  return x;
};

const importJiraRssFeed = (src) =>
  xml2json(src)
    .then(logToConsole('xml'))
    .then((x) => x.rss.channel.item)
    .then(mapFeedItemsToProjects)
    .then(dbinsert);

// middleware

const setup = (req, res, next) =>
  (router.db = router.db || createDatastore(req.app.locals.params.DATA_PATH || './.data', 'projects.db')) && next();

router.use(setup);

// public

const initializeDB = (req, res, next) =>
  importJiraRssFeed('./.data/jiraExport.xml')
    .then(redirect(res, '/projects'))
    .catch(failWithError(res, next));

router.get('/', initializeDB);

// exports
module.exports = router;
