import {Class} from "type-fest";
import {ContentfulError} from "./ContentfulError";


export class InvalidRequestError extends ContentfulError<InvalidRequestError> {

    constructor(message: string);

    constructor(message: string, ErrorType?: Class<Error>) {

        // call base
        super(message, ErrorType || InvalidRequestError);
    }
}
