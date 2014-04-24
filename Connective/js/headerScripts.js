var connectionTimer=null;
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
					/* Put unseen requests at the top */
					response.requests.sort(function(a,b) {
						return 2*b.seen-1; // Convert {0, 1} into {-1, 1}
					});
					if (response.requests.length<=0) {
						$(".connections").removeClass("newConnections").addClass("nonewConnections");
						$("#connectionNotices").html("<div class='requestItem'>You have no Connection requests.</div>"); 
					}
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
					connectionTimer=setTimeout(GetConnections, 15000);
				}
			}
    },
  });
}

$(document).ready(function() {
  GetConnections();
});