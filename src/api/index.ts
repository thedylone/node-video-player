import { LoaderFunctionArgs } from "react-router";
import { Video } from "../shared/schema";

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

export const fetchVideo = async (id: string): Promise<Video> => {
    const response = await fetch("/api/videos/id/" + encodeURIComponent(id));
    // rejecting shows the <Await> errorElement instead of rendering null
    if (!response.ok) throw new Error(response.statusText);
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

/**
 * marks a request returned by a loader as handled, so one that fails before
 * its <Await> renders isn't reported as an unhandled rejection (defer() used
 * to do this). <Await> still sees the rejection and shows its errorElement.
 */
const handled = <T>(promise: Promise<T>) => {
    promise.catch(() => {});
    return promise;
};

// the loaders return their requests unawaited, so the page renders at once
// and each <Await> shows its part when it arrives

export const videosLoader = ({ request }: LoaderFunctionArgs) => ({
    videos: handled(fetchVideos({ request: request })),
});

export const videoLoader = ({ params }: LoaderFunctionArgs) => ({
    video: handled(fetchVideo(params.id ?? "")),
});

export const sourcesLoader = ({ request }: LoaderFunctionArgs) => ({
    sources: handled(fetchSources({ request: request })),
});
