var express = require('express');
var path = require('path');
//var utils = require('./utils');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

var arg = {name : 'MyName'};

router.get('/sample', function(req, res) {
  res.render('sample', {arg:arg});
});

/*router.get('/main', function(req, res) {
  //res.send("Main page");
  res.render("main");
  console.log(req.session);
});*/

module.exports = router;
