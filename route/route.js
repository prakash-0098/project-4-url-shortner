const express = require('express');
const router = express.Router();

const urlController = require('../controller/url.controller');

router.post('/url/shorten', urlController.createShortURL);
router.get('/:urlCode', urlController.redirectToOriginalURL);


module.exports = router; 