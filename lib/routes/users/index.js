var express = require('express');
var router = express.Router();

// public
router.get('/', (req, res) => res.render('users', { title: 'User directory' }));
router.post('/', (req, res) => res.redirect('/users/new_id'));
router.get('/:id', (req, res) => res.render('profile', { title: 'User Profile' }));
router.get('/:id/profile', (req, res) => res.render('editProfile', { title: 'Update Profile' }));
router.post(':id', (req, res) => res.redirect('/projects/id'));
router.post(':id/follow', (req, res) => res.redirect('/projects/id'));

// private methods

// exports

module.exports = router;
