import fetch from 'node-fetch';
import { api_base, get_available_captions, get_thumbnail_url } from './api.js';
import { EventListener, _EmptyListener } from './event_listener.js';
import {
    PlaybackStateEvent,
    NowPlayingEvent,
    VolumeChangedEvent,
    AutoplayModeChangedEvent,
    AdStateEvent,
    AdPlayingEvent,
    SubtitlesTrackEvent,
    AutoplayUpNextEvent,
    PlaybackSpeedEvent,
    DisconnectedEvent,
} from './events.js';
import { AuthState, DpadCommand, BLACKLISTED_CLIENTS } from './models.js';
import { iterResponseLines, asAiter } from './util.js';
import { NotConnectedException, NotLinkedException, NotPairedException, NotSupportedException } from './exceptions.js';

function buildUrlWithParams(base, params = {}) {
    const u = new URL(base);
    Object.keys(params).forEach((k) => {
        if (params[k] !== undefined && params[k] !== null) u.searchParams.append(k, String(params[k]));
    });
    return u.toString();
}

export default class YtLoungeApi {
    constructor(device_name, event_listener = null, logger = console) {
        this.device_name = device_name;
        this.auth = new AuthState();
        this._sid = null;
        this._gsession = null;
        this._last_event_id = null;
        this.event_listener = event_listener || new _EmptyListener();
        this._command_offset = 1;
        this._screen_name = null;
        this._device_info = null;
        this._logger = logger;
        this._id = 'js-remote-' + device_name.replace(/[^a-z0-9]/gi, '').toLowerCase();
    }

    paired() {
        return this.auth.screen_id != null;
    }

    linked() {
        return this.paired() && this.auth.lounge_id_token != null;
    }

    connected() {
        return this._sid != null && this._gsession != null;
    }

    toString() {
        return `screen_id: ${this.auth.screen_id}\n lounge_id_token: ${this.auth.lounge_id_token}\n sid = ${this._sid}\n gsession = ${this._gsession}\n last_event_id = ${this._last_event_id}`;
    }

    get screen_name() {
        if (!this.linked()) throw new NotLinkedException('Not linked');
        return this._screen_name;
    }

    get screen_device_name() {
        if (!this.connected()) throw new NotConnectedException('Not connected');
        if (!this._device_info) return null;
        const brand = this._device_info.brand;
        const model = this._device_info.model;
        return `${brand} ${model}`;
    }

    async pair_with_screen_id(screen_id, screen_name = null) {
        this.auth.screen_id = screen_id;
        this._screen_name = screen_name;
        return await this.refresh_auth();
    }

    async pair(pairing_code) {
        const pair_url = `${api_base}/pairing/get_screen`;
        const body = new URLSearchParams({ pairing_code });
        const resp = await fetch(pair_url, { method: 'POST', body });
        const data = await resp.json();
        try {
            const screen = data.screen;
            this._screen_name = screen.name;
            this.auth.screen_id = screen.screenId;
            this.auth.lounge_id_token = screen.loungeToken;
            return this.linked();
        } catch (e) {
            this._logger.error('Pairing failed', e);
            throw e;
        }
    }

    async refresh_auth() {
        if (!this.paired()) throw new NotPairedException('Must be paired');
        const url = `${api_base}/pairing/get_lounge_token_batch`;
        const body = new URLSearchParams({ screen_ids: this.auth.screen_id });
        const resp = await fetch(url, { method: 'POST', body });
        const data = await resp.json();
        try {
            const screen = data.screens[0];
            this.auth.screen_id = screen.screenId;
            this.auth.lounge_id_token = screen.loungeToken;
            this._logger.info && this._logger.info('Refreshed auth, lounge id token %s', this.auth.lounge_id_token);
            return this.linked();
        } catch (e) {
            this._logger.error('Refresh auth failed', e);
            throw e;
        }
    }

    store_auth_state() {
        return { screenId: this.auth.screen_id, lounge_id_token: this.auth.lounge_id_token, refresh_token: this.auth.refresh_token };
    }

    load_auth_state(data) {
        this.auth = new AuthState();
        this.auth.deserialize(data);
    }

    _lounge_token_expired() {
        this.auth.lounge_id_token = null;
    }

    _connection_lost() {
        this._sid = null;
        this._gsession = null;
        this._last_event_id = null;
    }

