const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const con = require('../mysqlConnection')
const fs = require("fs");

router.get('/', async (req, res) => {
    console.log("Query:");
    console.log(req.params);
    // Check available query parameters
    if (Object.hasOwn(req.query, 'search')) {
        let searchResults = await(getResults(req.query));
        console.log("Results:");
        console.log(searchResults);
        let related = searchResults.slice(1);
        // N.B. only handles exact lemma matches right now - will have to handle cases where sense_num is null in the future
        querystring = related.length ? '/?' + related.map(a => 'related=' + a.lemma_id + ',' + a.lemma + a.sense_num).join('&') : '';
        if (searchResults.length > 0) {
            res.redirect('/latin/lemma/' + searchResults[0].lemma_id + querystring);
        } else {
            console.log("No results to render.");
            res.render('latin');
        }
    } else {
        console.log("No valid query params found.");
        res.render('latin');
    }
    
});

// Route for lemma definition
router.get('/lemma/:lemma_id', async(req, res) => {
    // Render lemma data
    console.log("Render lemma: " + req.params.lemma_id)
    let lemmaData = await(getSenses(req.params.lemma_id));
    console.log("DATA:");
    console.log(lemmaData.main);
    console.log(lemmaData.senses[0]);
    if (Object.hasOwn(req.query, 'related')) {
        console.log("Related: " + req.query.related);
        console.log(typeof(req.query.related));
        let relatedEntries = []

        if (typeof(req.query.related) == 'string') {
            let [id, lemma] = req.query.related.split(',');
            relatedEntries = [{
                'id': id,
                'lemma': lemma
            }]
        } else {
            req.query.related.forEach((e) => {
                let [id, lemma] = e.split(',');
                relatedEntries.push({
                    'id': id,
                    'lemma': lemma
                })
            });
        }
        lemmaData["related"] = relatedEntries;
    }
    console.log(lemmaData);
    res.render('latin', { lemmaData });
});

// Copied from results.js
async function getResults(data){
    // Perform the database query to retrieve search results

    // console.log("Search for:");
    // console.log(data);

    // let pattern = "%" + data.search + "%"
    // Exact match only for now
    let pattern = data.search
    console.log(pattern)
    //For now: select top result only
    const [results, ] = await con.promise().execute(
        `
        SELECT * FROM lex_master
        WHERE lemma LIKE ?;
        `,
        [pattern]
    );
    // console.log(results);
    return results;
}

async function getSenses(lemma_id){
    //Get main entry
    const [[mainEntry, ]] = await con.promise().execute(
        `
        SELECT * FROM lex_master
        WHERE lemma_id = ?;
        `,
        [lemma_id]
    );
    //Get entry senses
    const [senseEntries, ] = await con.promise().execute(
        `
        SELECT * FROM lex_senses
        WHERE lemma_id = ?;
        `,
        [lemma_id]
    );
    return {
        main: mainEntry,
        senses: senseEntries
    };
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