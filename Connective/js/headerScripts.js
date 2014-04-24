var connectionTimer=null;

/* Ignore a Connection request */
function IgnoreConnection(username) {
  $.ajax("ignore", {
    type: "POST",
		data: {
			user:username
		},
    complete: function(xhr, stat) {
      var data=xhr.responseText;
      if (stat<200 || stat>=300) { alert("Failed to ignore request"); }
      else {
			  if (data.substr(0, 7)=="ERROR: ") {
				  alert(data.substr(7));
				}
				else {
          /* On success, update the notifications list */
					GetConnections();
				}
			}
    },
    error: function(xhr, stat, err) {
      alert("Error: "+err);
    },
    xhrFields: { withCredentials: true }
  });
}

/* Accept a Connection request */
function AcceptConnection(username) {
  $.ajax("accept", {
    type: "POST",
		data: {
			user:username
		},
    complete: function(xhr, stat) {
      var data=xhr.responseText;
      if (stat<200 || stat>=300) { alert("Failed"); }
      else {
			  if (data.substr(0, 7)=="ERROR: ") {
				  alert(data.substr(7));
				}
				else {
          /* Update the notifications list */
					GetConnections();
				}
			}
    },
    error: function(xhr, stat, err) {
      alert("Error: "+err);
    },
    xhrFields: { withCredentials: true }
  });
}

/* Get up-to-date notifications from the server */
function GetConnections() {
  $.ajax("connectionNotices", {
    type: "GET",
    complete: function(xhr, stat) {
      var data=xhr.responseText;
      if (stat<200 || stat>=300) { alert("Failed"); }
      else {
			  var response=JSON.parse(data);
				if (response.error!="") {
					alert("Error: "+response.error);
				}
				else {
					/* Put newer requests at the top */
					response.requests.sort(function(a,b) {
						return a.timestamp-b.timestamp;
					});
          
          /* If there are no notifications, show that message */
					if (response.requests.length<=0) {
						$(".connections").removeClass("newConnections").addClass("nonewConnections");
						$("#connectionNotices").html("<div class='requestItem'>You have no notifications.</div>"); 
					}
          
          /* If there are new notifications, add them to the drop-down list */
					else {
						$(".connections").removeClass("nonewConnections").addClass("newConnections");
						for (i in response.requests) {
							$("#connectionNotices").html("");
							var req=document.createElement("div");
							req.className="requestItem";
							if (response.requests[i].seen) {
								$(req).addClass("seen");
							}
							$(req).html("<a href='profile?user="+response.requests[i].username+"' style='font-weight:bold'>"+response.requests[i].username+"</a><a style='cursor:pointer' onclick="+'"'+"IgnoreConnection('"+response.requests[i].username+"')"+'"'+"><img style='float:right; position:relative; top:2px' src='images/deleteIcon.png' /></a><a style='float:right; height:20px; background:#E0E0E0; border:1px solid #C0C0C0; border-radius:5px; font-family:Arial; font-size:8pt; padding:4px; vertical-align:middle; cursor:pointer; font-weight:bold' onclick="+'"'+"AcceptConnection('"+response.requests[i].username+"')"+'"'+">Accept</a>");
							$("#connectionNotices").append(req);
						}
					}
          
          /* Update the notifications every 15 seconds */
					connectionTimer=setTimeout(GetConnections, 15000);
				}
			}
    },
  });
}

/* Detect if a pressed key is a number, for validating number-only fields */
function isNumberKey(evt)
    {
       var charCode = (evt.which) ? evt.which : event.keyCode
       if (charCode > 31 && (charCode < 48 || charCode > 57))
          return false;

       return true;
    }

/* Page initializations */
$(document).ready(function() {

  /* Get notificaitons right away */
  GetConnections();
  
  /* Bootstrap stuff */
  $("ul.dropdown-menu").on("click", function(e) {
		e.stopPropagation();
	});
	
  /* Get the class listings for the Autocomplete fields */
	$.ajax({url: "/allClassListings?excludeSections=true", async: false, success: function(data) {
		classNamesForSearchHeader=data.classes;
		$('#classNameBox').autocomplete({source:classNamesForSearchHeader});
		function sortSemestersByDate(s1,s2){
			var year1 = parseInt(s1.substr(s1.length-4));
			var year2 = parseInt(s1.substr(s2.length-4));
			if (year1 > year2)
				return 1;
			else if (year1 < year2)
				return -1;
			else
			{
        /* Parse semester data, giving Summer, Spring, and Fall values that can be sorted */
				var season1 = s1.substr(0, s1.indexOf(" "));
				var season2 = s2.substr(0, s2.indexOf(" "));
				
				var season1Val = 1;
				if (season1 == "Summer")
					season1Val = 2;
				else if (season1 == "Fall")
					season1Val = 3;
					
				var season2Val = 1;
				if (season2 == "Summer")
					season2Val = 2;
				else if (season2 == "Fall")
					season2Val = 3;
					
				if (season1Val > season2Val)
					return 1;
				else if (season1Val < season2Val)
					return -1;
				else
					return 0;
			}
			
		}
		
    /* Sort semesters */
		data.semesters.sort(sortSemestersByDate);
		
    /* Add the semesters to the semester selection field */
		for (var i = 0; i < data.semesters.length; i++)
			$('#semesterSelect').append("<option value='" + data.semesters[i] + "'>" + data.semesters[i] + "</option>");
	}});
});