import {ContentfulError} from "./ContentfulError";


export class RateLimitError extends ContentfulError<RateLimitError> {

    constructor(message: string);

    constructor(message: string, ErrorType?: new(message: string) => RateLimitError) {

        // call base
        super(message, ErrorType || RateLimitError);
    }
}
