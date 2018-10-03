var express = require('express');
var bodyparser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var logger = require('morgan');
var createError = require('http-errors');
var path = require('path');
var utils = require("./routes/utils");
var mysql = require("mysql");

var router = require('./routes/index');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
//app.use(bodyparser.json());
//app.use(bodyparser.urlencoded({extend: false}));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  key: "user_sid",
  secret: 'cdatajapaninc',
  resave: false,
  saveUninitialized: false,
  cookie: {
    expires:null, //60000,
    httpOnly: true,
  }
}));

app.use((req, res, next) => {
  if (req.cookies.user_sid && !req.session.user) {
    res.clearCookie('user_sid');
  }
  next();
});

var sessionChecker = (req, res, next) => {
  if (req.session.user && req.cookies.user_sid) {
    console.log(req.url);
    if( req.url.includes('/main') ) {
      next();
    } else {
      res.redirect('/main');
    }
  }else {
    next();
  }
};


app.get('/', sessionChecker, function(req, res) {
  res.redirect('signin');
});

app.route('/signup')
  .get(sessionChecker, (req, res) => {
    console.log("get signup");
    res.sendFile(path.join(__dirname, "public", "www", "signup.html"));
  })
  .post((req, res) => {
    try{
    console.log("post signup");
    if (utils.adduser(req.body.username, req.body.password)) {
      req.session.user = req.body.username;
      console.log("signup succeeded");
      res.redirect("/main");
    } else {
      console.log("signup fail");
      res.redirect("/signup");
    }
    }catch(e){
      console.log(e.message);
    }
  });

app.route("/login")
  .get(sessionChecker, (req, res) => {
    console.log("get login");
    res.sendFile(path.join(__dirname, "public", "www", "login.html"));
  })
  .post((req, res) => {
    try{
    console.log("post login");
    if (utils.authuser(req.body.username, req.body.password)) {
      req.session.user = req.body.username;
      console.log("login succeeded");
      res.location("/main");
      res.end();
    } else {
      console.log("login fail");
    }     
    }catch(e){
      console.log(e.message);
    }
  });

app.route("/main")
  .get(sessionChecker, (req, res) => {
    console.log("get main");
    res.sendFile(path.join(__dirname, "public", "www", "main.html"));
  })

var sessionCheckerApi = (req, res, next) => {
  if (req.session.user && req.cookies.user_sid) {
    next();
  }else {
    res.status(401).end();
  }
};

app.route("/insert")
  .post(sessionCheckerApi, (req, res) => {
    console.log("post insert");
    console.log(req.body.Data);
    var conn = mysql.createConnection({
      host: "cdatajapisertver.csmyxxxr4ysy.ap-northeast-1.rds.amazonaws.com",
      user: "admin",
      password: "cdatajdemo",
      database: "testdb"
    });

    req.body.Data.forEach(v => {
      v[0] = parseInt(v[0]);
    });
    console.log(req.body.Data);

    conn.connect( function(err) {
      if(err) {
        res.send({Result:"NG", Message:"Database connection error."});
      } else {
        var sql = "INSERT INTO address (zip, prefecture, city, other, kana) VALUES ?";
        conn.query(sql, [req.body.Data], function(err) {
          if(err) {
            console.log(err);
            res.send({Result:"NG", Message:"Database query error."});
          } else {
            console.log("insert succeeded.");
            res.send({Result:"OK"});
          }
          conn.end();
        });
      }
    });
  });

app.route("/records")
  .get(sessionCheckerApi, (req, res) => {
    console.log("get records");
    var conn = mysql.createConnection({
      host: "cdatajapisertver.csmyxxxr4ysy.ap-northeast-1.rds.amazonaws.com",
      user: "admin",
      password: "cdatajdemo",
      database: "testdb"
    });

    conn.connect( function(err) {
      if (err) {
        res.send({Result:"NG", Message:"Database connection error."});
      } else {
        var fields = ["zip", "prefecture", "city", "other", "kana"];
        var query = conn.query('SELECT ?? FROM address WHERE city = "石巻市"', [fields], function(err, result) {
          if (err) {
            console.log(err);
            res.send({Result:"OK", Data:[]});
          }else {
            console.log(result);
            res.send({Result:"OK", Data:result});
          }
          conn.end();
        });
      }
    });
  });

app.use('/', router);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
