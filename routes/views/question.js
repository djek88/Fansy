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
	var io = keystone.get('io');
	
	Question.model.findById(req.params.id).exec(function (err, question) {
		
		if(type === 'option1'){
			question.status = 'finished';
			question.answer = 1;
		}
		
		if(type === 'option2'){
			question.status = 'finished';
			question.answer = 2;
		}
		
		if(type === 'cancel'){
			question.status = 'cancelled';
		}
		
		Prediction.model.find({'stream': sid }).populate('user').exec(function (err, predictions) {
           io.emit('leader', predictions);
        });
        
 
		question.timing = false;
		
		question.save(function(err) {
			Question.model.find()
        		.where({'stream': sid })
        		.where({'timing': true })
        		.where({'status': 'active'})
        		.exec(function (err, questions) {
        			io.emit('timer', {questions:questions, time: new Date().getTime()});
            });
			Prediction.model.find({'question': req.params.id})
				.populate('user question question.template')
				.exec(function (err, predictions) {
					
					predictions.forEach(function(prediction) {
						if(question.status != 'cancelled'){
							
							if(question.answer == prediction.answer){
								prediction.status = 'true';
							}
							else{
								prediction.status = 'false';
							}
						}
						else{
							prediction.status = 'cancelled'
						}
						
						prediction.save(function(err){
							for (var key in io.sockets.connected){
								var e = io.sockets.connected[key];
								if(e.token == prediction.user.token){
									e.emit('answer',  prediction);
								}
								       
        
						        User.model.findOne({'token': e.token }).exec(function (err, user) {
									if(user){
										Prediction.model.find()
											.where({'user': user.id})
											.where({'status': 'active'})
						            		.where({'stream': sid })
						            		.populate('question')
						            		.sort( { updated_at: -1 } )
											.exec(function(err, predictions) {
												e.emit('active_predictions', predictions);
											})
										Prediction.model.find()
											.where({'user': user.id})
											.where({'status': { $ne: 'active'}})
						            		.where({'stream': sid })
						            		.populate('question')
						            		.sort( { updated_at: -1 } )
											.exec(function(err, predictions) {
												e.emit('finished_predictions', predictions);
											})
										Prediction.model.find({},{question:1, _id:0})
											.where({'user': user.id})
											.where({'status': 'active'})
						            		.where({'stream': sid })
											.exec(function(err, predictions) {
												predictions = predictions.map(function(i) {
						            				return i.question;
						            			})
												Question.model.find({_id: { $in: predictions }},{goal:1, adminTimer:1, _id:0})
													.where({'timing':'true'})
						        					.exec(function(err, timers) {
						        						e.emit('timer', {timers: timers, time: new Date().getTime()});
						        					})
											})
									}
								
								});
        
							}
							
							
						});
					})
					res.redirect('/dashboard/' + sid + '/error/0');
			});
		});
	});

}