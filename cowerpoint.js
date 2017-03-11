/* A very simple little script for transitioning between sides in html */
var Slides = function() {
	var index;

	this.slides		= document.querySelectorAll("#slides > div");
	this.showing	= NaN;
	this.stripcount	= 0;
	this.curslide	= null;


	window.addEventListener('hashchange', function(e) {
		var index = parseInt(window.location.hash.slice(1));

		if (!isNaN(index)) {
			this.show(index, true);
		}
	}.bind(this), false);

	window.addEventListener('keydown', function(e) {
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
				e.stopPropagation();
				e.preventDefault();
				return false;
		}
	});

	window.addEventListener('keyup', function(e) {
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
				this.buzz();
				break;
		}
	}.bind(this), false);

	window.addEventListener('click', function(e) {
		if (e && e.target && 'A' == e.target.nodeName) {
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

	index = parseInt(window.location.hash.slice(1));
	if (isNaN(index)) {
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
			this.next(data.page);
		}.bind(this));
		socket.on("back", function(data) {
			this.prev(data.page);
		}.bind(this));
		socket.on("forward", function(data) {
			this.next(data.page);
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
		});
	} catch(ignore) {
		console.log("Remote unavailable");
	}
};

Slides.prototype = {

selectSlide: function selectSlide(index, select)
{
	var count		= index;
	var slideidx	= 0;
	var slide;
	var striptease;

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

show: function show(index, instant, oldindex)
{
	var oldslide;
	var newslide;
	var striptease;

	if (isNaN(oldindex)) {
		oldindex = this.showing;
	}

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
	if (newslide !== oldslide) {
		console.log("Slide:", oldindex, index);

		newslide.classList.remove("slidein");
		if (oldindex < index) {
			newslide.style.left = '200%';
		} else {
			newslide.style.left = '-200%';
		}

		if ((newslide && newslide.classList.contains("instant")) ||
			(oldslide && oldslide.classList.contains("instant")) ||
			instant
		) {
			newslide.classList.remove("slidein");
			if (oldslide) oldslide.classList.remove("slidein");
		} else {
			newslide.classList.add("slidein");
			if (oldslide) oldslide.classList.add("slidein");
		}

		var seen = false;
		for (var i = 0, s; s = this.slides[i]; i++) {
			if (s === newslide) {
				newslide.style.left		= '0px';
				newslide.style.overflowY= 'auto';

				seen					= true;
			} else if (!seen) {
				s.style.left			= '-200%';
				s.style.overflowY		= 'hidden';
			} else {
				s.style.left			= '200%';
				s.style.overflowY		= 'hidden';
			}
		}

		if (newslide && oldslide) {
			newslide.scrollTop = oldslide.scrollTop;
		}
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
	if (!isNaN(page)) {
		this.show(page, false, page - 1);
	} else {
		this.show(this.showing + 1, false, this.showing);
	}
},

prev: function prev(page)
{
	if (!isNaN(page)) {
		this.show(page, false, page + 1);
	} else if (this.showing > 1) {
		this.show(this.showing - 1, false, this.showing);
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
}

};

window.addEventListener('load', function() {
	var slides	= new Slides();
}, false);
