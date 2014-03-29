/* Saves course descriptions */
function SaveDescription() {
	  var myNum=$(this).attr("data-id");
	  var myEdit=$("#description"+myNum);
		var myBox=$("#descEdit"+myNum);
		var me=$(this);
		
		/* Disable the edit box while waiting for a response from the server (prevents race conditions) */
		myBox.attr("disabled", true);
		
		/* Send the value over to the server */
		$.ajax("editDesc", {
      type: "POST",
      data: {
        id: $(this).attr("data-id"),
        user: thisUser,
				description: myBox.val()
      },
      complete: function(xhr, stat) {
        var theID=0;
        var data=xhr.responseText;
				
				/* Basic error display...perhaps make this more graceful upon final release? */
        if (stat<200 || stat>=300) { alert("Failed"); }
        else if (data.substr(0,7)=="ERROR: ") {
          alert(data.substr(7));
        }
        else {
				  /* On success, update the description box appropriately */
				  var json=JSON.parse(data);
          myEdit.text(json.description);
					
					/* Make the edit button show the edit box again instead of saving */
					me.unbind("click").click(ShowEdit);
        }
      },
      error: function(xhr, stat, err) {
        alert("Error: "+err);
      },
      xhrFields: { withCredentials: true }
    });
		
		/* Before the response is received, show a message to the user that we're saving the content */
		myBox.val("Saving...");
}

/* Show the course description edit boxes */
function ShowEdit() {
	  var myNum=$(this).attr("data-id");
	  var myEdit=$("#description"+myNum);
		
		/* Create a textbox with the current description text */
		myEdit.html("<textarea rows=5 cols=25 id='descEdit"+myNum+"'>"+myEdit.text()+"</textarea>");
		
		/* Focus on it */
		var myBox=document.getElementById("descEdit"+myNum);
		myBox.focus();
		
		/* Move the cursor to the end of the text */
    var end=myBox.value.length;
    if (myBox.setSelectionRange) {
        myBox.setSelectionRange(end,end);  
    } else { // IE style...because IE is dumb but should still be supported if possible
        var aRange = myBox.createTextRange();
        aRange.collapse(true);
        aRange.moveEnd('character', end);
        aRange.moveStart('character', end);
        aRange.select();    
    }
		
		/* Change the function of the edit button to save rather than to show more boxes */
		$(this).unbind("click").click(SaveDescription);
}

/* Update the data ID numbers of the course list items; i.e. when deleting or adding courses */
function SetDatas() {
  $(".className").unbind("click").click(function() {
    var index=$(this).attr("data-id");
    $("#classData"+index).slideToggle("slow");
  });

  /* Set all the edit buttons to show a textbox when clicked */  
	$(".editButton").unbind("click").click(ShowEdit);
	
	/* Set the delete buttons to delete when clicked */
  $(".delete").unbind("click").click(function() {
    var removeWhat=$(this);
    if (!confirm("Are you sure you want to remove this course?")) { return false; }
    $.ajax("deleteClass", {
      type: "POST",
      data: {
        id: $(this).attr("data-id"),
        user: thisUser
      },
      complete: function(xhr, stat) {
        var theID=0;
        var data=xhr.responseText;
        if (stat<200 || stat>=300) { alert("Failed"); }
        else if (data.substr(0,7)=="ERROR: ") {
          alert(data.substr(7));
        }
        else {
          var ul, li, lis;
          li=removeWhat;
          while (li && li.prop("tagName").toLowerCase()!="li") { li=li.parent(); }
          ul=li;
          while (ul && ul.prop("tagName").toLowerCase()!="ul") { ul=ul.parent(); }
          theID=$(li).children("span").attr("data-id");
          li.remove();
          lis=ul.children("li");
          if (lis.length<=0) {
            var p=ul.parent();
            ul.remove();
            p.append("None Added");
          }
          else {
            lis.each(function() {
              var dataChildren=$(this).children("span").each(function() {
                if ($(this).attr("data-id")>theID) {
                  $(this).attr("data-id", $(this).attr("data-id")-1);
                }
              });
            });
          }
        }
      },
      error: function(xhr, stat, err) {
        alert("Error: "+err);
      },
      xhrFields: { withCredentials: true }
    });
  });
}

