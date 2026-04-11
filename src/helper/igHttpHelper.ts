import crypto from 'crypto';

// Docs ID
const docsIDs = {
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

// Post & Reels Payload
const rpPayload = (friendlyName: string, variables: string) => {
    const randomString = (length: number) => {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) { result += chars.charAt(Math.floor(Math.random() * chars.length)); }
        return result;
    };
    const randomHex = (min: number, max: number) => { return Math.floor(Math.random() * (max - min + 1) + min).toString(16); };
    const timestamp = () => Math.floor(Date.now() / 1000).toString();
    const randomBigIntLike = () => {
        const randPart = Math.floor(Math.random() * 1e18).toString().padStart(18, '0');
        return '7' + randPart;
    };

    // Return
    return {
        av: String(Math.floor(Math.random() * 1000000000)),
        __d: Math.random() < 0.5 ? 'www' : 'm',
        __user: String(Math.floor(Math.random() * 1000000000)),
        __a: String(Math.random() < 0.5 ? 0 : 1),
        __req: randomHex(1, 255),
        __hs: `${Math.floor(Math.random() * (20199 - 20000 + 1)) + 20000
            }.HYP:instagram_web_pkg.${Math.floor(Math.random() * 3) + 1
            }.${Math.random() < 0.5 ? 0 : 1}..${Math.random() < 0.5 ? 0 : 1}`,
        dpr: [1, 1.5, 2, 3][Math.floor(Math.random() * 4)],
        __ccg: 'EXCELLENT',
        __rev: String(Math.floor(Math.random() * (9999999999 - 1000000000 + 1)) + 1000000000),
        __s: `${randomString(6)}:${randomString(6)}:${randomString(6)}`,
        __hsi: randomBigIntLike(),
        __dyn: `7xe${randomString(50)}1mxu${randomString(50)}w9a${randomString(50)}`,
        __csr: randomString(200),
        __comet_req: String(Math.floor(Math.random() * 10) + 1),
        lsd: 'AV' + randomString(9),
        jazoest: String(2000 + Number(timestamp().slice(-4))),
        __spin_r: String(Math.floor(Math.random() * (9999999999 - 1000000000 + 1)) + 1000000000),
        __spin_b: Math.random() < 0.5 ? 'trunk' : 'stable',
        __spin_t: timestamp(),
        fb_api_caller_class: 'RelayModern',
        fb_api_req_friendly_name: friendlyName,
        variables: JSON.stringify(variables),
        server_timestamps: 'true',
        doc_id: (docsIDs as any)[friendlyName],
    };
};

// Web Profile Info Header
const wpiHeaders = (fullUrl: string) => {
    const randomString = (length: number) => {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    };
    const platforms = [
        { ua: 'Windows NT 10.0; Win64; x64', platform: 'Windows', platform_version: '10.0.0' },
        { ua: 'Macintosh; Intel Mac OS X 10_15_7', platform: 'macOS', platform_version: '10.15.7' },
        { ua: 'X11; Linux x86_64', platform: 'Linux', platform_version: '0.0.0' },
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
        'Accept-Language': `en-${locale},en;q=${(Math.floor(Math.random() * 3) + 7) / 10},hi;q=0.${Math.floor(Math.random() * 4) + 5}`,
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
        'X-Csrftoken': csrf,
        'X-Ig-App-Id': '936619743392459',
        'X-IG-WWW-Claim': '0',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Web-Session-Id': `${randomString(6)}:${randomString(6)}:${randomString(6)}`
    };
}

// Export
export { rpHeaders, rpPayload, wpiHeaders };