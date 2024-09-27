import {Class} from "type-fest";


export class ContentfulError<T extends ContentfulError<T>> extends Error {

    protected constructor(message: string,
                          private ErrorType: Class<Error>) {

        // call base
        super(message);

        // fix prototype
        Object.setPrototypeOf(this, ErrorType.prototype);

        // bind name based on constructor
        const object = this as any;
        this.name = object.constructor.name;
    }
}
