var fs  = require("fs");
var readline = require("readline");

function finduser(username) {
  var register = {};
  var stream = fs.createReadStream("./user.txt", {encoding: "utf8", flag: "r"});
  console.log("finduser arg: " + username);

  stream.on("data", function (data) {
    console.log("data event by readstream");
    data2 = data.replace(/\r?\n|\r/g, " ").split(" ").forEach(function(value) {
      var user_pass = value.split(",");
      register[user_pass[0]] = user_pass[1];
    });
  });

  stream.on("close", function() {
    console.log(register);
    console.log("close event by readstream");
    return register.hasOwnProperty(username);
  });
}

module.exports.adduser = function(username, password) {
  console.log("adduser called");

  if (finduser(username)){
    return false;
  }

  console.log("adduser stream");
  //var stream = fs.createWriteStream("./user.txt", {encoding: "utf8", flag: "a"});
  //stream.write(username + ',' + password + require("os").EOL);
  fs.appendFileSync("./user.txt", username + ',' + password + require("os").EOL, function(err) {
    console.log(err)
  });

  return true;

  /*stream.on("close", function() {
    console.log("close event by writestream");
    return true;
  });*/
}

module.exports.gentoken = function() {
  return Math.random().toString().substring(2, 16) + Math.random().toString().substring(2, 16);
}

module.exports = finduser; 
