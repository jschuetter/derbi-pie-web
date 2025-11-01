const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    //Check for search query from search bar?

    // Check for results queryparams when rendering?
    res.render('latin');
});

module.exports = router;
