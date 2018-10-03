

export interface ContentfulClientOptions {

    readonly accessToken: string;
    readonly spaceId: string;
    readonly environmentId?: string;
    readonly preview?: boolean;
    readonly fetch?: any;
}