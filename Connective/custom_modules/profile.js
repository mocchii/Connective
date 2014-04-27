/* The main Connections (buddies) code */
function startBuddyList(app, User, Conversation, domain) {
  /* Send a connection request */
  app.get("/request", function(req,resp) {
    resp.redirect("/signin");
  });
	app.post("/request", function (req, resp) {
		if (!req.session.signedIn) {
			resp.send("ERROR: You must be signed in to request connections.");
		}
		else if (req.session.uname==req.body.user.toLowerCase()) { resp.send("ERROR: You can't request a connection with yourself."); }
		else {
			User.findOne({uname_lower: req.session.uname, password: req.session.key}, function (err, me) {
				if (err || me==null) {
					resp.send("ERROR: You must be signed in to request connections.");
				}
				else {
					var success=true;
					var uname=req.body.user.toLowerCase();
					User.findOne({uname_lower: uname}, function(err, found) {
						if (err || found==null) {
							resp.send("ERROR: The user you're trying to connect with doesn't exist.");
						}
						else {
							if (found.requests.indexOf(req.session.uname)>=0 || found.buddies.indexOf(req.session.uname)>=0) {
							  resp.send("ERROR: You've already sent this user a connection request.");
							}
							else {
                /* If all is well, add the new Connections request to the user's "requests list" in the databse */
							  found.requests.push({username: me.username, seen: false, timestamp: new Date()});
								found.save();
								resp.send("{}");
							}
						}
					});
				}
			});
		}
	});

	/* Get connections and message notifications -- this is only done internally by the app, hence why it only returns JSON. */
	app.get("/connectionNotices", function(req, resp) {
		if (!req.session.signedIn) {
			resp.send('{error: "You must be signed in to check noifications."}');
		}
		else {
			User.findOne({uname_lower: req.session.uname, password: req.session.key}, function (err, me) {
				if (err || me==null) {
					resp.send('{error: "You must be signed in to check notifications."}');
				}
				else {
				  var returnObj={};
					returnObj.error="";
					returnObj.requests=me.requests; // Add the user's requests to the return object
          
          /* Remove already-seen (but ignored) requests form the list */
          for (var i=0; i<returnObj.requests.length; i++) {
            if (returnObj.requests[i].seen) {
              returnObj.requests.splice(i, 1);
              i--;
            }
          }
				
					resp.send(JSON.stringify(returnObj));
				}
			});
		}
	});
	
/* Get connections and message notifications -- this is only done internally by the app, hence why it only returns JSON. */
	app.get("/messageNotices", function(req, resp) {
		if (!req.session.signedIn) {
			resp.send('{error: "You must be signed in to check noifications."}');
		}
		else {
			User.findOne({uname_lower: req.session.uname, password: req.session.key}, function (err, me) {
				if (err || me==null) {
					resp.send('{error: "You must be signed in to check notifications."}');
				}
				else {
				  var returnObj={};
				  returnObj.error="";
				  var user=me.uname_lower;
				  Conversation.find( { $or:[ {user1:user}, {user2:user} ] }, function (error, convs) {

					if (error) { returnObj.error=error; }
					
					for (var i=0; i<convs.length; i++) {
					  if ((convs[i].user1==user && convs[i].seen1) || (convs[i].user2==user && convs[i].seen2)) {
					    convs.splice(i,1);
						i--;
					  }
					}
					returnObj.messages=convs;
					resp.send(JSON.stringify(returnObj));
					
				  });
				}
			});
		}
	});
	
  /* Accept Connection requests */
  app.get("/accept", function(req, resp) {
    resp.redirect("/signin");
  });
	app.post("/accept", function(req, resp) {
		if (!req.session.signedIn) {
			resp.send("ERROR: You must be signed in to accept Connection requests.");
		}
		else if (req.session.uname==req.body.user.toLowerCase()) { resp.send("ERROR: You can't accept a Connection from yourself."); }
		else {
			User.findOne({uname_lower: req.session.uname, password: req.session.key}, function (err, me) {
				if (err || me==null) {
					resp.send("ERROR: You must be signed in to accept Connection requests.");
				}
				else {
					var success=true;
					var uname=req.body.user.toLowerCase();
					User.findOne({uname_lower: uname}, function(err, found) {
						if (err || found==null) {
							resp.send("ERROR: The user you're trying to accept a Connection from doesn't exist.");
						}
						
						else {
            
              /* Create an array of just the usernames who have sent this user a Connection request, and ensure that the person we're accepting is on it */
							var namemap=me.requests.map(function(user) { return user.username; });
							var ind=namemap.indexOf(found.username);
							if (ind<0) {
								resp.send("ERROR: You have no Connection requests from user "+found.username);
							}
							else {
              
                /* Remove that request from the requests list, and add the users to each others' buddy lists */
								me.requests.splice(ind, 1);
								me.buddies.push(found.username);
								me.save();
								
								found.buddies.push(me.username);
								found.save();
								
								resp.send("SUCCESS");
								
							}
						}
						
					});
				};
			});
		}
	});

	/* Ignore Connection requests */
  app.get("/ignore", function(req, resp) {
    resp.redirect("/signin");
  });
	app.post("/ignore", function(req, resp) {
		if (!req.session.signedIn) {
			resp.send("ERROR: You must be signed in to ignore Connection requests.");
		}
		else if (req.session.uname==req.body.user.toLowerCase()) { resp.send("ERROR: You can't ignore a Connection from yourself."); }
		else {
			User.findOne({uname_lower: req.session.uname, password: req.session.key}, function (err, me) {
				if (err || me==null) {
					resp.send("ERROR: You must be signed in to ignore Connection requests.");
				}
				else {
					var success=true;
					var uname=req.body.user.toLowerCase();
					User.findOne({uname_lower: uname}, function(err, found) {
						if (err || found==null) {
							resp.send("ERROR: The user you're trying to ignore a Connection from doesn't exist.");
						}
						
						else {
              /* Create an array of just usernames from the user's requests, and ensure the user we're ignoring is on it */
							var namemap=me.requests.map(function(user) { return user.username; });
							var ind=namemap.indexOf(found.username);
							if (ind<0) {
								resp.send("ERROR: You have no Connection requests from user "+found.username);
							}
							else {
              
                /* Mark that request as seen and ignored in the database */
                me.requests[ind].seen=true;
								me.save();								
								resp.send("SUCCESS");
								
							}
						}
						
					});
				};
			});
		}
	});
  
}

