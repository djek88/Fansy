var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
 * Template Model
 * ==========
 */

var Question = new keystone.List('Question', {
	map: { name: 'text' },
	defaultSort: '-updated_at'
});


Question.add({
	text: { type: String},
	timer: { type: Number},
	template: { type: Types.Relationship, ref: 'Template'},
	stream: { type: Types.Relationship, ref: 'Stream'},
	game: { type: Types.Relationship, ref: 'Game'},
	status: {type: Types.Select, options: ['active', 'finished', 'cancelled']},
	answer: { type: Number},
	adminTimer: {type: Number},
	goal: {type: String},
	timing: {type: Boolean},
	created_at: { type: Types.Datetime, default: Date.now },
	updated_at: { type: Types.Datetime, default: Date.now },
});

Question.schema.virtual('content.full').get(function () {
	return this.content.extended || this.content.brief;
});

Question.schema.pre('save', function(next) {
    this.updated_at = Date.now;
    next();
});


Question.defaultColumns = 'text, timer, template, stream, game, status, answer, adminTimer, created_at, updated_at';
Question.register();