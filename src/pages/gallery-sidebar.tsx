import { useLoaderData } from "react-router-dom";
import Sidebar from "../components/sidebar";

const GallerySidebar = () => {
    const sources = useLoaderData() as string[];
    return (
        <Sidebar>
            <h2>Sources</h2>
            <div className="flex-col">
                {sources.map((source, index) => (
                    <label key={index}>
                        <input type="checkbox" name="filter" value={source} />
                        {source}
                    </label>
                ))}
            </div>
        </Sidebar>
    );
};

export default GallerySidebar;
