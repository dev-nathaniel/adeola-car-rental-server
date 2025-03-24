const express = require('express')
const nodemailer = require('nodemailer')
const bodyparser = require('body-parser')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const csvParser = require('csv-parser')
const bcrypt = require('bcrypt')
const jwt = require("jsonwebtoken");
const crypto = require("crypto")
const mongoose = require("mongoose")
const User = require('./models/User')
const Booking = require('./models/Booking')

require('dotenv').config()


mongoose
    .connect(process.env.MONGO_URL)
    .then(() => console.log('DB Connection successful!'))
    .catch((err) => {
        console.log(err);
    });


// const FILE_PATH = path.join(__dirname, "users.csv")

// if (!fs.existsSync(FILE_PATH)) {
//     fs.writeFileSync(FILE_PATH, "firstName,lastName,email,password,isVerified,verificationToken,loginAttempts,locked\n")
// }

const app = express()
app.use(bodyparser.json())
app.use(cors())

// The transporter auth does not necessarily have to be the same as the 'from' in mailOptions.
// However, in this case, we are using Gmail as the service, and Gmail requires the 'from' field to match the authenticated user.
// This is a security feature to prevent email spoofing.
let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'adebayoolowofoyeku@gmail.com',
        pass: process.env.THING
    }
});
const SECRET_KEY = process.env.JWT_SECRET
const saltRounds = 10;

const sendEmail = (name, email, verificationLink, twoFACode, resetLink) => {

    let mailOptions = {
        from: '"No reply" <adebayoolowofoyeku@gmail.com>',
        to: email,
        //   replyTo: email, // Added replyTo field to allow the recipient to reply directly to the sender
        subject: verificationLink ? 'EMAIL VERIFICATION' : resetLink ? 'PASSWORD RESET' : '2FA VERIFICATION',
        headers: {
            'Importance': 'high',
            'X-Priority': '1'
        },
        html: verificationLink ? `
        <div style="background-color: #f0f0f0; padding: 20px; border: 1px solid #ddd; border-radius: 10px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
          <h1 style="color: #333; font-weight: bold; margin-top: 0;">Verify Your Email</h1>
          <p style="font-size: 18px; margin-bottom: 20px;">Dear ${name},</p>
          <p style="font-size: 16px; margin-bottom: 20px;">To complete your registration with Adeola's Car Rental, please verify your email address by clicking the link below:</p>
          <a href="${verificationLink}" style="background-color: #333; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 20px;">Verify Email</a>
          <p style="font-size: 16px; margin-top: 20px;">If you have any questions or concerns, please don't hesitate to reach out to us.</p>
          <p style="font-size: 16px;">Best regards,</p>
          <p style="font-size: 16px;">Adeola's Car Rental Team</p>
        </div>
      ` : resetLink ? `
        <div style="background-color: #f0f0f0; padding: 20px; border: 1px solid #ddd; border-radius: 10px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
          <h1 style="color: #333; font-weight: bold; margin-top: 0;">Reset Your Password</h1>
          <p style="font-size: 18px; margin-bottom: 20px;">Dear ${name},</p>
          <p style="font-size: 16px; margin-bottom: 20px;">You have requested a password reset. Please click the link below to reset your password:</p>
          <a href="${resetLink}" style="background-color: #333; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 20px;">Reset Password</a>
          <p style="font-size: 16px; margin-top: 20px;">If you have any questions or concerns, please don't hesitate to reach out to us.</p>
          <p style="font-size: 16px;">Best regards,</p>
          <p style="font-size: 16px;">Adeola's Car Rental Team</p>
        </div>
      ` : `
        <div style="background-color: #f0f0f0; padding: 20px; border: 1px solid #ddd; border-radius: 10px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
          <h1 style="color: #333; font-weight: bold; margin-top: 0;">Verify Your Device</h1>
          <p style="font-size: 18px; margin-bottom: 20px;">Dear ${name},</p>
          <p style="font-size: 16px; margin-bottom: 20px;">Your code is: <strong>${twoFACode}</strong></p>
          <p style="font-size: 16px; margin-top: 20px;">If you have any questions or concerns, please don't hesitate to reach out to us.</p>
          <p style="font-size: 16px;">Best regards,</p>
          <p style="font-size: 16px;">Adeola's Car Rental Team</p>
        </div>
      `
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
            res.status(500).send('Error sending email');
        } else {
            // console.log('Email sent: ' + info.response);
            res.status(200).send('Email sent successfully');
        }
    });
};


