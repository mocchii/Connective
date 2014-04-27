/* Main administrative code */
var startAdmin=function(app, User, smtp, crypto, domain) {
	
  /* Confirmation of signup */
	app.get("/confirmSignup", function(req, resp) {
		var query=req.query;
		User.findOne({username:query.user, password:query.confirmID}, function(error, found) {
			if (found==null) {
				/* If a user with that info hasn't registered, say so on the confirmation page. */
				resp.render("Admin/confirmPage", {
					error: 1,
					errorText: "The specified user information...doesn't belong to any account that needs to be confirmed. Did you copy it correctly from your confirmation E-Mail?",
					statusText: "",
					signedInAs: req.session.uname
				});
			}
			else if (found.confirmed) {
				/* If the user matching the information has already confirmed, say so on the confirmation page. */
				resp.render("Admin/confirmPage", {
					error: 2,
					statusText: "Good news--the specified user has already been confirmed! You can just sign in and use Connective now! :)",
					errorText: "",
					signedInAs: req.session.uname
				});
			}
			
			/* If everything looks good, confirm the user in the database, sign them in on the server, and then show a message on the confirmation page, including a link to their profile to set up */
			else {
				found.confirmed=true;
				found.save();
				req.session.signedIn=true;
				req.session.key=found.password;
				req.session.uname=found.username.toLowerCase();
				resp.render("Admin/confirmPage", {
					error:0,
					errorText:"",
					statusText: "Thanks! You're all confirmed and ready to go.<br /><a href='profile?user="+found.username+"'>Click here to start setting up your Connective profile.</a>",
					signedInAs: req.session.uname
				});
			}
			
		})
	});

	/* Signup processing */
	app.post("/signup", function(req,res){

		/* Error codes (bitwise OR'd together for combinations):
			 |1 = Username issue
			 |2 = E-Mail issue
			 |4 = Password issue */
		var error=0, uname=req.body.userName, errorMess="There were some issues with your signup information. <ul>";
		
		User.findOne({uname_lower:req.body.userName.toLowerCase()}, function(error, found) {
			/* Verify available username */
			if (typeof req.body.userName=="undefined" || req.body.userName=="") {
				error|=1;
				uname="";
				errorMess+="<li>You must create a username! This is how other Connective users will see you.</li>";
			}
			else if (found!=null) {
				error|=1;
				uname="";
				errorMess+="<li>The username you wanted is already taken. Try another!</li>";
			}
			
			/* Verify matching password and password confirmation */
			if (typeof req.body.pass=="undefined" || typeof req.body.passConf=="undefined" || req.body.pass=="" || req.body.passConf=="") {
				error|=4;
				errorMess+="<li>You must enter a password and confirm it, too.</li>";
			}
			else if (req.body.pass!=req.body.passConf) {
				error|=4;
				errorMess+="<li>The passwords you provided don't match! Be careful when typing them.</li>";
			}
			
			/* Verify valid RPI E-Mail address */
			if (typeof req.body.email=="undefined" || req.body.email=="") {
				error|=2;
				errorMess+="<li>You need to enter an E-Mail address to use Connective.</li>";
			}
			else if (!/^[0-9a-z._+-]+?@([0-9a-z_.+-]*?\.)?rpi\.edu$/i.test(req.body.email)) {
				error|=2;
				errorMess+="<li>That E-Mail address is not a valid RPI address! Sorry, we're only available to RPI students.</li>";
			}
			
			/* If there are errors, show the signup page again, but with the error information */
			if (error>0) {
				errorMess+="</ul>";
				res.render("Admin/index", {
						errorMsg: errorMess,
						username: uname,
						error: error,
						email: req.body.email,
						signedInAs: req.session.uname,
            type: "signup"
				});
			 }
			 
			 else {
				
				/* If there are no issues, salt and hash the password, store the user in the DB, and generate the confirmation E-Mail. */
				function genSalt(len, usableChars) {
					var ind=(Math.random()*(usableChars.length-1)).toFixed(0);
					return (len>0) ? usableChars[ind]+genSalt(len-1, usableChars) : "";
				}
				var salt=genSalt(8, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_");
				var sha1=crypto.createHash("sha1");
				
				/* Hash algorithm: first 4 of salt, then pass, then last 4 of salt, all sha1'd. Shhhh, tell no one! */
				sha1.update(salt.substr(0, 4)+req.body.pass+salt.substr(4,4));
				var passHash=sha1.digest("hex");
				
				/* Create user in DB */
				var newUser = new User({
					username:req.body.userName,
					uname_lower:req.body.userName.toLowerCase(),
					password:passHash,
					confirmed:false,
					salt:salt,
					classesAndDescriptions:[],
					buddies: [],
          requests: [],
          ratingList: [],
					rating: -0.1,
          email: req.body.email,
          allowMail: true
				});
				newUser.save();
				
				/* Generate and send confirmation E-Mail */
				var message={
					from: "Connective <Connective.Team@gmail.com>",
					to: req.body.email,
					subject: "Confirm Your E-Mail",
					html: "Thanks for joining Connective! Just one more step and you'll be on your way to connecting with students all over RPI. All we need now is for you to confirm your E-Mail address by clicking the link below! (If it doesn't show as a link for you, copy and paste it into your browser's address bar).<br /><br /><a href='"+domain+"/confirmSignup?confirmID="+passHash+"&user="+escape(req.body.userName)+"'>"+domain+"/confirmSignup?confirmID="+passHash+"&user="+escape(req.body.userName)+"</a><br /><br />Thanks again!",
					generateTextFromHTML: true
				};

				smtp.sendMail(message, function(error, resp) {
					if (error) {
						console.log("Error sending confirmation email: ", error);
					}
					else {
						/* When E-Mail is sent, render the "E-Mail sent, please confirm" page */
						res.render("Admin/confirm", {
							email: req.body.email,
							signedInAs: req.session.uname
						});
					}
				});
			 }
		});
	});

	/* Blank signup page before anything's submitted */
	app.get("/signup", function(req, resp) {
    if (req.session.signedIn) {
      resp.redirect("/profile?user="+req.session.uname);
    }
    else {
      resp.render("Admin/index", {
        username: "",
        errorMsg:""
      });
    }
	});

	/* Signin processing */
	app.post("/signin", function(req, res) {
		User.findOne({uname_lower:req.body.userName.toLowerCase()}, function(error, found) {
    
      /* If the username is nonexistent, render the signin page again with that error */
			if (found==null) {
				res.render("Admin/index", {
					username: req.body.userName,
					error: 1,
					errorMsg: "There's no account with the username "+req.body.userName+". Did you type it correctly?",
					signedInAs: req.session.uname,
          type:"signin"
				});
			}
      
      /* If the user is registered but not confirmed, render the signin page again with that error */
			else if (!found.confirmed) {
				res.render("Admin/index", {
					username: req.body.userName,
					error:2,
					errorMsg: "This account has not verified its E-Mail address. Please check your RPI E-Mail and confirm your account before you can sign in.",
					signedInAs: req.session.uname,
          type:"signin"
				});
			}
			else {
				var sha1=crypto.createHash("sha1");
				sha1.update(found.salt.substr(0, 4)+req.body.pass+found.salt.substr(4,4));
				var passHash=sha1.digest("hex");
        
        /* If the password is correct, sign the user in and redirect him/her to his/her profile */
				if (passHash==found.password) {
					req.session.signedIn=true;
					req.session.uname=req.body.userName.toLowerCase();
					req.session.key=found.password;
					res.redirect("/profile?user="+found.username);
				}
        
        /* If the password is incorrect, render the signin page again with that error */
				else {
					res.render("Admin/index", {
						username:req.body.userName,
						error:4,
						errorMsg: "The password you entered was not corrrect. Make sure capslock is off.",
						signedInAs: req.session.uname,
            type: "signin"
					});
				}
			}
		});
	});

  /* Navigating to the signin page redirects you to your profile if you're already signed in */
	app.get("/signin", function(req, resp) {
		if (req.session.signedIn) {
			resp.redirect("/profile?user="+req.session.uname);
		}
		else {
			resp.render("Admin/index", {signedInAs: req.session.uname});
		}
	});

	/* Signing out */
	app.get("/signout", function(req, resp) {
		req.session.destroy();
		resp.redirect("/");
	});
}
module.exports.startAdmin=startAdmin;