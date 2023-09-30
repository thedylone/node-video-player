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

export const fetchVideosSearch = async ({
    request,
}: {
    request: Request;
}): Promise<Video[]> => {
    const url = new URL(request.url);
    const response = await fetch("/api/videos" + url.pathname + url.search);
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

export const fetchSources = async (): Promise<string[]> => {
    const response = await fetch("/api/sources");
    if (!response.ok) return [];
    const sources = await response.json();
    return sources;
};

export const fetchSourcesSearch = async ({
    request,
}: {
    request: Request;
}): Promise<string[]> => {
    const url = new URL(request.url);
    const response = await fetch("/api/sources" + url.pathname + url.search);
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
