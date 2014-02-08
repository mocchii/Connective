/* Basic includes:

express -- Easier Web server creation. Handles GET, POST, sending, receiving, etc.
http -- Lower-level server handling; required by socket.io.
socket.io -- Websocket simulation with easy event-driven, duplex communication between server and client
*/
var express = require("express"),
    app = express(), // Creates an instance of Express referenced from now on as "app"
    server = require("http").createServer(app),
    io = require("socket.io").listen(server); // Bind the socket.io to the created server
    

server.listen(80); // Make the server listen on post 80, the port used for Web traffic

app.use(express.static(__dirname)); // Let Express look in the root directory for requested files

/* Include the YACS API library. I'm keeping it separate for organizational reasons. */
var yacs=require("./yacs.js");

/* Let the server grab the entire course listing. This will be done and loaded whenever someone
   loads a page requiring it, but it's cached every week to lighten the network load and increase speed. */
app.get("/courses/all", function(request, response) {

  /* Write the header saying that this is going to be JSON-formatted. 200=success status code */
  response.writeHead(200, {"Content-type":"application/json"});
  
  /* Call getCourses, passing "null" as the ID to indicate we're grabbing the entire listing. */
  yacs.getCourses(function(list) {
    
    /* Output it as a string and send back the response */
    response.write(JSON.stringify(list));
    response.end();
  });
});

/* Do the same thing with the department listings */
app.get("/departments/all", function(request, response) {
  response.setHeader("Content-type", "application/json");
  yacs.getDepartments(function(list) {
    response.send(JSON.stringify(list));
  });
/* And again for section listings */

/* Do the same thing with the department listings */
app.get("/sections/all", function(request, response) {
  response.setHeader("Content-type", "application/json");
  yacs.getSections(function(list) {
    response.send(JSON.stringify(list));
  });
});
});