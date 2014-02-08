var http=require("http");
var fs=require("fs"); // Include filesystem manipulation, so we can read/write files for cacheing.

/* The getCourses() function takes a callback function which is passed the resulting JSON from YACS. */
function getCourses(callback) {

  /* First, check if the cached file is older than 1 week. If not, just use that data. */
  var lastUpdated=-1; // If there's no cache yet, this will ensure it's processed as "too old" and be re-cached from YACS.
  if (fs.existsSync("caches/courseCache.json")) {
    var lastUpdated = fs.lstatSync("caches/courseCache.json").mtime; // Get the file's last-modified time.
  }
  if (new Date() - lastUpdated < 1000*60*60*24*7) { // Convert elapsed milliseconds to weeks and compare
    callback(JSON.parse(fs.readFileSync("caches/courseCache.json"))); // Pass the cached data to the callback.
  }
  else {
  /* If the cache is too old, reload it from the YACS server */
  
    /* Set the HTTP request parameters */
    var requestOptions={
      hostname: "yacs.me",
      post:80,
      path: "/api/4/courses/",
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
        fs.writeFile("caches/courseCache.json", response.body, null); // Cache the data
        callback(JSON.parse(response.body));
      });
    });
    
    /* Send the request */
    request.end();
  }
}

/* The getDepartments() function works basically the same way as getCourses() */
function getDepartments(callback) {

  var lastUpdated=-1;
  if (fs.existsSync("caches/departmentCache.json")) {
    var lastUpdated = fs.lstatSync("caches/departmentCache.json").mtime;
  }
  if (new Date() - lastUpdated < 1000*60*60*24*7) {
    callback(JSON.parse(fs.readFileSync("caches/departmentCache.json")));
  }
  else {
    
    var requestOptions={
      hostname: "yacs.me",
      post:80,
      path: "/api/4/departments/",
      method: "GET"
    };
    
    var request=http.request(requestOptions, function (response) {
      
      response.body="";
      response.on('data', function (chunk) {
        response.body+=chunk;
      });
      
      response.on("end", function() {
        fs.writeFile("caches/departmentCache.json", response.body, null);
        callback(JSON.parse(response.body));
      });
    });
    
    /* Send the request */
    request.end();
  }
}

/* And getSections() for class sections. Yeah... same way. */
function getSections(callback) {

  var lastUpdated=-1;
  if (fs.existsSync("caches/sectionCache.json")) {
    var lastUpdated = fs.lstatSync("caches/sectionCache.json").mtime;
  }
  if (new Date() - lastUpdated < 1000*60*60*24*7) {
    callback(JSON.parse(fs.readFileSync("caches/sectionCache.json")));
  }
  else {
    
    var requestOptions={
      hostname: "yacs.me",
      post:80,
      path: "/api/4/sections/",
      method: "GET"
    };
    
    var request=http.request(requestOptions, function (response) {
      
      response.body="";
      response.on('data', function (chunk) {
        response.body+=chunk;
      });
      
      response.on("end", function() {
        fs.writeFile("caches/sectionCache.json", response.body, null);
        callback(JSON.parse(response.body));
      });
    });
    
    /* Send the request */
    request.end();
  }
}

/* The getSemesters() function takes a callback function which is passed the resulting JSON from YACS. */
function getSemesters(callback) {

  /* First, check if the cached file is older than 1 week. If not, just use that data. */
  var lastUpdated=-1; // If there's no cache yet, this will ensure it's processed as "too old" and be re-cached from YACS.
  if (fs.existsSync("caches/semesterCache.json")) {
    var lastUpdated = fs.lstatSync("caches/semesterCache.json").mtime; // Get the file's last-modified time.
  }
  if (new Date() - lastUpdated < 1000*60*60*24*7) { // Convert elapsed milliseconds to weeks and compare
    callback(JSON.parse(fs.readFileSync("caches/semesterCache.json"))); // Pass the cached data to the callback.
  }
  else {
  /* If the cache is too old, reload it from the YACS server */
  
    /* Set the HTTP request parameters */
    var requestOptions={
      hostname: "yacs.me",
      post:80,
      path: "/api/4/semesters/",
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
        fs.writeFile("caches/semesterCache.json", response.body, null); // Cache the data
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