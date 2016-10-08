var keystone = require('keystone');
var User = keystone.list('User');
var Prediction = keystone.list('Prediction');
var randtoken = require('rand-token');

var shared = require('../lib/shared');

module.exports = function(io) {
	var streaNsp = io.of('/stream');

	var users = keystone.get('users');

	streaNsp.on('connection', function(socket) {
		console.log('USER CONNECTED to stream nsp, connected sockets:', Object.keys(streaNsp.connected).length);

		socket.on('open', function(data) {
			socket.token = data.token;
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
			User.model.findOne({'username': data.username}).exec(function (err, user) {
				if (user){
					socket.emit('auth', {'type': 'error', 'username': data.username});
				} else {
					var newUser = new User.model({
						username: data.username,
						token: randtoken.generate(16)
					});

					newUser.save(function(err) {
						socket.token = newUser.token;
						socket.emit('auth', {
							'type': 'success',
							'token': newUser.token,
							'username': data.username
						});
					});
				}
			});
		});

		socket.on('answerToQuestion', function (data) {
			console.log('on answerToQuestion event');

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