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

        // // if there is a single result, we redirect to it
        // if (searchResults.length === 1) {
        //     res.redirect(`/dictionary/${encodeURIComponent(searchResults[0].common_id)}`);
        //     return
        // }

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

    const [results, fields] = await con.promise().query(
        'SELECT * FROM rt_master WHERE rt_shape = "'+data.search+'"',
    );

    console.log(results)

    return results

    // switch between a regular search and an advanced search. regular search is default.
    if (data && data.submit && data.submit === "advanced"){
        searchResults = await newAdvancedSearch(data);
    }else{
        let rootQuery = getPatternedRootQuery(data["search"])
        let rootMeaningQuery = getRootMeaningQuery(data["search"])
        let query = {"$or": [rootQuery, rootMeaningQuery]}
        searchResults = await searchAll(query)
    }

    return searchResults
}

// region helpers
function escapeRegExp(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

async function searchID(id, collection_names) {
    if(collection_names === undefined){
        collection_names = ["liv", "pokorny"]
    }
    let results = {}
    for(let collection_name of collection_names){
        results[collection_name] = await performSearch({"common_id": id}, collection_name)
    }
    return results
}

async function searchIDs(ids, collection_names) {
    // fixme: this should actually probably find what all the available collection names are as default and not just assume like it currently does.
    if(collection_names === undefined){
        collection_names = ["liv", "pokorny"]
    }
    let results = {}
    for(let collection_name of collection_names){
        results[collection_name] = await performSearch({"common_id": {"$in": ids}}, collection_name)
    }
    return results
}

async function searchAll(query, collection_names) {
    if(collection_names === undefined){
        collection_names = ["liv", "pokorny"]
    }
    // run performSearch on each collection, and then combine based on common_id
    let common_ids = []
    for(let collection_name of collection_names){
        const results = await performSearch(query, collection_name)
        // for each, extract the common_id and combine them all into one list
        common_ids = common_ids.concat(results.map((item) => item.common_id))
    }

    // remove duplicates
    common_ids = [...new Set(common_ids)]
    common_ids.sort()

    // run performSearch on common with the list of common_ids
    return await performSearch({"common_id": {"$in": common_ids}}, "common")
}

async function performSearch(query, collection_name) {
    try {
        const collection = client.db(dbName).collection(collection_name)
        const results = await collection.find(query).toArray()
        return results
    }
    catch (e) {
        return []
    }
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
// endregion

/********************************************
 * disabling advanced search for now
 

// region search functions
async function pluginSearch(data){
    // pass the data to each plugin.
    // fixme: currently every plugin is given the entire search data, but this can be limited if we want to.
    const availableCollections = ["liv", "pokorny"]
    let searchQueries = pluginManager.getSearchQueries()

    let pluginIDs = []

    for(let {searchMethod, searchCollections} of searchQueries){
        let query = searchMethod(data)
        let collections = searchCollections(data, availableCollections)

        // run performSearch on each collection, and then combine based on common_id
        let commonIDs = []
        for(let collection_name of collections){
            const results = await performSearch(query, collection_name)
            // for each, extract the common_id and combine them all into one list
            commonIDs = commonIDs.concat(results.map((item) => item.common_id))
        }
        // remove duplicates
        pluginIDs.push([...new Set(commonIDs)])
    }

    // do a set intersection on every list of ids to act as an AND statement between them all
    let finalIDs = undefined
    for(let idList of pluginIDs){
        if(finalIDs === undefined){
            finalIDs = new Set(idList)
        }else{
            finalIDs.intersection(new Set(idList))
        }
    }
    finalIDs = [...finalIDs]

    finalIDs.sort()

    // run performSearch on common with the list of common_ids
    return await performSearch({"common_id": {"$in": finalIDs}}, "common")
}


async function newAdvancedSearch(data) {
    return await pluginSearch(data)
}

function getPatternedRootQuery(searchPattern) {
    if (searchPattern === "" || searchPattern === undefined){
        return {}
    }
    // query for searching roots, needs to be ignored if there are no searched roots
    const regex = patternedRegex(searchPattern)
    return {"searchable_roots": {"$regex": regex}}
}

function getRootMeaningQuery(searchString) {
    if (searchString === "" || searchString === undefined){
        return {}
    }
    const searchRegex = escapeRegExp(searchString)
    return {"meaning": {"$regex": searchRegex, "$options": "i"}}
}
// endregion

********************************************/

module.exports = {resultsRoutes: router, getResults, searchID, searchIDs};