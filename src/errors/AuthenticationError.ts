import {ContentfulError} from "./ContentfulError";


export class AuthenticationError extends ContentfulError<AuthenticationError> {

    constructor(message: string) {

        // call base
        super(message, AuthenticationError);
    }
}