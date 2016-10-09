var keystone = require('keystone');
var async = require('async');
var Template = keystone.list('Template');
var Question = keystone.list('Question');
var Stream = keystone.list('Stream');
var request = require('superagent');

var shared = require('../../lib/shared');

module.exports = function(req, res) {
	var view = new keystone.View(req, res);
	var locals = res.locals;
	var streamNsp = keystone.get('io').nsps['/stream'];
	var sid = req.params.sid;
	var cookies = shared.parseCookies(req);

	Stream.model.findById(sid).populate('streamer').exec(function(err, stream) {
		locals.stream = stream;

		Template.model.findById(req.params.id)
			.populate('game')
			.exec(function(err, template) {
				if (err) return res.err();
				if (!template) return res.notfound();

				locals.template = template;

				var re = /\'(.*)\'/i;
				var reGoal = /\*(.*)\*/i;
				var questionTimer = null;
				var adminTimer = null;
				var goal = null;
				var timing = false;
				var text = locals.template.text.replace(/%.*?%/, locals.stream.streamer.name);

				if (text.match(re) && text.match(re)[1]) {
					questionTimer = text.match(re)[1];
					text = text.replace(/'.*?'/, questionTimer);
				}

				if (text.match(reGoal) && text.match(reGoal)[1]) {
					goal = text.match(reGoal)[1];
					text = text.replace(/\*(.*)\*/, goal);
				}

				if (questionTimer) {
					adminTimer = new Date().getTime() + questionTimer * 60 * 1000;
					timing = true;
				}

				new Question.model({
					text: text,
					timer: locals.template.timer,
					template: locals.template.id,
					stream: locals.stream.id,
					game: locals.template.game,
					status: 'active',
					adminTimer: adminTimer,
					goal: goal,
					timing: timing
				}).save(function(err, freshQuestion) {
					// set handler on "question time finished" for auto close question
					if (questionTimer) {
						var url = process.env.IP + ':' + process.env.PORT + '/front/' + sid + '/question/option2/' + freshQuestion.id;
						setTimeout(function() {
							request.get(url).end(function(){});
						}, questionTimer * 60 * 1000);
					}

					streamNsp.emit('question', {
						message: text,
						timer: locals.template.timer,
						id: freshQuestion.id,
						templateId: template.id,
						gameId: template.game.id
					});

					res.redirect('/dashboard/' + locals.stream.id + '/error/0');
				});
			});
	});
}