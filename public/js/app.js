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
			mixpanel.track('onb-auth-showed');
		}

		$timeout(function() {
			socket = socketIO.toStream(app.socketUrl);

			socket.onSuccessAuth = function() {
				if (app.token) {
					socket.emit("open", {token: app.token});
					socket.emit("first", {streamId: app.stream, token: app.token});

					Intercom('boot', {
						app_id: app.intercom,
						name: getCookie('fansy.username'),
						email: getCookie('fansy.username') + "@fansy.tv",
						created_at: Math.floor(new Date().getTime() / 1000)
					});

					mixpanel.identify(app.token);
					mixpanel.people.set('name', getCookie('fansy.username'));
				}

				socket.on('leader', function(predictions) {
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

				socket.on('cur_stream_user_predictions', function(predictions) {
					console.log('CUR_STREAM_USER_PREDICTIONS', predictions);

					app.activePredictions = predictions.filter(function(pred) {
						return pred.status === 'active';
					});

					app.finishedPredictions = predictions.filter(function(pred) {
						return pred.status !== 'active' && pred.status !== 'cancelled';
					});
				});

				socket.on('user_statistic', function(data) {
					console.log('USER_STATISTIC', data);

					mixpanel.people.set(data);
					Intercom('update', data);
				});

				socket.on('timer', function(data) {
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

				socket.on('auth', function(data) {
					console.log('ON AUTH');

					if (data.error) {
						console.log('auth internal server error');
					} else {
						mixpanel.alias(data.token);
						mixpanel.track('onb-auth-done');

						setCookie('fansy.token', data.token);
						setCookie('fansy.username', data.username);

						$timeout(function(){
							location.href = '/';
						}, 2000);
					}
				});

				socket.on('question', function(data) {
					console.log("ON QUESTION", data);

					new Audio('/audio/question.mp3').play();

					app.first = Math.floor(new Date().getTime() / 1000);
					app.question = data;

					runQuestionTimer(data);

					var data = {
						templateId: data.templateId,
						game: app.game
					};
					mixpanel.track('question-showed', data);
					Intercom('trackEvent', 'question-showed', data);
				});

				socket.on('close_question', function(id) {
					console.log("ON LOSE_QUESTION", id);

					if (app.question && app.question.id == id) stopQuestionTimer();
				});

				socket.on('refresh_page', function() {
					console.log("ON REFRESH_PAGE");

					location.reload(true);
				});

				socket.on('answer', function(answer) {
					console.log("ON ANSWER", answer);

					mixpanel.track('notification-showed');
					Intercom('trackEvent', 'notification-showed');

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

			var data = {
				templateId: app.question.templateId,
				game: app.game,
				timer: app.question.timer - (Math.floor(new Date().getTime() / 1000) - app.first),
				answer: answer
			};
			mixpanel.track('prediction-done', data);
			Intercom('trackEvent', 'prediction-done', data);
			twttr.conversion.trackPid('nvizu', {tw_sale_amount: 0, tw_order_quantity: 0});

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
					var dataForAnalytics = {
						templateId: data.templateId,
						game: app.game
					};
					/*mixpanel.track('question-expire', dataForAnalytics);
					Intercom('trackEvent', 'question-expire', dataForAnalytics);*/

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

		app.userSidebarExpand = function() {
			mixpanel.track('ux-sidebar-expand');
			Intercom('trackEvent', 'ux-sidebar-expand');
		}

		app.userSidebarCollapse = function() {
			mixpanel.track('ux-sidebar-collapse');
			Intercom('trackEvent', 'ux-sidebar-collapse');
		}

		app.fullscreenExpand = function() {
			mixpanel.track('ux-full-expand');
			Intercom('trackEvent', 'ux-full-expand');
		}

		app.fullscreenCollapse = function() {
			mixpanel.track('ux-full-collapse');
			Intercom('trackEvent', 'ux-full-collapse');
		}
	});