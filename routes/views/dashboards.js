var keystone = require('keystone');
var async = require('async');
var Template = keystone.list('Template');
var Question = keystone.list('Question');
var Stream = keystone.list('Stream');
var Game = keystone.list('Game');

exports = module.exports = function (req, res) {

	var view = new keystone.View(req, res);
	var locals = res.locals;

	locals.streams = [];





	view.on('init', function (next) {
		
			Stream.model.find().populate('game streamer').exec(function (err, streams) {
				locals.streams = streams.map(function(e){
					if(e.status != 'finished'){
						return e;
					}
				})
				next(err);
			});
		
		
	});


	view.render('dashboards');

}