app.post('/register', async (req, res) => {
    console.log('i was called, register')
    const { firstName, lastName, email, password, deviceId, deviceName } = req.body

    const verificationToken = crypto.randomBytes(32).toString('hex')

    try {
        const existingUser = await User.findOne({ email })
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists. Please choose a different email.' })
        }
        const hashedPassword = await bcrypt.hash(password, saltRounds)
        const newUser = new User({
            firstname: firstName,
            lastname: lastName,
            email,
            password: hashedPassword,
            verificationToken,
            devices: [{ deviceId, deviceName }],
            verificationTokenExpires: Date.now() + 24 * 60 * 60 * 1000
        })
        const savedUser = await newUser.save()
        const verificationLink = `https://adeola-car-rental.netlify.app/verify?token=${verificationToken}&id=${savedUser._id}`
        sendEmail(firstName, email, verificationLink)
        return res.status(201).json({ email: savedUser.email, firstname: savedUser.firstname, lastname: savedUser.lastname, isVerified: savedUser.isVerified })
        // const stream = fs.createReadStream(FILE_PATH)
        //     .pipe(csvParser())
        //     .on("data", (row) => {
        //         if (row.email === email) {
        //             console.log("User already exists. Choose a different username.")
        //             stream.destroy()
        //             return res.status(400).json({ error: 'User already exists' })
        //         }
        //     })
        //     .on('end', () => {
        //         fs.appendFileSync(FILE_PATH, `${firstName},${lastName},${email},${hashedPassword},null,${verificationToken},0,null\n`)
        //         console.log("Signup successful!")
        //         const verificationLink = `https://adeola-car-rental.netlify.app/verify?token=${verificationToken}&email=${email}`
        //         sendEmail(firstName, email, verificationLink)
        //         return res.status(201).json({ firstName, lastName, email, verificationToken })
        //     })
    } catch (err) {
        console.log(err)
        return res.status(500).json({ error: "Something went wrong" })
    }
})

const MAX_ATTEMPTS = 5; // Maximum allowed login attempts
const LOCK_TIME = 15 * 60 * 1000; // Lock time in milliseconds (e.g., 15 minutes)

