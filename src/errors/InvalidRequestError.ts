import {ContentfulError} from "./ContentfulError";


export class InvalidRequestError extends ContentfulError<InvalidRequestError> {

    constructor(message: string);

    constructor(message: string, ErrorType?: new(message: string) => InvalidRequestError) {

        // call base
        super(message, ErrorType || InvalidRequestError);
    }
}