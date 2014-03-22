/* Include the necessary modules */
var express = require('express'),
  app = express(),
  server = require('http').createServer(app),
  io = require('socket.io').listen(server),
  users = [],
  mongoose = require('mongoose'),
  yacs = require('./yacs.js'),
  mailer=require("nodemailer"),
  crypto=require("crypto");

/* Setup the server to listen on port 80 (Web traffic port), allow it to parse POSTED body data, and let it render EJS pages */
server.listen(80);
app.use(express.bodyParser());
app.set('view engine', 'ejs');

/* Setup the information for the E-Mail system */
var domain="http://127.0.0.1";
var smtp = mailer.createTransport("SMTP", {
    service: "Gmail",
    auth: {
        user: "Connective.Team@gmail.com",
        pass: "nakedmonkeywizard"
    }
});

/* Setup Express to use the modules we need, like EJS, bodyParser (for POST data), etc. */
app.use(express.bodyParser());
app.set('view engine', 'ejs');
app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Credentials', 'true');
  return next();
});

/* This part sets up Express to use sessions */
app.use(express.cookieParser());
app.use(express.session({secret: 'banemask', key: "express_sid"}));

/* Connect to the database when the server starts up -- is this more efficient than connecting when needed? */
mongoose.connect('mongodb://localhost/chat', function(err){
  if(err){
    console.log(err);
  }else{
    console.log("connected to database");
  }
});

/* Define the User table */
var userSchema = mongoose.Schema({
  username:String,
  uname_lower:String,
  password:String,
  email:String,
  salt:String,
  confirmed:Boolean,
  classesAndDescriptions:[{
    className:String,
    description:String // Description of the user's needs for the class
  }],
  buddies: [String]
});

var User = mongoose.model('User', userSchema);

app.use(express.static(__dirname));

/* Confirmation of signup */
app.get("/confirmSignup", function(req, resp) {
  var query=req.query;
  User.findOne({username:query.user, password:query.confirmID}, function(error, found) {
    if (found==null) {
      /* If a user with that info hasn't registered, say so on the confirmation page. */
      resp.render("confirmPage", {
        error: 1,
        errorText: "The specified user information...doesn't belong to any account that needs to be confirmed. Did you copy it correctly from your confirmation E-Mail?",
        statusText: ""
      });
    }
    else if (found.confirmed) {
      /* If the user matching the information has already confirmed, say so on the confirmation page. */
      resp.render("confirmPage", {
        error: 2,
        statusText: "Good news--the specified user has already been confirmed! You can just sign in and use Connective now! :)",
        errorText: ""
      });
    }
    
    /* If everything looks good, confirm the user in the database and then show a message on the confirmation page, including a link to their profile to set up */
    else {
      found.confirmed=true;
      found.save();
      resp.render("confirmPage", {
        error:0,
        errorText:"",
        statusText: "Thanks! You're all confirmed and ready to go.<br /><a href='profile?user="+found.username+"'>Click here to start setting up your Connective profile.</a>"
      });
    }
    
  })
});

