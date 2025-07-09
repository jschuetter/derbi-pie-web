const express = require('express');
const router = express.Router();
const {searchID} = require("./results");

const uri = 'mongodb://localhost:27017';
const dbName = 'DERBI-PIE';
const client = new MongoClient(uri);

function capitalize(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
}


router.get('/:common_id', async (req, res) => {
    const common_id = req.params.common_id;

    const results = await searchID(common_id, ["liv", "pokorny", "common"])
    // const query = {common_id}

    // const commonCollection = client.db(dbName).collection("common")
    // const dictionaryEntry = await commonCollection.findOne(query)
    //
    // const pokornyCollection = client.db(dbName).collection("pokorny")
    // const pokornyEntry = await pokornyCollection.findOne(query)

    // results is a dict {"tableName": [results]}, and I need to loop through each (but not common), and process the reflexes
    let dictionaries = []
    let common = results["common"]
    for(let tableName in results){
        if(tableName === "common"){
            continue
        }
        // for each result in the table
        for(let result of results[tableName]){
            result.categorized = {}
            if(result && result.reflexes) {
                result.reflexes = expandSources(result.reflexes)
                result.categorized = categorizeReflexesByLanguage(result.reflexes)
            }
            result.reflexes = expandSources(results[tableName].reflexes)
            dictionaries.push({name: capitalize(tableName), data: result, categorizedReflexes: result.categorized})
        }
    }

    // create an entry from the data in pokorny (if it exists) and liv otherwise
    let entry = dictionaries.find((entry) => entry.name === "Pokorny") || dictionaries.find((entry) => entry.name === "Liv")
    if(!(entry && entry.data)){
        res.redirect("/404")
    }
    entry = entry.data

    // Render the dictionary entry template and pass the data
    res.render('dictionary', {entry, dictionaries, common});
});


function expandSources(reflexes) {
    for(let i in reflexes){
        let combinedSources = new Set();
        for(let source of reflexes[i].source.text_sources){
            combinedSources.add(JSON.stringify(source))
        }
        for(let source of reflexes[i].source.db_sources){
            combinedSources.add(JSON.stringify(source))
        }
        combinedSources = Array.from(combinedSources).map(JSON.parse);
        reflexes[i].combinedSources = combinedSources
    }
    return reflexes
}


function categorizeReflexesByLanguage(reflexes) {
    const categorizedObjects = {};

    reflexes.forEach(entry => {
        const languageFamily = entry.language.family_name;
        const subFamilyName = entry.language.sub_family_name;

        if (!categorizedObjects[languageFamily]) {
            categorizedObjects[languageFamily] = {};
        }

        if (!categorizedObjects[languageFamily][subFamilyName]) {
            categorizedObjects[languageFamily][subFamilyName] = [];
        }

        categorizedObjects[languageFamily][subFamilyName].push(entry);
    });
    return categorizedObjects;
}

module.exports = router;