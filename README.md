# node-video-player

A small self-hosted video library. It scans a folder of videos, shows them in a
searchable gallery with hover previews, and lets you watch them in the browser.
Each title has a play counter and tags, which are stored in a JSON file.

- React + React Router client (Vite)
- Express server that scans the folder, streams videos and serves the API
- Thumbnails generated with ffmpeg (optional)

> **No access control.** Anyone who can reach the server can change counts and
> tags, and can **delete title folders from disk**. Only run it on a trusted
> network.

## Requirements

- Node.js 22.22+ or 24.15+ (the current LTS releases)
- ffmpeg and ffprobe, only for thumbnails. Without them the server still runs;
  titles just have no poster image.

## Setup

```sh
npm ci
cp .env.example .env   # then edit .env
```

### Configuration

Settings are read from `.env` in the folder you start the server from.
Environment variables set in the shell take precedence over `.env`.

| Variable       | Default   | Description                                                    |
| -------------- | --------- | -------------------------------------------------------------- |
| `DIRECTORY`    | `videos`  | Folder holding the videos (see below). Relative or absolute.   |
| `DB_FILE`      | `db.json` | JSON database file. Created on the first save if missing.      |
| `FFMPEG_PATH`  |           | Path to the ffmpeg executable. Needed for thumbnails.          |
| `FFPROBE_PATH` |           | Path to the ffprobe executable. Needed for thumbnails.         |
| `PORT`         | `3000`    | Port for `npm start`. `npm run dev` uses Vite's port instead.  |

### Folder layout

Videos are stored as `DIRECTORY/<source>/<title>/*.mp4`:

```
videos/                  <- DIRECTORY
└── source/
    └── title/
        ├── video1.mp4
        └── video2.mp4
```

For example, with `DIRECTORY=hololive`:

```
hololive/
├── suisei/              <- source
│   ├── tetris/          <- title
│   │   ├── tetris1.mp4
│   │   └── tetris2.mp4
│   └── mario kart/
│       └── mario.mp4
└── pekora/
    └── minecraft/
        └── tnt.mp4
```

- Each title folder becomes one entry in the gallery; its `.mp4` files are
  listed on the watch page in natural order (`2.mp4` before `10.mp4`).
- The folder is scanned on startup and then every 60 seconds. New titles and new
  videos show up after the next scan; removed folders are dropped from the
  database.
- If ffmpeg is configured and a title folder has no `tn.png`, a thumbnail is
  made from the middle of its first video and saved there as `tn.png`. Delete
  `tn.png` to make a new one. Thumbnails are made one at a time. If one fails,
  that video is tried again after 5 minutes, then 10, 20 and so on, up to once
  a day (the wait resets when the server restarts).
- Renaming or moving a title folder keeps its id, count and tags, as long as
  its video file names stay the same. This is recognised by the file names, so
  if several titles that moved or disappeared together have the same names
  (e.g. just `1.mp4`), they can't be told apart and start over. A folder that
  comes back within 10 minutes of being removed also keeps its count and tags.

## Running

| Command                                      | What it does                                                          |
| -------------------------------------------- | --------------------------------------------------------------------- |
| `npm run dev`                                | Dev server with hot reload; the API runs inside Vite (port 5173).     |
| `npm run build`                              | Type-checks and builds the client into `dist/`.                       |
| `npm run build:server`                       | Bundles the server into `dist-server/`.                               |
| `npm start`                                  | Runs the built server, serving `dist/` and the API on `PORT`.         |
| `npm test`                                   | Runs the tests once (`npm run test:watch` reruns them on changes).    |
| `npm run typecheck`                          | Type-checks the client, server, tests and config files.               |
| `npm run test:smoke`                         | Starts the built server and checks it serves pages and the API.       |
| `npm run lint`                               | Runs ESLint.                                                          |
| `npm run format`                             | Formats the code with Prettier (`format:check` only checks).          |

To run in production:

```sh
npm run build && npm run build:server && npm start
```

Run these from the repository root: the server looks for `dist/` and `.env`
in the current folder.

### Docker

The image builds the app and includes ffmpeg, so thumbnails work without
setting any paths. With [docker-compose.yml](docker-compose.yml):

```sh
mkdir -p videos data   # an existing db.json goes in data/
docker compose up -d   # then open http://localhost:3000
```

- `videos/` is mounted as `DIRECTORY` and `data/` holds `db.json`. `db.json`
  is not mounted as a single file because saving replaces it with a rename,
  which a single-file mount doesn't allow.
- The server runs as uid 1000, which needs write access to both folders
  (thumbnails are saved next to the videos, and deleting a title deletes its
  folder). On Linux, `sudo chown -R 1000:1000 videos data` if needed.
- The port is published on `127.0.0.1` only, because of the lack of access
  control described above. Edit `ports` to open it to your network.

## Tests

Tests use Vitest and sit next to the code as `*.test.ts(x)`. Server tests use
Supertest against a temporary `DIRECTORY` and `DB_FILE` (your `.env` and
`videos/` are not touched) and don't need ffmpeg. Client tests use Testing
Library in jsdom with the API calls mocked.

CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs lint, the format
check, the type-check, the tests, both builds and the smoke test on Node 22 and
24 for every push and pull request.

## Pages

| Path                                | Page                                                        |
| ----------------------------------- | ----------------------------------------------------------- |
| `/`                                 | Gallery of every title                                      |
| `/?search=<term>&filter=<source>`   | Gallery filtered by a search term and/or sources            |
| `/watch/<id>?index=<n>`             | Watch page for a title, playing its `n`th video (default 0) |

The search matches title names and tags, ignoring case.

## API

A title is returned as:

```ts
{
    id: string;      // generated when the title is first found
    title: string;   // title folder name
    source: string;  // source folder name
    counter: number;
    tags: string[];
    vids: string[];  // video file names in the title folder
}
```

Request bodies are JSON. Invalid bodies return `400`, and unknown ids and
unknown `/api` paths return `404`. Errors are sent as JSON:
`{ "error": "<message>" }`.

| Method   | Path                    | Description                                                                                                   |
| -------- | ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/api/videos`           | List titles. Optional `search=<term>` and `filter=<source>` (repeat it or separate sources with commas).      |
| `GET`    | `/api/videos/id/<id>`   | Get one title.                                                                                                |
| `DELETE` | `/api/videos/id/<id>`   | Delete the title's folder **from disk** and remove it from the database.                                      |
| `GET`    | `/api/sources`          | List source names. With `search=<term>`, only sources that have matching titles.                              |
| `GET`    | `/api/stream/<id>`      | Stream a video. `index=<n>` picks the file (default 0). Supports single `Range` requests (`206`, `416`).      |
| `GET`    | `/api/thumbnail/<id>`   | The title's `tn.png`.                                                                                         |
| `POST`   | `/api/count`            | `{ "id", "num" }`: add the integer `num` (may be negative) to the counter. Returns the new counter.           |
| `POST`   | `/api/tags`             | `{ "id", "tags" }`: replace the tags. Tags are trimmed; empty and duplicate ones are dropped.                 |
| `POST`   | `/api/tag`              | `{ "id", "tag" }`: add a tag (a non-empty string, trimmed).                                                   |
| `DELETE` | `/api/tag`              | `{ "id", "tag" }`: remove a tag.                                                                              |

## Database

`DB_FILE` holds `{ "<id>": <title>, ... }`. The server keeps it in memory and
writes it after every change and after each scan, through a temporary file and
a rename, so a crash can't leave a half-written file. Back it up if you care
about your counts and tags.

## License

MIT. See [LICENSE](LICENSE).
