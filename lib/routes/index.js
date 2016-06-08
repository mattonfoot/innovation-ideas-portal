var express = require('express');
var router = new express.Router();

// middleware
//router.use(require('../middleware/...'));

// core routes
router.use('/', require('./home'));
router.use('/auth', require('./auth'));
router.use('/users', require('./users'));
router.use('/projects', require('./projects'));
router.use('/initdb', require('./initialize'));

// support routes
//router.use('/autocomplete/addresses',  require('./autocomplete/addresses'));

module.exports = router;