    async _process_event(event_type, args) {
        this._logger.debug && this._logger.debug(event_type,':' ,JSON.stringify(args));
        if (event_type === 'onStateChange' && this.event_listener) {
            await this.event_listener.playback_state_changed(new PlaybackStateEvent(args[0]));
        } else if (event_type === 'nowPlaying') {
            await this.event_listener.now_playing_changed(new NowPlayingEvent(args[0]));
        } else if (event_type === 'onVolumeChanged') {
            await this.event_listener.volume_changed(new VolumeChangedEvent(args[0]));
        } else if (event_type === 'onAutoplayModeChanged') {
            await this.event_listener.autoplay_changed(new AutoplayModeChangedEvent(args[0]));
        } else if (event_type === 'onAdStateChange') {
            await this.event_listener.ad_state_changed(new AdStateEvent(args[0]));
        } else if (event_type === 'adPlaying') {
            await this.event_listener.ad_playing_changed(new AdPlayingEvent(args[0]));
        } else if (event_type === 'onSubtitlesTrackChanged') {
            await this.event_listener.subtitles_track_changed(new SubtitlesTrackEvent(args[0]));
        } else if (event_type === 'autoplayUpNext' && args && args.length) {
            await this.event_listener.autoplay_up_next_changed(new AutoplayUpNextEvent(args[0]));
        } else if (event_type === 'onPlaybackSpeedChanged') {
            await this.event_listener.playback_speed_changed(new PlaybackSpeedEvent(args[0]));
            await this.get_now_playing();
        } else if (event_type === 'loungeStatus') {
            const data = args[0];
            const devices = JSON.parse(data.devices);
            for (const device of devices) {
                if (device.type === 'LOUNGE_SCREEN') {
                    this._screen_name = device.name;
                    this._device_info = JSON.parse(device.deviceInfo || 'null');
                    if (this._device_info && BLACKLISTED_CLIENTS.includes(this._device_info.clientName || '')) {
                        throw new NotSupportedException('Unsupported client');
                    }
                    break;
                }
            }
        } else if (event_type === 'loungeScreenDisconnected') {
            await this.event_listener.disconnected(new DisconnectedEvent(args && args.length ? args[0] : null));
            this._connection_lost();
        } else if (event_type === 'noop') {
            // no-op
        } else {
            //this._logger.debug && this._logger.debug('Unprocessed event %s %s', event_type, JSON.stringify(args));
        }
    }

    async _process_events(events) {
        for (const event of events) {
            const [event_id, payload] = event;
            const [event_type, ...args] = payload;
            if (event_type === 'c') {
                this._sid = args[0];
            } else if (event_type === 'S') {
                this._gsession = args[0];
            } else {
                await this._process_event(event_type, args);
            }
        }
        const last_id = events[events.length - 1][0];
        this._last_event_id = last_id;
    }

    async *_parse_event_chunks(linesAsync) {
        let chunk_remaining = 0;
        let current_chunk = '';
        for await (let line of linesAsync) {
            if (chunk_remaining <= 0) {
                chunk_remaining = parseInt(line, 10);
                current_chunk = '';
            } else {
                line = line.replace('\n', '');
                current_chunk = current_chunk + line;
                chunk_remaining = chunk_remaining - line.length - 1;
                if (chunk_remaining === 0) {
                    const events = JSON.parse(current_chunk);
                    yield events;
                }
            }
        }
    }

    async is_available() {
        if (!this.linked()) throw new NotLinkedException('Not linked');
        const body = new URLSearchParams({ lounge_token: this.auth.lounge_id_token });
        const url = `${api_base}/pairing/get_screen_availability`;
        const resp = await fetch(url, { method: 'POST', body });
        const status = await resp.json();
        if (status.screens && status.screens.length > 0) return status.screens[0].status === 'online';
        return false;
    }

    _handle_session_result(status_code, reason) {
        if (status_code === 400 && reason && reason.includes('Unknown SID')) {
            this._connection_lost();
            return false;
        }
        if (status_code === 410 && reason && reason.includes('Gone')) {
            this._connection_lost();
            return false;
        }
        if (status_code === 401 && reason && reason.includes('Expired')) {
            this._connection_lost();
            this._lounge_token_expired();
            return false;
        }
        return true;
    }

    _common_connection_parameters() {
        return {
            name: this.device_name,
            loungeIdToken: this.auth.lounge_id_token,
            SID: this._sid,
            AID: this._last_event_id,
            gsessionid: this._gsession,
            device: 'REMOTE_CONTROL',
            app: 'lb-v4',
            theme: 'cl',
            capabilities: 'dsp,dpa,mic,ntb,vsp,ads,asw,apw,pas,dcn,dcp,drq,sads',
            mdxVersion: '2',
            VER: '8',
            v: '2',
            id: this._id,
        };
    }

