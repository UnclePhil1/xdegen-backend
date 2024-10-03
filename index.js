// Load environment variables
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { PublicKey } = require('@solana/web3.js'); // Import Solana web3 for signature verification
const nacl = require('tweetnacl'); // To verify signatures

// Initialize express app
const app = express();

// Get PORT and MongoDB connection string from environment variables
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_DB_SERVER;

// Check if MONGO_DB_SERVER is defined
if (!MONGO_URI) {
  console.error('Error: MONGO_DB_SERVER is not defined in the environment variables.');
  process.exit(1);  // Exit the process if the environment variable is missing
}

// Middleware
app.use(cors({
    origin: '*', // Allow all origins or specify your frontend URL
    methods: 'GET,POST'
}));

// Enable CORS
app.use(express.json()); // Parse incoming JSON requests

// MongoDB connection
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);  // Exit if the connection fails
  });

// Waitlist schema and model
const waitlistSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true }, // Ensure email is unique
  date: { type: Date, default: Date.now },
});

const Waitlist = mongoose.model('Waitlist', waitlistSchema);

// API endpoint to add email to the waitlist
app.post('/api/waitlist', async (req, res) => {
  const { email } = req.body;

  // Validate email format
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  try {
    // Check if email is already in the waitlist
    const existingEmail = await Waitlist.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({ message: 'Email is already in the waitlist' }); // 409 Conflict
    }

    // Add new email to the waitlist
    const newEmail = new Waitlist({ email });
    await newEmail.save();
    return res.status(201).json({ message: 'Email added to the waitlist' });
  } catch (error) {
    console.error('Error adding email:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// API endpoint for Solana wallet authentication
app.post('/api/auth/verify', async (req, res) => {
  const { publicKey, signature, message } = req.body;

  if (!publicKey || !signature || !message) {
      console.log('Missing parameters:', { publicKey, signature, message });
      return res.status(400).json({ message: 'Missing parameters' });
  }

  try {
      // Decode the public key from Base58
      const pubKey = new PublicKey(publicKey);
      const encodedMessage = new TextEncoder().encode(message);
      const signatureUint8 = Uint8Array.from(signature); // Convert the signature back to Uint8Array

      console.log('Received message:', message);
      console.log('Received signature:', signature);
      console.log('Received publicKey:', publicKey);

      // Verify the signed message using tweetnacl
      const isValid = nacl.sign.detached.verify(encodedMessage, signatureUint8, pubKey.toBytes());

      if (isValid) {
          // If the signature is valid, return a success response
          return res.status(200).json({ message: 'Signature verified', isValid: true });
      } else {
          console.log('Invalid signature for message:', message);
          return res.status(401).json({ message: 'Invalid signature', isValid: false });
      }
  } catch (error) {
      console.error('Error verifying signature:', error.message);
      return res.status(500).json({ message: 'Server error' });
  }
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
