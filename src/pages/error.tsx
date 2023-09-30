import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import Header from "../components/header";

const ErrorPage = () => {
    const error = useRouteError();
    // let errorMessage = "An error has occured";
    if (isRouteErrorResponse(error)) {
        return (
            <>
                <Header />
                <div className="empty">
                    <h1>{error.status}</h1>
                    <span>{error.statusText}</span>
                </div>
            </>
        );
    } else if (error instanceof Error) {
        return (
            <>
                <Header />
                <div className="empty">
                    <h1>Unexpected error</h1>
                    <span>{error.message}</span>
                </div>
            </>
        );
    } else {
        return (
            <>
                <Header />
                <div className="empty">
                    <h1>Unexpected error</h1>
                    <span>Something went wrong</span>
                </div>
            </>
        );
    }
};

export default ErrorPage;
