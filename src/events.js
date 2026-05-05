import { get_thumbnail_url } from './api.js';
import { State } from './models.js';

export class PlaybackStateEvent {
    constructor(data) {
        this.current_time = Number(data.currentTime);
        this.duration = Number(data.duration);
        this.state = State.parse(data.state);
    }
}

export class NowPlayingEvent {
    constructor(data) {
        this.video_id = data.videoId || null;
        this.current_time = data.currentTime ? Number(data.currentTime) : null;
        this.duration = data.duration ? Number(data.duration) : null;
        this.state = data.state ? State.parse(data.state) : State.Stopped;
    }

    get_thumbnail_url(thumbnailIdx = 0) {
        if (this.video_id) return get_thumbnail_url(this.video_id, thumbnailIdx);
        return null;
    }
}

export class VolumeChangedEvent {
    constructor(data) {
        this.volume = Number(data.volume);
        this.muted = data.muted === 'true';
    }
}

export class AutoplayModeChangedEvent {
    constructor(data) {
        this.enabled = data.autoplayMode === 'ENABLED';
        this.supported = data.autoplayMode !== 'UNSUPPORTED';
    }
}

export class AdStateEvent {
    constructor(data) {
        this.ad_state = State.parse(data.adState);
        this.current_time = Number(data.currentTime);
        this.is_skip_enabled = data.isSkipEnabled === 'true';
    }
}

export class AdPlayingEvent {
    constructor(data) {
        this.ad_video_id = data.adVideoId || null;
        this.ad_video_uri = data.adVideoUri || null;
        this.ad_title = data.adTitle;
        this.is_bumper = data.isBumper === 'true';
        this.is_skippable = data.isSkippable === 'true';
        this.is_skip_enabled = data.isSkipEnabled === 'true';
        this.click_through_url = data.clickThroughUrl;
        this.ad_system = data.adSystem;
        this.ad_next_params = data.adNextParams;
        this.remote_slots_data = data.remoteSlotsData || null;
        this.ad_state = State.parse(data.adState);
        this.content_video_id = data.contentVideoId;
        this.duration = Number(data.duration);
        this.current_time = Number(data.currentTime);
    }
}

export class SubtitlesTrackEvent {
    constructor(data) {
        this.video_id = data.videoId;
        this.track_name = data.trackName || null;
        this.language_code = data.languageCode || null;
        this.source_language_code = data.sourceLanguageCode || null;
        this.language_name = data.languageName || null;
        this.kind = data.kind || null;
        this.vss_id = data.vss_id || null;
        this.caption_id = data.captionId || null;
        this.style = data.style || null;
    }
}

export class AutoplayUpNextEvent {
    constructor(data) {
        this.video_id = data.videoId;
    }
}

export class PlaybackSpeedEvent {
    constructor(data) {
        this.playback_speed = Number(data.playbackSpeed);
    }
}

export class DisconnectedEvent {
    constructor(data) {
        this.reason = data ? data.reason : null;
    }
}
