

export class ContentfulError<T extends ContentfulError<T>> extends Error {

    protected constructor(message: string,
                          private ErrorType: new(message: string) => ContentfulError<T>) {

        // call base
        super(message);

        // fix prototype
        Object.setPrototypeOf(this, ErrorType.prototype);

        // capture stack
        Error.captureStackTrace(this, ErrorType);
    }
}