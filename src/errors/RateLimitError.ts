import {Class} from "type-fest";
import {ContentfulError} from "./ContentfulError";


export class RateLimitError extends ContentfulError<RateLimitError> {

    public readonly waitTime: number;


    constructor(message: string, waitTime: number);

    constructor(message: string, waitTime: number, ErrorType?: Class<Error>) {

        // call base
        super(message, ErrorType || RateLimitError);

        // initialize instance variables
        this.waitTime = waitTime;
    }
}
