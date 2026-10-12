# builds the client and the server, then runs them on a smaller image with
# ffmpeg for thumbnails. see docker-compose.yml for the folders to mount.

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm run build:server

FROM node:24-alpine
RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
# DB_FILE is in a folder, not a file of its own, because saving replaces it
# with a rename, which a single-file mount doesn't allow
ENV NODE_ENV=production \
    DIRECTORY=/videos \
    DB_FILE=/data/db.json \
    FFMPEG_PATH=/usr/bin/ffmpeg \
    FFPROBE_PATH=/usr/bin/ffprobe \
    PORT=3000
EXPOSE 3000
# the mounted /videos and /data must be writable by this user (uid 1000):
# thumbnails are saved in /videos, and deleting a title deletes its folder
USER node
CMD ["node", "dist-server/main.js"]
