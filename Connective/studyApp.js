/* Include the necessary modules */
var express = require('express'),
  app = express(),
  server = require('http').createServer(app),
  io = require('socket.io').listen(server),
  users = [],
  mongoose = require('mongoose'),
  yacs = require('./yacs.js'),
  mailer=require("nodemailer"),
  crypto=require("crypto"),
	admin=require("./admin"),
	profile=require("./profile"),
	search=require("./search"),
	messaging=require("./messaging");

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
		className: String, // Class name, like "Foundations of Computer Science"
		section: String, // Section, as a 0-padded string, like "02"
		semester: String, // Semester like "Spring 2014"
		code: String, // Class code like "CSCI 2200"
		description:String // User's self-evaluation in the course
  }],
  buddies: [String],
	requests: [String],
  rating: Number,
  ratingList: [{
    user: String,
    rating: Number
  }]
});

var User = mongoose.model('User', userSchema);

/* Static file requests */
app.get('/', function(req,res){  
  res.redirect("signup");
});

app.use(express.static(__dirname));

/* Main code...all modular */
admin.startAdmin(app, User, smtp, crypto, domain);
profile.startProfile(app, User, domain);
search.startSearch(app, User, domain);
messaging.startMessaging(app, User, domain);

/* Getting YACS data */
app.get("/courses",function(request,response){
  getYacsData(request,response,"course");
});

/* YACS -- Get all class listings */
app.get("/allClassListings",function(request,response){
  response.writeHead(200,{"Content-type":"application/json"});
  yacs.getAllClassListings(function(list){
    var classesObject = {classes:[],semesters:[]};
	if (request.query.excludeSections == "true")
	{
		for (var i = 0; i < list.classes.length; i++)
		{
			var classWithoutSection = list.classes[i].substr( list.classes[i].indexOf(":")+2);
			var classWithoutSectionOrSemester = classWithoutSection.substr(0, classWithoutSection.indexOf(" -- "));
			var semester = classWithoutSection.substr( classWithoutSection.indexOf(" -- ") + 4);
			if (classesObject.classes.indexOf(classWithoutSectionOrSemester) == -1)
				classesObject.classes.push(classWithoutSectionOrSemester);
			if (classesObject.semesters.indexOf(semester) == -1)
			{
				console.log(semester);
				classesObject.semesters.push(semester);
			}
		}
	}
	else
		classesObject = list;
    response.write(JSON.stringify(classesObject, null, '\t'));
    //console.log(list);
    response.end();
  });
});