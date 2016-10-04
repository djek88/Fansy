var keystone = require('keystone');
var async = require('async');
var Template = keystone.list('Template');
var Question = keystone.list('Question');
var Stream = keystone.list('Stream');
var Game = keystone.list('Game');

exports = module.exports = function (req, res) {

	Template.model.findById(req.body.id).exec(function (err, template) {
		template[req.body.type] = req.body.value;
		template.save();
	});

}