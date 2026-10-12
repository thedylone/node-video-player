import { FC, Suspense } from "react";
import { Form, useSubmit, useNavigation } from "react-router";

/**
 * the page below the header. a form, so the sidebar's controls (sort,
 * filters, the video picked) change the query string as they change.
 */
const Content: FC<{ children?: React.ReactNode; className?: string }> = ({
    children,
    className,
}) => {
    const submit = useSubmit();
    const navigation = useNavigation();
    return (
        <Form
            onChange={(e) => submit(e.currentTarget)}
            className={
                "content" +
                (className ? " " + className : "") +
                (navigation.state === "loading" ? " loading" : "")
            }
            replace
        >
            <Suspense fallback={<p className="notice">Loading…</p>}>
                {children}
            </Suspense>
        </Form>
    );
};

export default Content;
