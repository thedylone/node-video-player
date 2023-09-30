// import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Root from "./pages/root";
import ErrorPage from "./pages/error";
import Gallery from "./pages/gallery";
import GallerySidebar from "./pages/gallery-sidebar";
import Watch from "./pages/watch";
import {
    fetchVideos,
    fetchVideo,
    fetchSources,
    fetchVideosSearch,
    fetchSourcesSearch,
} from "./server/api";
import WatchSidebar from "./pages/watch-sidebar";

const router = createBrowserRouter([
    {
        path: "/",
        element: <Root />,
        errorElement: <ErrorPage />,
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
                path: "/search/:query",
                element: <Gallery />,
                loader: fetchVideosSearch,
                children: [
                    {
                        path: "/search/:query",
                        element: <GallerySidebar />,
                        loader: fetchSourcesSearch,
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
