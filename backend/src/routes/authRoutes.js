const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/login/guest', authController.guestLogin);

module.exports = router;
