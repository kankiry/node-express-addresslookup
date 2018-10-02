var fs  = require("fs");
var readline = require("readline");

function getlist() {
  var register = {};
  console.log("getlist");
  var text = fs.readFileSync("./user.txt", "utf8");
  text.replace(/\r?\n|\r/g, " ").split(" ").forEach((v) => {
    if (v.includes(",")) {
      var user_pass = v.split(",");
      register[user_pass[0]] = user_pass[1];
    }
  });
  return register;
}

function finduser(username) {
  console.log("finduser");
  var userlist = getlist();
  console.log(userlist);
  return username in userlist;
}

module.exports.authuser = function (username, password) {
  console.log("authuser");
  var userlist = getlist();
  return username in userlist && userlist[username] == password;
}

module.exports.adduser = function(username, password) {
  console.log("adduser");

  if (finduser(username)){
    return false;
  }else{
    fs.appendFileSync("./user.txt", username + ',' + password + require("os").EOL, function(err) {
      console.log(err)
    });
    return true;
  }
}



module.exports.gentoken = function() {
  return Math.random().toString().substring(2, 16) + Math.random().toString().substring(2, 16);
}
