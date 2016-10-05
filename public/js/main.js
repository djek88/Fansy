$( window ).resize(function() {
	$('#twitch').height($(window).height());
});

$('#twitch').width('100%');
$('#twitch').height($(window).height());

$('#fullscreen-expand').click(function() {
	toggleFullScreen();
});

$('#fullscreen-collapse').click(function() {
	// Whack fullscreen
	function exitFullscreen() {
		if (document.exitFullscreen) {
			document.exitFullscreen();
		} else if (document.mozCancelFullScreen) {
			document.mozCancelFullScreen();
		} else if (document.webkitExitFullscreen) {
			document.webkitExitFullscreen();
		}
	}
	// Cancel fullscreen for browsers that support it!
	exitFullscreen();
});

var videoElement = document.getElementById("core");

function toggleFullScreen() {
	if (!document.mozFullScreen && !document.webkitFullScreen) {
		if (videoElement.mozRequestFullScreen) {
			videoElement.mozRequestFullScreen();
		} else {
			videoElement.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
		}
	} else {
		if (document.mozCancelFullScreen) {
			document.mozCancelFullScreen();
		} else {
			document.webkitCancelFullScreen();
		}
	}
}

document.addEventListener("keydown", function(e) {
	if (e.keyCode == 13) {
		toggleFullScreen();
	}
}, false);