const express = require('express');
const bodyParser = require('body-parser');
const jsonfile = require('jsonfile');
const fs = require('fs');
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

/**
 * renders the main page.
 * filter query is used to filter the videos by source.
 * filter is handled by the ejs template.
 * access by /?filter=<source>
 */
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
 * renders the watch page with the information from the database.
 * access by /watch?title=<title>
*/
app.get('/watch', [urlencodedParser], (req, res) => {
    const title = req.query.title;
    res.render('watch', {title: title, data: database[title]});
});

/**
 * 'video' path handler with query of title and index.
 * returns video file data.
 * access by /video?title=<title>&index=<index>
 */
app.get('/video', [urlencodedParser], (req, res) => {
    const title = req.query.title;
    const index = req.query.index;
    let data;
    try {
        data = database[title];
    } catch (error) {
        console.log(error);
    }
    if (!data) {
        res.status(404).send('404 Not Found');
        return;
    }
    const video = data.vids[index];
    const videoPath = [DIRECTORY, data.source, title, video].join('/');
    let videoStat;
    try {
        videoStat = fs.statSync(videoPath);
    } catch (error) {
        console.log(error);
    }
    if (!videoStat) {
        res.status(404).send('404 Not Found');
        return;
    }
    const fileSize = videoStat.size;
    const videoRange = req.headers.range;
    if (videoRange) {
        const parts = videoRange.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(videoPath, {start, end});
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4',
        };
        res.writeHead(206, head);
        file.pipe(res);
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
        };
        res.writeHead(200, head);
        fs.createReadStream(videoPath).pipe(res);
    }
});

app.listen(PORT_NUMBER);
