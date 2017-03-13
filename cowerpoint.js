/* A very simple little script for transitioning between sides in html */
var Slides = function() {
	var index;

	this.container	= document.querySelector("#slides");
	this.slides		= document.querySelectorAll("#slides > div");
	this.showing	= NaN;
	this.stripcount	= 0;
	this.curslide	= null;
	this.socket		= null;
	this.setupdiv	= null;
	this.setuppass	= null;

	window.addEventListener('hashchange', function(e) {
		var index = parseInt(window.location.hash.slice(1));

		if (!isNaN(index) && index != this.showing) {
			this.show(index, true);
		}
	}.bind(this), false);

	function checkTarget(e)
	{
		if (e && e.target) {
			if(e.target.className === "click_handle") return false;
			switch (e.target.nodeName) {
				case 'A':
				case 'INPUT':
				case 'PRE':
					return(false);

				default:
					return(true);
			}
		}
	}

	window.addEventListener('keydown', function(e) {
		if (!checkTarget(e)) {
			return;
		}

		switch (e.which) {
			case 32: /* space */
				e.stopPropagation();
				e.preventDefault();
				return false;
		}

		switch (e.keyCode) {
			case 37: /* left	*/
			case 38: /* up		*/
			case 39: /* right	*/
			case 40: /* down	*/
			case 32: /* space	*/
			case 83: /* s       */
			case 78: /* n		*/
				e.stopPropagation();
				e.preventDefault();
				return false;
		}
	});

	window.addEventListener('keyup', function(e) {
		if (!checkTarget(e)) {
			return;
		}

		e.preventDefault();

		switch (e.which) {
			case 32: /* space */
				this.next();
				break;
		}

		switch (e.keyCode) {
			case 37: /* left	*/
			case 38: /* up		*/
				this.prev();
				break;

			case 39: /* right	*/
			case 40: /* down	*/
				this.next();
				break;
			case 83: /* s       */
				if (this.token) {
					socket.emit("buzz", { "token": this.token });
				} else {
					this.buzz();
				}
				break;

			case 78: /* n		*/
				this.container.classList.toggle("presenter");
				break;

		}
	}.bind(this), false);

	window.addEventListener('click', function(e) {
		if (!checkTarget(e)) {
			return;
		}

		e.preventDefault();

		if (e.button === 0) {
			this.next();
		}
	}.bind(this), false);

	window.addEventListener('contextmenu', function(e) {
		e.preventDefault();

		this.prev();
	}.bind(this), false);

	window.addEventListener('scroll', function(e) {
		e.preventDefault();

		window.scrollTo(0, 0);
	});

	var touchStartX = NaN;
	var touchEndX	= NaN;
	document.addEventListener('touchstart', function(e) {
		touchStartX = e.touches[0].clientX;
	});
	document.addEventListener('touchmove', function(e) {
		touchEndX = e.touches[0].clientX;
	});
	document.addEventListener('touchend', function(e) {
		if (Math.abs(touchStartX - touchEndX) < 50) {
			/* Not a significant enough slide */
			return;
		}

		if (touchEndX < touchStartX) {
			this.next();
		} else {
			this.prev();
		}
	}.bind(this));

	index = parseInt(window.location.hash.slice(1));
	if (isNaN(index) || index < 1) {
		index = 1;
	}

	/*
		Slide in up to the active id to position all of the slides on the
		correct side of the visible slide.

		They are set to render instant, so this will not be visible to the user.
	*/
	for (var i = 0; i <= index; i++) {
		this.show(i, true);
	}

	try {
		socket = io();
		socket.on("remotein", function(data) {
			console.log("Remote connected");
		}.bind(this));
		socket.on("remoteout", function(data) {
			console.log("Remote disconnected");
		}.bind(this));
		socket.on("buzz", function(data) {
			this.buzz();
		}.bind(this));
		socket.on("next", function(data) {
			this.show(data.page);
		}.bind(this));
		socket.on("back", function(data) {
			this.show(data.page);
		}.bind(this));
		socket.on("forward", function(data) {
			this.show(data.page);
		}.bind(this));
		socket.on("show", function(data) {
			this.show(data.page, true);
		}.bind(this));

		var reconnectTimer = null;
		socket.on("disconnect", function() {
			if (reconnectTimer) {
				clearTimeout(reconnectTimer);
				reconnectTimer = null;
			}
			reconnectTimer = setInterval(function() {
				console.log('Trying to connect');
				socket.connect();
			}, 333);
		});

		socket.on("connect", function() {
			if (reconnectTimer) {
				clearTimeout(reconnectTimer);
				reconnectTimer = null;
			}

			if (this.setuppass && this.setuppass.value.length > 0) {
				this.auth(this.setuppass.value);
			}
		}.bind(this));

		this.socket = socket;
	} catch(ignore) {
		console.log("Remote unavailable");

		this.socket = null;
	}

	/*
		Insert an extra slide before the real presentation to allow entering
		a password to act as a presenter.

		This slide only gets inserted if we have a socket.
	*/
	if (this.socket) {
		this.setupdiv = document.createElement('div');

		this.setupdiv.appendChild(document.createTextNode("Presenter password:"));
		this.setupdiv.appendChild(document.createElement('br'));

		this.setuppass = document.createElement('input');
		this.setuppass.type = 'password';
		this.setupdiv.appendChild(this.setuppass);


		this.setuppass.addEventListener("change", function() {
			this.auth(this.setuppass.value);
			this.setuppass.blur();
		}.bind(this));

		document.querySelector("#slides").insertBefore(this.setupdiv, this.slides[0]);
		this.slides = document.querySelectorAll("#slides > div");

		this.show(this.showing);
	}
};

