// import React from "react";
import {
    createBrowserRouter,
    redirect,
    RouterProvider,
} from "react-router-dom";
import Root from "./pages/root";
import ErrorPage from "./pages/error";
import Gallery from "./pages/gallery";
import GallerySidebar from "./pages/gallery-sidebar";
import Watch from "./pages/watch";
import { videoLoader, videosLoader, sourcesLoader } from "./server/api";
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
                        path: "/watch/:id",
                        id: "watch",
                        element: <Watch />,
                        loader: videoLoader,
                        children: [{ index: true, element: <WatchSidebar /> }],
                    },
                    {
                        // old links: /watch?id=<id>&index=<index>
                        path: "/watch",
                        loader: ({ request }) => {
                            const params = new URL(request.url).searchParams;
                            const id = params.get("id");
                            if (!id) return redirect("/");
                            params.delete("id");
                            const search = params.toString();
                            return redirect(
                                `/watch/${encodeURIComponent(id)}` +
                                    (search ? "?" + search : "")
                            );
                        },
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
