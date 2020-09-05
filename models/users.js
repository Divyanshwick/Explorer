var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");
// const { model } = require("./Blog");
// const { model } = require("./comment");

var userSchema = mongoose.Schema({
    name : String,
    username : String,
    image : String, 
    password : String
});

userSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model("User",userSchema);