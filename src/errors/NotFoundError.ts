import {ContentfulError} from "./ContentfulError";


export class NotFoundError extends ContentfulError<NotFoundError> {

    constructor(message: string) {

        // call base
        super(message, NotFoundError);
    }
}