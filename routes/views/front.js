var keystone = require('keystone');
var async = require('async');
var Template = keystone.list('Template');
var Question = keystone.list('Question');
var Stream = keystone.list('Stream');
var User = keystone.list('User');
var Prediction = keystone.list('Prediction');

exports = module.exports = function (req, res) {
	var view = new keystone.View(req, res);
	var locals = res.locals;
	var id = req.params.id;
	var sid = req.params.sid;
	var type = req.params.type;
	var socket = keystone.get('io');

	Question.model.findById(req.params.id).exec(function (err, question) {
		if (question.status == 'active') {
			question.status = 'finished';
			question.answer = 2;
			question.timing = false;

			question.save(function(err) {
				Prediction.model.find({ 'question': req.params.id })
					.populate('user question question.template')
					.exec(function (err, predictions) {
						predictions.forEach(function(prediction) {
							if (question.status != 'cancelled') {
								if (question.answer == prediction.answer) {
									prediction.status = 'true';
								} else {
									prediction.status = 'false';
								}
							} else {
								prediction.status = 'cancelled';
							}

							prediction.save(function(err) {
								if (err) return;

								for (var key in socket.sockets.connected) {
									var e = socket.sockets.connected[key];
									if (e.token != prediction.user.token) continue;

									e.emit('answer', prediction);

									User.model.findOne({'token': e.token }).exec(function (err, user) {
										if (err || !user) return;

										Prediction.model.find()
											.where({ 'user': user.id })
											.where({ 'status': 'active' })
											.where({ 'stream': sid })
											.populate('question')
											.sort({ updated_at: -1 })
											.exec(function(err, predictions) {
												e.emit('active_predictions', predictions);
											});

										Prediction.model.find()
											.where({ 'user': user.id })
											.where({ 'status': { $ne: 'active' } })
											.where({ 'stream': sid })
											.populate('question')
											.sort({ updated_at: -1 })
											.exec(function(err, predictions) {
												e.emit('finished_predictions', predictions);
											});

										Prediction.model.find({},{question:1, _id:0})
												.where({ 'user': user.id })
												.where({ 'status': 'active' })
												.where({ 'stream': sid })
												.exec(function(err, predictions) {
													predictions = predictions.map(function(i) {
														return i.question;
													});

													Question.model.find({
															_id: { $in: predictions }},
															{ goal: 1, adminTimer: 1, _id: 0 }
														)
														.where({ 'timing':'true' })
														.exec(function(err, timers) {
															e.emit('timer', {timers: timers, time: new Date().getTime()});
														});
												});
									});
								}
							});
						});
					});
			});
		}
	});
}