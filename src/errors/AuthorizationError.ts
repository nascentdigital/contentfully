import {ContentfulError} from "./ContentfulError";


export class AuthorizationError extends ContentfulError<AuthorizationError> {

    constructor(message: string) {

        // call base
        super(message, AuthorizationError);
    }
}