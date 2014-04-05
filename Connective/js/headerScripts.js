function GetNotifications() {
  $.ajax("notifications", {
    type: "GET",
    complete: function(xhr, stat) {
      var data=xhr.responseText;
      if (stat<200 || stat>=300) { alert("Failed"); }
      else {
			  var response=JSON.parse(data);
				/* Put unseen requests at the top */
				response.requests.sort(function(a,b) {
				  return 2*b.seen-1; // Convert {0, 1} into {-1, 1}
				});
				
				for (i in response.requests) {
				  var req=document.createElement("div");
					req.className="requestItem";
					if (response.requests[i].seen) {
					  $(req).addClass("seen");
					}
					$(req).html(response.requests[i].username);
					$("#notifications").append(req);
				}
				
      }
    },
  });
}

$(document).ready(function() {
  GetNotifications();
});