var http=require("http");
var fs=require("fs"); // Include filesystem manipulation, so we can read/write files for cacheing.

var MILLISECONDS_IN_A_WEEK = 1000*60*60*24*7;

/* The getCourses() function takes a callback function which is passed the resulting JSON from YACS. */
function getCourses(callback) {
  getLocallyOrGetFromWebAndCacheForAWeek("course",callback);
}

function getDepartments(callback) {
  getLocallyOrGetFromWebAndCacheForAWeek("department",callback);
}

function getSections(callback) {
  getLocallyOrGetFromWebAndCacheForAWeek("section",callback);
}

function getSemesters(callback) {
  getLocallyOrGetFromWebAndCacheForAWeek("semester",callback);
}

function getDataOfThisType(typeOfYacsData, callback) {
  getLocallyOrGetFromWebAndCacheForAWeek(typeOfYacsData, callback);
}

function computeClassListings(coursesData,departmentsData,sectionsData,semestersData)
{
    
}

function getAllClassListings(callback) {
  getCourses(function(coursesData){
  getDepartments(function(departmentsData){
  getSections(function(sectionsData){
  getSemesters(function(semestersData){
  
        var lastUpdated = 0;
        if (fs.existsSync("caches/classListings.json")) {
             var lastUpdated = fs.lstatSync("caches/classListings.json").mtime;
        }
        if (new Date() - lastUpdated < MILLISECONDS_IN_A_WEEK) {
             callback(JSON.parse(fs.readFileSync("caches/classListings.json"))); 
        }

	var courses = coursesData["result"];
	var departments = departmentsData["result"];
	var sections = sectionsData["result"]; 
        var semesters = semestersData["result"];
        semesters.sort(function(s1,s2){
          var t1 = new Date(s1.year, s1.month).getTime();
          var t2 = new Date(s2.year, s2.month).getTime();
          return t2-t1;
        });
        var lastTwoSemesterNames = [semesters[0]["name"], semesters[1]["name"]];
        var lastTwoSemesterIds = [semesters[0]["id"],semesters[1]["id"]];
        //console.log(lastTwoSemesters);
	var departmentIdsToCodes = {};
        
        var classListings = [];
	for (var i = 0; i < departments.length; i++)
	{
	  var departmentId = departments[i]["id"];
	  var departmentCode = departments[i]["code"];
	  departmentIdsToCodes[departmentId.toString()] = departmentCode;
	} 
	var classIdsToListOfSections = {};
	for (var i = 0; i < sections.length; i++)
	{
	  //make this number a fucking constant at the top
	  //if (sections[i]["semester_id"] != 16073)
         
          var semesterIndexOfThisSection = lastTwoSemesterIds.indexOf(sections[i]["semester_id"]);
          //if (lastTwoSemesters.indexOf(sections[i]["semester_id"]) == -1)
          if (semesterIndexOfThisSection == -1)
	    continue; //sections are not for two semesters of Interest (this and next, or this and last)

	  var classIdAsString = sections[i]["course_id"].toString();

	  var sectionForAClass =  sections[i]["number"]
	  /*for (var j = 0; j < sectionsForAClass.length; j++)
	  {
	    //var sectionInfo =  sectionsForAClass["start"];
	    classIdsToListOfSections[classIdAsString]
	        = sections[i]["section_times"];
	  }*/
	if (classIdsToListOfSections[classIdAsString] == null)
	  classIdsToListOfSections[classIdAsString] 
                  = [{section:sectionForAClass, semester:lastTwoSemesterNames[semesterIndexOfThisSection]}];
	else classIdsToListOfSections[classIdAsString]
                  .push({section:sectionForAClass, semester:lastTwoSemesterNames[semesterIndexOfThisSection]});
	}
	//console.log("classIdsToListOfSections num fields = " 
	//	+ classIdsToListOfSections.__count__);
	//console.log(classIdsToListOfSections);
	for (var i = 0; i < courses.length; i++)
        {
         var classIdAsString = courses[i]["id"].toString();
         var sectionsOfThisClassThisSemester = classIdsToListOfSections[classIdAsString];
         if (sectionsOfThisClassThisSemester == null)
           continue;//class doesn't have any sections this semester
         var departmentCodeOfClass = 
             departmentIdsToCodes[courses[i]["department_id"].toString()];
         var numberOfClass = courses[i]["number"];
         var nameOfClass = courses[i]["name"];
         for (var j = 0; j < sectionsOfThisClassThisSemester.length; j++)
         {
           var sectionNumber = sectionsOfThisClassThisSemester[j].section;
           var semester = sectionsOfThisClassThisSemester[j].semester;
           var classListing = departmentCodeOfClass + " " 
                  + numberOfClass + "-" + sectionNumber + ":" + nameOfClass + "--" + semester;
           classListings.push(classListing);     
         }     
        }  
        fs.writeFile("caches/classListings",JSON.stringify({classes:classListings}));
        callback({classes:classListings});
  });
  });
  });
  });
}

function getLocallyOrGetFromWebAndCacheForAWeek(thingToGet, callback){
  var thingToGetPlural = thingToGet + "s";
  
  /* First, check if the cached file is older than 1 week. If not, just use that data. */
  var lastUpdated=0; // If there's no cache yet, this will ensure it's processed as "too old" and be re-cached from YACS.
  if (fs.existsSync("caches/" + thingToGet + "Cache.json")) {
    var lastUpdated = fs.lstatSync("caches/" + thingToGet + "Cache.json").mtime; // Get the file's last-modified time.
  }
  if (new Date() - lastUpdated < MILLISECONDS_IN_A_WEEK) { // Convert elapsed milliseconds to weeks and compare
    callback(JSON.parse(fs.readFileSync("caches/" + thingToGet + "Cache.json"))); // Pass the cached data to the callback.
  }
  else {
  /* If the cache is too old, reload it from the YACS server */
  
    /* Set the HTTP request parameters */
    var requestOptions={
      hostname: "yacs.me",
      post:80,
      path: "/api/4/" + thingToGetPlural + "/",
      method: "GET"
    };
    
    /* Request the JSON file */
    var request=http.request(requestOptions, function (response) {
      
      /* COncatenate the response as data comes in */
      response.body="";
      response.on('data', function (chunk) {
        response.body+=chunk;
      });
      
      /* When all data has been received, cache it and pass it to the callback function */
      response.on("end", function() {
        fs.writeFile("caches/" + thingToGet + "Cache.json", response.body, null); // Cache the data
        callback(JSON.parse(response.body));
      });
    });
    
    /* Send the request */
    request.end();
  }
}


/* Make sure the functions can be called if this is used as a Node module...which it is. */
module.exports.getCourses=getCourses;
module.exports.getDepartments=getDepartments;
module.exports.getSections=getSections;
module.exports.getSemesters=getSemesters;

module.exports.getDataOfThisType=getDataOfThisType;
module.exports.getAllClassListings=getAllClassListings;
