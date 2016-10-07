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
		if (err || !question || question.status !== 'active') return;

		question.status = 'finished';
		question.answer = 2;
		question.timing = false;

		question.save(function(err, freshQuestion) {
			if (err) return;

			Prediction.model.find({'question': id})
				.populate('user question question.template')
				.exec(function(err, predictions) {
					if (err) return;

					async.each(predictions, predictionHandler, function(err) {
						if (err) return;

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
							cb(null, prediction);

							for (var key in streamNsp.connected) {
								var socket = streamNsp.connected[key];
								var userToken = socket.token;

								if (userToken == prediction.user.token){
									socket.emit('answer', prediction);
								}

								User.model.findOne({'token': userToken}).exec(function (err, user) {
									if (err || !user) return;

									shared.getActivePredictions(user.id, sid, function(err, predictions) {
										socket.emit('active_predictions', predictions);
									});

									shared.getFinishedPredictions(user.id, sid, function(err, predictions) {
										socket.emit('finished_predictions', predictions);
									});

									shared.getTimers(user.id, sid, function(err, timers) {
										socket.emit('timer', {timers: timers, time: new Date().getTime()});
									});
								});
							}
						});
					}
			});
		});
	});
}