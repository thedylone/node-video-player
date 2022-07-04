const express = require('express');
const bodyParser = require('body-parser');
const jsonfile = require('jsonfile');
const fs = require('fs');
const fsp = require('fs').promises;
const ejs = require('ejs');
const {nanoid} = require('nanoid');

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
            if (!Object.values(database).map((x) => {
                return x.title;
            }).includes(title)) {
                const generatedId = nanoid(12);
                database[generatedId] = {
                    title: title,
                    source: source,
                    counter: 0,
                    tags: [],
                    vids: vids,
                };
            }
        }
    }
    if (allFiles.length > 0) {
        for (const id of Object.keys(database)) {
            if (!allFiles.includes(database[id].title)) delete database[id];
        }
    }
    jsonfile.writeFile(DB_FILE, database)
        .then((res) => console.log('write complete'))
        .catch((error) => console.log(error));

    // return database;
    setTimeout(updateDB, 1000 * 60);
}

/**
 * adds to the database's id's counter.
 * writes the database to the database file.
 * returns the new counter.
 * @param {string} id the id of the video
 * @param {int} num the value to add to the counter
 * @return {int} the new counter
 */
async function addCount(id, num) {
    database[id].counter += parseInt(num);
    jsonfile.writeFile(DB_FILE, database)
        .then((res) => console.log('write complete'));
    return database[id].counter;
}

/**
 * removes id and its videos from the directory.
 * @param {string} id the id of the video
 * @return {boolean} true if successful, false otherwise
 */
async function deleteTitle(id) {
    const source = database[id].source;
    const title = database[id].title;
    const success = await fsp.rm([DIRECTORY, source, title].join('/'), {
        recursive: true,
    }, (error) => {
        if (error) {
            console.log('deleteTitle: ' + error);
            return false;
        } else {
            delete database[id];
            return true;
        }
    });
    if (success == undefined) return true;
    return false;
}

/**
 * updates the database with the new tags.
 * @param {string} id the id of the video
 * @param {string[]} tags the tags of the video
 * @return {boolean} true if successful, false otherwise
 */
async function updateTags(id, tags) {
    database[id].tags = tags;
    return jsonfile.writeFile(DB_FILE, database)
        .then((res) => {
            console.log('write complete');
            return true;
        }, (error) => {
            console.log(error);
            return false;
        });
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
    const search = req.query.search;
    const sources = new Set(Object.values(database).map((x)=> x.source));
    const data = JSON.parse(JSON.stringify(database));
    if (filter) {
        for (const id in data) {
            if (!filter.includes(data[id].source)) delete data[id];
        }
    }
    res.render('index', {
        sources: sources,
        data: data,
        filter: filter,
        search: search,
    });
    // updateDB()
    //     .then(
    //         (data) => {
    //             res.render('index', {
    //                 data: data,
    //                 filter: filter,
    //                 search: search,
    //             });
    //         },
    //         (error) => {
    //             console.log(error);
    //             res.render('index', {
    //                 data: null,
    //                 filter: filter,
    //                 search: search,
    //             });
    //         },
    //     ).catch((error) => console.log(error));
});

/**
 * GET 'watch' path handler with query of id.
 * renders the watch page with the information from the database.
 * access by /watch?id=<id>
*/
app.get('/watch', [urlencodedParser], (req, res) => {
    const id = req.query.id;
    const title = database[id] ? database[id].title : '404';
    res.render('watch', {title: title, id: id, data: database[id]});
});

/**
 * GET 'video' path handler with query of id and index.
 * returns video file data.
 * access by /video?id=<id>&index=<index>
 */
app.get('/video', [urlencodedParser], (req, res) => {
    const id = req.query.id;
    const index = req.query.index;
    let data;
    try {
        data = database[id];
    } catch (error) {
        console.log(error);
    }
    if (!data) {
        res.status(404).send('404 Not Found');
        return;
    }
    const video = data.vids[index];
    const title = data.title;
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
 * POST 'count' path handler. adds to the database's id's counter.
 * returns the new counter.
 * access by /count with body of {id: <id>, num: <num>}
 */
app.post('/count', [urlencodedParser], (req, res) => {
    let id;
    let num;
    try {
        id = req.body.id;
        num = req.body.num;
    } catch (error) {
        console.log(error);
    }
    if (!id || !num) {
        res.status(400).send('400 Bad Request');
        return;
    }
    addCount(id, num)
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
 * POST 'delete' path handler. deletes id and its videos from the directory.
 * returns true if successful, false otherwise.
 * access by /delete with body of {id: <id>}
 */
app.post('/delete', [urlencodedParser], (req, res) => {
    let id;
    try {
        id = req.body.id;
    } catch (error) {
        console.log(error);
    }
    if (!id) {
        res.status(400).send('400 Bad Request');
        return;
    }
    deleteTitle(id)
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

/**
 * POST 'tags' path handler. updates the database's id's tags.
 * returns true if successful, false otherwise.
 * access by /tags with body of {id: <id>, tags: <tags>}
 */
app.post('/tags', [urlencodedParser], (req, res) => {
    let id;
    let tags;
    try {
        id = req.body.id;
        tags = req.body['tags[]'];
        if (tags && !Array.isArray(tags)) {
            tags = [tags];
        } else if (!tags) {
            tags = [];
        }
    } catch (error) {
        console.log(error);
    }
    if (!id || !tags) {
        res.status(400).send('400 Bad Request');
        return;
    }
    updateTags(id, tags)
        .then((success) => {
            if (success) {
                res.status(200).send('200 OK');
            } else {
                res.status(500).send('500 Internal Server Error');
            }
        }).catch((error) => {
            console.log('/tags catch: ' + error);
            res.status(500).send('500 Internal Server Error');
        });
});

updateDB();
app.listen(PORT_NUMBER);
