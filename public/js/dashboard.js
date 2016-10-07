$(document).on('keypress', '.editable', function(e) {
	if (e.which == 13) {
		$(this).blur();
		console.log($(this).html());
		var data = {
			id: $(this).attr('data-id'),
			value: $(this).html(),
			type: $(this).attr('data-type'),
		}
		$.ajax({
			type: "POST",
			url: '/dashboard/template',
			data: data,
			success: function() {}
		});
	}
	return e.which != 13;
});

function getTimeRemaining(endtime) {
	var t = endtime - new Date().getTime();
	var seconds = Math.floor((t / 1000) % 60);
	var minutes = Math.floor((t / 1000 / 60) % 60);
	var total = minutes * 60 + seconds;
	if (seconds < 10) {
		seconds = "0" + seconds;
	}
	if (minutes < 10) {
		minutes = "0" + minutes;
	}
	return {
		'minutes': minutes,
		'seconds': seconds,
		'total': total,
	};
}

function initializeClock(id, countdown) {
	console.log(countdown);

	var endtime = new Date().getTime() + countdown;
	var clock = document.getElementById(id);

	console.log(clock);

	var timeinterval = setInterval(function() {
		var t = getTimeRemaining(endtime);
		clock.innerHTML = t.minutes + ':' + t.seconds;
		if (t.total <= 0) {
			clearInterval(timeinterval);
			clock.parentElement.remove();
		}
	}, 1000);
}

Element.prototype.remove = function() {
	this.parentElement.removeChild(this);
}
NodeList.prototype.remove = HTMLCollection.prototype.remove = function() {
	for (var i = this.length - 1; i >= 0; i--) {
		if (this[i] && this[i].parentElement) {
			this[i].parentElement.removeChild(this[i]);
		}
	}
}