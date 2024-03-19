const express = require('express');
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json()); // Middleware for parsing JSON bodies

// Importing the insurance plan routes
const insurancePlanRoutes = require('./routes/insurancePlanRoutes');

// MongoDB connection string

const mongoURI = 'mongodb+srv://delictodelight:E4DQPnTcN25S710t@cluster-health-insuranc.eaobusu.mongodb.net/';

mongoose.connect(mongoURI)
.then(() => console.log('MongoDB connected successfully.'))
.catch(err => console.log('MongoDB connection error', err));


// Use the insurance plan routes with '/api/plans' as the base path
app.use('/api/plans', insurancePlanRoutes);

app.get('/', (req, res) => {
    res.send('Hello, World!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});