var app = require("express")();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var fs = require("fs");
var crypto = require("crypto");

var pending = "";  //pending token for allowed (one at a time!)
var allowed = {};  //(socket id): (allowed token)

app.get("*", function(req, res) {
	if(req.url.indexOf("/.") >= 0) {
		res.send("nope.");
	} else {
		//console.log(req.url);
		res.sendFile(__dirname + req.url);
	}
});

app.post("/remote/connect", function(req, res) {
	var data = [];
	req.on("data", function(chunk) {
		//console.log("chunk:", chunk.toString());
		data.push(chunk.toString());
	});
	req.on("end", function() {
		if(!data.length) {
			res.send({
				error: "bad request"
			});
			return;
		}
		var post = JSON.parse(data.join(""));
		fs.readFile("config.json", null, function(err, data) {
			if(err) {
				res.send({
					error: "could not read config"
				});
				return;
			}
			var config = JSON.parse(data);
			if(!config.password || config.password !== post.password) {
				res.send({
					error: "password does not match"
				});
				return;
			}
			var token = crypto.randomBytes(64).toString("hex");
			pending = token;
			res.send({
				token: token
			});
		});
	});
});

io.on("connection", function(socket) {
	//io.emit("to everyone", data);
	//socket.broadcast.emit("to everyone else", data);
	//io.sockets.connected[id].emit("to one client", data);

	socket.on("auth", function(data) {
		if(data === pending) {
			allowed[socket.id] = pending;
			pending = "";
		}
		io.emit("remotein");
	});

	socket.on("buzz", function(data) {
		if(allowed[socket.id] === data) {
			io.emit("buzz");
		}
	});
	socket.on("next", function(data) {
		if(allowed[socket.id] === data) {
			io.emit("next");
		}
	});
	socket.on("back", function(data) {
		if(allowed[socket.id] === data) {
			io.emit("back");
		}
	});
	socket.on("forward", function(data) {
		if(allowed[socket.id] === data) {
			io.emit("forward");
		}
	});

	socket.on("disconnect", function() {
		if(allowed[socket.id]) {
			delete allowed[socket.id];
		}
		io.emit("remoteout");
	});
});

http.listen(1234, function() {
	console.log("listening on *:1234");
});
