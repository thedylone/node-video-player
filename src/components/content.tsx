import { FC, Suspense } from "react";
import { Form, useSubmit, useNavigation } from "react-router";

const Content: FC<{ children?: React.ReactNode }> = (props) => {
    const submit = useSubmit();
    const navigation = useNavigation();
    return (
        <Form
            onChange={(e) => submit(e.currentTarget)}
            className={
                "content" + (navigation.state === "loading" ? " loading" : "")
            }
            replace
        >
            <Suspense fallback={<div className="empty">loading...</div>}>
                {props.children}
            </Suspense>
        </Form>
    );
};

export default Content;
