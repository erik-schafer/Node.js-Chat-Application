var http = require('http'); 	//buit in http module provides http server and client functionality
var fs = require('fs'); 		//built in fs module provides filesystem related functionality
var path = require('path'); 	//built in path module provides filesystem path-related functionality
var mime = require('mime');		//built in mime module provides ability to derive a mime type based on a filename extension
var chatServer = require('./lib/chat_server');		//load functionality from custom node module wich supplies logic to handle socket.io server chat functionality
var cache = {};					//cache object where the contents of cached files are stored



//three helper functions for serving static http
//handle a 404:
function send404(response) {
	response.writeHead(404, {'Content-Type':'text/plain'});
	response.write('Error 404: resource not found.');
	response.end();
}

//serve file data -- write apropriate header and send file
function sendFile(response, filePath, fileContents) {
	response.writeHead(
			200,
			{"content-type" : mime.lookup(path.basename(filePath))}
		);
	response.end(fileContents);
}

//serve static files -- serve from cache if cached; otherwise read from disk, cache, and then serve
function serveStatic(response, cache, absPath) {
	if(cache[absPath]) {	//absPath keys into cache to determine if the file is cached
		sendFile(response, absPath, cache[absPath]);	//if so, retrieve the file and pass it to the send file function
	} else {
		fs.exists(absPath, function(exists){ //pass the path and exists object (?)
			if(exists) {
				fs.readFile(absPath, function(err, data) { //read file from disk
					if(err) { //if err object passed by fs.readFile is set
						send404(response); //404
					} else {
						cache[absPath] = data;	//cache data object which is passed by fs.readFile
						sendFile(response, absPath, data);  //send file with the data, taking response, abspath from initial call
					}
				});
			} else {
				send404(response);
			}
		});
	}
}

//create an http server
var server = http.createServer(function(request, response){ //create HTTP server, use anon func to handle request logic
	var filePath = false;
	if(request.url == '/') {
		filePath = 'public/index.html'; //set the default root html page
	} else {
		filePath = 'public' + request.url; //translate url path to relative file path
	}
	var absPath = './' + filePath;
	serveStatic(response, cache, absPath); //serve up the file
});

server.listen(3000, function(){
	console.log("server listening on port 3000.");
});

chatServer.listen(server);	//starts the socket server