const express = require('express');
const router = express.Router();
const {searchID} = require("./results");
const con = require('../mysqlConnection')

function capitalize(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
}


router.get('/:common_id', async (req, res) => {
    const root_id = req.params.common_id;

    let [[entry], ] = await con.promise().execute(
            'select * from rt_master where rt_master_id=?;',
        [root_id]
    );

    console.log(entry)

    let [dictionary, ] = await con.promise().execute(
        `
            select * from lex_ref_link where 
                (ref_id, ref_rt_index) in (
                    select ref_id, ref_rt_index from rt_ref_link where rt_master_id=?
                ) and form_in_ref is not null;
        `,
        [root_id]
    );

    if(!entry){
        res.redirect("/404")
    }

    res.render('dictionary', {entry, dictionary});
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