/* Add a new class to your profile */
function AddClass() {
  /* Verify the entered class against the course list */
	if (classNames.indexOf($("#newClass").val())<0) {
	  alert("The class you entered does not exist. Please choose a class from the drop-down list.");
		return false;
	}
	
  $.ajax("addClass", {
    type: "POST",
    data: {
      user: thisUser,
      course: $("#newClass").val()
    },
    complete: function(xhr, stat) {
      var data=xhr.responseText;
      if (stat<200 || stat>=300) { alert("Failed"); }
      else if (data.substr(0,7)=="ERROR: ") {
        alert(data.substr(7));
      }
      else {
			
			  /* On success, create a new entry in the class list, complete with blank description box ready for editing. */
			  var response=JSON.parse(data);
        var li=document.createElement("li");
        var dataID=$("#myClassList").children().length-1;
        li.innerHTML="<span class='className' data-id='"+dataID+"'>"+response.className+"</span> &nbsp;";
        li.innerHTML+="<span class='delete' data-id='"+dataID+"'><img src='images/deleteIcon.png' /></span>";
        li.innerHTML+="<div class='classDesc' id='classData"+dataID+"'><span class='editButton'>&nbsp;</span><span class='courseInfo'>"+response.code+" - "+response.semester+"</span><br /><div id='description"+dataID+"' class='descriptionBox'></div></div>";
        $(li).attr("data-id", dataID);
				
				if (dataID>=0) {
					$(li).insertBefore($("#myClassList").children().last());
				}
				else {
				  $("#myClassList").append(li);
				}
				
        SetDatas(); // Update the data IDs
        $("#newClass").val(""); // Clear the New Class textbox
        $("#newClassArea").animate({width:'0px'}, 350); // Close the New Class textbox
        $("#addClass").html("Add Course"); // Change the Add Course link's text back from "Add"
        isAdding=false; // Indicate we don't have the Add Course textbox open anymore
      }
    },
  });
}

var isAdding=false;
var classNames;
$(document).ready(function() {
  
  SetDatas(); // Set the data IDs
  
  $("#newClass").attr("disabled", true).val("Loading course list..."); // Disable the New Class box while we load the course list

  /* Load the course list */
  $.ajax({url: "/allClassListings", async: false, success: function(data) {
    classNames=data.classes;
    
    /* Copy some information into the "label" and "value" fields, for the autocomplete plugin to register them */
    courses=[];
    for (i in classNames) {
      courses[courses.length]={
        label: classNames[i],
        value: classNames[i]
      };
    }
    $("#newClass").val("").attr("disabled", false); // Clear and re-enable course list box
    $("#newClass").attr("placeholder", "Enter a course ID or name");
    
    /* Set the New Class box to an autocomplete Course Listing box using that resulting list */
    $("#newClass").autocomplete({
      source: function(req, response) { 

        /* Make a pattern out of whatever the person typed */
        var re = $.ui.autocomplete.escapeRegex(req.term); 

        /* Check for things that come either at the beginning of a string or after a space or dash */
        var matcher = new RegExp( "(?:^|[ -])" + re, "i" ); 
    
        /* Respond with only those courses whose names include the typed pattern */
        response($.grep(courses, function(course){ 
            return matcher.test(course.label);
        }) ); 
      }
    })
  }});

  /* Initialize the Add Class button to toggle the New Class box being shown or not, and adding a course */
  $("#addClass").click(function() {
    isAdding=!isAdding;
    if (isAdding) {
      $("#newClassArea").animate({width:'200px'}, 350);
      $(this).html("Add");
      $("#newClass").focus();
    }
    else {
      AddClass();
    }
  });
});