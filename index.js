const express = require('express');
const bodyParser = require('body-parser');
const jsonfile = require('jsonfile');
const fsp = require('fs').promises;

// environment variables
require('dotenv').config();
const DB_FILE = process.env.DB_FILE;
const DIRECTORY = process.env.DIRECTORY;
const PORT_NUMBER = process.env.PORT_NUMBER;

// global variables
let database = {};

const app = express();
app.use(express.static('static'));
app.set('view engine', 'ejs');

const urlencodedParser = bodyParser.urlencoded({extended: false});

/**
 * traverses video directory and stores all videos into a list.
 * updates DB with new videos, with source, counter, tags and vids.
 * checks all videos in DB and deletes if video is not in the stored list.
 */
async function updateDB() {
    jsonfile.readFile(DB_FILE)
        .then((data) => database = data ?? {})
        .catch((error) => console.log(error));
    const allFiles = [];
    let sources;
    try {
        sources = await fsp.readdir(DIRECTORY);
    } catch (error) {
        console.log(error);
        return;
    }
    for (const source of sources) {
        let titles;
        try {
            titles = await fsp.readdir(
                [DIRECTORY, source].join('/'), {withFileTypes: true},
            );
        } catch (error) {
            console.log(error);
            return;
        }
        titles = titles.filter((title) => title.isDirectory())
            .map((title) => title.name);
        for (const title of titles) {
            allFiles.push(title);
            let vids;
            try {
                vids = await fsp.readdir(
                    [DIRECTORY, source, title].join('/'),
                );
            } catch (error) {
                console.log(error);
            }
            if (Object.keys(database).includes(title)) {
                database[title]['source'] = source;
                database[title]['vids'] = vids;
            } else {
                database[title] = {
                    'source': source,
                    'counter': 0,
                    'tags': [],
                    'vids': vids,
                };
            }
        }
    }
    if (allFiles.length > 0) {
        for (const title of Object.keys(database)) {
            if (!allFiles.includes(title)) delete DB[title];
        }
    }
    jsonfile.writeFile(DB_FILE, database)
        .then((res) => console.log('write complete'))
        .catch((error) => console.log(error));

    return database;
}

app.get('/', [urlencodedParser], (req, res) => {
    filter = req.query.filter;
    if (filter && !Array.isArray(filter)) {
        filter = [filter];
    }
    updateDB()
        .then(
            (data) => {
                res.render('index', {data: data, filter: filter});
            },
            (error) => {
                console.log(error);
                res.render('index', {data: null, filter: filter});
            },
        ).catch((error) => console.log(error));
});

/**
 * 'watch' path handler with query of title.
 * access by /watch?title=<title>
*/
app.get('/watch', [urlencodedParser], (req, res) => {
    const title = req.query.title;
    res.render('watch', {title: title, data: database[title]});
});

app.listen(PORT_NUMBER);
