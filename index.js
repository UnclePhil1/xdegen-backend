require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;
const SERVER = process.env.MONGO_DB_SERVER;
const corsOptions = {
  origin: 'https://xdgen.vercel.app',  // Replace with your frontend URL
  optionsSuccessStatus: 200,
};

if (!SERVER) {
  console.error('Error: MONGO_DB_SERVER is not defined in the environment variables.');
  process.exit(1);  // Exit the process if the environment variable is missing
}


// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// MongoDB connection
mongoose.connect(SERVER, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

// Waitlist email schema
const waitlistSchema = new mongoose.Schema({
    email: { type: String, required: true },
    date: { type: Date, default: Date.now }
});

const Waitlist = mongoose.model('Waitlist', waitlistSchema);

// API endpoint to submit email
app.post('/api/waitlist', async (req, res) => {
    const { email } = req.body;

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
    }

    try {
        const newEmail = new Waitlist({ email });
        await newEmail.save();
        res.status(201).json({ message: 'Email added to the waitlist' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));