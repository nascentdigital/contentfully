import {ContentfulError} from "./ContentfulError";


export class ServerError extends ContentfulError<ServerError> {

    constructor(message: string) {

        // call base
        super(message, ServerError);
    }
}