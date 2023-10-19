import { useLoaderData, Await } from "react-router-dom";
import Sidebar from "../components/sidebar";

const sourcesToContent = (sources: string[]) => {
    return (
        <>
            <h2>Sources</h2>
            <div className="flex-col">
                {sources.map((source, index) => (
                    <label key={index}>
                        <input type="checkbox" name="filter" value={source} />
                        {source}
                    </label>
                ))}
            </div>
        </>
    );
};

const GallerySidebar = () => {
    const data = useLoaderData() as { sources: string[] };
    return (
        <Sidebar>
            <Await
                resolve={data.sources}
                errorElement={
                    <div className="empty">error loading sources!</div>
                }
            >
                {sourcesToContent}
            </Await>
        </Sidebar>
    );
};

export default GallerySidebar;
