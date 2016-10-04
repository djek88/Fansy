var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
 * Template Model
 * ==========
 */

var Prediction = new keystone.List('Prediction', {
	map: { name: 'text' },
});


Prediction.add({
	user: { type: Types.Relationship, ref: 'User'},
	stream: { type: Types.Relationship, ref: 'Stream'},
	status: {type: Types.Select, options: ['active', 'true', 'false', 'cancelled'], default:'active' },
	question: { type: Types.Relationship, ref: 'Question'},
	answer: { type: Number},
	answerText: { type: String},
	created_at: { type: Types.Datetime, default: Date.now },
	updated_at: { type: Types.Datetime, default: Date.now },
});

Prediction.schema.virtual('content.full').get(function () {
	return this.content.extended || this.content.brief;
});

Prediction.schema.pre('save', function(next) {
    this.updated_at = Date.now();
    next();
});

Prediction.defaultColumns = 'question, user, answer ,status, created_at, updated_at';
Prediction.register();