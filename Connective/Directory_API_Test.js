/* Include the necessary modules */
var express = require('express'),
  app = express(),
	http=require("http"),
  server = http.createServer(app),
  users = [];

/* Setup the server to listen on port 80 (Web traffic port), allow it to parse POSTED body data, and let it render EJS pages */
server.listen(80);

/* Setup Express to use the modules we need, like EJS, bodyParser (for POST data), etc. */
app.use(express.bodyParser());
app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Credentials', 'true');
  return next();
});

/* This part sets up Express to use sessions */
app.use(express.cookieParser());
app.use(express.session({secret: 'banemask', key: "express_sid"}));

app.get("/test", function (req, res) {
	
	var opts={
	  host: "rpidirectory.appspot.com",
		path: "/api?q="+escape(req.query.email)
	}

  handleReq=function (resp) {
	  var response="";
	  resp.on("data", function(chunk) { response+=chunk; });
		resp.on("end", function() { res.send(response); })
	}
	
	http.request(opts, handleReq).end();
});