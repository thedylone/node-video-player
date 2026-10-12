import { LoaderFunctionArgs } from "react-router";
import { Video } from "../shared/schema";

/** the gallery's sort options (?sort= on the page), as the API's sort and order. */
export const SORTS = {
    newest: { label: "Newest", sort: "added", order: "desc" },
    oldest: { label: "Oldest", sort: "added", order: "asc" },
    name: { label: "Name, A to Z", sort: "name", order: "asc" },
    "name-desc": { label: "Name, Z to A", sort: "name", order: "desc" },
    most: { label: "Most watched", sort: "count", order: "desc" },
    least: { label: "Least watched", sort: "count", order: "asc" },
} as const;

export type Sort = keyof typeof SORTS;

/** the page's sort option, or newest if it has none or an unknown one. */
export const pageSort = (params: URLSearchParams): Sort => {
    const sort = params.get("sort");
    return sort && Object.prototype.hasOwnProperty.call(SORTS, sort)
        ? (sort as Sort)
        : "newest";
};

export const fetchVideos = async ({
    request,
}: {
    request: Request;
}): Promise<Video[]> => {
    const params = new URL(request.url).searchParams;
    const query = new URLSearchParams();
    const search = params.get("search");
    if (search) query.set("search", search);
    for (const filter of params.getAll("filter"))
        query.append("filter", filter);
    const { sort, order } = SORTS[pageSort(params)];
    query.set("sort", sort);
    query.set("order", order);
    const response = await fetch("/api/videos?" + query);
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

/** every tag in use, the most used first. */
export const fetchTags = async (): Promise<string[]> => {
    const response = await fetch("/api/tags");
    if (!response.ok) throw new Error(response.statusText);
    return await response.json();
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
