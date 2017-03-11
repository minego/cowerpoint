window.addEventListener("load", function() {
	var socket = null;
	var token = "";
	var password = document.querySelector("#password");
	var connect = document.querySelector("#connect");
	var page = document.querySelector("#page");
	var buzz = document.querySelector("#buzz");
	var show = document.querySelector("#show");
	var next = document.querySelector("#next");
	var back = document.querySelector("#back");
	var forward = document.querySelector("#forward");
	var reconnectTimer = null;

	password.focus();

	try {
		socket = io();
		document.querySelector("#offline").classList.toggle("hidden", true);
		document.querySelector("#auth").classList.toggle("hidden", false);
	} catch(ignore) {
		console.log("offline only");
	}

	var sendAuth = function sendAuth(interactive) {
		if (reconnectTimer) {
			clearTimeout(reconnectTimer);
			reconnectTimer = null;
		}

		var r = new XMLHttpRequest();
		r.open("POST", "/remote/connect", true);
		r.onreadystatechange = function() {
			if(r.readyState != 4 || r.status != 200) return;
			var res = JSON.parse(r.responseText);
			console.log(res);
			if(res.token) {
				token = res.token;
				socket.emit("auth", { "token": token });
				document.querySelector("#auth").classList.toggle("hidden", true);
				document.querySelector("#control").classList.toggle("hidden", false);
			} else if (interactive) {
				alert("Nope.");
			}
		};
		r.send(JSON.stringify({
			password: password.value
		}));
	};

	var reconnect = function reconnect() {
		if (reconnectTimer) {
			clearTimeout(reconnectTimer);
			reconnectTimer = null;
		}

		reconnectTimer = setInterval(function() {
			console.log('Trying to connect');
			socket.connect();
		}, 333);
	};

	connect.addEventListener("click", function() {
		sendAuth(true);
	});

	buzz.addEventListener("click", function() {
		socket.emit("buzz", { "token": token });
	});
	show.addEventListener("click", function() {
		socket.emit("show", { "token": token, "page": page.value });
	});
	next.addEventListener("click", function() {
		page.value++;
		socket.emit("next", { "token": token, "page": page.value });
	});
	back.addEventListener("click", function() {
		if (page.value > 0) {
			page.value--;
		}
		socket.emit("back", { "token": token, "page": page.value });
	});
	forward.addEventListener("click", function() {
		page.value++;
		socket.emit("forward", { "token": token, "page": page.value });
	});

	var pagechange = function pagechange(data) {
		if (data && !isNaN(data.page)) {
			page.value = data.page;
		}
	};

	socket.on("show", pagechange);
	socket.on("next", pagechange);
	socket.on("back", pagechange);
	socket.on("forward", pagechange);

	socket.on("disconnect", reconnect);
	socket.on("connect", function() {
		sendAuth(false);
	});
});

