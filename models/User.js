const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
    {
        email:{type: String, lowercase: true, required: true, index: true, unique: true, trim: true},
        firstname:{ type: String , required: true, trim: true},
        lastname:{ type: String , required: true, trim: true},
        password: {type: String, required: true, minlength: 6},
        isVerified: {type: Boolean, default: false },
        verificationToken: {
            type: String,
        },
        verificationTokenExpires: {type: Date},
        loginAttempts: {type: Number, default: 0},
        locked: {type: Date, default: null}
    },
    { timestamps: true}
);

module.exports = mongoose.model('User', UserSchema)