app.post('/login', async (req, res) => {
    console.log('i was called, login')
    const { email, deviceId } = req.body
    let found = false
    // let user = {
    // }
    try {
        const user = await User.findOne({ email })
        if (!user) {
            return res.status(401).json({ error: "Wrong credentials!" })
        }
        if (user.loginAttempts >= MAX_ATTEMPTS) {
            console.log('login attempts is at 5 and above')
            if (user.locked == null) {
                console.log('it is null')
                user.locked = Date.now()
                user.loginAttempts = user.loginAttempts + 1
                user.save()
                return res.status(403).json({ error: 'Account locked due to too many failed login attempts. Try again later.', lockedUntil: new Date(user.locked.setTime(user.locked.getTime() + LOCK_TIME)) })
            } else if (Date.now() - user.locked >= LOCK_TIME) {
                user.locked = null
                user.loginAttempts = 0
                user.save()
            } else {
                user.loginAttempts = user.loginAttempts + 1
                user.save()
                return res.status(403).json({ error: 'Account locked due to too many failed login attempts. Try again later.', lockedUntil: new Date(user.locked.setTime(user.locked.getTime() + LOCK_TIME)) })
            }

        }
        const passwordMatch = await bcrypt.compare(req.body.password, user.password)
        if (!passwordMatch) {
            user.loginAttempts = user.loginAttempts + 1
            user.save()
            return res.status(401).json({ error: "Wrong credentials!" })
        }
        // Check if the device is recognized
        const knownDevice = user.devices.find((device) => device.deviceId === deviceId);

        if (!knownDevice) {
            // Generate 2FA code
            const code = crypto.randomInt(100000, 999999).toString();
            user.twoFACode = code;
            user.twoFAExpires = Date.now() + 10 * 60 * 1000; // Code expires in 10 minutes
            await user.save();

            // Send 2FA code via email
            sendEmail(user.firstname, user.email, null, code);
            const { password, verificationToken, verificationTokenExpires, twoFACode, twoFAExpires, ...others } = user._doc

            return res.status(200).json({
                ...others,
                message: 'New device detected. Please verify with the 2FA code sent to your email.'
            });
        }

        // Update last used timestamp
        knownDevice.lastUsed = Date.now();
        // await user.save();

        user.loginAttempts = 0
        user.locked = null
        await user.save()
        const accessToken = jwt.sign({ id: user._id }, SECRET_KEY, { expiresIn: "1h" })
        const { password, verificationToken, verificationTokenExpires, ...others } = user._doc
        return res.status(200).json({ ...others, accessToken })
        // const stream = fs.createReadStream(FILE_PATH)
        //     .pipe(csvParser())
        //     .on("data", async (row) => {
        //         if (row.email === email) {
        //             user = row
        //             // user.email = row.email
        //             // user.password = row.password
        //             // user.firstName = row.firstName
        //             // user.lastName = row.lastName
        //             // user.loginAttempts = row.loginAttempts
        //             // console.log(user)
        //             // stream.destroy()
        //         }
        //     })
        //     .on('end', async () => {
        //         // console.log(user, 'end')
        //         // console.log(user.email.length)
        //         if (user.email?.length > 0) {
        //             // console.log(user.email)  
        //             // console.log(found)  
        //             if (Number(user.loginAttempts) >= 5) {
        //                 if (user.locked == 'null') {
        //                     user.locked = Date.now()
        //                     user.loginAttempts = Number(user.loginAttempts) + 1
        //                     updateCSV(FILE_PATH, user)
        //                     return res.status(403).json({ error: 'Account locked due to too many failed login attempts. Try again later.', timer: (Number(Date.now()) - Number(user.locked)) });
        //                 } else {
        //                     if (Number(Date.now()) - Number(user.locked) >= LOCK_TIME) {
        //                         user.locked = 'null'
        //                         user.loginAttempts = '0'
        //                         updateCSV(FILE_PATH, user)
        //                     } else {
        //                         user.loginAttempts = Number(user.loginAttempts) + 1
        //                         updateCSV(FILE_PATH, user)
        //                         return res.status(403).json({ error: 'Account locked due to too many failed login attempts. Try again later.', timer: (Number(Date.now()) - Number(user.locked)) });
        //                     }
        //                 }
        //             }
        //             const result = await bcrypt.compare(password, user.password)
        //             if (result) {
        //                 // found = true
        //                 // console.log(found)
        //                 console.log("Login successful!")
        //                 const token = jwt.sign({ email }, SECRET_KEY, { expiresIn: '1h' })
        //                 user.loginAttempts = '0'
        //                 user.locked = 'null'
        //                 updateCSV(FILE_PATH, user)
        //                 const { password, verificationToken, ...others } = user
        //                 return res.status(200).json({ userDetails: others, token })
        //             } else {
        //                 console.log("Invalid email or password.")
        //                 user.loginAttempts = (Number(user.loginAttempts) + 1).toString()
        //                 updateCSV(FILE_PATH, user)
        //                 return res.status(401).json({ error: 'Wrong credentials' })
        //             }
        //             // res.status(400).json({error: 'Wrong credentials'})
        //         } else {
        //             console.log("Invalid email or password.")
        //             user.loginAttempts = (Number(user.loginAttempts) + 1).toString()
        //             updateCSV(FILE_PATH, user)
        //             return res.status(401).json({ error: 'Wrong credentials' })
        //         }
        //     })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: "Something went wrong" })
    }
})

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
    const token = req.headers["authorization"];
    if (!token) return res.status(403).json({ error: "No token provided" });

    jwt.verify(token.split(" ")[1], SECRET_KEY, (err, decoded) => {
        if (err) return res.status(401).json({ error: "Unauthorized" });
        req.user = decoded; // Store the decoded token in the request object
        next();
    });
};

// Endpoint to verify token
app.get('/verifytoken', verifyToken, (req, res) => {
    // If the token is valid, this code will execute
    return res.status(200).json({ message: 'Token is valid', user: req.user });
});

