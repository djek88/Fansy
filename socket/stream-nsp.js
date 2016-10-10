var keystone = require('keystone');
var User = keystone.list('User');
var Prediction = keystone.list('Prediction');
var randtoken = require('rand-token');

var shared = require('../lib/shared');
var resources = require('../resources');

module.exports = function(io) {
	var streaNsp = io.of('/stream');

	var users = keystone.get('users');

	streaNsp.on('connection', function(socket) {
		console.log('USER CONNECTED to stream nsp, connected sockets:', Object.keys(streaNsp.connected).length);

		socket.on('open', function(data) {
			socket.token = data.token;
			socket.questions = {};
		});

		socket.on('first', function(data) {
			shared.getPredictionsByStreamId(data.streamId, function(err, predictions) {
				socket.emit('leader', predictions);
			});

			User.model.findOne({'token': data.token}).exec(function (err, user) {
				if (err || !user) return;

				shared.getActivePredictions(user.id, data.streamId, function(err, predictions) {
					socket.emit('active_predictions', predictions);
				});

				shared.getFinishedPredictions(user.id, data.streamId, function(err, predictions) {
					socket.emit('finished_predictions', predictions);
				});

				shared.getTimers(user.id, data.streamId, function(err, timers) {
					socket.emit('timer', {timers: timers, time: new Date().getTime()});
				});
			});
		});

		socket.on('auth', function (data) {
			console.log('on auth event');
			getFreeName(function(err, userName) {
				if (err) return socket.emit('auth', {'error': true});

				new User.model({
					username: userName,
					token: randtoken.generate(16)
				}).save(function(err, freshUser) {
					socket.token = freshUser.token;

					socket.emit('auth', {
						'token': freshUser.token,
						'username': freshUser.username
					});
				});
			});

			function getFreeName(cb) {
				var userNames = resources.userNames;
				var randIndex = Math.floor(Math.random() * userNames.length);
				var randNumber = Math.floor(Math.random() * 10) + 1;
				var userName = userNames[randIndex] + randNumber;

				User.model.findOne({'username': userName}).exec(function (err, user) {
					if (user) return getFreeName(cb);
					cb(err, userName);
				});
			}
		});

		socket.on('answerToQuestion', function (data) {
			console.log('on answerToQuestion event');
			if (socket.questions[data.questionId] &&
				socket.questions[data.questionId].answered) return;

			socket.questions[data.questionId] = {answered: true};

			User.model.findOne({'token': data.token}).exec(function (err, user) {
				if (err || !user) return;

				new Prediction
					.model({
						user: user.id,
						question: data.questionId,
						answer: data.answer,
						status: 'active',
						stream: data.streamId,
						answerText: data.answerText,
					})
					.save(function(err) {
						shared.getPredictionsByStreamId(data.streamId, function(err, predictions) {
							streaNsp.emit('leader', predictions);
						});

						shared.getActivePredictions(user.id, data.streamId, function(err, predictions) {
							socket.emit('active_predictions', predictions);
						});

						shared.getFinishedPredictions(user.id, data.streamId, function(err, predictions) {
							socket.emit('finished_predictions', predictions);
						});

						shared.getTimers(user.id, data.streamId, function(err, timers) {
							socket.emit('timer', {timers: timers, time: new Date().getTime()});
						});
					});
			});
		});

		socket.on('disconnect', function() {
			console.log('SOCKET DISCONNECT');
		});

		socket.onclose = function onclose(reason) {
			var socket = this;

			/*if (socket.auth) {
				for (var room in socket.rooms) {
					socket.broadcast.to(room).emit('user:left', socket.user._id);
				}
			}*/

			Object.getPrototypeOf(socket).onclose.call(socket, reason);
		};
	});

	return streaNsp;
};