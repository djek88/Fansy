var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
 * Streamer Model
 * ==========
 */

var Streamer = new keystone.List('Streamer', {
	map: { name: 'name' }
});

Streamer.add({
	name: { type: String, required: true, index: true },
	created_at: { type: Types.Datetime, default: Date.now },
	updated_at: { type: Types.Datetime, default: Date.now },
});


Streamer.schema.virtual('content.full').get(function () {
	return this.content.extended || this.content.brief;
});

Streamer.schema.pre('save', function(next) {
    this.updated_at = Date.now();
    next();
});

Streamer.defaultColumns = 'name, created_at, updated_at';
Streamer.register();
