// import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Root from "./pages/root";
import Gallery from "./pages/gallery";
import GallerySidebar from "./pages/gallery-sidebar";
import Watch from "./pages/watch";
import { fetchVideos, fetchVideo, fetchSources } from "./server/api";
import WatchSidebar from "./pages/watch-sidebar";

const router = createBrowserRouter([
    {
        path: "/",
        element: <Root />,
        // errorElement: <div>not found</div>,
        children: [
            {
                path: "/",
                element: <Gallery />,
                loader: fetchVideos,
                children: [
                    {
                        path: "/",
                        element: <GallerySidebar />,
                        loader: fetchSources,
                    },
                ],
            },
            {
                path: "/watch",
                element: <Watch />,
                loader: fetchVideo,
                children: [
                    {
                        path: "/watch",
                        element: <WatchSidebar />,
                        loader: fetchVideo,
                    },
                ],
            },
        ],
    },
]);

function App() {
    return <RouterProvider router={router}></RouterProvider>;
}

export default App;