app.post('/verifyemail', async (req, res) => {
    try {
        const { id, verificationToken } = req.body;
        const user = await User.findById(id)
        if (!user) {
            return res.status(400).json({ error: "User not found!" })
        }
        if (user.isVerified) {
            return res.status(400).json({ error: "User already verified!" })
        }
        console.log(user.verificationToken, id)
        if (user.verificationToken == verificationToken) {
            user.isVerified = true
            user.save()
            const accessToken = jwt.sign({ id: user._id }, SECRET_KEY, { expiresIn: "1h" })
            const { password, verificationToken, verificationTokenExpires, twoFACode, twoFAExpires, ...others } = user._doc
            return res.status(200).json({ ...others, accessToken })
        } else {
            return res.status(401).json({ error: "Invalid verification token" })
        }
        // console.log(email, verificationToken)
        // let user = {};

        // fs.createReadStream(FILE_PATH)
        //     .pipe(csvParser())
        //     .on('data', (row) => {
        //         if (row.email === email && row.isVerified === 'null') {
        //             user = row;
        //         }
        //     })
        //     .on('end', () => {
        //         // console.log(user)
        //         if (Object.keys(user).length > 0 && user.verificationToken === verificationToken) {
        //             console.log(true)
        //             user.isVerified = 'true';
        //             // Assuming there's a function to update the CSV file
        //             updateCSV(FILE_PATH, user);
        //             // res.status(200).json({ message: 'Email verified successfully' });
        //             // Log the user in after verification
        //             const token = jwt.sign({ email }, SECRET_KEY, { expiresIn: '1h' });
        //             const { password, verificationToken, ...others } = user;
        //             return res.status(200).json({ userDetails: others, token });
        //         } else {
        //             res.status(401).json({ error: 'Invalid verification token or email not found' });
        //         }
        //     });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/verifydevice', async (req, res) => {
    try {
        const { id, code, deviceId, deviceName } = req.body;
        const user = await User.findById(id)
        if (!user) {
            return res.status(400).json({ error: "User not found!" })
        }

        if (user.twoFACode !== code) {
            return res.status(401).json({ error: 'Invalid 2FA code' });
        }
        // console.log(user.verificationToken, id)
        // Add new device to recognized devices
        user.devices.push({ deviceId, deviceName, lastUsed: Date.now() });
        user.twoFACode = null;
        user.twoFAExpires = null;
        await user.save();



        const accessToken = jwt.sign({ id: user._id }, SECRET_KEY, { expiresIn: "1h" })
        const { password, verificationToken, verificationTokenExpires, twoFACode, twoFAExpires, ...others } = user._doc
        return res.status(200).json({ ...others, accessToken })

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/updateuser/:id', async (req, res) => {
    try {
        const { email, firstName, lastName } = req.body;
        if (req.body.password) {
            req.body.password = await bcrypt.hash(req.body.password, saltRounds)
        }
        const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true })
        const accessToken = jwt.sign({ id: updatedUser._id }, SECRET_KEY, { expiresIn: "1h" })
        const { password, verificationToken, verificationTokenExpires, twoFACode, twoFAExpires, ...others } = updatedUser._doc
        return res.status(200).json({ ...others, accessToken })
        // let user = {};

        // fs.createReadStream(FILE_PATH)
        //     .pipe(csv())
        //     .on('data', (row) => {
        //         if (row.email === email) {
        //             user = row;
        //         }
        //     })
        //     .on('end', () => {
        //         if (Object.keys(user).length > 0) {
        //             user.firstName = firstName;
        //             user.lastName = lastName;
        //             user.password = password;
        //             // Assuming there's a function to update the CSV file
        //             updateCSV(FILE_PATH, user);
        //             res.status(200).json({ message: 'User updated successfully' });
        //         } else {
        //             res.status(404).json({ error: 'User not found' });
        //         }
        //     });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/', (req, res) => {
    res.send('testingggg')
})

// Endpoint to get users from the CSV file
app.get('/users', async (req, res) => {
    try {
        const users = await User.find()
        return res.status(200).json(users)
    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: "Something went wrong" })
    }
    // const users = [];

    // fs.createReadStream(FILE_PATH)
    //     .pipe(csvParser())
    //     .on('data', (row) => {
    //         // Push each user row into the users array
    //         users.push(row);
    //     })
    //     .on('end', () => {
    //         // Send the users array as a JSON response
    //         return res.status(200).json(users);
    //     })
    //     .on('error', (error) => {
    //         console.error(error);
    //         return res.status(500).json({ error: 'Error reading the CSV file' });
    //     });
});

