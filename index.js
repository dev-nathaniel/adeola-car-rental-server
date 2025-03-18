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

const FILE_PATH = path.join(__dirname, "users.csv")

if (!fs.existsSync(FILE_PATH)) {
    fs.writeFileSync(FILE_PATH, "firstName,lastName,email,password,isVerified,verificationToken\n")
}
require('dotenv').config()

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

const sendEmail = (name, email, verificationLink) => {  
    
  
    let mailOptions = {
      from: '"No reply" <adebayoolowofoyeku@gmail.com>',
      to: email,
    //   replyTo: email, // Added replyTo field to allow the recipient to reply directly to the sender
      subject: 'EMAIL VERIFICATION',
      headers: {
        'Importance': 'high',
        'X-Priority': '1'
      },
      html: `
        <div style="background-color: #f0f0f0; padding: 20px; border: 1px solid #ddd; border-radius: 10px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
          <h1 style="color: #333; font-weight: bold; margin-top: 0;">Verify Your Email</h1>
          <p style="font-size: 18px; margin-bottom: 20px;">Dear ${name},</p>
          <p style="font-size: 16px; margin-bottom: 20px;">To complete your registration with Adeola's Car Rental, please verify your email address by clicking the link below:</p>
          <a href="${verificationLink}" style="background-color: #333; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 20px;">Verify Email</a>
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
        console.log('Email sent: ' + info.response);
        res.status(200).send('Email sent successfully');
      }
    });
  };
  

app.post('/register', async (req, res) => {
    console.log('i was called, register')
    const {firstName, lastName, email, password} =req.body
    const verificationToken = crypto.randomBytes(32).toString('hex')

    const saltRounds = 10;
    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds)
        const stream = fs.createReadStream(FILE_PATH)
            .pipe(csvParser())
            .on("data", (row) => {
                if (row.email === email) {
                    console.log("User already exists. Choose a different username.")
                    stream.destroy()
                    return res.status(400).json({error: 'User already exists'})
                }
            })
            .on('end', () => {
                fs.appendFileSync(FILE_PATH, `${firstName},${lastName},${email},${hashedPassword},null,${verificationToken}\n`)
                console.log("Signup successful!")
                const verificationLink = `https://adeola-car-rental.netlify.app/verify?token=${verificationToken}&email=${email}`
                sendEmail(firstName, email, verificationLink)
                return res.status(201).json({firstName, lastName, email, verificationToken})
            })
    } catch(err) {
        return res.status(500).json(err)
    }
})

app.post('/login', async(req,res)=> {
    console.log('i was called, login')
    const {email, password} = req.body
    let found = false
    const user = {
        firstName: '',
        lastName: '',
        email: '',
        password: ''
    }
    try {
        const stream = fs.createReadStream(FILE_PATH)
            .pipe(csvParser())
            .on("data", async (row) => {
                if (row.email === email) {
                    user.email = row.email
                    user.password = row.password
                    user.firstName = row.firstName
                    user.lastName = row.lastName
                    // console.log(user)
                    // stream.destroy()
                }
            })
            .on('end', async () => {
                // console.log(user, 'end')
                // console.log(user.email.length)
                if (user.email.length > 0) { 
                    // console.log(user.email)  
                    // console.log(found)  
                    const result = await bcrypt.compare(password, user.password)
                    if (result) {
                        // found = true
                        // console.log(found)
                        console.log("Login successful!")
                        const token = jwt.sign(user.email, SECRET_KEY, {expiresIn: '1h'})
                        const {password, ...others} = user
                        return res.status(200).json({...others, token})
                    } else {
                        console.log("Invalid email or password.")
                        return res.status(401).json({error: 'Wrong credentials'})
                    }               
                    // res.status(400).json({error: 'Wrong credentials'})
                } else {
                    console.log("Invalid email or password.")
                    return res.status(401).json({error: 'Wrong credentials'})
                }
            })
    } catch (error) {
        console.log(error)
        return res.status(500).json(error)
    }
})

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
    const token = req.headers["authorization"];
    if (!token) return res.status(403).json({ error: "No token provided" });

    jwt.verify(token.split(" ")[1], SECRET_KEY, (err, decoded) => {
        if (err) return res.status(401).json({ error: "Unauthorized" });
        next();
    });
};

app.post('/verifyemail', async (req, res) => {
    try {
        const { email, verificationToken } = req.body;
        let user = {};

        fs.createReadStream(FILE_PATH)
            .pipe(csv())
            .on('data', (row) => {
                if (row.email === email && row.isVerified === 'null') {
                    user = row;
                }
            })
            .on('end', () => {
                if (Object.keys(user).length > 0 && user.verificationToken === verificationToken) {
                    user.isVerified = 'true';
                    // Assuming there's a function to update the CSV file
                    updateCSV(FILE_PATH, user);
                    // res.status(200).json({ message: 'Email verified successfully' });
                    // Log the user in after verification
                    const token = jwt.sign(user.email, SECRET_KEY, {expiresIn: '1h'});
                    const {password, ...others} = user;
                    return res.status(200).json({...others, token});
                } else {
                    res.status(401).json({ error: 'Invalid verification token or email not found' });
                }
            });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/updateuser', async (req, res) => {
    try {
        const { email, firstName, lastName, password } = req.body;
        let user = {};

        fs.createReadStream(FILE_PATH)
            .pipe(csv())
            .on('data', (row) => {
                if (row.email === email) {
                    user = row;
                }
            })
            .on('end', () => {
                if (Object.keys(user).length > 0) {
                    user.firstName = firstName;
                    user.lastName = lastName;
                    user.password = password;
                    // Assuming there's a function to update the CSV file
                    updateCSV(FILE_PATH, user);
                    res.status(200).json({ message: 'User updated successfully' });
                } else {
                    res.status(404).json({ error: 'User not found' });
                }
            });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/', (req,res) => {
    res.send('testingggg')
})

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
        rows[indexToUpdate][0] = user.firstName; // Update the firstName
        rows[indexToUpdate][1] = user.lastName; // Update the lastName
        rows[indexToUpdate][2] = user.email; // Update the email
        rows[indexToUpdate][3] = user.password; // Update the password
        rows[indexToUpdate][4] = user.isVerified; // Update the isVerified
        const updatedRows = rows.map(row => row.join(','));

        // Write the updated rows back to the file
        fs.writeFileSync(filePath, updatedRows.join('\n'));
        console.log('CSV file updated successfully');
    } else {
        console.log('User not found in CSV file');
    }
};