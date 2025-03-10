const express = require('express')
const nodemailer = require('nodemailer')
const bodyparser = require('body-parser')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const csvParser = require('csv-parser')
const bcrypt = require('bcrypt')

const FILE_PATH = path.join(__dirname, "users.csv")

if (!fs.existsSync(FILE_PATH)) {
    fs.writeFileSync(FILE_PATH, "firstname,lastname,email,password\n")
}
require('dotenv').config()

const app = express()
app.use(bodyparser.json())
app.use(cors())

app.post('/register', async (req, res) => {
    console.log('i was called, register')
    const {firstName, lastName, email, password} =req.body

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
                fs.appendFileSync(FILE_PATH, `${firstName},${lastName},${email},${hashedPassword}\n`)
                console.log("Signup successful!")
                return res.status(201).json({firstName, lastName, email})
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
        fs.createReadStream(FILE_PATH)
            .pipe(csvParser())
            .on("data", async (row) => {
                if (row.email === email) {
                    user.email = row.email
                    user.password = row.password
                    user.firstName = row.firstname
                    user.lastName = row.lastname
                }
            })
            .on('end', async () => {
                if (user.email.length > 0) {   
                    // console.log(found)  
                    const result = await bcrypt.compare(password, user.password)
                    if (result) {
                        // found = true
                        // console.log(found)
                        console.log("Login successful!")
                        const {password, ...others} = user
                        res.status(200).json({...others})
                    } else {
                        console.log("Invalid email or password.")
                        res.status(401).json({error: 'Wrong credentials'})
                    }               
                    // res.status(400).json({error: 'Wrong credentials'})
                }
            })
    } catch (error) {
        console.log(error)
        res.status(500).json(error)
    }
})

app.get('/', (req,res) => {
    res.send('testingggg')
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})