function startMessaging(app, User, Conversation, domain) {

	app.post("/sendMessage",function(req,resp){
		
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
				//if there is no record of conversation between these two users, add such a conversation
				// to the database, and add this message
				if (err || conversation == null)
				{
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
	
	//do a case-insensitive check to see if the 
	// provided username corresponds to an actual user
	app.get("/checkIfUserExists",function(req,resp){
		
		var username = req.query.username.toLowerCase();
		
		User.findOne({uname_lower:username},function(err,user){
		
			if (err || user==null)
			{
				resp.write(JSON.stringify({userExists:false}));
			}
			else
			{
				resp.write(JSON.stringify({userExists:true}));
			}
			resp.end();
		
		});
		
	});
	
	//retrieve the messages sent between these two users, if there are any
	app.get("/getConversationDataForPair",function(req, resp){
		
		var thisUser1 = req.query.user1.toLowerCase();
		var thisUser2 = req.query.user2.toLowerCase();
		
		Conversation.findOne( { $or:[ 
								{ $and:[{user1:thisUser1}, {user2:thisUser2}] },
								{ $and:[{user1:thisUser2}, {user2:thisUser1}] }
							] }, 
			function(err,conversation){
				if (err || conversation == null)
				{
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
			return; 
		}
		
		
		var user = req.session.uname.toLowerCase();
		Conversation.find( { $or:[ {user1:user}, {user2:user} ] }, 
			function(err,conversations){
				
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
			
				resp.render("messaging",
					{signedInAs:req.session.uname, convers: conversationsToReturn });
				return;
							
		});
    
  
	});

}

module.exports.startMessaging=startMessaging;