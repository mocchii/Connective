function startBuddyList(app, User, domain) {
  // Send a connection request
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
							  found.requests.push({username: me.username, seen: false});
								found.save();
								resp.send("{}");
							}
						}
					});
				}
			});
		}
	});

	// Get connections notifications -- this is only done by the app, hence why it only returns JSON.
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
					returnObj.requests=me.requests;
					
					// Space for new notification types to be processed here.
					
					resp.send(JSON.stringify(returnObj));
				}
			});
		}
	});
	
	// Accept Connection requests
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
							var namemap=me.requests.map(function(user) { return user.username; });
							var ind=namemap.indexOf(found.username);
							if (ind<0) {
								resp.send("ERROR: You have no Connection requests from user "+found.username);
							}
							else {
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
}

function startProfile(app, User, domain) {
	/* Profiles */
	startBuddyList(app, User, domain);
	
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
					resp.render("Profile/profile", {
						session: req.sessionID,
						userData: found,
						signedInAs: req.session.uname,
						isMe: (req.session.signedIn && found.uname_lower==req.session.uname && found.password==req.session.key)
					});
				}
			});
		}
	});

	/* User manipulation -- adding, removing, changing classes, buddies, ratings, etc. */

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
						found.classesAndDescriptions.push(classObject);
						found.save();
						resp.send(JSON.stringify(classObject));
					}
				}
			});
		}
	});

	// Edit class descriptions (self-evaluations)
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
						found.classesAndDescriptions[req.body.id].description=req.body.description;
						found.save();
						resp.send(JSON.stringify(found.classesAndDescriptions[req.body.id]));
					}
				}
			});
		}
	});

	// Add user rating (peer evaluation)
	app.post("/rate", function (req, resp) {
		if (!req.session.signedIn) {
			resp.send("ERROR: You must be signed in to rate students.");
		}
		else if (req.session.uname==req.body.user.toLowerCase()) { resp.send("ERROR: You can't rate yourself."); }
		else if (req.body.rating>5 || req.body.rating<1) { resp.send("ERROR: Your rating must be between 1 and 5. No cheating!"); }
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
							 
							 /* Save and return */
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
}

module.exports.startProfile=startProfile;