const express = require('express');
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// MongoDB connection string

const mongoURI = 'mongodb+srv://delictodelight:E4DQPnTcN25S710t@cluster-health-insuranc.eaobusu.mongodb.net/';

mongoose.connect(mongoURI)
.then(() => console.log('MongoDB connected successfully.'))
.catch(err => console.log('MongoDB connection error', err));


app.get('/', (req, res) => {
    res.send('Hello, World!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});