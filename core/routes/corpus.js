const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const con = require('../mysqlConnection')
const fs = require("fs");

router.get('/', async (req, res) => {
    // Check available query parameters
    if (Object.hasOwn(req.query, 'search')) {
        let docs = await(getResults(req.query));
        let related = docs.slice(1);
        // N.B. only handles exact lemma matches right now - will have to handle cases where sense_num is null in the future
        if (docs.length > 0) {
            res.render('corpus', { docs });
        } else {
            console.log("No results to render.");
            res.render('corpus');
        }
    } else {
        console.log("No valid query params found.");
        res.render('corpus');
    }
    
});

// Route for specific language
router.get('/lang/:lang_name', async(req, res) => {
    let docs = await(getLang(req.params.lang_name));
    res.render('corpus', { docs });
});
// Route for specific author
router.get('/author/:author_name', async(req, res) => {
    let docs = await(getAuthor(req.params.author_name));
    res.render('corpus', { docs });
});
// Route for specific document
router.get('/text/:corpus_id', async(req, res) => {
    res.render('corpus');
    // let docData = await(getDoc(req.params.corpus_id))
    // res.render('corpus', {docData});
});

// Copied from results.js
async function getResults(data){
    // Perform the database query to retrieve search results
    let pattern = "%" + data.search + "%"
    //For now: select top result only
    const [results, ] = await con.promise().execute(
        `
        SELECT * FROM corpus_master
        WHERE title LIKE ?
        OR author LIKE ?;
        `,
        [pattern, pattern]
    );
    return results;
}
async function getLang(lang_str){
    // Get all documents marked with language
    const [results, ] = await con.promise().execute(
        `
        SELECT * FROM corpus_master
        WHERE language = ?;
        `,
        [lang_str]
    );
    return results;
}
async function getAuthor(author_str){
    // Get all documents marked with language
    const [results, ] = await con.promise().execute(
        `
        SELECT * FROM corpus_master
        WHERE author = ?;
        `,
        [author_str]
    );
    return results;
}

module.exports = router;