var PORT = process.env.PORT || 3000;
var methodOverride = require("method-override");
var express = require("express");
var app = express();
var bodyParser  =   require("body-parser");
var flash = require("connect-flash");
var moment = require("moment");
var mongoose = require("mongoose");
var passport = require("passport");
var LocalStrategy = require("passport-local");
var LocalMongooseStrategy = require("passport-local-mongoose");
var Idea = require("./models/ideas");
var Comment = require("./models/comments");
var Contact = require("./models/contacts");
var User = require("./models/users");

mongoose.connect("mongodb+srv://admin-Divyansh:Test123@cluster2.bln5e.mongodb.net/explorer",{
    useNewUrlParser : true,
    useUnifiedTopology : true
  
})
.then(()=> console.log("Connected to DB!!"))
.catch(err => console.log(err.message));

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended : true}));
app.use(methodOverride("_method"));
app.locals.moment = require("moment");
app.use(flash());

app.use(require("express-session")({
    secret : "Our little secret.",
    resave : false,
    saveUninitialized : false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req,res,next){
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
})

//============
//Main Routes
//============

app.get("/",(req,res)=> {
    res.redirect("/home");
})

//Home
app.get("/home",(req,res) => {
    res.render("index.ejs");
});


//Resources
app.get("/home/resources",(req,res) => {
    res.render("resources.ejs");
});

//Wall of Fame
app.get("/home/wof",(req,res) => {
    res.render("wof.ejs");
});

//Clubs and Societies
app.get("/home/clubs",(req,res) => {
    res.render("clubs.ejs");
});

//Boooks
app.get("/home/books",(req,res) => {
    res.render("Books.ejs");
})
//-------
//Ideas
//-------
//Ideas(View all Ideas)
app.get("/home/ideas",function(req,res){
    Idea.find({},function(err,ideas){
        if(err){
            console.log(err);
        }
        else{
            res.render("Ideas.ejs",{ideas : ideas, currentUser : req.user});
        }
    });
});

//Create Idea
app.get("/home/ideas/new",isLoggedIn,function(req,res){
    res.render("Submit.ejs");
});

//Create Idea POST Route
app.post("/home/ideas",function(req,res){
    var title = req.body.title;
    var body = req.body.body;
    var tech = req.body.tech;
    var author = {
        id : req.user._id,
        name : req.user.name
    }
    var newIdea = {title : title,body : body,tech : tech,author : author}
    Idea.create(newIdea,function(err,newlyCreatedIdea){
        if(err){
            req.flash("error","Some error Occurred!!");
            res.render("Submit.ejs");
        }
        else{
            req.flash("success","Idea successfully created :)");
            res.redirect("/home/ideas");
        }
    });
});

// Show ideas Route
app.get("/home/ideas/:id",function(req,res){
    Idea.findById(req.params.id).populate("comments likes").exec(function(err,showIdea){
        if(err){
            req.redirect("/home/ideas");
        }
        else{
            
            res.render("showIdea.ejs",{idea : showIdea});
        }
    });
});

//Edit ideas Route
app.get("/home/ideas/:id/edit",checkIdeaOwnership,function(req,res){
    Idea.findById(req.params.id,function(err,foundIdea){
        if(err) {
            req.flash("error","Requested Idea doesn't exist");
        }
        res.render("editIdea.ejs",{idea : foundIdea});
    });
});

//Update ideas Route
app.put("/home/ideas/:id",checkIdeaOwnership, function(req,res){
    Idea.findByIdAndUpdate(req.params.id,req.body.blog,function(err,UpdatedIdea){
        if(err){
            req.flash("error","Some error occurred!!");
            res.redirect("/home/ideas");
        }else{
            req.flash("success","Idea updated successfully");
            res.redirect("/home/ideas/"+ req.params.id);
        }
    });
});

//Delete ideas Route
app.delete("/home/ideas/:id",checkIdeaOwnership, function(req,res){
    Idea.findByIdAndRemove(req.params.id,function(err){
        if(err){
            req.flash("error","Requested Idea does not exist!!");
            res.redirect("/home/ideas");
        }else{
            req.flash("success","Idea deleted successfully");
            res.redirect("/home/ideas");
        }
    });
});

//======
//Likes
//======
//Blog like route
app.post("/home/ideas/:id/likes",isLoggedIn,(req,res) => {
    Idea.findById(req.params.id,(err,foundIdea)=> {
        if(err) {
            req.flash("error","Idea not found!!!");
            req.redirect("/home/ideas");
        } 
            var foundUserLike = foundIdea.likes.some((like) => {
                return like.equals(req.user._id);
            });

            if(foundUserLike) {
                foundIdea.likes.pull(req.user._id);
            } else {
                foundIdea.likes.push(req.user);
            }

            foundIdea.save((err) => {
                if(err) {
                    req.flash("error","An error occurred!!");
                    return res.redirect("/home/ideas");
                }
                return res.redirect("/home/ideas/"+ foundIdea._id);
            });
         
    });
});

//==========
//Comments
//==========
//Show all comments
app.post("/home/ideas/:id/comments",isLoggedIn,function(req,res) {
    Idea.findById(req.params.id, function(err,idea) {
        if(err) {
            console.log(err);
            res.redirect("/home/ideas");
        } else {
            Comment.create(req.body.comment,function(err, newCmnt){
                if(err) {
                    console.log(err);
                } else {
                    newCmnt.author._id = req.user._id;
                    newCmnt.author.username = req.user.name;
                    newCmnt.author.email = req.user.username;
                   
                    newCmnt.save();
                    idea.comments.push(newCmnt);
                    idea.save();
                    console.log(newCmnt);
                    res.redirect("/home/ideas/"+idea._id);
                }
            });
        }
    })
})
//new Comment
app.get("/home/ideas/:id/comments/new",isLoggedIn,function(req,res) {
    Idea.findById(req.params.id,function(err, idea) {
        if(err) {
            console.log(err);
        } else {
            res.render("newComment.ejs",{idea : idea});
        }
    })
    
});
//Edit Comment
app.get("/home/ideas/:id/comments/:comment_id/edit", function(req,res) {
    Comment.findById(req.params.comment_id, function(err, foundComment) {
        if(err) {
            req.flash("error","You need to be logged in to do that!!");
            res.redirect("back");
        } else {
            res.render("editComment.ejs",{idea_id : req.params.id, comment : foundComment});
        }
    });
   
})
//Put Comment
app.put("/home/ideas/:id/comments/:comment_id",function(req,res) {
    Comment.findByIdAndUpdate(req.params.comment_id,req.body.comment,function(err, updatedCmnt){
        if(err) {
            req.flash("error","Something went wrong!!");
            res.redirect("back");
        } else {
            req.flash("success","Comment successfully edited");
            res.redirect("/home/ideas/"+req.params.id);
        }
    })
})
//Delete Comment
app.delete("/home/ideas/:id/comments/:comment_id", function(req,res){
    
    Comment.findByIdAndRemove(req.params.comment_id, function(err){
        if(err){
            req.flash("error","You need to be logged in to do that!!");
            res.redirect("back");
        } else {
            req.flash("success","Comment successfully deleted!!");
            res.redirect("/home/ideas/"+ req.params.id);
        }
    })
});




//========
//Contact 
//========
app.get("/home/contact",(req,res) => {
    res.render("contact.ejs");
})

app.post("/home",(req,res) => {
    Contact.create(req.body.message,(err,newM) => {
        if(err) {
            res.redirect("/home/contact");
        } else {
            console.log("New Message");
            res.redirect("/home/contact");
        }
    });

})


//===============
//Authentication
//===============
app.post("/register",(req,res) => {
    User.register(new User({username : req.body.username, name : req.body.name,image : req.body.userImage}),req.body.password,function(err, user){
         if(err) {
             console.log(err);
             var errMsg = err.message;
             req.flash("error",errMsg);
             res.redirect("/register");
         } 
         passport.authenticate("local")(req, res, function(){
             req.flash("success","Account successfully created!!");
             res.redirect("/home/ideas");
         })
     })
 })
 //Login
 app.post("/login",passport.authenticate("local",{
     successRedirect : "/home/ideas",
     failureRedirect : "/login"
 }) ,function(req,res) {
   
 })
 //Show Regiter
app.get("/register",(req,res) =>{
    res.render("Register.ejs");
})
//Show Login
app.get("/login", (req,res) => {
    res.render("Login.ejs");
})
//Logout
app.get("/logout",(req,res) => {
    req.logout();
    req.flash("success","Logged You Out!!");
    res.redirect("/home/ideas");
})

//============
//Middleware
//============
function isLoggedIn(req,res,next){
    if(req.isAuthenticated()) {
        
        return next();
    }
    req.flash("error","You need to be logged in to do that!!");
    res.redirect("/login");
}

function checkIdeaOwnership(req,res,next) {
    if(req.isAuthenticated()) {
        Idea.findById(req.params.id,function(err,foundIdea){
            if(err){
                req.flash("error","Campground not found!!");
                res.redirect("back");
            }else{
                if(foundIdea.author.id.equals(req.user._id)) {
                    next();
                } else {
                    req.flash("error","You don't have the permission to do that!!");
                    res.redirect("back");
                }
                
            }
        });
    } else {
        req.flash("error","You need to be logged in to do that");
        res.redirect("back");
    }
}

function checkCommentOwnership(req,res,next) {
    if(req.isAuthenticated()) {
        Comment.findById(req.params.comment_id,function(err,foundComment){
            if(err){
                res.redirect("back");
            }else{
                // console.log(foundComment.author._id);
                // console.log(req.user._id);
                // console.log(foundComment.author.id.equals(req.user._id));
                if(foundComment.author.id.equals(req.user._id)) {
                    next();
                } else {
                    res.redirect("back");
                }
                
            }
        });
    } else {
        res.redirect("back");
    }
}



app.listen(PORT,() => {
    console.log("Server is working!!");
})
