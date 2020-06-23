

export interface ContentfulClientOptions {

    readonly accessToken: string;
    readonly spaceId: string;
    readonly environmentId?: string;
    readonly preview?: boolean;
    readonly fetch?: any;
    readonly apiUrl?: URL;
    readonly headers?: Readonly<Record<string, string>>;
}
