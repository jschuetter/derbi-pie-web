const express = require('express');
const router = express.Router();
// const pluginManager = require('../pluginManager');

// Define the route to display the search form
router.get('/', (req, res) => {
    res.render('construction');
});

module.exports = router;
