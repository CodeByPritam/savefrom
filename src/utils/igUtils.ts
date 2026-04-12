const dissectIgUrl = (url: string) => {

    // Normalize
    let nrml = (url as string)
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/^instagram\.com\//, '')
    .replace(/\/$/, '');

    // Pattern Check
    const patterns = {
        postRegex: /^p\/([a-zA-Z0-9_\-]+)\/?$/,
        reelsRegex: /^reels?\/([a-zA-Z0-9_\-]+)\/?$/,
        audioRegex: /^reels?\/audio\/(\d+)\/?$/,
        bigUrlFormatHighlightsRegex: /^stories\/highlights\/(\d+)\/?$/,
        shortUrlFormatHighlightRegex: /^s\/([a-zA-Z0-9]+)\/?$/,
        storiesRegex: /^stories\/([a-zA-Z0-9_.\-]+)(?:\/(\d+))?\/?$/,
        profileRegex: /^([a-zA-Z0-9_.\-]+)\/?$/,
    }

    // Matching
    for (const [type, pattern] of Object.entries(patterns)) {
        const match = nrml.match(pattern);
        if (match) {
            return {
                shortcode: match[1],
                isPost: (type === 'postRegex'),
                isReel: (type === 'reelsRegex'),
                isAudio: (type === 'audioRegex'),
                isProfile: (type === 'profileRegex'),
                isStory: (type === 'storiesRegex'),
                isHighlight: (type === 'bigUrlFormatHighlightsRegex' || type === 'shortUrlFormatHighlightRegex'),
            }
        }
    }

};

// Export
export { dissectIgUrl };