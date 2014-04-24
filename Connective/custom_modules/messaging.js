function startMessaging(app, User, Conversation, domain) {

	
	
	app.post("/sendMessage",function(req,resp){
	
		console.log("req.body.userToSendTo is " + req.body.userToSendTo);
		
		var thisUser1 = req.body.userToSendTo.toLowerCase();
		if (req.session.uname == null)
		{
			resp.end();
			return;
		}
		var thisUser2 = req.session.uname.toLowerCase();
		
		Conversation.findOne(
					{$or:[
							{ $and:[{user1:thisUser1}, {user2:thisUser2}] },
							{ $and:[{user2:thisUser1}, {user1:thisUser2}] }
						] }, function(err,conversation){
				if (err || conversation == null)
				{
					//resp.write(JSON.stringify([]));
					var newConversation = new Conversation(
							{user1:thisUser1, 
								user2:thisUser2,
								messages:[{sender:thisUser2,content:req.body.message,timeSent:Date.now()}],
								seen1: false,
								seen2: true,
								timestamp: new Date()}
								);
					newConversation.save();
					console.log("created new conversation between " + thisUser1 + " and " + thisUser2);
				}
				else
				{
					console.log("conversation is " + JSON.stringify(conversation));
					conversation.messages.push({sender:thisUser2,content:req.body.message,timeSent:Date.now()});
					console.log("messages are now: " + JSON.stringify(conversation.messages));
					if (conversation.user1==thisUser2) { conversation.seen1=true; conversation.seen2=false; }
					else { conversation.seen2=true; conversation.seen1=false; }
					
					conversation.timestamp=new Date();
					conversation.save();
				}
		});
		
		
		resp.end();
	
	});
	
	app.get("/checkIfUserExists",function(req,resp){
		
		console.log("in checkIfUserExists, req.query is " +JSON.stringify( req.query) );
		console.log("in checkIfUserExists, req.body is " + JSON.stringify(req.body) );
		
		var username = req.query.username.toLowerCase();
		
		User.findOne({uname_lower:username},function(err,user){
		
			//console.log("user is " + );
			if (err || user==null)
			{
				//resp.write("no such user");
				resp.write(JSON.stringify({userExists:false}));
			}
			else
			{
				resp.write(JSON.stringify({userExists:true}));
			}
			resp.end();
		
		});
		
	});
	
	app.get("/getConversationDataForPair",function(req, resp){
		
		//var thisUser1 = req.user1.toLowerCase();
		//var thisUser2 = req.user2.toLowerCase();
		var thisUser1 = req.query.user1.toLowerCase();
		var thisUser2 = req.query.user2.toLowerCase();
		
		Conversation.findOne( { $or:[ 
								{ $and:[{user1:thisUser1}, {user2:thisUser2}] },
								{ $and:[{user1:thisUser2}, {user2:thisUser1}] }
							] }, 
			function(err,conversation){
				if (err || conversation == null)
				{
					console.log("no conversation data found for pair " + thisUser1 + ", " + thisUser2);
					resp.write(JSON.stringify([]));
				}
				else
				{
				    conversation.seen1=true;
					conversation.seen2=true;
					conversation.save();
					resp.write(JSON.stringify(conversation.messages));
				}
				resp.end();
			}
		);
	});


	app.get("/getConversations",function(req, resp){
		
		if (!req.session.signedIn)
		{
			resp.redirect("/signin");
			return; //for some reason this is necessary
		}
		console.log("dude's logged in, apparently");
		
		var user = req.session.uname.toLowerCase();
		Conversation.find( { $or:[ {user1:user}, {user2:user} ] }, 
			function(err,conversations){
				/*messages = conversations.messages;
				for (var i = 0; i < messages.length; i++)
				{
					
				}*/
				
				var conversationsToReturn = [];
				var otherUser;
				for (var i = 0; i < conversations.length; i++)
				{
					conversation = conversations[i];
					if (user == conversation.user1)
						otherUser = conversation.user2;
					else otherUser = conversation.user1;
					
					
					conversationsToReturn.push({user: otherUser, messages: conversation.messages});
				}
			
				console.log("req.session.uname is " + req.session.uname);
				resp.render("messaging",
					{signedInAs:req.session.uname, convers: conversationsToReturn });
				return;
							
		});
    
  
	});

}

module.exports.startMessaging=startMessaging;