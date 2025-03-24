const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User' // Assuming you have a User model
    },
    carId: {
        type: Number,
        required: true,
        // ref: 'Car' // Assuming you have a Car model
    },
    upgradeId: {
        type: Number
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    locationPickUp: {
        type: String,
        required: true // Location where the car is picked up
    },
    locationReturn: {
        type: String,
        required: true // Location where the car is returned
    },
    protectionId: {
        type: Number,
        // required: true // Unique identifier for protection
    },
    extraId: {
        type: Number,
        // required: true // Unique identifier for protection
    },
    status: {
        type: String,
        required: true,
        enum: ['upcoming', 'completed', 'cancelled']
    },
    price: {
        type: String,
        required: true
    }
});

// Create the Booking model
const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
