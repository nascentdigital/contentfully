import {ContentfulError} from "./ContentfulError";


export class InvalidLocaleError extends ContentfulError<InvalidLocaleError> {

    constructor(message: string) {

        // call base
        super(message, InvalidLocaleError);
    }
}