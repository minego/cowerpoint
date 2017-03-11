/* A very simple little script for transitioning between sides in html */
var Slides = function() {
	var index;

	this.slides		= document.querySelectorAll("#slides > div");
	this.showing	= NaN;


	window.addEventListener('hashchange', function(e) {
		var index = parseInt(window.location.hash.slice(1));

		if (!isNaN(index)) {
			this.show(index);
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
				this.next(true);
				break;
			case 83: /* s       */
				this.buzz();
				break;
		}
	}.bind(this), false);

	window.addEventListener('click', function(e) {
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
		index = 0;
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
			this.next(false, data.page);
		}.bind(this));
		socket.on("back", function(data) {
			this.prev(data.page);
		}.bind(this));
		socket.on("forward", function(data) {
			this.next(true, data.page);
		}.bind(this));
		socket.on("show", function(data) {
			this.show(data.page, true);
		}.bind(this));
	} catch(ignore) {
		console.log("Remote unavailable");
	}
};

Slides.prototype = {

show: function show(index, instant, backwards)
{
	var oldslide	= null;
	var newslide;
	var striptease;

	if (isNaN(index)) {
		index = 0;
	}

	if (index == this.showing || !(newslide = this.slides[index])) {
		return;
	}

	this.striptease = [];

	if (!isNaN(this.showing)) {
		oldslide = this.slides[this.showing];
	}

	/*
		Determine if this slide should be animated or instant. If either the new
		or old slide is marked as "instant" then disable the animation.
	*/
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

	if (oldslide) {
		if (this.showing < index) {
			oldslide.style.left		= '-200%';
		} else {
			oldslide.style.left		= '200%';
		}
		oldslide.style.overflowY	= 'hidden';
	}

	newslide.style.left			= '0px';
	newslide.style.overflowY	= 'auto';

	if (newslide && oldslide) {
		newslide.scrollTop = oldslide.scrollTop;
	}

	striptease = newslide.querySelectorAll('.skin');
	if ((!striptease || !striptease.length) &&
		(striptease = newslide.querySelector('.striptease'))
	) {
		striptease = striptease.childNodes;
	}

	if (striptease && striptease.length) {
		for (var i = 0, c; c = striptease[i]; i++) {
			if (!c.classList) {
				continue;
			}

			if (!backwards) {
				c.classList.add('hidden');
				this.striptease.push(c);
			} else {
				c.classList.remove('hidden');
			}
		}
	}

	this.showing = index;
	window.location.hash = '#' + this.showing;
},

next: function next(instant, page)
{
	var		child;

	if (this.striptease && (child = this.striptease.shift())) {
		child.classList.remove('hidden');

		if (instant) {
			/* Show all */
			while ((child = this.striptease.shift())) {
				child.classList.remove('hidden');
			}
		}
	} else {
		if (!isNaN(page)) {
			this.show(page);
		} else {
			this.show(this.showing + 1);
		}
	}
},

prev: function prev(page)
{
	if (!isNaN(page)) {
		this.show(page, undefined, true);
	} else if (this.showing > 0) {
		this.show(this.showing - 1, undefined, true);
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