// Endpoint to create a booking
app.post('/book', verifyToken, async (req, res) => {
    const { carId, startDate, endDate, locationReturn, locationPickUp, protectionId, extraId, upgradeId, status, price } = req.body;
    // console.log(req.user)
    try {
        const newBooking = new Booking({
            userId: req.user.id,
            status,
            carId,
            startDate,
            endDate,
            locationPickUp,
            locationReturn,
            price,
            ...(protectionId ? { protectionId } : {}),
            ...(extraId ? { extraId } : {}),
            ...(upgradeId ? { upgradeId } : {})
        });

        const savedBooking = await newBooking.save();
        return res.status(201).json(savedBooking);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Something went wrong while creating the booking' });
    }
});

// Endpoint to fetch bookings
app.get('/bookings', verifyToken, async (req, res) => {
    const { status } = req.query; // Get the status from query parameters
    const userId = req.user.id; // Corrected variable name to match the parameter name

    try {
        let filter = { userId }; // Filter by userId
        console.log(req.user)
        if (status) {
            filter.status = status; // Filter by status if provided
        }

        const bookings = await Booking.find(filter); // Populate user and car details
        return res.status(200).json(bookings);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Something went wrong while fetching bookings' });
    }
});

// Endpoint to edit the status of a booking
app.put('/bookings/:bookingId/status', verifyToken, async (req, res) => {
    const { bookingId } = req.params; // Get the bookingId from the request parameters
    const { status } = req.body; // Get the new status from the request body

    try {
        // Validate the status if needed (e.g., check against allowed statuses)
        if (!status) {
            return res.status(400).json({ error: 'Status is required' });
        }

        const updatedBooking = await Booking.findByIdAndUpdate(
            bookingId,
            { status }, // Update the status
            { new: true } // Return the updated booking
        );

        if (!updatedBooking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        return res.status(200).json(updatedBooking);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Something went wrong while updating the booking status' });
    }
});

// Endpoint to request a password reset link
app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Generate a password reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetToken = resetToken;
        user.resetTokenExpires = Date.now() + 3600000; // Token valid for 1 hour
        await user.save();

        const resetLink = `https://adeola-car-rental.netlify.app/resetpassword?token=${resetToken}&id=${user._id}`;
        sendEmail(user.firstname, email, null, null, resetLink); // Send the reset link via email

        return res.status(200).json({ message: 'Password reset link sent to your email' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Something went wrong while sending the password reset link' });
    }
});

// Endpoint to reset the password
app.post('/reset-password', async (req, res) => {
    const { token, id, newPassword } = req.body;

    try {
        const user = await User.findById(id);
        if (!user || user.resetToken !== token || user.resetTokenExpires < Date.now()) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        // Hash the new password
        user.password = await bcrypt.hash(newPassword, saltRounds);
        user.resetToken = undefined; // Clear the reset token
        user.resetTokenExpires = undefined; // Clear the expiration
        await user.save();

        return res.status(200).json({ message: 'Password has been reset successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Something went wrong while resetting the password' });
    }
});

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})

transporter.verify(function (error, success) {
    if (error) {
        console.log(error);
    } else {
        console.log("Server is ready to take messages")
    }
})

// Function to update the CSV file
const updateCSV = (filePath, user) => {
    const rows = fs.readFileSync(filePath, { encoding: 'utf8' }).split('\n').map(row => row.split(','));

    // Find the row to update
    const indexToUpdate = rows.findIndex(row => row[2] === user.email);

    if (indexToUpdate !== -1) {
        // Dynamically update fields without explicitly specifying them
        Object.keys(user).forEach((key) => {
            const columnIndex = rows[0].indexOf(key);
            if (columnIndex !== -1) {
                rows[indexToUpdate][columnIndex] = user[key];
            }
        });
        const updatedRows = rows.map(row => row.join(','));

        // Write the updated rows back to the file
        fs.writeFileSync(filePath, updatedRows.join('\n'));
        console.log('CSV file updated successfully');
    } else {
        console.log('User not found in CSV file');
    }
};