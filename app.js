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
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

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
    expires:null,
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
  if (req.session.user && req.cookies.user_sid) {
    res.redirect("/main");
  } else {
    next();
  }
};

var sessionCheckAjax = (req, res, next) => {
  if (req.session.user && req.cookies.user_sid) next();
  else res.status(401).end();
};

// index 
app.get('/', (req, res) => {
  res.redirect('/main');
});

// signup page
app.route('/signup')
  .get(sessionCheck, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "www", "signup.html"));
  })
  .post((req, res) => {
    if (utils.adduser(req.body.username, req.body.password)) {
      req.session.user = req.body.username;
      res.location("/main");
      res.send({Result:"OK"});
    } else {
      res.send({Result:"NG"});
    }
    res.end();
  });

// login page
app.route("/login")
  .get(sessionCheck, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "www", "login.html"));
  })
  .post((req, res) => {
    var users = utils.getusers();
    if(users[req.body.username] == req.body.password) {
      req.session.user = req.body.username;
      res.location("/main");
      res.send({Result:"OK"});
    } else {
      res.send({Result:"NG"});
    }
  });

// main page
app.route("/main")
  .get((req, res) => {
    if (req.session.user && req.cookies.user_sid) {
      res.sendFile(path.join(__dirname, "public", "www", "main.html"));
    } else {
      res.redirect("/login");
    }
  })

// profile page
app.route("/profile")
  .get((req, res) => {
    if (req.session.user && req.cookies.user_sid) {
      res.sendFile(path.join(__dirname, "public", "www", "profile.html"));
    } else {
      res.redirect("login");
    }
  })

// MySQL Create
app.route("/insert")
  .post(sessionCheckAjax, (req, res) => {
    var conf = utils.getconf();
    var conn = mysql.createConnection({
      host: conf.database_host,
      user: conf.database_user,
      password: conf.database_password,
      database: conf.database_name,
    });
    conn.connect( (err) => {
      if(err) res.send( {Result:"NG", Message:err.message} );

      var sql = "INSERT INTO address (zip, prefecture, city, other, kana) VALUES ?";
      var data = [
        req.body.Data.zip,
        req.body.Data.prefecture,
        req.body.Data.city,
        req.body.Data.other,
        req.body.Data.kana
      ];

      conn.query(sql, [[data]], (err) => {
        if(err) res.send( {Result:"NG", Message:err.message} );
        else {
          res.send({Result:"OK"});
          conn.end();
        }
      });
    });
  });

// MySQL Read
app.route("/records")
  .post(sessionCheckAjax, (req, res) => {
    var conf = utils.getconf();
    var conn = mysql.createConnection({
      host: conf.database_host,
      user: conf.database_user,
      password: conf.database_password,
      database: conf.database_name
    });
    conn.connect( (err) => {
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

      var sql = "SELECT * FROM address" + where + " LIMIT 1000";

      var query = conn.query(sql, (err, result) => {
        if(err) res.send( {Result:"NG", Message:err.message} );
        else {
          res.send({Result:"OK", Data:result});
          conn.end();
        }
      });
    });
  });

// MySQL Delete
app.route("/delete")
  .post(sessionCheckAjax, (req, res) => {
    var conf = utils.getconf();
    var conn = mysql.createConnection({
      host: conf.database_host,
      user: conf.database_user,
      password: conf.database_password,
      database: conf.database_name
    });
    console.log("*** /delete ***");
    console.log(req.body.Filter);

    conn.connect( (err) => {
      if(err) res.send( {Result:"NG", Message:err.message} );
      var query = conn.query("DELETE FROM address WHERE id = ?", [req.body.Filter.id], (err, result) => {
      //var query = conn.query(sql, (err, result) => {
        if(err) res.send( {Result:"NG", Message:err.message} );
        else {
          res.send({Result:"OK"});
          conn.end();
        }
      });
    });
  });

// get API Server's user
var getAPIUserInfo = function(username) {
  return new Promise((resolve, reject) => {
    var conf = utils.getconf();
    var options = {
      hostname: conf.apiserver_host,
      port: parseInt(conf.apiserver_port),
      path: "/apiserver/admin.rsc/Users",
      method: "GET",
      headers: {
        "Content-Type": "application/json;charset=utf-8",
        "x-cdata-authtoken": conf.apiserver_token,
      },
    };

    var body = "";
    var req = http.request(options, (res) => {
      res.on("data", (chunk) => {
        body += chunk;
      });

      res.on("end", () => {
        var result = JSON.parse(body).value.find(v => v.UserName == username);
        if(result !== undefined) resolve(result);
        else resolve(null);
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.end();
  });
}

// add API Server's user
var createAPIUser = function(username) {
  return new Promise((resolve, reject) => {
    var conf = utils.getconf();
    var options = {
      hostname: conf.apiserver_host,
      port: parseInt(conf.apiserver_port),
      path: "/apiserver/admin.rsc/Users",
      method: "POST",
      headers: {
        "Content-Type": "application/json;charset=utf-8",
        "x-cdata-authtoken": conf.apiserver_token,
      },
    };

    var body = "";
    var req = http.request(options, (res) => {
      res.on("data", chunk => {
        body += chunk;
      });

      res.on("end", () => {
        var result = JSON.parse(body);
        if("error" in result) throw new Error(result.error.message);
        else resolve(result);
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    var postdata = JSON.stringify({
      "@odata.type":"CDataAPI.Users.rsd",
      "UserName": username,
      "Privileges": "GET,POST,DELETE",
    });

    req.write(postdata);
    req.end();
  });
}
      
// get or add API Server's user
app.route("/apiusr")
  .get(sessionCheckAjax, (req, res) => {
    var retv = {
      Username: req.session.user,
      URL: "",
      Token: "",
      Permission: "",
    };

    getAPIUserInfo(req.session.user)
    .then((data) => {
      if(data != null) {
        var conf = utils.getconf();
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
      res.send({
        Result: "NG",
        Message: err.message
      });
    });
  })
  .post(sessionCheckAjax, (req, res) => {
    var retv = {
      Username: req.session.user,
      URL: "",
      Token: "",
      Permission: "",
    };

    createAPIUser(req.session.user)
    .then((data) => {
      var conf = utils.getconf();
      retv.URL = [conf.apiserver_host + ":" + conf.apiserver_port, "api.rsc", "address"].join("/");
      retv.Token = data.AuthToken;
      retv.Permission = data.Privileges;
      res.send({Result: "OK", Data: retv});
    })
    .catch((err) => {
      res.send({Result: "NG", Message: err.message});
    });
  });

// logout
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
