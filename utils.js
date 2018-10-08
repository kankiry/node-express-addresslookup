var fs  = require("fs");
var readline = require("readline");
var mysql = require("mysql");
var http = require("http");
var rp = require("request-promise");

function getusers() {
  var users = {};
  var text = fs.readFileSync("./user.txt", "utf8");
  text.replace(/\r?\n|\r/g, " ").split(" ")
    .filter(v => v.includes(","))
    .forEach(v => {
      var result = v.split(",");
      users[result[0]] = result[1];
    });
  return users;
}

function adduser(username, password) {
  var users = getusers();
  if (username in users) return false;
  else {
    var userdata = username + ',' + password + require("os").EOL;
    fs.appendFileSync("./user.txt", userdata, function(err) {
        console.log(err.message)
        return false;
      }
    );
    return true;
  }
}

function getconf() {
  var conf = {};
  var text = fs.readFileSync("./app.conf", "utf8");
  text.replace(/\r?\n|\r/g, " ").split(" ")
    .filter(v => v.includes(":"))
    .forEach(v => {
      var result = v.split(":");
      conf[result[0]] = result[1];
    });
  return conf;
}

/*
module.exports.addUser = function(username, password) {
  if (finduser(username)) return false;
  else {
    fs.appendFileSync(
      "./user.txt", username + ',' + password + require("os").EOL,
      function(err) {
        console.log(err.message)
        return false;
      }
    );
    return true;
  }
}

module.exports.authUser = function (username, password) {
  var users = getusers();
  return username in users && users[username] == password;
}

*/


module.exports.getApiUser = function(username) {
  return new Promise((resolve, reject) => {
    var conf = getconf();
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

module.exports.addApiUser = function(username) {
  return new Promise((resolve, reject) => {
    var conf = getconf();
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

module.exports.getconf = getconf;
module.exports.getusers = getusers;
module.exports.adduser = adduser;
