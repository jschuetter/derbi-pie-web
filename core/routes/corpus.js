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
router.get('/text/:corpus_id', async(req, res) => {
    let [docData,] = await con.promise().execute(
        `
        SELECT * FROM corpus_master
        WHERE corpus_master_id = ?;
        `,
        [req.params.corpus_id]
    );
    // Fetch document text
    console.log("Fetch URL: " + docData[0].source_url);
    let text = await fetch(docData[0].source_url).then(response => {
        if (!response.ok) {
            throw new Error(`File retrieval error, status: ${response.status}`);
        }
        return response.text()
    });
    // Preprocess text
    // Don't query all of these on page load - slows things down
    let tokenData = await(getDocTokens(req.params.corpus_id, docData[0].language));
    textHTML = processDoc(text, docData[0].source, tokenData);
    // Parse text & link tokens here?
    res.render('corpus', { docData, textHTML, tokenData });
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

// async function getDoc(doc_id){
//     // Get data for document 
//     const [results, ] = await con.promise().execute(
//         `
//         SELECT * FROM corpus_master
//         WHERE corpus_master_id = ?;
//         `,
//         [doc_id]
//     );
//     return results;
// }
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

function processDoc(text, src_name, token_data) {
    if (src_name == 'tesserae') {
        let preprocessedHTML = '';
        // Break text into lines, annotate with book & line numbers
        let lines = text.split('\n');
        let tokenIdx = 0;
        const regex = /^<[^>]*?(\d+(?:\-\d+)?)(?:\.([a-zA-Z0-9]+))?(?:\.(\d+))?>\s*(.*)$/
        lines.forEach(element => {
            if (element.trim().length == 0) {
                return;
            }
            // Parse out book, chapter, & line number annotations
            let bookNum, chapterNum, lineNum, lineText;
            const m = element.match(regex);
            if (m) {
                // If 3 digits
                if (typeof(m[3]) !== 'undefined') {
                    [, bookNum, chapterNum, lineNum, lineText] = m;
                } else {
                    // If 2 digits or less
                    [, bookNum, lineNum, , lineText] = m;
                }
            } else {
                throw new Error("Could not find line annotation in line " + element);
            }

            let attrs = '';
            let note = '';
            if (bookNum) { 
                attrs += `book=${bookNum} `;
                note += `${bookNum}.`;
            }
            if (chapterNum) {
                attrs += `chapter=${chapterNum} `;
                note += `${chapterNum}.`;
            }
            if (lineNum) {
                attrs += `line=${lineNum}`;
                note += `${lineNum}`;
            }

            let tokens = lineText.split(' ');
            tokens.forEach(token => {
                token = token.strip(' ,.“”');
            });
            
            preprocessedHTML += `<tr> <td class='text-note'>${note}</td> <td class='text-line' ${attrs}> ${lineText}</td> </tr>\n`;
        });
        return preprocessedHTML;
    } else {
        throw new Error(`This source (${src_name}) does not have a parser yet`);
    }
}

module.exports = router;