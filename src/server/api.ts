import { Video } from "./schema";

export const fetchVideos = async ({
    request,
}: {
    request: Request;
}): Promise<Video[]> => {
    const url = new URL(request.url);
    const response = await fetch("/api/videos" + url.search);
    const videos = await response.json();
    return videos;
};

export const fetchVideo = async ({
    request,
}: {
    request: Request;
}): Promise<Video> => {
    const url = new URL(request.url);
    const response = await fetch(
        "/api/videos/id/" + url.searchParams.get("id")
    );
    const video = await response.json();
    return video;
};
