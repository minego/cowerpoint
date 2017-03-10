window.addEventListener("load", function() {
	var socket = null;
	var token = "";
	var password = document.querySelector("#password");
	var connect = document.querySelector("#connect");
	var buzz = document.querySelector("#buzz");
	var next = document.querySelector("#next");
	var back = document.querySelector("#back");
	var forward = document.querySelector("#forward");

	password.focus();

	try {
		socket = io();
		document.querySelector("#offline").classList.toggle("hidden", true);
		document.querySelector("#auth").classList.toggle("hidden", false);
	} catch(ignore) {
		console.log("offline only");
	}

	connect.addEventListener("click", function() {
		var r = new XMLHttpRequest();
		r.open("POST", "/remote/connect", true);
		r.onreadystatechange = function() {
			if(r.readyState != 4 || r.status != 200) return;
			var res = JSON.parse(r.responseText);
			console.log(res);
			if(res.token) {
				token = res.token;
				socket.emit("auth", token);
				document.querySelector("#auth").classList.toggle("hidden", true);
				document.querySelector("#control").classList.toggle("hidden", false);
			} else {
				alert("Nope.");
			}
		};
		r.send(JSON.stringify({
			password: password.value
		}));
	});

	buzz.addEventListener("click", function() {
		socket.emit("buzz", token);
	});
	next.addEventListener("click", function() {
		socket.emit("next", token);
	});
	back.addEventListener("click", function() {
		socket.emit("back", token);
	});
	forward.addEventListener("click", function() {
		socket.emit("forward", token);
	});
});
