var keystone = require('keystone');
var async = require('async');
var Template = keystone.list('Template');
var Question = keystone.list('Question');
var Stream = keystone.list('Stream');

exports = module.exports = function (req, res) {

	var sid = req.params.sid;
	
	Stream.model.findById(sid).exec(function (err, stream) {
		stream.status = 'finished';
		stream.save();
		
		res.status(301).redirect('/dashboard/');
		
		
	});

}