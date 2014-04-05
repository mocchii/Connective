function startSearch(app, User, domain) {
	app.post("/searchResults", function(req,resp) {
		
		/* Make sure this user is signed in */
		if (!req.session.signedIn) {
			resp.send("ERROR: You must be signed in to use the search.");
			return;
		}
		User.findOne({uname_lower: req.session.uname, password: req.session.key}, function (err, thisUser) {
			if (err || thisUser==null) {
				resp.send("ERROR: You must be signed in to use the search.");
				return;
			}

			/* Set the array to search for only your classes/sections, or the given one, depending on the checkbox */
			var classes=[];	
			if (req.body.justRegisteredClasses) {
				var tempClasses=thisUser.classesAndDescriptions;
				console.log("There are "+tempClasses.length+" classes");
				for (var i in tempClasses) {
					if (!isNaN(i)) {
						classes.push(tempClasses[i].className);
					}
				}
			}
			else {
				classes=[req.body.className];
			}
			
			/* Build up the search object with the right class name */
			var searchObj={
				"classesAndDescriptions": {
					$elemMatch: {
						"className": {
							$in: classes
						}
					}
				}
			};
			
			if (req.body.ratingLimit!=null && req.body.ratingLimit!="") {
				searchObj.rating={
					$gte: req.body.ratingLimit*1
				}
			}
			if (req.body.userName!=null && req.body.userName!="") {
				searchObj.uname_lower=req.body.userName.toLowerCase();
			}
			
			/* Search */
			User.find(searchObj, function(err,allUsers){
				if (typeof allUsers=="undefined" || allUsers==null) {
					resp.send("Error: "+err+"<br />JSON: "+JSON.stringify(searchObj));
					return;
				}
				function sortByClass(pair1,pair2) {
					return 0; // Bypass this for now until we've gotten the details figured out.
					
					if (pair1.classAndDescriptions.className > pair2.classAndDescriptions.className)
						return 1;
					else if (pair1.classAndDescriptions.className < pair2.classAndDescriptions.className)
						return -1;
					else 
						return 0;
				}	
				
				/* Filter by class section if needed, as well as filtering out nonmatching classes */
				if (req.body.section!=null && req.body.section!="") {
					var sect=req.body.section.toString();
					while (sect.length<2) { sect="0"+sect; }
				}
				else { var sect=null; }
				
				for (var i  in allUsers) {
					var theClasses=allUsers[i].classesAndDescriptions;
					var isin=false;
					for (var c in theClasses) {
						if (classes.indexOf(theClasses[c].className)<0) {
							theClasses.splice(c, 1);
						}
						else if (sect==null || theClasses[c].section==sect) {
							isin=true;
							break;
						}
					}
					if (!isin) {
						allUsers.splice(i, 1);
					}
				}
				
				allUsers.sort(sortByClass);
				
				resp.render("searchResults", {
					userData: thisUser,
					users:allUsers,
					signedInAs: req.session.uname
				});
				
			});
		});
	});
}

module.exports.startSearch=startSearch;