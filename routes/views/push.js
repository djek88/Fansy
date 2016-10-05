var keystone = require('keystone');
var async = require('async');
var Template = keystone.list('Template');
var Question = keystone.list('Question');
var Stream = keystone.list('Stream');
var request = require('superagent');
function parseCookies (request) {
	var list = {},
		rc = request.headers.cookie;

	rc && rc.split(';').forEach(function( cookie ) {
		var parts = cookie.split('=');
		list[parts.shift().trim()] = decodeURI(parts.join('='));
	});

	return list;
}


exports = module.exports = function (req, res) {

	var view = new keystone.View(req, res);
	var locals = res.locals;
	var socket = keystone.get('io');
	var sid = req.params.sid;
	var cookies = parseCookies(req);
	var mixpanel = keystone.get('mixpanel');
	
	Stream.model.findById(sid).populate('streamer').exec(function (err, stream) {
		locals.stream = stream;
		
		Template.model.findById(req.params.id).populate('game').exec(function (err, template) {
				locals.template = template;
				var text = locals.template.text.replace(/%.*?%/,locals.stream.streamer.name);
				var re = /\'(.*)\'/i;
				var reGoal = /\*(.*)\*/i;
				var number = null,
					adminTimer = null,
					goal = null;
					
				if(text.match(re) && text.match(re)[1]){
					number = text.match(re)[1];
					text = text.replace(/'.*?'/, number);
				}
				
				if(text.match(reGoal) && text.match(reGoal)[1]){
					goal = text.match(reGoal)[1];
					text = text.replace(/\*(.*)\*/, goal);
				}
				
				var timing = false;
				
				if(number){
					adminTimer = new Date().getTime() + number*60*1000;
					timing = true;
					Question.model.find()
						.where({'stream': sid })
						.where({'timing': true })
						.where({'status': 'active'})
						.exec(function (err, questions) {
							socket.emit('timer', {questions:questions, time: new Date().getTime()});
					});
				}
				
				
				var newQuestion = new Question.model({
					text: text,
					timer: locals.template.timer,
					template: locals.template.id,
					stream: locals.stream.id,
					game: locals.template.game,
					status: 'active',
					adminTimer: adminTimer,
					goal: goal,
					timing: timing
				});
				
				newQuestion.save(function(err) {
					if(number){
						var time = number*60*1000;
						var url = process.env.URL + 'front/'+sid+'/question/option2/' + newQuestion.id;
						
						setTimeout(function(string){
							return function(){
								request
									.get(string)
									.end(function(err, res){
									});
							}
						}(url),time);
						
					}
					socket.emit('question', { message: text, timer: locals.template.timer, 
					id:newQuestion.id, templateId: template.id, gameId: template.game.id });
					res.redirect('/dashboard/' + locals.stream.id + '/error/0');
				});
				
			});
	
	});

}