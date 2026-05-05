export const State = Object.freeze({
    Stopped: -1,
    Buffering: 0,
    Playing: 1,
    Paused: 2,
    Starting: 3,
    Advertisement: 1081,
    parse(value) {
        const n = Number(value);
        if (!Number.isNaN(n) && Object.values(this).includes(n)) return n;
        console.warn(`Unknown state ${value}. Assuming stopped state.`);
        return this.Stopped;
    },
});

export class AuthState {
    constructor() {
        this.version = 0;
        this.screen_id = null;
        this.lounge_id_token = null;
        this.refresh_token = null;
        this.expiry = null;
    }

    serialize() {
        return {
            version: this.version,
            screenId: this.screen_id,
            loungeIdToken: this.lounge_id_token,
            refreshToken: this.refresh_token,
            expiry: this.expiry,
        };
    }

    deserialize(data) {
        if (data.version === 0) {
            this.version = data.version;
            this.screen_id = data.screenId;
            this.lounge_id_token = data.loungeIdToken;
            this.refresh_token = data.refreshToken;
            this.expiry = data.expiry;
        } else {
            throw new Error('Unknown authentication data version');
        }
    }
}

export const DpadCommand = Object.freeze({ UP: 'UP', DOWN: 'DOWN', LEFT: 'LEFT', RIGHT: 'RIGHT', ENTER: 'ENTER', BACK: 'BACK' });

export const BLACKLISTED_CLIENTS = ['TVHTML5_FOR_KIDS'];
