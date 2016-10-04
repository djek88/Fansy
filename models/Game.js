var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
 * Game Model
 * ==========
 */

var Game = new keystone.List('Game', {
	map: { name: 'game', },
});

Game.add({
	game: { type: String, required: true, index: true },
	created_at: { type: Types.Datetime, default: Date.now },
	updated_at: { type: Types.Datetime, default: Date.now },
});

Game.schema.virtual('content.full').get(function () {
	return this.content.extended || this.content.brief;
});

Game.schema.pre('save', function(next) {
    this.updated_at = Date.now();
    next();
});

Game.defaultColumns = 'game, created_at, updated_at';
Game.register();
