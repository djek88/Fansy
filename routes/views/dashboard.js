var keystone = require('keystone');
var async = require('async');
var Template = keystone.list('Template');
var Question = keystone.list('Question');
var Stream = keystone.list('Stream');
var Game = keystone.list('Game');

exports = module.exports = function (req, res) {

	var view = new keystone.View(req, res);
	var locals = res.locals;
	var sid = req.params.sid;
	if(req.params.error == 1){
		locals.error = true;
	}
	else{
		locals.error = false;
	}

	locals.templates = {
		'Any': [],
		'Early': [],
		'Mid': []
	};
	locals.questions = [];

	view.on('init', function (next) {
		
			Stream.model.findById(sid).populate('streamer').exec(function (err, result) {
				locals.stream = result;
				Game.model.findById(locals.stream.game).exec(function (err, game) {
					locals.game = game.game;

					Template.model.find()
					.where('game',locals.stream.game)
					.where('type',locals.stream.type)
					.sort('-updated_at')
					.exec(function (err, templates) {
						templates.forEach(function(template){
							locals.templates[template.stage].push(template);
						});
						
						
						Question.model.find()
							.where('stream', locals.stream.id)
							.where('status', 'active')
							.sort('-updated_at')
							.exec(function (err, results) {
								if (err || !results.length) {
									return next(err);
								}
								locals.questions = results;
								locals.questions.forEach(function(question){
									if(question.adminTimer){
										question.countdown = question.adminTimer - new Date().getTime();
									}
								})
								next(err);
							});
					});	
				})
			});
	});


	view.render('dashboard');

}