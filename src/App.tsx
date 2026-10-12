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

/** redirects old /watch?id=<id>&index=<index> links to /watch/<id> */
const redirectOldWatchLink = ({ request }: { request: Request }) => {
    const params = new URL(request.url).searchParams;
    const id = params.get("id");
    if (!id) return redirect("/");
    params.delete("id");
    const search = params.toString();
    return redirect(
        `/watch/${encodeURIComponent(id)}` + (search ? "?" + search : "")
    );
};

const router = createBrowserRouter([
    {
        path: "/",
        element: <Root />,
        errorElement: <ErrorPage />,
        children: [
            {
                // errors below render inside Root, so the header stays
                errorElement: <ErrorPage />,
                children: [
                    {
                        element: <Gallery />,
                        loader: videosLoader,
                        children: [
                            {
                                index: true,
                                element: <GallerySidebar />,
                                loader: sourcesLoader,
                            },
                        ],
                    },
                    {
                        path: "watch/:id",
                        id: "watch",
                        element: <Watch />,
                        loader: videoLoader,
                        children: [{ index: true, element: <WatchSidebar /> }],
                    },
                    { path: "watch", loader: redirectOldWatchLink },
                    {
                        path: "*",
                        loader: () => {
                            throw new Response("", {
                                status: 404,
                                statusText: "Not Found",
                            });
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
