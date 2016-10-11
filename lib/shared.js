var keystone = require('keystone');
var Prediction = keystone.list('Prediction');
var Question = keystone.list('Question');

module.exports = {
	parseCookies: parseCookies,
	getActivePredictions: getActivePredictions,
	getFinishedPredictions: getFinishedPredictions,
	getTimers: getTimers,
	getPredictionsByStreamId: getPredictionsByStreamId,
	getActiveOnboardQuestion: getActiveOnboardQuestion,
}

function parseCookies(request) {
	var list = {},
	rc = request.headers.cookie;

	rc && rc.split(';').forEach(function( cookie ) {
		var parts = cookie.split('=');
		list[parts.shift().trim()] = decodeURI(parts.join('='));
	});

	return list;
}

function getActiveOnboardQuestion(userId, streamId, cb) {
	Question.model.find()
		.where({'stream': streamId})
		.where({'status': 'active'})
		.populate('template')
		.exec(function(err, questions) {
			if (err) return cb(err);

			var onboardQuestions = questions.filter(function(e) {
				return e.template.onboarding == 'Yes';
			});

			if (!onboardQuestions.length) return cb();

			var questionIds = onboardQuestions.map(function(e) {return e._id});
			Prediction.model.find()
				.where({'user': userId})
				.where({'status': 'active'})
				.where({'question': {$in: questionIds}})
				.exec(function(err, predictions) {
					if (err) return cb(err);

					// delete questions which have prediction
					onboardQuestions = onboardQuestions.filter(function(q) {
						return predictions.every(function(p) {
							return p.question != q.id;
						});
					});

					cb(null, onboardQuestions[0]);
				});
		});
}

function getActivePredictions(userId, streamId, cb) {
	Prediction.model.find()
		.where({'user': userId})
		.where({'status': 'active'})
		.where({'stream': streamId})
		.populate('question')
		.sort({updated_at: -1})
		.exec(cb);
}

function getFinishedPredictions(userId, streamId, cb) {
	Prediction.model.find()
		.where({'user': userId})
		.where({'status': {$ne: 'active'}})
		.where({'stream': streamId})
		.populate('question')
		.sort({updated_at: -1})
		.exec(cb);
}

function getTimers(userId, streamId, cb) {
	Prediction.model.find({}, {question: 1, _id: 0})
		.where({'user': userId})
		.where({'status': 'active'})
		.where({'stream': streamId})
		.exec(function(err, predictions) {
			predictions = predictions.map(function(e) {
				return e.question;
			});

			Question.model.find(
					{_id: {$in: predictions}},
					{goal: 1, adminTimer: 1, _id: 0}
				)
				.where({'timing': 'true'})
				.exec(cb);
		});
}

function getPredictionsByStreamId(streamId, cb) {
	Prediction.model.find({'stream': streamId})
		.populate('user')
		.exec(cb);
}