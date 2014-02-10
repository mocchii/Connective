var express = require('express'),
  app = express(),
  server = require('http').createServer(app),
  io = require('socket.io').listen(server),
  users = [],
  mongoose = require('mongoose'),
  yacs = require('./yacs.js');

server.listen(3000);

mongoose.connect('mongodb://localhost/chat', function(err){
  if(err){
    console.log(err);
  }else{
    console.log("connected to database");
  }
});

/*var userSchema = mongoose.Schema({username:String,password:String
            ,description:String,wantsHelp:String,wantsToHelp:String});

var User = mongoose.model('User',userSchema);*/

var userSchema = mongoose.Schema({username:String,password:String
            ,classesAndDescriptions:[{className:String,description:String}]
                });

var User = mongoose.model('User',userSchema);

app.use(express.static(__dirname));

app.post("/signup",function(req,res){
  console.log("test");
  res.end();
});

app.get('/', function(req,res){
  res.sendfile(__dirname + '/studyIndex.html');
});

app.get("/courses",function(request,response){
  /*response.writeHead(200, {"Content-type":"application/json"});

  yacs.getCourses(function(list) {
    response.write(JSON.stringify(list));
    response.end();
  });*/
  getYacsData(request,response,"course");
});

app.get("/departments",function(request,response){
  getYacsData(request,response,"department");
});
app.get("/semesters",function(request,response){
  getYacsData(request,response,"semester");
});
app.get("/sections",function(request,response){
  getYacsData(request,response,"section");
});

app.get("/allClassListings",function(request,response){
  response.writeHead(200,{"Content-type":"application/json"});
  yacs.getAllClassListings(function(list){
    response.write(JSON.stringify(list));
    //console.log(list);
    response.end();
  });
});

//need to pass request?
function getYacsData(request,response,typeOfYacsData){
  response.writeHead(200,{"Content-type":"application/json"});
  yacs.getDataOfThisType(typeOfYacsData,function(list){
    response.write(JSON.stringify(list));
    response.end();
  });
}


io.sockets.on('connection',function(socket){
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


