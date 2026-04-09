import crypto from 'crypto';

// Docs ID
const docsID = {
    'PolarisPostActionLoadPostQueryQuery': '8845758582119845',
    'PolarisProfilePageContentQuery': '28812098038405011',
}

// Post & Reels Headers
const rpHeaders = (friendlyName: string, fullUrl: string) => {
    const randomString = (length: number) => {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) { result += chars.charAt(Math.floor(Math.random() * chars.length)); }
        return result;
    };
    const platforms = [
        { ua: 'Windows NT 10.0; Win64; x64', platform: 'Windows', platform_version: '10.0.0' },
        { ua: 'Macintosh; Intel Mac OS X 10_15_7', platform: 'macOS', platform_version: '10.15.7' },
        { ua: 'X11; Linux x86_64', platform: 'Linux', platform_version: '0.0.0'  },
    ];
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    const colorschemes = ['light', 'dark'];
    const majorVersion = Math.floor(Math.random() * (134 - 120 + 1)) + 120;
    const build = Math.floor(Math.random() * (7000 - 6000 + 1)) + 6000;
    const patch = Math.floor(Math.random() * (200 - 100 + 1)) + 100;
    const fullVersion = `${majorVersion}.0.${build}.${patch}`;
    const userAgent = `Mozilla/5.0 (${(platform as any).ua}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${majorVersion}.0.0.0 Safari/537.36`;
    const secChUa = `"Chromium";v="${majorVersion}", "Not:A-Brand";v="24", "Google Chrome";v="${majorVersion}"`;
    const secChUaFullVersionList = `"Chromium";v="${fullVersion}", "Not:A-Brand";v="24.0.0.0", "Google Chrome";v="${fullVersion}"`;
    const csrf = randomString(32);
    const locales = ['US', 'IN', 'GB'];
    const locale = locales[Math.floor(Math.random() * locales.length)];

    // Return
    return {
        'Accept': '*/*',
        'Accept-Language': `en-${locale},en;q=${(Math.floor(Math.random() * 3) + 7)/10},hi;q=0.${Math.floor(Math.random() * 4) + 5}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': [
            `mid=${randomString(26)}`,
            `ig_did=${randomString(8).toUpperCase()}-${randomString(4)}-${randomString(4)}-${randomString(4)}-${randomString(12)}`,
            'ig_nrcb=1',
            `ps_l=${Math.random() < 0.5 ? 0 : 1}`,
            `ps_n=${Math.random() < 0.5 ? 0 : 1}`,
            `datr=${randomString(20)}`,
            `rur="${randomString(3)}\\054${Math.floor(Math.random() * (99999999999 - 10000000000 + 1)) + 10000000000}\\054${Math.floor(Date.now() / 1000)}:01f7${randomString(58)}"`,
            `csrftoken=${csrf}`,
            `wd=${Math.floor(Math.random() * (1920 - 800 + 1)) + 800}x${Math.floor(Math.random() * (1080 - 600 + 1)) + 600}`
        ].join('; '),
        'DNT': Math.random() < 0.5 ? '0' : '1',
        'Origin': 'https://www.instagram.com',
        'Priority': `u=${Math.floor(Math.random() * 3) + 1}, i`,
        'Referer': fullUrl,
        'Sec-Ch-Prefers-Color-Scheme': colorschemes[Math.floor(Math.random() * colorschemes.length)],
        'Sec-Ch-Ua': secChUa,
        'Sec-Ch-Ua-Full-Version-List': secChUaFullVersionList,
        'Sec-Ch-Ua-Mobile': `?${Math.random() < 0.5 ? 0 : 1}`,
        'Sec-Ch-Ua-Model': '""',
        'Sec-Ch-Ua-Platform': `"${(platform as any).platform}"`,
        'Sec-Ch-Ua-Platform-Version': `"${(platform as any).platform_version}"`,
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'User-Agent': userAgent,
        'X-Asbd-Id': String(Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000),
        'X-Bloks-Version-Id': crypto.createHash('sha256').update(randomString(32)).digest('hex'),
        'X-Csrftoken': csrf,
        'X-Fb-Friendly-Name': friendlyName,
        'X-Fb-Lsd': randomString(11),
        'X-Ig-App-Id': String(Math.floor(Math.random() * (999999999999999 - 900000000000000 + 1)) + 900000000000000),
    };
};


// Export
export { rpHeaders };