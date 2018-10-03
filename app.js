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

/*
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
*/

var sessionChecker = (req, res, next) => {
  console.log("sessinCheck for " + req.url);
  if (req.session.user && req.cookies.user_sid) {
    console.log("sid ok");
    if(req.url == "/login") res.redirect("/main");
    else next();
  }else {
    console.log("sid ng");
    if(req.url == "/login") next();
    else res.redirect('/login');
  }
};

app.get('/', sessionChecker, function(req, res) {
  res.redirect('/main');
});

app.route('/signup')
  .get(sessionChecker, (req, res) => {
    console.log("get signup");
    res.sendFile(path.join(__dirname, "public", "www", "signup.html"));
  })
  .post(sessionChecker, (req, res) => {
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


app.route("/profile")
  .get(sessionChecker, (req, res) => {
    console.log("get profile");
    res.sendFile(path.join(__dirname, "public", "www", "profile.html"));
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
    var conn = mysql.createConnection({
      host: "cdatajapisertver.csmyxxxr4ysy.ap-northeast-1.rds.amazonaws.com",
      user: "admin",
      password: "cdatajdemo",
      database: "testdb"
    });

    req.body.Data.forEach(v => {
      v[0] = parseInt(v[0]);
    });

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
  .post(sessionCheckerApi, (req, res) => {
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
        var filter = [];
        var where = " WHERE ";

        if(req.body.zip != "") filter.push('zip = "?"'.replace("?", req.body.zip));
        if(req.body.prefecture != "") filter.push('prefecture = "?"'.replace("?", req.body.prefecture));
        if(req.body.city != "") filter.push('city = "?"'.replace("?", req.body.city));
        if(req.body.other != "") filter.push('other = "?"'.replace("?", req.body.other));
        if(req.body.kana != "") filter.push('kana = "?"'.replace("?", req.body.kana));

        if(filter.length == 0) where = "";
        else if(filter.length == 1) where += filter[0];
        else if(2 <= filter.length) where += filter.join(" AND ");

        var fields = ["zip", "prefecture", "city", "other", "kana"];
        var sql = "SELECT ?? FROM address" + where;

        var query = conn.query(sql, [fields], function(err, result) {
          if (err) {
            console.log("failed");
            console.log(err);
            res.send({Result:"OK", Data:[]});
          }else {
            console.log("succeeded");
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
