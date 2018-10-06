var express = require('express');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var logger = require('morgan');
var createError = require('http-errors');
var path = require('path');
var mysql = require("mysql");
var http = require("http");
var utils = require("./utils");

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// mount common middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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

var sessionCheck = (req, res, next) => {
  console.log("SessionCheck");
  if (req.session.user && req.cookies.user_sid) {
    console.log("SessionCheck OK");
    next();
  }
  else {
    console.log("SessionCheck NG");
    res.redirect('/login');
  }
};

var sessionCheckApi = (req, res, next) => {
  console.log("SessionCheckApi");
  if (req.session.user && req.cookies.user_sid) {
    console.log("SessionCheckApi OK");
    next();
  }else {
    console.log("SessionCheckApi NG");
    res.status(401).end();
  }
  
};

app.get('/', function(req, res) {
  console.log("redirect / to /main");
  res.redirect('/main');
});

app.route('/signup')
  .get((req, res) => {
    res.sendFile(path.join(__dirname, "public", "www", "signup.html"));
  })
  .post((req, res) => {
    if (utils.addUser(req.body.username, req.body.password)) {
      req.session.user = req.body.username;
      res.redirect(307, "/main");
    } else {
      res.redirect("/signup");
    }
  });

app.route("/login")
  .get(
    (req, res, next) => {
      console.log("GET /login");
      if (req.session.user && req.cookies.user_sid) {
        console.log("GET /login SessionCheck OK");
        res.redirect("/main");
      }
      else {
        console.log("GET /login SessionCheck NG");
        next();
      }
    },
    (req, res) => {
      res.sendFile(path.join(__dirname, "public", "www", "login.html"));
    }
  )
  .post((req, res) => {
    console.log("POST /login");
    if (utils.authUser(req.body.username, req.body.password)) {
      console.log("POST /login SessionCheck OK");
      req.session.user = req.body.username;
      res.location("/main");
      res.end();
      //res.redirect("/main");
    } else {
      console.log("POST /login SessionCheck NG");
    }     
  });

app.route("/main")
  .get(sessionCheck, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "www", "main.html"));
  })


app.route("/profile")
  .get(sessionCheck, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "www", "profile.html"));
  })


app.route("/insert")
  .post(sessionCheckApi, (req, res) => {
    var conf = utils.getConf();
    var conn = mysql.createConnection({
      host: conf.database_host,
      user: conf.database_user,
      password: conf.database_password,
      database: conf.database_name,
    });
    conn.connect( function(err) {
      if(err) res.send( {Result:"NG", Message:err.message} );

      var sql = "INSERT INTO address (zip, prefecture, city, other, kana) VALUES ?";
      var data = [
        parseInt(req.body.Data.zip),
        req.body.Data.prefecture,
        req.body.Data.city,
        req.body.Data.other,
        req.body.Data.kana
      ];

      conn.query(sql, [[data]], function(err) {
        if(err) res.send( {Result:"NG", Message:err.message} );
        console.log("data inserting succeeded");
        res.send({Result:"OK"});
        conn.end();
      });
    });
  });

app.route("/records")
  .post(sessionCheckApi, (req, res) => {
    var conf = utils.getConf();
    var conn = mysql.createConnection({
      host: conf.database_host,
      user: conf.database_user,
      password: conf.database_password,
      database: conf.database_name
    });
    conn.connect( function(err) {
      if(err) res.send( {Result:"NG", Message:err.message} );
        
      var filter = [];
      if(req.body.Filter.zip != "") filter.push('zip = "?"'.replace("?", req.body.Filter.zip));
      if(req.body.Filter.prefecture != "") filter.push('prefecture = "?"'.replace("?", req.body.Filter.prefecture));
      if(req.body.Filter.city != "") filter.push('city = "?"'.replace("?", req.body.Filter.city));
      if(req.body.Filter.other != "") filter.push('other = "?"'.replace("?", req.body.Filter.other));
      if(req.body.Filter.kana != "") filter.push('kana = "?"'.replace("?", req.body.Filter.kana));

      var where = " WHERE ";
      if(filter.length == 0) where = "";
      else if(filter.length == 1) where += filter[0];
      else if(2 <= filter.length) where += filter.join(" AND ");

      var fields = ["zip", "prefecture", "city", "other", "kana"];
      var sql = "SELECT ?? FROM address" + where;

      var query = conn.query(sql, [fields], function(err, result) {
        if(err) res.send( {Result:"NG", Message:err.message} );
        console.log("data selecting succeeded");
        res.send({Result:"OK", Data:result});
        conn.end();
      });
    });
  });
      
app.route("/apiusr")
  .get(sessionCheckApi, (req, res) => {
    var retv = {
      Username: req.session.user,
      URL: "",
      Token: "",
      Permission: "",
    };

    utils.getApiUser(req.session.user)
    .then((data) => {
      if(data != null) {
        var conf = utils.getConf();
        retv.URL = [conf.apiserver_host + ":" + conf.apiserver_port, "api.rsc", "address"].join("/");
        retv.Token = data.AuthToken;
        retv.Permission = data.Privileges;
      }
      res.send({
        Result: "OK",
        Data: retv,
      });
    })
    .catch((err) => {
      console.log(err.message);
      res.send({Result: "NG", Message: err.message});
    });
  })
  .post(sessionCheckApi, (req, res) => {
    var retv = {
      Username: req.session.user,
      URL: "",
      Token: "",
      Permission: "",
    };

    utils.addApiUser(req.session.user)
    .then((data) => {
      console.log("API New User Succeeded");
      var conf = utils.getConf();
      retv.Token = data.AuthToken;
      retv.Permission = data.Privileges;
      retv.URL = [conf.apiserver_host + ":" + conf.apiserver_port, "api.rsc", "address"].join("/");
      res.send({Result: "OK", Data:data});
    })
    .catch((err) => {
      console.log("API New User Failed");
      console.log(err.message);
      res.send({Result: "NG", Message: err.message});
    });
  });

app.route("/logout")
  .get((req, res) => {
    res.clearCookie('user_sid');
    res.redirect("/login");
  });


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
