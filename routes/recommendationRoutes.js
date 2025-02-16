const { getRecommendations } = require('../controllers/recommendationController');
const express = require('express');
const router = express.Router();

router.post('/recommendation', getRecommendations);

module.exports = router;