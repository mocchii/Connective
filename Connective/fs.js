var fs=require("fs");
var cont=fs.readFileSync("test.txt");
console.log("Started as: "+cont);
fs.watch("test.txt", function(cur, prev) {
  cont=fs.readFileSync("test.txt");
  console.log("File updated: "+cont);
});
console.log("End");