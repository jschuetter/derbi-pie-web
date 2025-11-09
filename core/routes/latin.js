const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const con = require('../mysqlConnection')
const fs = require("fs");

router.get('/:lemma_id?', async (req, res) => {
    // console.log(req);
    console.log("Query:");
    console.log(req.params);
    console.log(typeof(req.params));
    console.log(req.params.lemma_id);
    // Check available query parameters
    if (Object.hasOwn(req.query, 'search')) {
        let searchResults = await(getResults(req.query));
        console.log("Results:");
        console.log(searchResults);
        if (searchResults.length > 0) {
            res.redirect('/latin/' + searchResults[0].lemma_id);
        } else {
            console.log("No results to render.");
            res.render('latin');
        }
    } else if (req.params.lemma_id !== undefined) {
        // Render lemma data
        console.log("Render lemma: " + req.params.lemma_id)
        let lemmaData = await(getSenses(req.params.lemma_id));
        console.log("DATA:");
        console.log(lemmaData);
        res.render('latin', { lemmaData });
    } else {
        console.log("No valid query params found.");
        res.render('latin');
    }
    
});

// Copied from results.js
async function getResults(data){
    // Perform the database query to retrieve search results
    let searchResults = []

    // console.log("Search for:");
    // console.log(data);

    let pattern = "%" + data.search + "%"
    console.log(pattern)
    //For now: select top result only
    const [results, ] = await con.promise().execute(
        `
        SELECT * FROM lex_master
        WHERE lemma LIKE ?
        LIMIT 1;
        `,
        [pattern]
    );
    // console.log(results);
    return results;
}

async function getSenses(lemma_id){
    //Get main entry
    const [mainEntry, ] = await con.promise().execute(
        `
        SELECT * FROM lex_master
        WHERE lemma_id = ?;
        `,
        [lemma_id]
    );
    //Get entry senses
    const [senses, ] = await con.promise().execute(
        `
        SELECT * FROM lex_senses
        WHERE lemma_id = ?;
        `,
        [lemma_id]
    );
    return mainEntry.concat(senses);
}

// // region helpers
// function escapeRegExp(str) {
//     return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
// }

// function patternedRegex(pseudoRegex) {
//     const path = "private/regex.json"
//     const data = fs.readFileSync(path)
//     const linguisticDict = JSON.parse(data)
//     // Create a regex pattern to search for keys in the dictionary
//     const keysPattern = Object.keys(linguisticDict).map(escapeRegExp).join('|');
//     const pattern = new RegExp(`(${keysPattern})`, 'g')
//     const regexArray = pseudoRegex
//         .split('OR')
//         .map((item) => item.trim())
//         .map((item) => item.replace(pattern, (match) => linguisticDict[match]))
//         .map((item) => `(?:${item})`)
//     return `${regexArray.join('|')}`
// }

module.exports = router;