// import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Root from "./pages/root";
import ErrorPage from "./pages/error";
import Gallery from "./pages/gallery";
import GallerySidebar from "./pages/gallery-sidebar";
import Watch from "./pages/watch";
import {
    videoLoader,
    videosSearchLoader,
    videosLoader,
    sourcesLoader,
    sourcesSearchLoader,
} from "./server/api";
import WatchSidebar from "./pages/watch-sidebar";

const router = createBrowserRouter([
    {
        path: "/",
        element: <Root />,
        errorElement: <ErrorPage />,
        children: [
            {
                errorElement: <ErrorPage />,
                children: [
                    {
                        path: "/",
                        element: <Gallery />,
                        errorElement: <ErrorPage />,
                        loader: videosLoader,
                        children: [
                            {
                                path: "/",
                                element: <GallerySidebar />,
                                errorElement: <ErrorPage />,
                                loader: sourcesLoader,
                            },
                        ],
                    },
                    {
                        path: "/search/:query",
                        element: <Gallery />,
                        loader: videosSearchLoader,
                        children: [
                            {
                                path: "/search/:query",
                                element: <GallerySidebar />,
                                loader: sourcesSearchLoader,
                            },
                        ],
                    },
                    {
                        path: "/watch",
                        element: <Watch />,
                        loader: videoLoader,
                        children: [
                            {
                                path: "/watch",
                                element: <WatchSidebar />,
                                loader: videoLoader,
                            },
                        ],
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