    async connect() {
        if (!this.linked()) throw new NotLinkedException('Must be linked (paired) first');
        const rid = Math.floor(Math.random() * 900_000) + 100_000;
        const params = {
            ...this._common_connection_parameters(),
            RID: String(rid),
            CVER: '1',
            zx: Math.random().toString(36).substring(2, 12),
            t: '1',
        };
        const url = buildUrlWithParams(`${api_base}/bc/bind`, params);
        const body = new URLSearchParams({ count: '0' });
        const resp = await fetch(url, { method: 'POST', body });
        if (!resp.ok) {
            const text = await resp.text();
            throw new Error(`Initial bind failed: ${resp.status} ${text}`);
        }

        for await (const events of this._parse_event_chunks(iterResponseLines(resp))) {
            await this._process_events(events);
        }

        if (!this.connected()) throw new Error('Initial bind did not return SID/GSession');
    }

    async subscribe() {
        if (!this.connected()) await this.connect();
        const params = {
            ...this._common_connection_parameters(),
            RID: 'rpc',
            CI: '0',
            TYPE: 'xmlhttp',
        };
        const url = buildUrlWithParams(`${api_base}/bc/bind`, params);
        this._logger.info && this._logger.info('Subscribing to lounge id %s', this.auth.lounge_id_token);
        const resp = await fetch(url, { method: 'GET' });
        try {
            if (!this._handle_session_result(resp.status, resp.statusText || '')) return;
            for await (const events of this._parse_event_chunks(iterResponseLines(resp))) {
                await this._process_events(events);
                if (!this.connected()) break;
            }
            this._logger.info && this._logger.info('Subscribe completed, status %i %s', resp.status, resp.statusText);
        } catch (e) {
            if (e.name === 'AbortError') throw e;
            this._logger.error('Handle subscribe failed, status %s reason %s', resp.status, resp.statusText, e);
            throw e;
        }
    }

    async disconnect() {
        if (!this.connected()) throw new NotConnectedException('Not connected');
        const command_body = new URLSearchParams({ ui: '', TYPE: 'terminate', clientDisconnectReason: 'MDX_SESSION_DISCONNECT_REASON_DISCONNECTED_BY_USER' });
        const params = { ...this._common_connection_parameters(), CVER: '1', RID: this._command_offset, auth_failure_option: 'send_error' };
        const url = buildUrlWithParams(`${api_base}/bc/bind`, params);
        const resp = await fetch(url, { method: 'POST', body: command_body });
        const response_text = await resp.text();
        if (!this._handle_session_result(resp.status, response_text)) return false;
        if (!resp.ok) throw new Error('Disconnect failed');
        return true;
    }

    async _command(command, command_parameters = null) {
        if (!this.connected()) throw new NotConnectedException('Not connected');
        const command_body = new URLSearchParams({ count: '1', ofs: String(this._command_offset), req0__sc: command });
        if (command_parameters) {
            for (const key of Object.keys(command_parameters)) {
                const value = command_parameters[key];
                command_body.append(`req0_${key}`, String(value));
            }
        }
        this._command_offset += 1;
        const params = { ...this._common_connection_parameters(), RID: this._command_offset, CVER: '1' };
        const url = buildUrlWithParams(`${api_base}/bc/bind`, params);
        const resp = await fetch(url, { method: 'POST', body: command_body });
        const response_text = await resp.text();
        if (!this._handle_session_result(resp.status, response_text)) return false;
        if (!resp.ok) throw new Error('Command failed');
        return true;
    }

    async play() { return await this._command('play'); }
    async play_video(video_id) { return await this._command('setPlaylist', { videoId: video_id }); }
    async pause() { return await this._command('pause'); }
    async previous() { return await this._command('previous'); }
    async next() { return await this._command('next'); }
    async seek_to(time) { return await this._command('seekTo', { newTime: time }); }
    async skip_ad() { return await this._command('skipAd'); }
    async set_auto_play_mode(enabled) { return await this._command('setAutoplayMode', { autoplayMode: enabled ? 'ENABLED' : 'DISABLED' }); }
    async set_volume(volume) { return await this._command('setVolume', { volume }); }
    async set_playback_speed(speed) { return await this._command('setPlaybackSpeed', { playbackSpeed: speed }); }
    async send_dpad_command(button_input) { return await this._command('dpadCommand', { key: button_input }); }
    async set_closed_captions(language_code, video_id) { const lang = language_code != null ? language_code : ''; return await this._command('setSubtitlesTrack', { languageCode: lang, videoId: video_id }); }
    async get_now_playing() { return await this._command('getNowPlaying'); }
}

export { get_available_captions, get_thumbnail_url };
