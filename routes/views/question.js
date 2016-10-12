var keystone = require('keystone');
var async = require('async');
var Question = keystone.list('Question');
var User = keystone.list('User');
var Prediction = keystone.list('Prediction');

var shared = require('../../lib/shared');

module.exports = function (req, res) {
	var view = new keystone.View(req, res);
	var locals = res.locals;
	var sid = req.params.sid;
	var type = req.params.type;
	var id = req.params.id;
	var streamNsp = keystone.get('io').nsps['/stream'];

	Question.model.findById(id).exec(function (err, question) {
		if (err || !question || question.status !== 'active') return res.notfound();

		question.timing = false;
		if (type === 'cancel') {
			question.status = 'cancelled';
		} else {
			question.status = 'finished';
			question.answer = type === 'option1' ? 1 : 2;
		}

		question.save(function(err, freshQuestion) {
			if (err) return res.err();

			res.redirect('/dashboard/' + sid + '/error/0');

			Prediction.model.find({'question': id})
				.populate('user question question.template')
				.exec(function(err, predictions) {
					if (err) return;

					async.eachSeries(predictions, predictionHandler, function(err) {
						if (err) return;

						streamNsp.emit('close_question', freshQuestion.id);

						for (var key in streamNsp.connected) {
							(function(socket) {
								User.model.findOne({'token': socket.token}).exec(function (err, user) {
									if (err || !user) return;

									shared.getUserPredictions(user.id, sid, function(err, predictions) {
										socket.emit('user_predictions', predictions);
									});

									shared.getTimers(user.id, sid, function(err, timers) {
										socket.emit('timer', {timers: timers, time: new Date().getTime()});
									});
								});
							})(streamNsp.connected[key]);
						}

						shared.getPredictionsByStreamId(sid, function(err, predictions) {
							streamNsp.emit('leader', predictions);
						});
					});

					function predictionHandler(prediction, cb) {
						if (freshQuestion.status == 'cancelled') {
							prediction.status = 'cancelled';
						} else {
							prediction.status = freshQuestion.answer == prediction.answer ? 'true' : 'false';
						}

						prediction.save(function(err) {
							if (err) return cb(err);

							for (var key in streamNsp.connected) {
								var socket = streamNsp.connected[key];

								if (socket.token == prediction.user.token){
									socket.emit('answer', prediction);
								}
							}

							cb();
						});
					}
				});
		});
	});
}