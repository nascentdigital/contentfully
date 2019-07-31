

export interface ContentfulClientOptions {

    readonly accessToken: string;
    readonly spaceId: string;
    readonly host?: string;
    readonly headers?: string;
    readonly environmentId?: string;
    readonly preview?: boolean;
    readonly fetch?: any;
}