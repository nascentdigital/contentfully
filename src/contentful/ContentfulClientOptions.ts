

export interface ContentfulClientOptions {

    readonly accessToken: string;
    readonly spaceId: string;
    readonly environmentId?: string;
    readonly preview?: boolean;
    readonly fetch?: any;
    readonly host?: string;
    readonly headers?: object|string;
}
