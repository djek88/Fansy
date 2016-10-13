var keystone = require('keystone');
var Template = keystone.list('Template');
var Question = keystone.list('Question');
var Stream = keystone.list('Stream');
var Game = keystone.list('Game');

module.exports = function (req, res) {
	var view = new keystone.View(req, res);
	var locals = res.locals;
	var sid = req.params.sid;

	locals.error = req.params.error == 1;
	locals.templates = {
		'Any': [],
		'Early': [],
		'Mid': []
	};
	locals.questions = [];

	view.on('init', function (next) {
		Stream.model.findById(sid).populate('streamer').exec(function (err, stream) {
			if (err) return res.err(err);
			if (!stream) return res.notfound();

			locals.stream = stream;

			Game.model.findById(stream.game).exec(function (err, game) {
				if (err) return res.err(err);
				if (!game) return res.notfound();

				locals.game = game.game;

				Template.model.find()
					.where('game', stream.game)
					.where('type', stream.type)
					.sort('-updated_at')
					.exec(function (err, templates) {
						if (err) return res.err(err);

						templates.forEach(function(template) {
							locals.templates[template.stage].push(template);
						});

						Question.model.find()
							.where('stream', stream.id)
							.where('status', 'active')
							.sort('-updated_at')
							.exec(function (err, questions) {
								if (err) return res.err(err);

								questions.forEach(function(question) {
									if (question.adminTimer) {
										question.countdown = question.adminTimer - new Date().getTime();
									}
								});

								locals.questions = questions;
								next();
							});
					});
			});
		});
	});

	view.render('dashboard');
}