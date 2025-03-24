const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
    {
        email: { type: String, lowercase: true, required: true, index: true, unique: true, trim: true },
        firstname: { type: String, required: true, trim: true },
        lastname: { type: String, required: true, trim: true },
        password: { type: String, required: true, minlength: 8 },
        isVerified: { type: Boolean, default: false },
        verificationToken: {
            type: String,
        },
        verificationTokenExpires: { type: Date },
        devices: [
            {
                deviceId: { type: String, required: true }, // Unique device identifier
                deviceName: { type: String, required: true }, // e.g., "Chrome on Windows"
                lastUsed: { type: Date, default: Date.now } // Last login timestamp
            }
        ],

        // 2FA Fields
        twoFACode: { type: String },
        twoFAExpires: { type: Date },
        loginAttempts: { type: Number, default: 0 },
        locked: { type: Date, default: null },

        // Password reset fields
        resetToken: { type: String }, // Token for password reset
        resetTokenExpires: { type: Date } // Expiration date for the reset token
    },
    { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema)