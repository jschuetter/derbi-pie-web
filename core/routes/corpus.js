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
    let [docs,] = await con.promise().execute(
        `
        SELECT * FROM corpus_master
        WHERE language = ?;
        `,
        [req.params.lang_name]
    );
    res.render('corpus', { docs });
});
// Route for specific author
router.get('/author/:author_name', async(req, res) => {
    let [docs,] = await con.promise().execute(
        `
        SELECT * FROM corpus_master
        WHERE author = ?;
        `,
        [req.params.author_name]
    );
    res.render('corpus', { docs });
});
// Route for specific document
const DOC_REPO_OWNER = 'jschuetter';
const DOC_REPO_NAME = 'derbi-pie-dev';
const DOC_REPO_PATH_PFX = 'corpus/texts/';
const DOC_REPO_BRANCH = 'main';
const REPO_BASE_URL = `https://raw.githubusercontent.com/${DOC_REPO_OWNER}/${DOC_REPO_NAME}/refs/heads/${DOC_REPO_BRANCH}/${DOC_REPO_PATH_PFX}`;
const STRUCT_FILE = '/sections.json';
router.get('/text/:corpus_id', async(req, res) => {
    // Optional query parameters for specifying section
    let section = req.query.section;

    let [docData,] = await con.promise().execute(
        `
        SELECT * FROM corpus_master
        WHERE corpus_master_id = ?;
        `,
        [req.params.corpus_id]
    );
    // Fetch document text sections
    // could be either 1 (book only) or 2 (book and chapter) dir levels
    const docURL = REPO_BASE_URL + docData[0].source_uri;
    const structURL = docURL + STRUCT_FILE;
    console.log("Fetch URL: " + structURL);
    let docSections = await fetch(structURL).then(response => {
        if (!response.ok) {
            throw new Error(`File retrieval error, status: ${response.statusText}\nURL:${sectionsURL}`);
        }
        return response.json();
    });

    // Sort docSections on book number first, then chapter number
    // docSections.sort((x, y) => {
    //     xParts = x.split("-");
    //     yParts = y.split("-");
    //     if (xParts[0] == yParts[0]) {
    //         // Test for chapter numbers
    //         if (xParts.length > 1 && yParts.length > 1) {
    //             if (xParts[1] > yParts[1]) { return 1; }
    //             else if (xParts[1] < yParts[1]) { return -1; }
    //             else { return 0; }
    //         } else { return 0; }  // If no chapter numbers, values are equal
    //     } else if (xParts[0] > yParts[0]) { return 1; }
    //     else { return -1; }
    // });
    console.log(docSections);
    
    // If no section, download first
    if (typeof(section) == 'undefined') {
        if (docSections[0].chapters) {
            section = `${docSections[0].book}/${docSections[0].chapters[0]}`;
        } else {
            section = docSections[0].book;
        }
    }
    // Get section text
    let sectionURL = `${docURL}/${section}.json`;

    let sectionTextJSON = await fetch(sectionURL).then(response => {
            if (!response.ok) {
                throw new Error(`File retrieval error, status: ${response.statusText}\nURL:${sectionURL}`);
            }
            return response.text();
        });
    // Don't query all of these on page load - slows things down
    // let tokenData = await(getDocTokens(req.params.corpus_id, docData[0].language));
    // Parse text & link tokens here?

    res.render('corpus', { docData, docSections, sectionTextJSON });
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

async function getDocTokens(doc_id, lang_name){
    // Get data for document 
    if (lang_name == 'latin') {
        const [results, ] = await con.promise().execute(
            `
            SELECT * FROM corpus_latin_tokens
            WHERE corpus_master_id = ?;
            `,
            [doc_id]
        );
        return results;
    } else {
        throw new Error("This language (" + lang_name + ") does not have a query method yet");
        return null;
    }
}

module.exports = router;