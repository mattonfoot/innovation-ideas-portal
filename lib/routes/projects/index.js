var express = require('express');
var router = express.Router();

// public
router.get('/', (req, res) => res.render('projects/list', { title: 'Submit a project' }));
router.post('/', (req, res) => res.redirect('/projects/new_id/draft'));
router.get('/:id/draft', (req, res) => res.render('projects/draft', { title: 'Basic Details' }));
router.post(':id/draft', (req, res) => res.redirect('/projects/new_id/draft'));
router.get('/:id/preview', (req, res) => res.render('projects/preview', { title: 'Draft Preview' }));
router.get('/:id/review', (req, res) => res.render('projects/review', { title: 'Draft Review' }));
router.post(':id/review', (req, res) => res.redirect('/projects/new_id/survey'));
router.get('/:id/survey', (req, res) => res.render('projects/survey', { title: 'Draft survey' }));
router.post(':id/survey', (req, res) => res.redirect('/projects/new_id/submit'));
router.get('/:id/submit', (req, res) => res.render('projects/submit', { title: 'Draft submit' }));
router.post(':id/submit', (req, res) => res.redirect('/projects/new_id/submit'));
router.get('/:id', (req, res) => res.render('projects/details', { title: 'Your project' }));
router.post(':id/support', (req, res) => res.redirect('/projects/new_id'));

// private methods

// exports

module.exports = router;
