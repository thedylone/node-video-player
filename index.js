const express = require('express');
const bodyParser = require('body-parser');
const jsonfile = require('jsonfile');
const fs = require('fs');
const fsp = require('fs').promises;
const ejs = require('ejs');

ejs.openDelimiter = '[';
ejs.closeDelimiter = ']';

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
            if (!allFiles.includes(title)) delete database[title];
        }
    }
    jsonfile.writeFile(DB_FILE, database)
        .then((res) => console.log('write complete'))
        .catch((error) => console.log(error));

    return database;
}

/**
 * adds to the database's title's counter.
 * writes the database to the database file.
 * returns the new counter.
 * @param {string} title the title of the video
 * @param {int} num the value to add to the counter
 * @return {int} the new counter
 */
async function addCount(title, num) {
    database[title].counter += parseInt(num);
    jsonfile.writeFile(DB_FILE, database)
        .then((res) => console.log('write complete'));
    return database[title].counter;
}

/**
 * removes title and its videos from the directory.
 * @param {string} title the title of the video
 * @return {boolean} true if successful, false otherwise
 */
async function deleteTitle(title) {
    const source = database[title].source;
    const success = await fsp.rm([DIRECTORY, source, title].join('/'), {
        recursive: true,
    }, (error) => {
        if (error) {
            console.log('deleteTitle: ' + error);
            return false;
        } else {
            delete database[title];
            console.log(database);
            return true;
        }
    });
    if (success == undefined) return true;
    return false;
}

/**
 * GET renders the main page.
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
 * GET 'watch' path handler with query of title.
 * renders the watch page with the information from the database.
 * access by /watch?title=<title>
*/
app.get('/watch', [urlencodedParser], (req, res) => {
    const title = req.query.title;
    res.render('watch', {title: title, data: database[title]});
});

/**
 * GET 'video' path handler with query of title and index.
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

/**
 * POST 'count' path handler. adds to the database's title's counter.
 * returns the new counter.
 * access by /count with body of {title: <title>, num: <num>}
 */
app.post('/count', [urlencodedParser], (req, res) => {
    let title;
    let num;
    try {
        title = req.body.title;
        num = req.body.num;
    } catch (error) {
        console.log(error);
    }
    if (!title || !num) {
        res.status(400).send('400 Bad Request');
        return;
    }
    addCount(title, num)
        .then((count) => {
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end(count.toString());
        })
        .catch((error) => {
            console.log(error);
            res.status(500).send('500 Internal Server Error');
        });
});

/**
 * POST 'delete' path handler. deletes title and its videos from the directory.
 * returns true if successful, false otherwise.
 * access by /delete with body of {title: <title>}
 */
app.post('/delete', [urlencodedParser], (req, res) => {
    let title;
    try {
        title = req.body.title;
    } catch (error) {
        console.log(error);
    }
    if (!title) {
        res.status(400).send('400 Bad Request');
        return;
    }
    deleteTitle(title)
        .then((success) => {
            if (success) {
                res.status(200).send('200 OK');
            } else {
                res.status(500).send('500 Internal Server Error');
            }
        }).catch((error) => {
            console.log('/delete catch: ' + error);
            res.status(500).send('500 Internal Server Error');
        });
});

updateDB();
app.listen(PORT_NUMBER);
