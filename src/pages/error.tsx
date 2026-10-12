import { isRouteErrorResponse, Link, useRouteError } from "react-router";

const ErrorPage = () => {
    const error = useRouteError();
    if (isRouteErrorResponse(error) && error.status === 404) {
        return (
            <div className="notice">
                <h1>Page not found</h1>
                <p>
                    Nothing is at this address. Go back to the{" "}
                    <Link to="/">library</Link>.
                </p>
            </div>
        );
    }
    const message = isRouteErrorResponse(error)
        ? `${error.status} ${error.statusText}`
        : error instanceof Error
          ? error.message
          : "Something went wrong.";
    return (
        <div className="notice">
            <h1>Something went wrong</h1>
            <p>{message}</p>
            <p>
                Reload the page, or go back to the <Link to="/">library</Link>.
            </p>
        </div>
    );
};

export default ErrorPage;
