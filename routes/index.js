var express = require('express');
var path = require('path');
var utils = require('./utils');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

var arg = {name : 'MyName'};

router.get('/sample', function(req, res) {
  res.render('sample', {arg:arg});
});

router.get('/signin', function(req, res) {
  res.sendFile(path.join(__dirname, '..', 'views', 'signin.html'));
});

router.get('/signup', function(req, res) {
  res.sendFile(path.join(__dirname, '..', 'views', 'signup.html'));
});

router.get('/main', function(req, res) {
  res.send("Main page");
  console.log(req.session);
  
});

router.post('/signup', function(req, res) {
  console.log("signup posted");
  console.log(req.body);
  
  if (utils.adduser(req.body.username, req.body.password)) {
    res.cookie('cdtuid', utils.gentoken(), {expire: Date.now() + 600000, httpOnly: true}).json({Result: "OK"});
  }else {
    res.json({Result: "NG"});
  }
});

router.post("/signin", function(req, res) {
  console.log("signin posted");

  if (


/*router.post('/dupchk', function(req, res, next) {
  console.log("exists posted");
  console.log(req.body);
  console.log(req.body.username);
  res.json({
    Result: (utils.finduser(req.body.username)) ? "NG" : "OK",
  });
});*/

module.exports = router;
