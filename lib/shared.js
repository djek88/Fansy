var keystone = require('keystone');
var Prediction = keystone.list('Prediction');
var Question = keystone.list('Question');

module.exports = {
	parseCookies: parseCookies,
	getActivePredictions: getActivePredictions,
	getFinishedPredictions: getFinishedPredictions,
	getTimers: getTimers,
	getPredictionsByStreamId: getPredictionsByStreamId,
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