/* Signup processing */
app.post("/signup", function(req,res){

  /* Error codes:
     |1 = Username issue
     |2 = E-Mail issue
     |4 = Password issue */
  var error=0, uname=req.body.userName, errorMess="There were some issues with your signup information. <ul>";
  
  User.findOne({uname_lower:req.body.userName.toLowerCase()}, function(error, found) {
    /* Verify available username */
    if (typeof req.body.userName=="undefined" || req.body.userName=="") {
      error|=1;
      uname="";
      errorMess+="<li>You must create a username! This is how other Connective users will see you.</li>";
    }
    else if (found!=null) {
      error|=1;
      uname="";
      errorMess+="<li>The username you wanted is already taken. Try another!</li>";
    }
    
    /* Verify matching passwords */
    if (typeof req.body.pass=="undefined" || typeof req.body.passConf=="undefined" || req.body.pass=="" || req.body.passConf=="") {
      error|=4;
      errorMess+="<li>You must enter a password and confirm it, too.</li>";
    }
    else if (req.body.pass!=req.body.passConf) {
      error|=4;
      errorMess+="<li>The passwords you provided don't match! Be careful when typing them.</li>";
    }
    
    /* Verify valid RPI E-Mail address */
    if (typeof req.body.email=="undefined" || req.body.email=="") {
      error|=2;
      errorMess+="<li>You need to enter an E-Mail address to use Connective.</li>";
    }
    else if (!/^[0-9a-z._+-]+?@([0-9a-z_.+-]*?\.)?rpi\.edu$/i.test(req.body.email)) {
      error|=2;
      errorMess+="<li>That E-Mail address is not a valid RPI address! Sorry, we're only available to RPI students.</li>";
    }
    
    /* If there are errors, show the signup page again, but with the error information */
    if (error>0) {
      errorMess+="</ul>";
      res.render("signup", {
          errorMsg: errorMess,
          username: uname,
          error: error,
          email: req.body.email
      });
     }
     
     else {
      
      /* If there are no issues, salt and hash the password, store the user in the DB, and generate the confirmation E-Mail. */
      function genSalt(len, usableChars) {
        var ind=(Math.random()*(usableChars.length-1)).toFixed(0);
        return (len>0) ? usableChars[ind]+genSalt(len-1, usableChars) : "";
      }
      var salt=genSalt(8, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_");
      var sha1=crypto.createHash("sha1");
      
      /* Hash algorithm: first 4 of salt, then pass, then last 4 of salt, all sha1'd */
      sha1.update(salt.substr(0, 4)+req.body.pass+salt.substr(4,4));
      var passHash=sha1.digest("hex");
      
      /* Create user in DB */
      var newUser = new User({
        username:req.body.userName,
        uname_lower:req.body.userName.toLowerCase(),
        password:passHash,
        confirmed:false,
        salt:salt,
        classesAndDescriptions:[]
      });
      newUser.save();
      
      /* Generate and send confirmation E-Mail */
      var message={
        from: "Connective <Connective.Team@gmail.com>",
        to: req.body.email,
        subject: "Confirm Your E-Mail",
        html: "Thanks for joining Connective! Just one more step and you'll be on your way to connecting with students all over RPI. All we need now is for you to confirm your E-Mail address by clicking the link below! (If it doesn't show as a link for you, copy and paste it into your browser's address bar).<br /><br /><a href='"+domain+"/confirmSignup?confirmID="+passHash+"&user="+escape(req.body.userName)+"'>"+domain+"/confirmSignup?confirmID="+passHash+"&user="+escape(req.body.userName)+"</a><br /><br />Thanks again!",
        generateTextFromHTML: true
      };

      smtp.sendMail(message, function(error, resp) {
        if (error) {
          console.log("Error: ", error);
        }
        else {
          /* When E-Mail is sent, render the "E-Mail sent, please confirm" page */
          res.render("confirm", {
            email: req.body.email
          });
          console.log("Message sent: ", resp.message);
        }
      });
     }
  });
});

/* Blank signup page before anything's submitted */
app.get("/signup", function(req, resp) {
  resp.render("signup", {
    username: ""
  });
});

/* Signin processing */
app.post("/signin", function(req, res) {
  User.findOne({uname_lower:req.body.userName.toLowerCase()}, function(error, found) {
    if (found==null) {
      res.render("signin", {
        username: req.body.userName,
        error: 1,
        errorText: "There's no account with the username "+req.body.userName+". Did you type it correctly?"
      });
    }
    else if (!found.confirmed) {
      res.render("notconfirmed", {
        username: req.body.userName,
        error:2,
        errorText: "This account has not verified its E-Mail address. Please check your RPI E-Mail and confirm your account before you can sign in."
      });
    }
    else {
      var sha1=crypto.createHash("sha1");
      sha1.update(found.salt.substr(0, 4)+req.body.pass+found.salt.substr(4,4));
      var passHash=sha1.digest("hex");
      if (passHash==found.password) {
        req.session.signedIn=true;
        req.session.uname=req.body.userName.toLowerCase();
        req.session.key=found.password;
        res.redirect("/profile?user="+found.username);
      }
      else {
        res.render("signin", {
          username:req.body.userName,
          error:4,
          errorText: "The password you entered was not corrrect. Make sure capslock is off."
        });
      }
    }
  });
});

app.get("/signin", function(req, resp) {
  if (req.session.signedin) {
    resp.redirect("/myProfile");
  }
  else {
    resp.render("signin");
  }
});

app.get("/signout", function(req, resp) {
  req.session.destroy();
  resp.render("signin");
});

/* Profiles */
app.get("/profile", function(req, resp) {
  var un=req.query.user.toLowerCase();
  if (un=="") {
    resp.send("User does not exist");
  }
  else {
    User.findOne({uname_lower:un}, function (err, found) {
      if (err || found==null) {
        resp.send("User does not exist.");
      }
      else {
        resp.render("profile", {
          session: req.sessionID,
          userData: found,
          isMe: (req.session.signedIn && found.uname_lower==req.session.uname && found.password==req.session.key)
        });
      }
    });
  }
});

/* User manipulation -- adding, removing, changing classes, buddies, etc. */

// Remove class
app.post("/deleteClass", function (req, resp) {
  if (!req.session.signedIn) {
    resp.send("ERROR: You must be signed in to remove a course.");
  }
  else if (req.session.uname!=req.body.user.toLowerCase()) { resp.send("ERROR: You can only remove courses from your own profile."); }
  else {
    User.findOne({uname_lower: req.session.uname, password: req.session.key}, function (err, found) {
      if (err || found==null) {
        resp.send("ERROR: You must be signed in to remove a course.");
      }
      else {
        if (found.classesAndDescriptions.length<=req.body.id) {
          resp.send("ERROR: The course you're trying to remove does not exist.");
        }
        else {
          found.classesAndDescriptions.splice(req.body.id,1);
          found.save();
          resp.send("SUCCESS");
        }
      }
    });
  }
});

// Add class
app.post("/addClass", function (req, resp) {
  if (!req.session.signedIn) {
    resp.send("ERROR: You must be signed in to add a course.");
  }
  else if (req.session.uname!=req.body.user.toLowerCase()) { resp.send("ERROR: You can only add courses to your own profile."); }
  else {
    User.findOne({uname_lower: req.session.uname, password: req.session.key}, function (err, found) {
      if (err || found==null) {
        resp.send("ERROR: You must be signed in to add a course.");
      }
      else {
        var success=true;
        for (var i=0; i<found.classesAndDescriptions.length; i++) {
          if (found.classesAndDescriptions[i].className==req.body.course) {
            resp.send("ERROR: You're already registered for this course.");
            success=false;
          }
        }
        if (success) {
          found.classesAndDescriptions.push({className: req.body.course, description:""});
          found.save();
          resp.send("SUCCESS");
        }
      }
    });
  }
});

/* Static file requests */
app.get('/', function(req,res){  
  res.sendfile(__dirname + '/studyIndex.html');
});

/* Getting YACS data */
app.get("/courses",function(request,response){
  getYacsData(request,response,"course");
});

/* YACS -- Get all class listings */
app.get("/allClassListings",function(request,response){
  response.writeHead(200,{"Content-type":"application/json"});
  yacs.getAllClassListings(function(list){
    response.write(JSON.stringify(list, null, '\t'));
    //console.log(list);
    response.end();
  });
});

/* Messaging system/sockets of all sorts */
io.sockets.on('connection', function(socket){
  socket.on('send message', function(data){
    io.sockets.emit('new message',data);
    //socket.broadcast.emit('new message',data);
  });

  socket.on('login', function(data, callback){
    console.log("login:username is " + data.username);
    console.log("login:callback is " + callback);
    if (data.username == "" || data.password == "")
    {
      callback({validated:false,users:null});
      //return;
    }
    else 
      User.find({username:data.username,password:data.password},function(err,users){
        if (err) console.log(err);
        else if (users.length > 0)
        {
          var query = User.find({});
          query.exec(function(err,docs){
            if (err) throw err;
            callback({validated:true,users:docs});
          });
        }
        else callback({validated:false,users:null});
        //return;
    });
  });

  socket.on('signup', function(data, callback){
    console.log("username is " + data['username'].toString());
    console.log("callback is " + callback);
    
    if (data.username == "" || data.password == "" 
           //|| data.description == ""
         || data.classesAndDescriptions.length == 0)
    {
      console.log("somfin missing");
      callback({m:"somfin missing"});
    }
    
    else
    {
      //console.log("please show this!!");
      User.find({username:data.username},function(err,usersWithSameUsername){
        //console.log("got inside the User.find call");
        if (err) { console.log("fuck" + err); }
        else if (usersWithSameUsername.length > 0) 
        {
          console.log("username already in use");
          callback({m:"username already in use"});
        }
        else 
        {
          console.log("all good");

          User.find({}, 
            function(err,allUsers)
            {
              if (err) {}
              else 
              {
                
                callback({m:"all good",d:allUsers});
                var newUser = new User({username:data.username,password:data.password
                  ,classesAndDescriptions:data.classesAndDescriptions
                  });
                newUser.save();
              }
            });      
        }
 
      });
      /*var newUser = new User({username:data.username,password:data.password
         ,classesAndDescriptions:data.classesAndDescriptions
        });
      newUser.save();
      callback("all good");*/
     }
  });

});