var keystone = require('keystone');
var Template = keystone.list('Template');
var Question = keystone.list('Question');
var Stream = keystone.list('Stream');
var request = require('superagent');

var shared = require('../../lib/shared');

module.exports = function(req, res) {
	var streamNsp = keystone.get('io').nsps['/stream'];
	var sid = req.params.sid;

	Stream.model.findById(sid).populate('streamer').exec(function(err, stream) {
		Template.model.findById(req.params.id)
			.populate('game')
			.exec(function(err, template) {
				if (err) return res.err();
				if (!template) return res.notfound();

				var re = /\'(.*)\'/i;
				var reGoal = /\*(.*)\*/i;
				var questionTimer = null;
				var adminTimer = null;
				var goal = null;
				var timing = false;
				var text = template.text.replace(/%.*?%/, stream.streamer.name);

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
					timer: template.timer,
					template: template.id,
					stream: stream.id,
					game: template.game,
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
						message: freshQuestion.text,
						timer: freshQuestion.timer,
						id: freshQuestion.id,
						templateId: freshQuestion.template,
						gameId: freshQuestion.game._id
					});

					res.redirect('/dashboard/' + stream.id + '/error/0');
				});
			});
	});
}