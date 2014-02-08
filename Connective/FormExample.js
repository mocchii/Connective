var express = require("express"),
    app = express(), // Creates an instance of Express referenced from now on as "app"
    server = require("http").createServer(app),
    io = require("socket.io").listen(server); // Bind the socket.io to the created server
    
server.listen(80); // Make the server listen on post 80, the port used for Web traffic

app.use(express.static(__dirname)); // Let Express look in the root directory for requested files
app.use(express.bodyParser());

app.set('view engine', 'ejs');

app.post("/postTest", function(req, resp) {
  resp.render("signup", {
    username: req.body.username
  });
});

app.get("/postTest", function(req, resp) {
  resp.render("signup");
});