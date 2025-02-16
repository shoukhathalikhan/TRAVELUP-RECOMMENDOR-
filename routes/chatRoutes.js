// routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const { travelChat } = require('../controllers/chatController');





router.post('/chat', travelChat);

module.exports = router;