/* Main profile code */
function startProfile(app, User, Conversation, smtp, domain) {
	startBuddyList(app, User, Conversation, domain);
	
  /* Render a profile page */
	app.get("/profile", function(req, resp) {
    if (!req.session.signedIn) { resp.redirect("/signin"); }
    else {
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
            resp.render("Profile/profile", {
              session: req.sessionID,
              userData: found,
              signedInAs: req.session.uname,
              isMe: (req.session.signedIn && found.uname_lower==req.session.uname && found.password==req.session.key) // Boolean: true if this is the signed-in user's profile
            });
          }
        });
      }
    }
	});

	/* User manipulation -- adding, removing, changing classes, buddies, ratings, etc. */

  /* Delete a class from your profile */
  app.get("/deleteClass", function(req,resp) {
    resp.redirect("/signin");
  });
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
          
            /* Remove the class from the user's classes array in the database */
						found.classesAndDescriptions.splice(req.body.id,1);
						found.save();
						resp.send("SUCCESS");
					}
				}
			});
		}
	});
  
  /* Add a class to a user's profile */
  app.get("/addclass", function(req,res) {
    res.redirect("/signin");
  });
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
          
            /* Parse the data out of the course name */
						var rawName=req.body.course;
						rawName.match(/(.+?) - ([0-9]+): (.+?) -- (.+)/);
						var classCode=RegExp.$1, section=RegExp.$2, className=RegExp.$3, semester=RegExp.$4;
						var classObject={
							className: className,
							section: section,
							semester: semester,
							code: classCode,
							description:""
						};
						found.classesAndDescriptions.push(classObject); // Add the class to the user's course list and save it
						found.save();
						resp.send(JSON.stringify(classObject)); // Send the parsed object back so it can be processed client-side for displays
					}
				}
			});
		}
	});

  /* Edit class descriptions (user self-evaluations in each course) */
  app.get("/editDesc", function(req,resp) {
    resp.redirect("/signin");
  });
	app.post("/editDesc", function (req, resp) {
		if (!req.session.signedIn) {
			resp.send("ERROR: You must be signed in to edit a course self-evaluation.");
		}
		else if (req.session.uname!=req.body.user.toLowerCase()) { resp.send("ERROR: You can only edit self-evaluations from your own profile."); }
		else {
			User.findOne({uname_lower: req.session.uname, password: req.session.key}, function (err, found) {
				if (err || found==null) {
					resp.send("ERROR: You must be signed in to edit a self-evaluation.");
				}
				else {
					if (found.classesAndDescriptions.length<=req.body.id) {
						resp.send("ERROR: The course you're trying to edit does not exist.");
					}
					else {
            /* Update the description in the database, then send the class object back for client-side processing */
						found.classesAndDescriptions[req.body.id].description=req.body.description;
						found.save();
						resp.send(JSON.stringify(found.classesAndDescriptions[req.body.id]));
					}
				}
			});
		}
	});

	/* Add user rating (peer evaluation) */
  app.get("/rate", function(req, resp) {
    resp.redirect("/signin");
  });
	app.post("/rate", function (req, resp) {
		if (!req.session.signedIn) {
			resp.send("ERROR: You must be signed in to rate students.");
		}
		else if (req.session.uname==req.body.user.toLowerCase()) { resp.send("ERROR: You can't rate yourself."); }
		else if (req.body.rating==null || req.body.rating>5 || req.body.rating<1) { resp.send("ERROR: Your rating must be between 1 and 5. No cheating!"); }
		else {
			User.findOne({uname_lower: req.session.uname, password: req.session.key}, function (err, found) {
				if (err || found==null) {
					resp.send("ERROR: You must be signed in to rate students.");
				}
				else {
					var success=true;
					var uname=req.body.user.toLowerCase(), rating=req.body.rating;
					User.findOne({uname_lower: uname}, function(err, found) {
						if (err || found==null) {
							resp.send("ERROR: The user you're trying to rate doesn't exist.");
						}
						else {
							/* Insert rating into DB and get total rating */
							var exists=false, total=0;
							for (var i=0; i<found.ratingList.length; i++) {
								var rated=found.ratingList[i];
								if (rated.user==req.session.uname) {
									rated.rating=rating;
									exists=true;
								}
								total+=rated.rating;
							 }
							 if (!exists) {
								 found.ratingList.push({user: req.session.uname, rating:rating});
								 total+=rating*1;
							 }
							 
							 /* Recalculate average rating */
							 found.rating=total/found.ratingList.length;
							 
							 /* Save to the database and return an object with data about the ratings*/
							found.save();
							var returnObj={
								rating: found.rating,
								total: total,
								raters: found.ratingList
							};
							resp.send(JSON.stringify(returnObj));
						}
					});
				}
			});
		}
	});
  
  /* Send an E-Mail to a user from a user */
  app.get("/sendmail", function(req, resp) {
    resp.redirect("/signin");
  });
  app.post("/sendmail", function(req, resp) {
		if (!req.session.signedIn) {
			resp.send("ERROR: You must be signed in to E-Mail users.");
		}
		else if (req.session.uname==req.body.user.toLowerCase()) { resp.send("ERROR: You can't send an E-Mail to yourself."); }
		else {
			User.findOne({uname_lower: req.session.uname, password: req.session.key}, function (err, me) {
				if (err || me==null) {
					resp.send("ERROR: You must be signed in to E-Mail users.");
				}
				else {
					var success=true;
					var uname=req.body.user.toLowerCase();
					User.findOne({uname_lower: uname}, function(err, found) {
						if (err || found==null) {
							resp.send("ERROR: The user you're trying to E-Mail doesn't exist.");
						}
						else if (found.allowMail==false) {
              resp.send("ERROR: The user you're trying to E-Mail doesn't accept E-Mails from Connective users.");
            }
						else {
            
                var from=me.email, to=found.email;
                
                /* Generate and send E-Mail */
                var message={
                  from: me.username+" (Connective) <"+from+">",
                  replyTo: from,
                  to: to,
                  subject: (req.body.subject!="")?req.body.subject:"(No subject)",
                  text: (req.body.message!="")?req.body.message:"(No message)"
                };

                smtp.sendMail(message, function(error, res) {
                  if (error) {
                    resp.send("ERROR: The E-Mail could not be sent. Please try again. If the problem persists, contact Connective at Connective.Team@gmail.com.");
                  }
                  else {
                    resp.send("SUCCESS");
                  }
                });
								
							}
					});
				};
			});
		}
	});
  
  /* Opt in or out of being allowed to receive E-Mails from Connective users */
  app.get("/toggleMailOK", function(req, resp) {
    resp.redirect("/signin");
  });
  app.post("/toggleMailOK", function(req, resp) {
		if (!req.session.signedIn) {
			resp.send("ERROR: You must be signed in to change your E-Mail status.");
		}
		else {
			User.findOne({uname_lower: req.session.uname, password: req.session.key}, function (err, me) {
				if (err || me==null) {
					resp.send("ERROR: You must be signed in to change your E-Mail status.");
				}
				else {
          me.allowMail=req.body.optin;
          me.save();
          resp.send("SUCCESS");
				};
			});
		}
	});
  
}

module.exports.startProfile=startProfile;