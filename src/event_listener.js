export class EventListener {
    async playback_state_changed(event) { }
    async now_playing_changed(event) { }
    async volume_changed(event) { }
    async autoplay_changed(event) { }
    async ad_state_changed(event) { }
    async ad_playing_changed(event) { }
    async subtitles_track_changed(event) { }
    async autoplay_up_next_changed(event) { }
    async playback_speed_changed(event) { }
    async disconnected(event) { }
}

export class _EmptyListener extends EventListener { }
