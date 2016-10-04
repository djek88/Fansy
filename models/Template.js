var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
 * Template Model
 * ==========
 */

var Template = new keystone.List('Template', {
	map: { name: 'text' },
});

Template.add({
	text: { type: String, required: true, index: true },
	timer: { type: Number, default: 20, required: true, index: true },
	game: { type: Types.Relationship, ref: 'Game' },
	type: { type: Types.Select, options: 'SOLO, TEAM', default: 'SOLO', required: true, index: true },
	stage: { type: Types.Select, options: 'Early, Any, Mid', default: 'Any', required: true, index: true },
	created_at: { type: Types.Datetime, default: Date.now },
	updated_at: { type: Types.Datetime, default: Date.now },
});

Template.schema.virtual('content.full').get(function () {
	return this.content.extended || this.content.brief;
});

Template.schema.pre('save', function(next) {
    this.updated_at = Date.now();
    next();
});

Template.defaultColumns = 'text, timer, game, type, stage, created_at, updated_at';
Template.register();
