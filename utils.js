var fs  = require("fs");
var readline = require("readline");
var mysql = require("mysql");
var http = require("http");

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

module.exports.getconf = getconf;
module.exports.getusers = getusers;
module.exports.adduser = adduser;
