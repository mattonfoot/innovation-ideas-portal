var express = require('express');
var router = express.Router();
var uuid = require('node-uuid');

const getListOfProjects = (req, res) => res.render('projects/list', { title: 'Submit a project' });

const generateDraftId = (req, res) => res.redirect('/projects/' + uuid.v4() + '/draft');

const provideBasicDetails = (req, res) => res.render('projects/draft', {
  title: 'Basic Details',
  project: {
    id: req.parameters.id,
  },
});

const collectBasicDetails = (req, res) => res.redirect('/projects/' + req.parameters.id + '/draft');

const reviewProfile = (req, res) => res.render('projects/review', {
  title: 'Draft Review',
  project: {
    id: req.parameters.id,
  },
});

const acceptProfile = (req, res) => res.redirect('/projects/' + req.parameters.id + '/survey');

const provideSurvey = (req, res) => res.render('projects/survey', {
  title: 'Draft survey',
  project: {
    id: req.parameters.id,
  },
});

const completeSurvey = (req, res) => res.redirect('/projects/' + req.parameters.id + '/submit');

const provideTermsOfEngagement = (req, res) => res.render('projects/submit', {
  title: 'Draft submit',
  project: {
    id: req.parameters.id,
  },
});

const acceptTermsOfEngagement = (req, res) => res.redirect('/projects/' + req.parameters.id);

const displayProjectDetails = (req, res) => res.render('projects/details', {
  title: 'Your project',
  project: {
    id: req.parameters.id,
  },
});

const supportProject = (req, res) => res.redirect('back');

// public
router.get('/', getListOfProjects);
router.get('/draft', generateDraftId);
router.get('/:id/draft', provideBasicDetails);
router.post(':id/draft', collectBasicDetails);
router.get('/:id/review', reviewProfile);
router.post(':id/review', acceptProfile);
router.get('/:id/survey', provideSurvey);
router.post(':id/survey', completeSurvey);
router.get('/:id/submit', provideTermsOfEngagement);
router.post(':id/submit', acceptTermsOfEngagement);
router.get('/:id', displayProjectDetails);
router.post(':id/support', supportProject);

// exports
module.exports = router;
