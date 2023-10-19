import { isRouteErrorResponse, useRouteError } from "react-router-dom";

const ErrorPage = () => {
    const error = useRouteError();
    if (isRouteErrorResponse(error)) {
        return (
            <>
                <div className="empty">
                    <h1>{error.status}</h1>
                    <span>{error.statusText}</span>
                </div>
            </>
        );
    } else if (error instanceof Error) {
        return (
            <>
                <div className="empty">
                    <h1>Unexpected error</h1>
                    <span>{error.message}</span>
                </div>
            </>
        );
    } else {
        return (
            <>
                <div className="empty">
                    <h1>Unexpected error</h1>
                    <span>Something went wrong</span>
                </div>
            </>
        );
    }
};

export default ErrorPage;
