const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const con = require('../mysqlConnection')
const fs = require("fs");

// entry point for the code
router.get('/', async (req, res) => {
    try {
        let queryString = req.originalUrl.split('?')[1];
        let special = false
        // special case when you just go to results
        if (queryString === undefined) {
            queryString = "search="
            req.query = {'search': '', 'submit': 'normal'}
            special = true
        }
        let searchResults = await getResults(req.query)
        console.log(req.query)
        // if there is a single result, we redirect to it
        if (searchResults.length === 1) {
            res.redirect(`/dictionary/${encodeURIComponent(searchResults[0].rt_master_id)}`);
            return
        }

        // Render the search results page
        res.render('results', {results: searchResults, queryString: queryString ? `?${queryString}` : '', renderIndex: special});
    }
    catch (error) {
        console.error(error)
        res.render('results', {results: [], queryString: ''});
    }
});

async function getResults(data){
    // Perform the database query to retrieve search results
    let searchResults = []

    console.log("Search for:");
    console.log(data);


    // switch between a regular search and an advanced search. regular search is default.
    if (data && data.submit && data.submit === "advanced"){
        return {}
        results = await newAdvancedSearch(data);
    }else{
        let quoteSplit = data.search.split('"');
        let [defSearch] = quoteSplit.splice(1,1);
        defSearch = defSearch ? "%"+defSearch+"%" : "%%";
        let shapeSearch = quoteSplit.join("");
        console.log(defSearch)

        let pattern = patternedRegex(shapeSearch);
        console.log(pattern)
        const [results, ] = await con.promise().execute(
            `
            select * from rt_master where (
                ((
                    rt_shape regexp ?
                ) or (
                    rt_master_id in (
                        select rt_master_id from rt_ref_link where rt_shape regexp ?
                    )
                )) and (
                    rt_meaning like ?
                ) 
            ) and (rt_shape is not null);
            `,
            [pattern, pattern, defSearch]
        );
        // console.log(results);
        return results;
    }
}

// region helpers
function escapeRegExp(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

function patternedRegex(pseudoRegex) {
    const path = "private/regex.json"
    const data = fs.readFileSync(path)
    const linguisticDict = JSON.parse(data)
    // Create a regex pattern to search for keys in the dictionary
    const keysPattern = Object.keys(linguisticDict).map(escapeRegExp).join('|');
    const pattern = new RegExp(`(${keysPattern})`, 'g')
    const regexArray = pseudoRegex
        .split('OR')
        .map((item) => item.trim())
        .map((item) => item.replace(pattern, (match) => linguisticDict[match]))
        .map((item) => `(?:${item})`)
    return `${regexArray.join('|')}`
}

module.exports = {resultsRoutes: router, getResults};