Slides.prototype = {

selectSlide: function selectSlide(index, select)
{
	var count		= index;
	var slideidx	= 0;
	var slide;
	var striptease;

	if (0 > index) {
		return(null);
	} else if (0 === index) {
		if (this.setuppass) {
			this.setuppass.focus();
		}

		return(this.setupdiv);
	} else if (this.setupdiv) {
		/*
			Change the offset by one so that adding the setup div won't change
			the offsets.
		*/
		count++;
	}

	/*
		A slide may have multiple frames. Take that into account while finding
		the appropriate slide based on the specified index.
	*/
	for (;;) {
		slide = this.slides[slideidx++];

		if (!slide) {
			if (select) {
				this.striptease = [];
				this.stripcount = 0;
			}
			return(null);
		}

		/* Count the slide itself */
		count -= 1;

		var items = [];

		striptease = slide.querySelectorAll('.skin');
		if ((!striptease || !striptease.length) &&
			(striptease = slide.querySelector('.striptease'))
		) {
			striptease = striptease.childNodes;
		}

		if (striptease) {
			for (var i = 0, s; s = striptease[i]; i++) {
				if (s && s.nodeName && "#text" !== s.nodeName) {
					items.push(s);
				}
			}
		}

		count -= items.length;
		if (count <= 0) {
			if (select) {
				this.stripcount = items.length + count;
				this.striptease = items;
			}

			return(slide);
		}
	}
},

show: function show(index, instant)
{
	var oldslide;
	var newslide;
	var striptease;
	var oldindex = this.showing;

	oldslide = this.selectSlide(oldindex, false);

	index = parseInt(index);
	if (isNaN(index)) {
		index = 1;
	}

	if (!(newslide = this.selectSlide(index, true))) {
		return;
	}

	/*
		Determine if this slide should be animated or instant. If either the new
		or old slide is marked as "instant" then disable the animation.
	*/
	var seen = false;

	this.container.classList.remove("slidein");
	for (var i = 0, s; s = this.slides[i]; i++) {
		if (s === oldslide) {
			s.classList.remove("left");
			s.classList.remove("right");

			seen = true;
		} else if (!seen) {
			s.classList.add("left");
			s.classList.remove("right");
		} else {
			s.classList.remove("left");
			s.classList.add("right");
		}
	}

	if ((newslide && newslide.classList.contains("instant")) ||
		(oldslide && oldslide.classList.contains("instant"))
	) {
		instant = true;
	}

	if (!instant) {
		this.container.classList.add("slidein");
	}
	this.container.classList.add("ready");

	seen = false;
	for (var i = 0, s; s = this.slides[i]; i++) {
		if (s === newslide) {
			s.classList.remove("left");
			s.classList.remove("right");

			seen = true;
		} else if (!seen) {
			s.classList.add("left");
			s.classList.remove("right");
		} else {
			s.classList.remove("left");
			s.classList.add("right");
		}
	}

	if (newslide && oldslide) {
		newslide.scrollTop = oldslide.scrollTop;
	}

	if (this.striptease && this.striptease.length) {
		for (var i = 0, c; c = this.striptease[i]; i++) {
			if (!c.classList) {
				continue;
			}

			if (i < this.stripcount) {
				c.classList.remove('hidden');
			} else {
				c.classList.add('hidden');
			}
		}
	}

	this.curslide			= newslide;
	this.showing			= index;

	window.location.hash	= '#' + index;
},

next: function next(page)
{
	if (isNaN(page)) {
		page = this.showing + 1;
	}

	if (this.token) {
		socket.emit("forward", { "token": this.token, "page": page });
	} else {
		this.show(page, false);
	}
},

prev: function prev(page)
{
	if (isNaN(page)) {
		page = this.showing - 1;
	}

	if (this.token) {
		socket.emit("forward", { "token": this.token, "page": page });
	} else {
		this.show(page, false);
	}
},

buzz: function buzz()
{
	var popup = document.querySelector("#buzzer");
	var audio = document.querySelector("#buzzer audio");
	if(popup) {
		if(audio) {
			audio.play();
		}
	}
	popup.className = "visible";
	window.setTimeout(function() {
		popup.className = "";
	}, 2000);
},

auth: function auth(password)
{
	var r = new XMLHttpRequest();

	r.open("POST", "/remote/connect", true);
	r.onreadystatechange = function() {
		if(r.readyState != 4 || r.status != 200) return;
		var res = JSON.parse(r.responseText);
		console.log(res);
		if(res.token) {
			this.token = res.token;
			socket.emit("auth", { "token": this.token });

			this.next();
		} else {
			this.token = null;
			alert("Nope.");
		}
	}.bind(this);

	r.send(JSON.stringify({
		"password": password
	}));
}

};

window.addEventListener('load', function() {
	var slides	= new Slides();
}, false);
