export interface Video {
    id: string;
    title: string;
    source: string;
    counter: number;
    tags: string[];
    vids: string[];
    /** when the title folder was created, in ms since 1970. */
    added: number;
}
