var keystone = require('keystone');
var Prediction = keystone.list('Prediction');
var Question = keystone.list('Question');
var Game = keystone.list('Game');

module.exports = {
	parseCookies: parseCookies,
	getUserPredictions: getUserPredictions,
	getTimers: getTimers,
	getPredictionsByStreamId: getPredictionsByStreamId,
	getActiveOnboardQuestion: getActiveOnboardQuestion,
	getUserStatistic: getUserStatistic,
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

					var result = onboardQuestions[0];
					result.template = result.template.id;
					cb(null, result);
				});
		});
}

function getUserPredictions(userId, cb) {
	Prediction.model.find()
		.where({'user': userId})
		.populate('question')
		.sort({updated_at: -1})
		.exec(cb);
}

function getUserStatistic(predictions, cb) {
	var data = {
		winrate: 0,
		score: 0
	};

	if (!predictions.length) return cb(null, data);

	var gameIds = {};
	predictions.forEach(function(e) {
		gameIds[e.question.game] = e.question.game;
	});
	gameIds = Object.keys(gameIds);

	Game.model.find({_id: {$in: gameIds}}, function(err, games) {
		if (err) return cb(err);

		games.forEach(function(game) {
			data[game.game] = predictions.filter(function(e) {return e.question.game == game.id;}).length;
		});

		// get finished predictions
		var finishedPredictions = predictions.filter(function(e) {return e.status !== 'active' && e.status !== 'cancelled';});
		if (finishedPredictions.length) {
			var wonGamesCount = finishedPredictions.filter(function(e) {
				data.score += e.status === 'true' ? 2000 : -2000;

				return e.status === 'true';
			}).length;

			data.winrate = Math.floor(wonGamesCount / finishedPredictions.length * 100);
		}
		return cb(null, data);
	});
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