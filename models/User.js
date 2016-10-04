var keystone = require('keystone');
var Types = keystone.Field.Types;
/**
 * User Model
 * ==========
 */

var User = new keystone.List('User', {
	map: { username: 'text' },
});


User.add({
	username: { type: String, default:'user', unique:true, required: true, index: true },
	token: { type: String},
	sid: { type: String},
	created_at: { type: Types.Datetime, default: Date.now },
	updated_at: { type: Types.Datetime, default: Date.now },
});

User.schema.virtual('content.full').get(function () {
	return this.content.extended || this.content.brief;
});

User.schema.pre('save', function(next) {
    this.updated_at = Date.now();
    next();
});

User.defaultColumns = 'username, created_at, updated_at';
User.register();