const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const con = require('../mysqlConnection')
const fs = require("fs");

router.get('/', async (req, res) => {
    // Check available query parameters
    if (Object.hasOwn(req.query, 'search')) {
        let searchResults = await(getResults(req.query));
        let related = searchResults.slice(1);
        // N.B. only handles exact lemma matches right now - will have to handle cases where sense_num is null in the future
        if (searchResults.length > 0) {
            res.redirect('/latin/lemma/' + searchResults[0].lemma_id);
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
    let lemmaData = await getSenses(req.params.lemma_id);
    // Query for related lemmas
    lemmaData["related"] = await getRelated(lemmaData.main);
    let etymData = await getEtym(lemmaData.main);
    lemmaData["etym"] = etymData.etym;
    lemmaData["cognates"] = etymData.cognates;
    console.log(lemmaData);

    res.render('latin', { lemmaData });
});

// Copied from results.js
async function getResults(data){
    // Perform the database query to retrieve search results
    // let pattern = "%" + data.search + "%"
    // Exact match only for now
    let pattern = data.search
    //For now: select top result only
    const [results, ] = await con.promise().execute(
        `
        SELECT * FROM lex_master
        WHERE lemma LIKE ?;
        `,
        [pattern]
    );
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

async function getRelated(entry_obj) {
    // For now, just query exact lemma matches, not matching
    // lemma_id
    const [relatedEntries, ] = await con.promise().execute(
        `
        SELECT * FROM lex_master
        WHERE lemma = ?
        AND NOT lemma_id = ?;
        `,
        [entry_obj.lemma, entry_obj.lemma_id]
    );
    return relatedEntries

}

async function getEtym(entry_obj) {
    // Search for etymology data related to lexicon entry
    const [lexRefEntries, ] = await con.promise().execute(
        `
        SELECT * FROM lex_ref_link
        WHERE word_id = ?
        `,
        [entry_obj.lemma_id]
    );
    // Generate placeholders for all distinct rt_ref_link_ids returned
    const rtRefIds = lexRefEntries.map((e) => e.rt_ref_link_id);
    const rtRefIdPlaceholders = lexRefEntries.map(() => '?').join(',');
    if (!lexRefEntries.length || !rtRefIds.length) {
        return {'etym': null, 'cognates': null}
    }

    const [cognates, ] = await con.promise().execute(
        `
        SELECT orig_lang_abbrev, reflex, gloss_eng
        FROM lex_ref_link
        WHERE rt_ref_link_id IN (${rtRefIdPlaceholders})
        `,
        rtRefIds
    );

    const [etym, ] = await con.promise().execute(
        `
        SELECT * FROM rt_ref_link
        WHERE rt_ref_link_id IN (${rtRefIdPlaceholders})
        `,
        rtRefIds
    );

    return {'etym': etym, 'cognates': cognates};
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