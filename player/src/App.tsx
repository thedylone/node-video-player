import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./App.css";
import Root from "./pages/root";
import Gallery from "./pages/gallery";
import Watch from "./pages/watch";

const router = createBrowserRouter([
    {
        path: "/",
        element: <Root />,
        children: [
            {
                path: "/",
                element: <Gallery videos={[]} />,
            },
            {
                path: "/watch/:id",
                element: <Watch />,
            },
        ],
    },
]);

function App() {
    return <RouterProvider router={router}></RouterProvider>;
}

export default App;
