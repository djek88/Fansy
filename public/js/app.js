angular.module('app', ['timer', 'ngAnimate'])
	.config(function($interpolateProvider){
    	$interpolateProvider.startSymbol('{$').endSymbol('$}');
	})
	.controller('AppController', function($scope) {
    var app = this;
	app.showQuestion = false;
	app.answers = [];
	app.timers = [];
	app.activePredictions = [];
	app.finishedPredictions = [];
	app.token = getCookie('fansy.token');

    socket = io.connect(app.url);

    
    socket.on('connect', function () {
    
		
		if(app.token){
			socket.emit("open", {token: app.token});
			socket.emit("first",{stream:app.stream, token: app.token});
			
			window.Intercom('boot', {  
			    app_id: 'e61khwbx',  
			    name: getCookie('fansy.username'),
			    email: getCookie('fansy.username') + "@fansy.tv",
			    created_at: Math.floor(new Date().getTime()/1000)
			});
		}
		else{
			mixpanel.track('onb-auth-showed', {
			    distinct_id: 'anonymus'
			});
		}
	
	    
		
		
		socket.on("auth", function(data) {
			
			if(data.type === 'error'){
				mixpanel.track('onb-auth-error', {
					distinct_id: data.username
                });
				$('.form-error').show();
			}
			
			if(data.type === 'success'){
				mixpanel.track('onb-auth-done', {
					distinct_id: data.username
                });
				$('.form-success').show();
				setCookie('fansy.token', data.token);
				setCookie('fansy.username', data.username);
				setTimeout(function(){
					location.href = '/';
				}, 2000);
			}
		});
		
		socket.on("leader", function(data) {
			console.log("leader");
			var usernames = data.map(function(e) {
				var delta = 0;
				var username = e.user.username;
				if(e.status == 'false'){
					delta = -2000;
				}
				if(e.status == 'true'){
					delta = 2000;
				}
				return username;
			}).getUnique();
			
			var leaders = usernames.map(function(username) {
				var user = {
					username: username,
					amount: 10000
				}
				data.forEach(function(e) {
					if(username === e.user.username){
						if(e.status == 'false'){
							user.amount = user.amount - 2000;
						}
						if(e.status == 'true'){
							user.amount = user.amount + 2000;
						}
					}
				})
				return user;
			})
			
			app.leaders = leaders.sort(function(a,b) {
				return a.amount - b.amount;
			}).reverse();
			app.currentUser = getCookie('fansy.username');
			var currentUserPosition = 0;
			app.leaders.forEach(function(e, i, a) {
				e.position = i;
				if(e.username == app.currentUser){
					currentUserPosition = i;
				}
			})
			
			if(currentUserPosition > 9){
				app.leaders[9] = app.leaders[currentUserPosition];
			}
			$scope.$apply();
		});
		
		
		socket.on("question", function(data) {
			console.log("question");
			app.first = Math.floor(new Date().getTime()/1000);
			mixpanel.track('question-showed', {
			    templateId: data.template,
			    game: data.game,
			    distinct_id: getCookie('fansy.username')
			});
			app.question = data;
			app.showQuestion = true;
			$scope.$broadcast('timer-reset');
			$scope.$broadcast('timer-add-cd-seconds', app.question.timer);
			$scope.$apply();
			
			clearTimeout(app.timeoutID);
			
			app.timeoutID = setTimeout(function(){
				app.showQuestion = false;
				$scope.$apply();
			}, (app.question.timer - 1) * 1000)
		});
		
		
		socket.on("active_predictions", function(data) {
			console.log("active_predictions");
			console.log(data);
			app.activePredictions = [];
			$scope.$apply();
			app.activePredictions = data;
			$scope.$apply();
		});
		
		socket.on("finished_predictions", function(data) {
			console.log("finished_predictions");
			console.log(data);
			app.finishedPredictions = [];
			$scope.$apply();
			app.finishedPredictions = data;
			$scope.$apply();
		});
		
		
		       
	    socket.on("answer", function(data) {
			console.log("answer");
			mixpanel.track('notification-showed', {
				distinct_id: getCookie('fansy.username')
			});
			console.log(data);
			app.answers.unshift(data);
			$scope.$apply();
			setTimeout(function(id){
				return function(){
					app.answers.forEach(function(e, i, a){
						if(id == e.id){
							app.answers.splice(i,1);
							$scope.$apply();
						}
					})
				}
			}(data.id),6000);
	    });
	    
	    socket.on("timer", function(data) {
			console.log("timer");
	    	if(data.timers){	
		    	app.timers = [];
		    	$scope.$apply();
		    	app.timers = data.timers.reverse();
		    	app.timers.forEach(function(e, i, a){
		    		
	    			if(e.adminTimer){
						e.countdown = Math.floor((e.adminTimer - data.time)/1000);
						if(e.countdown < 0){
							a.splice(i, 1);
						}
					}
				})
				$scope.$broadcast('timer-start');
		    	$scope.$apply();
	    	}
	    });	
	});
   
	app.auth = function(username){
		$('.form-success').hide();
		$('.form-error').hide();
		socket.emit("auth",{username: $('.textfield-nickname').val() });
	}
	
	
	app.logout = function(){
		deleteCookie('fansy.token');
		deleteCookie('fansy.username');
		location.href = '/';
	}


    
 
    app.answer = function(answer, answerText, countdown) {
		clearTimeout(app.timeoutID)
		app.showQuestion = false;
		var data = {};
		data[app.game] = app.activePredictions.length + app.finishedPredictions.length;
    	if(answer != 0){
			twttr.conversion.trackPid('nvizu', { tw_sale_amount: 0, tw_order_quantity: 0 });
			console.log(data);
			console.log(window.Intercom('update', data))
			window.Intercom('update', data);
			mixpanel.track('prediction-done', {
			    distinct_id: getCookie('fansy.username'),
			    templateId: app.question.templateId,
			    game: app.question.gameId,
			    timer: app.question.timer - (Math.floor(new Date().getTime()/1000) - app.first),
			    answer: answer
			});
		   	socket.emit("question", {
		   		answer: answer, 
		   		token: getCookie('fansy.token'), 
		   		question: app.question.id, 
		   		answerText:answerText,
		   		templateId: app.question.templateId, 
		   		gameId: app.question.gameId, 
		   		stream:app.stream
		   	});
    	}
    };
    
    app.fullexpand = function() {
    	mixpanel.track('ux-full-expand', {
			distinct_id: getCookie('fansy.username')
		});
    }
    
    app.fullcollapse = function() {
    	mixpanel.track('ux-full-collapse', {
			distinct_id: getCookie('fansy.username')
		});
    }
    
    app.sidebarexpand = function() {
    	mixpanel.track('ux-sidebar-expand', {
			distinct_id: getCookie('fansy.username')
		});
    }
    
    app.sidebarcollapse = function() {
    	mixpanel.track('ux-sidebar-collapse', {
			distinct_id: getCookie('fansy.username')
		});
    }
    
  });