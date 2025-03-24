const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
    make: {
        type: String,
        required: true
    },
    model: {
        type: String,
        required: true
    },
    year: {
        type: Number,
        required: true
    },
    pricePerDay: {
        type: Number,
        required: true
    },
    availability: {
        type: Boolean,
        default: true
    },
    image: {
        type: String,
        required: true // URL of the car image
    },
    seats: {
        type: Number,
        required: true // Number of seats in the car
    },
    doors: {
        type: Number,
        required: true // Number of doors in the car
    },
    transmission: {
        type: String,
        required: true // Type of transmission (e.g., Automatic, Manual)
    },
    fuel: {
        type: String,
        required: true // Type of fuel (e.g., Petrol, Diesel, Electric)
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Create the Car model
const Car = mongoose.model('Car', carSchema);

module.exports = Car;
