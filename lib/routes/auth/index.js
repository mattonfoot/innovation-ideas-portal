var express = require('express');
var router = express.Router();

const sessionLength = 20 * 60 * 1000;

const redirectToReferer = (res) => res.redirect('back');

const unsetUsername = (res) => res.clearCookie('uname');
const setUsername = (res, u) => u && res.cookie('uname', u, { maxAge: sessionLength });

const signin = (req, res) => {
  setUsername(res, req.body.user);
  redirectToReferer(res);
};

const signout = (req, res) => {
  unsetUsername(res);
  redirectToReferer(res);
};

// public
router.post('/signin', signin);
router.post('/signout', signout);

// private methods

// exports

module.exports = router;
