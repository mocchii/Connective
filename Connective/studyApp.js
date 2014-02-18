var express = require('express'),
  app = express(),
  server = require('http').createServer(app),
  io = require('socket.io').listen(server),
  users = [],
  mongoose = require('mongoose'),
  yacs = require('./yacs.js'),
  mailer=require("nodemailer"),
  crypto=require("crypto");

server.listen(80);

var domain="http://127.0.0.1";
var smtp = mailer.createTransport("SMTP", {
    service: "Gmail",
    auth: {
        user: "Connective.Team@gmail.com",
        pass: "nakedmonkeywizard"
    }
});

app.use(express.bodyParser());
app.set('view engine', 'ejs');

mongoose.connect('mongodb://localhost/chat', function(err){
  if(err){
    console.log(err);
  }else{
    console.log("connected to database");
  }
});

/* Analogous to table definition and creation */
var userSchema = mongoose.Schema({
  username:String,
  password:String,
  email:String,
  salt:String,
  confirmed:Boolean,
  classesAndDescriptions:[{
    className:String,
    description:String // Description of the user's needs for the class
  }]
});

var User = mongoose.model('User', userSchema);

app.use(express.static(__dirname));

/* Confirmation of signup */
app.get("/confirmSignup", function(req, resp) {
  var query=req.query;
  User.find({username:query.user, password:query.confirmID}, function(error, found) {
    if (found.length<=0) {
      resp.render("confirmPage", {
        error: 1,
        errorText: "The specified user information...doesn't belong to any account that needs to be confirmed. Did you copy it correctly from your confirmation E-Mail?",
        statusText: ""
      });
    }
    else if (found[0].confirmed) {
      resp.render("confirmPage", {
        error: 2,
        statusText: "Good news--the specified user has already been confirmed! You can just sign in and use Connective now! :)",
        errorText: ""
      });
    }
    else {
      found[0].confirmed=true;
      found[0].save();
      resp.render("confirmPage", {
        error:0,
        errorText:"",
        statusText: "Thanks! You're all confirmed and ready to go.<br /><a href='myProfile'>Click here to start setting up your Connective profile.</a>"
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
  
  User.find({username:req.body.userName}, function(error, found) {
    if (typeof req.body.userName=="undefined" || req.body.userName=="") {
      error|=1;
      uname="";
      errorMess+="<li>You must create a username! This is how other Connective users will see you.</li>";
    }
    else if (found.length>0) {
      error|=1;
      uname="";
      errorMess+="<li>The username you wanted is already taken. Try another!</li>";
    }
    
    if (typeof req.body.pass=="undefined" || typeof req.body.passConf=="undefined" || req.body.pass=="" || req.body.passConf=="") {
      error|=4;
      errorMess+="<li>You must enter a password and confirm it, too.</li>";
    }
    else if (req.body.pass!=req.body.passConf) {
      error|=4;
      errorMess+="<li>The passwords you provided don't match! Be careful when typing them.</li>";
    }
    
    if (typeof req.body.email=="undefined" || req.body.email=="") {
      error|=2;
      errorMess+="<li>You need to enter an E-Mail address to use Connective.</li>";
    }
    else if (!/^[0-9a-z._+-]+?@([0-9a-z_.+-]*?\.)?rpi\.edu$/i.test(req.body.email)) {
      error|=2;
      errorMess+="<li>That E-Mail address is not a valid RPI address! Sorry, we're only available to RPI students.</li>";
    }
    
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
      
      /* If there are no issues, salt and hash the password, store the user in the DB, and generate the E-Mail. */
      function genSalt(len, usableChars) {
        var ind=(Math.random()*(usableChars.length-1)).toFixed(0);
        return (len>0) ? usableChars[ind]+genSalt(len-1, usableChars) : "";
      }
      var salt=genSalt(8, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_");
      var sha1=crypto.createHash("sha1");
      sha1.update(salt.substr(0, 4)+req.body.pass+salt.substr(4,4));
      var passHash=sha1.digest("hex");
      
      var newUser = new User({
        username:req.body.userName,
        password:passHash,
        confirmed:false,
        salt:salt,
        classesAndDescriptions:[]
      });
      newUser.save();
      
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
          res.render("confirm", {
            email: req.body.email
          });
          console.log("Message sent: ", resp.message);
        }
      });
     }
  });
});
app.get("/signup", function(req, resp) {
  resp.render("signup", {
    username: ""
  });
});

/* Static file requests */
app.get('/', function(req,res){
  res.sendfile(__dirname + '/studyIndex.html');
});

/* Getting YACS data */
app.get("/courses",function(request,response){
  /*response.writeHead(200, {"Content-type":"application/json"});

  yacs.getCourses(function(list) {
    response.write(JSON.stringify(list));
    response.end();
  });*/
  getYacsData(request,response,"course");
});

/* Individual requests for courses, departments, etc.
app.get("/departments",function(request,response){
  getYacsData(request,response,"department");
});
app.get("/semesters",function(request,response){
  getYacsData(request,response,"semester");
});
app.get("/sections",function(request,response){
  getYacsData(request,response,"section");
});*/

/* YACS -- Get all class listings */
app.get("/allClassListings",function(request,response){
  response.writeHead(200,{"Content-type":"application/json"});
  yacs.getAllClassListings(function(list){
    response.write(JSON.stringify(list));
    //console.log(list);
    response.end();
  });
});

//need to pass request?
/* Unused getYacsData function...for now.
function getYacsData(request,response,typeOfYacsData){
  response.writeHead(200,{"Content-type":"application/json"});
  yacs.getDataOfThisType(typeOfYacsData,function(list){
    response.write(JSON.stringify(list));
    response.end();
  });
}*/

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
    /*if (users[data['username']] == null)
    {
      users[data['username']] = {password:data['password']};
      socket.username = data.username;
      callback(true);
    }
    else
    {
      callback(false);
    }*/
    //console.log("wants help: " + data.wantsHelp);
    //console.log("wants to help: " + data.wantsToHelp);
    
    if (data.username == "" || data.password == "" 
           //|| data.description == ""
         || data.classesAndDescriptions.length == 0)
    {
      console.log("somfin missing");
      callback({m:"somfin missing"});
    }
    /*else if (!data.wantsHelp && !data.wantsToHelp)
    {
      callback("must check something");
      console.log("must check something");
    }*/
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


