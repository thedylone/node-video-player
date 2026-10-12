import { defer } from "react-router-dom";
import { Video } from "./schema";

export const fetchVideos = async ({
    request,
}: {
    request: Request;
}): Promise<Video[]> => {
    const url = new URL(request.url);
    const response = await fetch("/api/videos" + url.search);
    if (!response.ok) return [];
    const videos = await response.json();
    return videos;
};

export const fetchVideo = async ({
    request,
}: {
    request: Request;
}): Promise<Video | null> => {
    const url = new URL(request.url);
    const response = await fetch(
        "/api/videos/id/" + url.searchParams.get("id")
    );
    if (!response.ok) return null;
    const video = await response.json();
    return video;
};

export const fetchSources = async ({
    request,
}: {
    request: Request;
}): Promise<string[]> => {
    const search = new URL(request.url).searchParams.get("search");
    const query = search ? "?search=" + encodeURIComponent(search) : "";
    const response = await fetch("/api/sources" + query);
    if (!response.ok) return [];
    const sources = await response.json();
    return sources;
};

export const addCount = async ({
    id,
    num,
}: {
    id: string;
    num: number;
}): Promise<number> => {
    const response = await fetch("/api/count", {
        method: "POST",
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify({ id: id, num: num }),
    });
    if (!response.ok) {
        throw new Error(response.statusText);
    }
    const count = await response.json();
    return count;
};

export const deleteVideo = async ({ id }: { id: string }): Promise<void> => {
    const response = await fetch("/api/videos/id/" + id, {
        method: "DELETE",
    });
    if (!response.ok) {
        throw new Error(response.statusText);
    }
};

export const addTag = async ({
    id,
    tag,
}: {
    id: string;
    tag: string;
}): Promise<void> => {
    const response = await fetch("/api/tag", {
        method: "POST",
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify({ id: id, tag: tag }),
    });
    if (!response.ok) {
        throw new Error(response.statusText);
    }
};

export const removeTag = async ({
    id,
    tag,
}: {
    id: string;
    tag: string;
}): Promise<void> => {
    const response = await fetch("/api/tag", {
        method: "DELETE",
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify({ id: id, tag: tag }),
    });
    if (!response.ok) {
        throw new Error(response.statusText);
    }
};

export const videosLoader = async ({ request }: { request: Request }) => {
    const videos = fetchVideos({ request: request });
    return defer({ videos: videos });
};

export const videoLoader = async ({ request }: { request: Request }) => {
    const video = fetchVideo({ request: request });
    return defer({ video: video });
};

export const sourcesLoader = async ({ request }: { request: Request }) => {
    const sources = fetchSources({ request: request });
    return defer({ sources: sources });
};
