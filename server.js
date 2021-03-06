var app = require("express")();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var fs = require("fs");
var crypto = require("crypto");

var pending = "";  //pending token for allowed (one at a time!)
var allowed = {};  //(socket id): (allowed token)

var showing	= NaN; //Currently showing page if a remote is connected

app.get("*", function(req, res) {
	if(req.url.indexOf("/.") >= 0) {
		res.send("nope.");
	} else {
		//console.log(req.url);

		fs.stat(process.cwd() + req.url, (err, stat) => {
			if (!err) {
				res.sendFile(process.cwd() + req.url);
			} else {
				res.sendFile(__dirname + req.url);
			}
		});
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

	if (!isNaN(showing)) {
		socket.emit("show", { "page": showing });
	}

	socket.on("auth", function(data) {
		if(data && data.token === pending) {
			allowed[socket.id] = pending;
			pending = "";
		}
		io.emit("remotein");
	});

	socket.on("buzz", function(data) {
		if(data && allowed[socket.id] === data.token) {
			io.emit("buzz");
		}
	});
	socket.on("show", function(data) {
		if(data && allowed[socket.id] === data.token) {
			showing = data.page;
			io.emit("show", { "page": showing });
		}
	});
	socket.on("next", function(data) {
		if(data && allowed[socket.id] === data.token) {
			showing = data.page;
			io.emit("next", { "page": showing });
		}
	});
	socket.on("back", function(data) {
		if(data && allowed[socket.id] === data.token) {
			showing = data.page;
			io.emit("back", { "page": showing });
		}
	});
	socket.on("forward", function(data) {
		if(data && allowed[socket.id] === data.token) {
			showing = data.page;
			io.emit("forward", { "page": showing });
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
