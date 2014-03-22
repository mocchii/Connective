function SetDatas() {
  $(".className").unbind("click").click(function() {
    var index=$(this).attr("data-id");
    $("#classData"+index).slideToggle("slow");
  });
  
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

function AddClass() {
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
        var li=document.createElement("li");
        var dataID=$("#myClassList").children().length-1;
        li.innerHTML="<span class='className' data-id='"+dataID+"'>"+$("#newClass").val()+"</span> &nbsp;";
        li.innerHTML+="<span class='delete' data-id='"+dataID+"'><img src='images/deleteIcon.png' /></span>";
        li.innerHTML+="<div class='classDesc' id='classData"+dataID+"'><span class='editButton'>&nbsp;</span></div>";
        $(li).attr("data-id", dataID);
        $(li).insertBefore($("#myClassList").children().last());
        SetDatas();
        $("#newClass").val("");
        $("#newClassArea").animate({width:'0px'}, 350);
        $("#addClass").html("Add Course");
        isAdding=false;
      }
    },
  });
}

$(document).ready(function() {
  var isAdding=false;
  
  SetDatas();
  
  $("#newClass").attr("disabled", true).val("Loading course list...");
  $.ajax({url: "/allClassListings", async: false, success: function(data) {
    var res=data.classes;
    
    /* Copy some information into the "label" and "value" fields, for the autocomplete plugin to register them */
    courses=[];
    for (i in res) {
      courses[courses.length]={
        label: res[i],
        value: res[i]
      };
    }
    $("#newClass").val("").attr("disabled", false); // Clear and re-enable course list boxes
    $("#newClass").attr("placeholder", "Enter a course ID or search by course name");
    
    /* Make all input boxes with class ".courser" into autocomplete Course Listing boxes using that resulting list */
    $("#newClass").autocomplete({
      source: function(req, response) { 

        /* Make a pattern out of whatever the person typed */
        var re = $.ui.autocomplete.escapeRegex(req.term); 

        /* The ^ in a Regular Expression pattern means "at the beginning of the text" */
        var matcher = new RegExp( "(?:^|[ -])" + re, "i" ); 
    
        /* Respond with only those courses whose names START with the typed pattern */
        response($.grep(courses, function(course){ 
            return matcher.test(course.label);
        }) ); 
      }
    })
  }});


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