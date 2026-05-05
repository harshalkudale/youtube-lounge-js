import fetch from 'node-fetch';

export const api_base = 'https://www.youtube.com/api/lounge';

export function get_thumbnail_url(videoId, thumbnailIdx = 0) {
    return `https://img.youtube.com/vi/${videoId}/${thumbnailIdx}.jpg`;
}

export async function get_available_captions(apiKey, videoId) {
    const yt_base_url = 'https://www.googleapis.com/youtube/v3/captions';
    const params = new URLSearchParams({ part: 'snippet', videoId, key: apiKey });
    const url = `${yt_base_url}?${params.toString()}`;
    const resp = await fetch(url);
    if (!resp.ok) {
        throw new Error(`Request failed with status ${resp.status}`);
    }
    const data = await resp.json();
    const languages = [];
    for (const item of data.items || []) {
        const snippet = item.snippet || {};
        const language = snippet.language;
        if (language && !languages.includes(language)) languages.push(language);
    }
    return languages;
}
