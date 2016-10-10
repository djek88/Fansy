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
			mixpanel.track('onb-auth-showed', {
				distinct_id: 'anonymus'
			});
		}

		$timeout(function() {
			socket = socketIO.toStream(app.socketUrl);

			socket.onSuccessAuth = function() {
				if (app.token) {
					socket.emit("open", {token: app.token});
					socket.emit("first", {streamId: app.stream, token: app.token});

					window.Intercom('boot', {
						app_id: 'e61khwbx',
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
					app.activePredictions = activePreds;
				});

				socket.on("finished_predictions", function(finishedPreds) {
					app.finishedPredictions = finishedPreds;
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
					if (data.type === 'error') {
						mixpanel.track('onb-auth-error', {distinct_id: data.username});

						$('.form-error').show();
					}

					if (data.type === 'success') {
						mixpanel.track('onb-auth-done', {distinct_id: data.username});

						$('.form-success').show();

						setCookie('fansy.token', data.token);
						setCookie('fansy.username', data.username);

						$timeout(function(){
							location.href = '/';
						}, 2000);
					}
				});

				socket.on("question", function(data) {
					console.log("QUESTION", data);

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
					console.log("CLOSE_QUESTION", id);

					if (app.question.id == id) stopQuestionTimer();
				});

				socket.on("answer", function(answer) {
					console.log("ANSWER", answer);

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

			socket.emit("auth", {username: $('.textfield-nickname').val()});
		};

		app.answer = function(answer, answerText) {
			stopQuestionTimer();

			if (!answer) return;

			twttr.conversion.trackPid('nvizu', {tw_sale_amount: 0, tw_order_quantity: 0});
			var intercomData = {};
			intercomData[app.game] = app.activePredictions.length + app.finishedPredictions.length;
			window.Intercom('update', intercomData);
			mixpanel.track('prediction-done', {
				distinct_id: getCookie('fansy.username'),
				templateId: app.question.templateId,
				game: app.game,
				timer: app.question.timer - (Math.floor(new Date().getTime() / 1000) - app.first),
				answer: answer
			});

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

		app.fullscreen = false;
		app.toggleFullScreen = function() {
			mixpanel.track(
				(app.fullscreen ? 'ux-full-collapse' : 'ux-full-expand'),
				{distinct_id: getCookie('fansy.username')}
			);

			app.fullscreen = !app.fullscreen;
			recalculateStreamWidth();
		}

		app.isLeaderBoard = true;
		app.toggleLeaderBoard = function() {
			mixpanel.track(
				(app.isLeaderBoard ? 'ux-sidebar-collapse' : 'ux-sidebar-expand'),
				{distinct_id: getCookie('fansy.username')}
			);

			app.isLeaderBoard = !app.isLeaderBoard;
			recalculateStreamWidth();
		};

		function recalculateStreamWidth() {
			var streamSection = document.getElementsByClassName('stream-section')[0];

			if (app.fullscreen) {
				streamSection.style.width = app.isLeaderBoard ? '70%' : '100%';
			} else {
				streamSection.style.width = app.isLeaderBoard ? '60%' : '100%';
			}
		}

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
	});