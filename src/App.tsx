// import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./App.css";
import Root from "./pages/root";
import Gallery from "./pages/gallery";
import Watch from "./pages/watch";
import { fetchVideos, fetchVideo } from "./server/api";

const router = createBrowserRouter([
    {
        path: "/",
        element: <Root />,
        errorElement: <div>not found</div>,
        children: [
            {
                path: "/",
                element: <Gallery />,
                loader: fetchVideos,
            },
            {
                path: "/watch",
                element: <Watch />,
                loader: fetchVideo,
            },
        ],
    },
]);

function App() {
    return <RouterProvider router={router}></RouterProvider>;
}

export default App;
