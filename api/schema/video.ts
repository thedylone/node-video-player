// Schema for video data

export interface Video {
    id: string;
    title: string;
    source: string;
    counter: number;
    tags: string[];
    videos: string[];
}
