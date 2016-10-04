
var socket = io.connect(process.env.URL);


window.Intercom("boot", {
	app_id: "e61khwbx"
});


	$( window ).resize(function() {
		$('#twitch').width($(window).width());
		$('#twitch').height($(window).height());
	});

	$('#question').hide();
	$('#answer').hide();
	
	$('#twitch').width($(window).width());
	$('#twitch').height($(window).height());
	
	var question = '',
		uid = '{{ uid }}'
		
	document.cookie = " uid=" + uid;	
	
	
	var timeoutID;
	var gData;

	socket.on("question", function(data) {
		gData = data;
		clearTimeout(timeoutID);
		$('#question .modal-question-text').html(data.message);
		$('#question').fadeIn(500);
		var timerCount = data.timer * 1000;
		
		
		$('.timerFind').clone().appendTo('.modal-window').addClass('timer' + data.id).removeClass('timerFind');
		
		$('.timer' + data.id).html(data.timer);
				
		function timer(){
	 		var count = $('.timer' + data.id).html();
	 		count--;
	 		$('.timer' + data.id).html(count);
	 		if(count>0){
	 			setTimeout(timer,1000);
	 		}
	 		else{
	 			mixpanel.track('question-expire', {
					templateId: gData.templateId,
					game: gData.gameId,
					distinct_id: getCookie('fansy.username')
				});
	 		}
		}
	
		setTimeout(timer, 1000);
		
		timeoutID = setTimeout(function(){
			$('#question').fadeOut(500);
		}, timerCount)
		question = data.id;
	});
	       
    socket.on("answer", function(data) {
       	var target = uid;
		var item = $.grep(data.data, function(e){ return e.uid == uid; });
		console.log(item[0]);
		mixpanel.track('notification-showed', {
			distinct_id: getCookie('fansy.username')
		});
       	if(item[0].status == 'cancelled'){
       		var string = '<p class="text-notification-cancel text-notification-title">Question cancelled</p>' + data.text;
       	}
        
        if(item[0].status == 'true'){
        	var string = '<p class="text-notification-won text-notification-title">You earn 2000 points</p>“' 
        	+ data.text +'” as “' + item[0].answerText + '”';
        }
        
        if(item[0].status == 'false'){
        	var string = '<p class="text-notification-lose text-notification-title">You lost 2000 points</p>“' 
        	+ data.text +'” as “' + item[0].answerText + '”';
        }
        
       	var id = 'answer' + $('.answer').size();; 

       	$('#answer .modal-notification-text').html(string);
       	$('#answer').clone().attr('id', id).appendTo('.answers');
		$('#' + id).fadeIn(500);
		
		setTimeout(function(){
			$('#' + id).fadeOut(500);
		}, 6000)
    });
       
       
    function getCookie(name) {
		var matches = document.cookie.match(new RegExp(
 			"(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
		));
		return matches ? decodeURIComponent(matches[1]) : undefined;
	}

