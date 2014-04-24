/* The main body of search-related code */
function startSearch(app, User, domain) {

  /* If someone tries to access the search while not signed in, redirect them to the signin page */
  app.get("/searchResults", function(req, resp) {
    resp.redirect("/signin");
  });
	app.post("/searchResults", function(req,resp) {
		if (!req.session.signedIn) {
			resp.redirect("/signin");
			return;
		}
		User.findOne({uname_lower: req.session.uname, password: req.session.key}, function (err, thisUser) {
			if (err || thisUser==null) {
				resp.redirect("/signin");
				return;
			}

			/* Set the array to search for only your classes/sections, or the given one, depending on the checkbox's status */
			var classes=[];	
			if (req.body.justRegisteredClasses) {
				var tempClasses=thisUser.classesAndDescriptions;
				for (var i in tempClasses) {  // Iterate through the user's registered classes and add them to the list of classes to search for
					if (!isNaN(i)) {
						classes.push(tempClasses[i].className);
					}
				}
			}
			else if (req.body.className!=null && req.body.className!="") {
				classes=[req.body.className]; // Or just add the entered class name, if supplied
			}
			
			/* Build up the search object with the right class names, if any were searched for */
      var searchObj={};
      if (classes.length>0) {
			searchObj.classesAndDescriptions={
					$elemMatch: {
						"className": {
							$in: classes
						}
					}
				};
			}
			
      /* Add the rating threshold and username, if those were searched for, to our search object */
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
        
        /* Sort results by classes -- Doesn't work as of now */
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
					while (sect.length<2) { sect="0"+sect; } // Ensure sections are in the 2-digit 0-padded format
				}
				else { var sect=null; }
				
        /* Remove class information for irrelevant classes from the resulting users, if a class was searched for */
        if (classes.length>0) {
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
            
            /* Just in case, if the user is NOT in any of the searched-for classes, remove them entirely from the results list */
            if (!isin) {
              allUsers.splice(i, 1);
            }
          }
        }
				
				allUsers.sort(sortByClass);
				
        /* And now, render the results page with the search results */
				resp.render("Search/searchResults", {
					userData: thisUser,
					users:allUsers,
					signedInAs: req.session.uname
				});
				
			});
		});
	});
}

module.exports.startSearch=startSearch;