const express = require('express');
const router = express.Router();
// const pluginManager = require('../pluginManager');

// Define the route to display the search form
router.get('/', (req, res) => {
    let searchFields = [
        {label:"Root shape", id: "rt_shape"},
        {label:"Root meaning", id: "rt_meaning"},
        {label:"Reflex", id: "reflex"},
        {label:"Reflex language", id: "lang"},
        {label:"Reflex meaning", id: "gloss"},
    ]

    // let searchData = pluginManager.getSearchFields()
    res.render('search', {fields: searchFields});
});

module.exports = router;
