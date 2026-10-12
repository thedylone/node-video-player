import { useLoaderData, Await, useSearchParams } from "react-router";
import { pageSort, SORTS, type sourcesLoader } from "../api";
import Sidebar from "../components/sidebar";

const SourceList = ({ sources }: { sources: string[] }) => {
    const [params] = useSearchParams();
    // the URL can name several sources per filter, separated by commas
    const filters = params.getAll("filter").flatMap((x) => x.split(","));
    return (
        <>
            <h2>Sources</h2>
            <div className="flex-col">
                {sources.map((source) => (
                    <label key={source}>
                        <input
                            type="checkbox"
                            name="filter"
                            value={source}
                            defaultChecked={filters.includes(source)}
                        />
                        {source}
                    </label>
                ))}
            </div>
        </>
    );
};

const GallerySidebar = () => {
    const data = useLoaderData<typeof sourcesLoader>();
    const [params] = useSearchParams();
    return (
        <Sidebar>
            <label className="flex-col">
                <h2>Sort by</h2>
                <select name="sort" defaultValue={pageSort(params)}>
                    {Object.entries(SORTS).map(([value, { label }]) => (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    ))}
                </select>
            </label>
            <Await
                resolve={data.sources}
                errorElement={
                    <div className="empty">error loading sources!</div>
                }
            >
                {(sources: string[]) => <SourceList sources={sources} />}
            </Await>
        </Sidebar>
    );
};

export default GallerySidebar;
