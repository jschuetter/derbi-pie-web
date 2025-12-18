// Internal route for querying token dataa

const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const con = require('../mysqlConnection')
const fs = require("fs");

async function getTokenData(token_id, lang_name){
    
}

// Middleware to restrict route to internal use only
// Google AI, based on Go/chix https://pkg.go.dev/github.com/lrstanley/chix
const internal_only = (req, res, next) => {
    const internalIP = ['::1', '127.0.0.1', '::ffff:127.0.0.1'];
    if (internalIP.includes(req.ip)) {
        next();
    } else {
        res.status(403).json( { "error": "Access denied: Internal use only." });
    }
};

router.get('/latin/:corpus_id/:token_id', internal_only, async(req, res) => {
// router.get('/latin/:corpus_id/:token_id', async(req, res) => {
    try {
        const [results, ] = await con.promise().execute(
            `
            SELECT * FROM corpus_latin_tokens
            WHERE doc_token_index = ?
            AND corpus_master_id = ?;
            `,
            [req.params.token_id, req.params.corpus_id]
        );
        res.json({
            success: true,
            data: results
        });
    } catch (err) {
        console.error("Internal Route Error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;