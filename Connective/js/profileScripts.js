$(document).ready(function() {
  $(".className").click(function() {
    var index=$(this).attr("data-id");
    $("#classData"+index).slideToggle("slow");
  });
  
  $(".delete").click(function() {
    var removeWhat=$(this);
    if (!confirm("Are you sure you want to remove this course?")) { return false; }
    $.ajax("deleteClass", {
      type: "POST",
      data: {
        id: $(this).attr("data-id"),
        user: thisUser,
        whatever: "Hello"
      },
      complete: function(xhr, stat) {
        var data=xhr.responseText;
        if (stat<200 || stat>=300) { alert("Failed"); }
        else if (data.substr(0,7)=="ERROR: ") {
          alert(data.substr(7));
        }
        else {
          var ul, li;
          li=removeWhat;
          while (li && li.prop("tagName").toLowerCase()!="li") { li=li.parent(); }
          ul=li;
          while (ul && ul.prop("tagName").toLowerCase()!="ul") { ul=ul.parent(); }
          l=ul.children("li").length;
          li.remove();
          if (l<=1) {
            var p=ul.parent();
            ul.remove();
            p.html("None Added");
          }
        }
      },
      error: function(xhr, stat, err) {
        alert("Error: "+err);
      },
      xhrFields: { withCredentials: true }
    });
  });
  
});