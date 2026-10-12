import { useLoaderData, Await, useSearchParams } from "react-router";
import { pageSort, SORTS, type sourcesLoader } from "../api";
import Sidebar from "../components/sidebar";
import { sourceStyle } from "../components/source-color";

const SourceList = ({ sources }: { sources: string[] }) => {
    const [params] = useSearchParams();
    // the URL can name several sources per filter, separated by commas
    const filters = params.getAll("filter").flatMap((x) => x.split(","));
    // e.g. a search that matches nothing
    if (sources.length === 0) return null;
    return (
        <fieldset className="choices">
            <legend className="heading">Sources</legend>
            {sources.map((source) => (
                <label
                    key={source}
                    className="choice source-choice"
                    style={sourceStyle(source)}
                >
                    <input
                        type="checkbox"
                        name="filter"
                        value={source}
                        defaultChecked={filters.includes(source)}
                    />
                    <span>{source}</span>
                </label>
            ))}
        </fieldset>
    );
};

const GallerySidebar = () => {
    const data = useLoaderData<typeof sourcesLoader>();
    const [params] = useSearchParams();
    return (
        <Sidebar>
            <label className="field">
                <span className="heading">Sort by</span>
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
                    <p className="notice">Couldn't load the sources.</p>
                }
            >
                {(sources: string[]) => <SourceList sources={sources} />}
            </Await>
        </Sidebar>
    );
};

export default GallerySidebar;
