var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
 * Game Model
 * ==========
 */

var Stream = new keystone.List('Stream', {
	map: { name: 'url' }
});

Stream.add({
	streamer: { type: Types.Relationship, ref: 'Streamer'},
	url: { type: String, required: true, index: true },
	option1: { type: String, default: 'YES', required: true, index: true },
	option2: { type: String, default: 'NO', required: true, index: true },
	game: { type: Types.Relationship, ref: 'Game'},
	type: { type: Types.Select, options: 'SOLO, TEAM', default: 'SOLO', required: true, index: true },
	status: { type: Types.Select, options: 'new, live, finished', default: 'new', required: true, index: true },
	created_at: { type: Types.Datetime, default: Date.now },
	updated_at: { type: Types.Datetime, default: Date.now },
});


Stream.schema.virtual('content.full').get(function () {
	return this.content.extended || this.content.brief;
});

Stream.schema.pre('save', function(next) {
    this.updated_at = Date.now();
    next();
});

Stream.defaultColumns = 'url, streamer, game, status, featured, created_at, updated_at';
Stream.register();
