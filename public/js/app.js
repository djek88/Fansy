angular
	.module('app', ['timer', 'ngAnimate'])
	.config(function($interpolateProvider) {
		$interpolateProvider.startSymbol('{$').endSymbol('$}');
	})
	.controller('AppController', function($scope, $timeout, $interval, socketIO) {
		var app = this;

		var socket = null;
		app.leaders = [];
		app.answers = [];
		app.timers = [];
		app.activePredictions = [];
		app.finishedPredictions = [];
		app.token = getCookie('fansy.token');

		if (!app.token) {
			mixpanel.track('onb-auth-showed', {distinct_id: 'anonymus'});
		}

		$timeout(function() {
			socket = socketIO.toStream(app.socketUrl);

			socket.onSuccessAuth = function() {
				if (app.token) {
					socket.emit("open", {token: app.token});
					socket.emit("first", {streamId: app.stream, token: app.token});

					Intercom('boot', {
						//app_id: 'e61khwbx', // for prod
						app_id: 'dk1peg8r', // for dev
						name: getCookie('fansy.username'),
						email: getCookie('fansy.username') + "@fansy.tv",
						created_at: Math.floor(new Date().getTime() / 1000)
					});
				}

				socket.on("leader", function(predictions) {
					console.log('ON LEADER');

					var usernames = predictions.map(function(e) {
						return e.user.username; }).getUnique();

					var users = usernames.map(function(name) {
						var user = {
							username: name,
							amount: 10000
						};

						predictions.forEach(function(e) {
							if (name !== e.user.username) return;

							if (e.status == 'false') {
								user.amount -= 2000;
							} else if (e.status == 'true') {
								user.amount += 2000;
							}
						});

						return user;
					});

					app.currentUser = getCookie('fansy.username');
					app.leaders = users.sort(function(a, b) {
						return a.amount - b.amount;
					}).reverse();

					var currentUserPosition = 0;
					app.leaders.forEach(function(e, i, a) {
						e.position = i;
						if (e.username == app.currentUser) {
							currentUserPosition = i;
						}
					});

					if (currentUserPosition > 9) {
						app.leaders[9] = app.leaders[currentUserPosition];
					}
				});

				socket.on("active_predictions", function(activePreds) {
					console.log('ON ACTIVE_PREDICTIONS', activePreds.length);
					app.activePredictions = activePreds;

					updateIntercom();
				});

				socket.on("finished_predictions", function(finishedPreds) {
					console.log('ON FINISHED_PREDICTIONS', finishedPreds.length);
					app.finishedPredictions = finishedPreds;

					updateIntercom();
				});

				socket.on("timer", function(data) {
					console.log('ON TIMER', data);

					app.timers = data.timers && data.timers.reverse();
					app.timers.forEach(function(e, i, a) {
						if (e.adminTimer) {
							e.countdown = Math.floor((e.adminTimer - data.time) / 1000);
							if (e.countdown < 0) {
								a.splice(i, 1);
							}
						}
					});

					$scope.$broadcast('timer-start');
				});

				socket.on("auth", function(data) {
					console.log('ON AUTH');

					if (data.error) {
						console.log('auth internal server error');
						//mixpanel.track('onb-auth-error', {distinct_id: data.username});
					} else {
						mixpanel.track('onb-auth-done', {distinct_id: data.username});

						setCookie('fansy.token', data.token);
						setCookie('fansy.username', data.username);

						$timeout(function(){
							location.href = '/';
						}, 2000);
					}
				});

				socket.on("question", function(data) {
					console.log("ON QUESTION", data);

					app.first = Math.floor(new Date().getTime() / 1000);
					app.question = data;

					runQuestionTimer(data);

					mixpanel.track('question-showed', {
						templateId: data.templateId,
						game: app.game,
						distinct_id: getCookie('fansy.username')
					});
				});

				socket.on("close_question", function(id) {
					console.log("ON LOSE_QUESTION", id);

					if (app.question.id == id) stopQuestionTimer();
				});

				socket.on("answer", function(answer) {
					console.log("ON ANSWER", answer);

					mixpanel.track('notification-showed', {distinct_id: getCookie('fansy.username')});

					app.answers.unshift(answer);

					$timeout(function() {
						app.answers = app.answers.filter(function(e) {
							return e.id != answer.id;
						});
					}, 6000);
				});
			};

			socket.onFailAuth = function() {
				console.log('fail auth');
			};
		}, 0);

		app.auth = function(username) {
			$('.form-success').hide();
			$('.form-error').hide();

			console.log('EMIT AUTH');
			socket.emit("auth");
		};

		app.answer = function(answer, answerText) {
			stopQuestionTimer();

			if (!answer) return;

			twttr.conversion.trackPid('nvizu', {tw_sale_amount: 0, tw_order_quantity: 0});
			mixpanel.track('prediction-done', {
				distinct_id: getCookie('fansy.username'),
				templateId: app.question.templateId,
				game: app.game,
				timer: app.question.timer - (Math.floor(new Date().getTime() / 1000) - app.first),
				answer: answer
			});

			console.log('EMIT ANSWERTOQUESTION');
			socket.emit('answerToQuestion', {
				answer: answer,
				token: getCookie('fansy.token'),
				questionId: app.question.id,
				answerText: answerText,
				templateId: app.question.templateId,
				gameId: app.question.gameId,
				streamId: app.stream
			});
		};

		app.logout = function(){
			deleteCookie('fansy.token');
			deleteCookie('fansy.username');
			location.href = '/';
		};

		function runQuestionTimer(data) {
			app.questionPoputTimer = data.timer - 1;

			stopQuestionTimer();
			app.questionPopupInterval = $interval(function() {
				if (app.questionPoputTimer <= 1) {
					mixpanel.track('question-expire', {
						templateId: data.templateId,
						game: app.game,
						distinct_id: getCookie('fansy.username')
					});

					return stopQuestionTimer();
				} 

				app.questionPoputTimer--;
			}, 1000);

			app.showQuestion = true;
		}

		function stopQuestionTimer() {
			$interval.cancel(app.questionPopupInterval);
			app.showQuestion = false;
		}

		function updateIntercom() {
			var intercomData = {};
			intercomData[app.game] = app.activePredictions.length + app.finishedPredictions.length;
			console.log('UPDATE INTERCOM: ', intercomData);
			Intercom('update', intercomData);
		}

		app.userSidebarExpand = function() {
			mixpanel.track('ux-sidebar-expand', {
				distinct_id: getCookie('fansy.username')
			});
		}

		app.userSidebarCollapse = function() {
			mixpanel.track('ux-sidebar-collapse', {
				distinct_id: getCookie('fansy.username')
			});
		}

		app.fullscreenExpand = function() {
			mixpanel.track('ux-full-expand', {
				distinct_id: getCookie('fansy.username')
			});
		}

		app.fullscreenCollapse = function() {
			mixpanel.track('ux-full-collapse', {
				distinct_id: getCookie('fansy.username')
			});
		}
	});