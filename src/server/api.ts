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

export const fetchSources = async (): Promise<string[]> => {
    const response = await fetch("/api/sources");
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
