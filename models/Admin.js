var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
 * Admin Model
 * ==========
 */
var Admin = new keystone.List('Admin');

Admin.add({
	name: { type: Types.Name, required: true, index: true },
	email: { type: Types.Email, initial: true, required: true, index: true },
	password: { type: Types.Password, initial: true, required: true },
}, 'Permissions', {
	isAdmin: { type: Boolean, label: 'Can access Keystone', index: true },
	created_at: { type: Types.Datetime, default: Date.now },
	updated_at: { type: Types.Datetime, default: Date.now },
});

// Provide access to Keystone
Admin.schema.virtual('canAccessKeystone').get(function () {
	return this.isAdmin;
});

Admin.schema.pre('save', function(next) {
    this.updated_at = Date.now();
    next();
});

/**
 * Registration
 */
Admin.defaultColumns = 'name, email, isAdmin, created_at, updated_at';
Admin.register();
