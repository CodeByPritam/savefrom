import type { Context } from 'hono';
import { fetch, ProxyAgent } from 'undici';
import _Config from '../config/config.js';
import { URLSearchParams, URL } from "node:url";
import { v7 } from 'uuid';
import { oxylabproxy, brightdataproxy } from '../config/proxy.js';
import { rpHeaders, rpPayload, wpiHeaders, feedHeaders } from '../helper/igHttpHelper.js';

/* =============================================================== */
/* ============== Module-level :: proxy singletons =============== */
/* =============================================================== */
const oxylabAgent = new ProxyAgent({ uri: oxylabproxy() as string });
const brightdataAgent = new ProxyAgent({ 
    uri: brightdataproxy().replace('https://', 'http://') as string,
    proxyTls: { rejectUnauthorized: false },
    requestTls: { rejectUnauthorized: false },
});

/* ===================================================================== */
/* ==================== @types:: Response Interfaces =================== */
/* ===================================================================== */

// interface : Jar -> Media
interface JarMedia {
    actual_type: string | null;
    expected_type: string[] | null;
    is_public: boolean | null;
    is_single: boolean | null;
}

// interface : Owner Account
interface OwnerAccount {
    is_private: boolean | null;
    is_verified: boolean | null;
    _type: string | null;
    displaylabel: string | null;
    total_media_count: number | null;
    followers_count: number | null;
    following_count: number | null;
    desc: string | null;
    external_links: object;
}

// interface :: Owner
interface Owner {
    id: string | null;
    name: string | null;
    username: string | null;
    profileUrl: string | null;
    account: OwnerAccount;
}

/* ============================================================ */
/* ==================== Shared Helpers ======================== */
/* ============================================================ */

// Null ::  Empty Owner
const NullOwner: Owner = {
    id: null,
    name: null,
    username: null,
    profileUrl: null,
    account: {
        is_private: null,
        is_verified: null,
        _type: null,
        displaylabel: null,
        total_media_count: null,
        followers_count: null,
        following_count: null,
        desc: null,
        external_links: {},
    },
}

// Null :: Empty Jar
const NullJar = {
    media: {
        actual_type: null,
        expected_type: null,
        is_public: null,
        is_single: null,
    } as JarMedia,
    sf: {},
}

// Build Error
const buildError = (c: Context, status: number, message: string) => {
    c.json({
        success: false,
        response_idx: v7(),
        jar: NullJar,
        owner: NullOwner,
        message,
        timestamp: new Date().toISOString()
    }, status as any);
}

// Build RP Owner
const buildOwnerForRPs = (owner: any): Owner => {
    return {
        id: owner.id ?? null,
        name: owner.full_name ?? null,
        username: owner.username ?? null,
        profileUrl: owner.profile_pic_url ?? null,
        account: {
            is_private: owner.is_private ?? null,
            is_verified: owner.is_verified ?? null,
            _type: null,
            displaylabel: null,
            total_media_count: owner.edge_owner_to_timeline_media.count ?? null,
            followers_count: owner.edge_followed_by.count ?? null,
            following_count: null,
            desc: null,
            external_links: {}
        }
    }
}

/* ============================================================ */
/* =========== Handle Posts & Reels HTTP Request ============== */
/* ============================================================ */
const rpService = async (c: Context, url: string, shortcode: string, type: string) => {
    const path = 'https://www.instagram.com/graphql/query/';
    const friendlyName = 'PolarisPostActionLoadPostQueryQuery';

    // Prepare headers & payload
    const headers = rpHeaders(friendlyName, url);
    const payload = rpPayload(friendlyName, ({
        shortcode,
        fetch_tagged_user_count: null,
        hoisted_comment_id: null,
        hoisted_reply_id: null,
    } as any));

    // Generate Body & Response
    const body = new URLSearchParams(payload as any).toString();

    // Error Handling
    let rawGraphQl: unknown;
    try {
        const call = await fetch(`${path}`, {
            method: 'POST',
            headers: headers,
            body: body,
            dispatcher: oxylabAgent,
            redirect: 'follow'
        });

        // Call failed
        if (!call.ok) {
            return buildError(c, 502, `reels & posts service responded with ${call.status}`);
        }

        // Process
        rawGraphQl = await call.json();
    } catch (error) {
        return buildError(c, 500, `reels & posts service, internal server error: ${(error as Error).message}`);
    }

    // Further processing
    const response = (rawGraphQl as any).data.xdt_shortcode_media;

    // Private content
    if (response === null || response === undefined) {
        return c.json({
            success: false,
            response_idx: v7(),
            jar: {
                media: {
                    actual_type: type,
                    expected_type: null,
                    is_public: null,
                    is_single: null
                },
                sf: {}
            },
            owner: NullOwner,
            message: `You are trying to download a private ${type}, we do not support private downloading`,
            timestamp: new Date().toISOString()
        }, 404 as any);
    }

    // Public :: Single Post
    if ((response.__typename === "XDTGraphImage" || response.__isXDTGraphMediaInterface === "XDTGraphImage") && !response.is_video) {
        const displayResources = response.display_resources;

        // Response
        return c.json({
            success: true,
            response_idx: v7(),
            jar: {
                media: {
                    actual_type: type,
                    expected_type: [ 'image' ],
                    is_public: true,
                    is_single: true
                },
                sf: { dr: displayResources }
            },
            owner: buildOwnerForRPs(response.owner),
            message: `${type} fetched successfully`,
            timestamp: new Date().toISOString()
        }, 200 as any);
    }

    // Public :: Multiple Post
    if ((response.__typename === "XDTGraphSidecar" || response.__isXDTGraphMediaInterface === "XDTGraphSidecar") && !response.is_video) {
        const edgeSideCar = response.edge_sidecar_to_children.edges ?? [];
        const list = edgeSideCar.map((edge: any) => edge.node.display_resources);

        // Response
        return c.json({
            success: true,
            response_idx: v7(),
            jar: {
                media: {
                    actual_type: type,
                    expected_type: [ 'image' ],
                    is_public: true,
                    is_single: false
                },
                sf: { mp: list }
            },
            owner: buildOwnerForRPs(response.owner),
            message: `${type} fetched successfully`,
            timestamp: new Date().toISOString()
        }, 200 as any);
    }

    // Public : Reels
    if ((response.__typename === "XDTGraphVideo" || response.__isXDTGraphMediaInterface === "XDTGraphVideo") && response.is_video) {
        const displayResources = response.display_resources ?? [];
        const highestQualityPreviewUrl = displayResources[displayResources.length - 1].src ?? null;
        const videoUrl = response.video_url ?? null;

        // Return
        return c.json({
            success: true,
            response_idx: v7(),
            jar: {
                media: {
                    actual_type: type,
                    expected_type: [ 'video' ],
                    is_public: true,
                    is_single: true
                },
                sf: {
                    previewUrl: highestQualityPreviewUrl,
                    videoUrl: videoUrl
                }
            },
            owner: buildOwnerForRPs(response.owner),
            message: `${type} fetched successfully`,
            timestamp: new Date().toISOString()
        }, 200 as any);
    }

    // Unknown / Unhandled types
    return buildError(c, 422, `Unhandled media type: is_video=${response.is_video}`);
};

/* ============================================================ */
/* ======== Handle Profile & Feed HTTP Request ================ */
/* ============================================================ */
const pfService = async (c: Context, url: string, shortcode: string, type: string) => {

    /* ================================================================================= */
    /* ====== Step 1 :: Obtain UserID (serial — Steps 2 & 3 depend on this value) ====== */
    /* ================================================================================= */
    const wpiUrl = new URL(`https://instagram.com/api/v1/users/web_profile_info`);
    wpiUrl.searchParams.set("username", shortcode);

    // Ready headers
    const headers = wpiHeaders(url);
    let userID: string;

    // Error Handling
    try {
        const wpiCall = await fetch(wpiUrl, {
            method: 'GET',
            headers: headers,
            dispatcher: brightdataAgent,
            redirect: 'follow'
        });

        // wpiCall failed
        if (!wpiCall.ok) {
            return buildError(c, 502, `wpi responded with ${wpiCall.status}`);
        }

        // Response
        const wpiJson = await wpiCall.json();
        userID = (wpiJson as any).data.user.id ?? null;

        // Critical :: no point continuing without a valid userID
        if (!userID) {
            return c.json({
                success: false,
                response_idx: v7(),
                jar: NullJar,
                owner: NullOwner,
                message: `User "${shortcode}" not found or account does not exist`,
                timestamp: new Date().toISOString()
            }, 404 as any);
        }
    } catch (error) {
        return buildError(c, 500, `wpi error: ${(error as Error).message}`);
    }
    
    /* ========================================================== */
    /* ====== Steps 2 & 3 — Profile + Feed ( in PARALLEL ) ====== */
    /* ========================================================== */
    const getProfilePath = "https://www.instagram.com/graphql/query/";
    const profileFriendlyName = 'PolarisProfilePageContentQuery';

    // Prepare headers & payload & generate profile body
    const profileHeaders = rpHeaders(profileFriendlyName, url);
    const profilePayload = rpPayload(profileFriendlyName, ({
        id: userID,
        render_surface: 'PROFILE',
    } as any));
    const profileBody = new URLSearchParams(profilePayload as any).toString();

    // Prepare feed Url & Headers
    const feedUrl = new URL(`https://www.instagram.com/api/v1/feed/user/${shortcode}/username/`);
    feedUrl.searchParams.set('count', '9');
    const fHeaders = feedHeaders(url);
    
    // Call parallel promise
    const [profileResult, feedResult] = await Promise.allSettled([
        fetch(`${getProfilePath}`, {
            method: 'POST',
            headers: profileHeaders,
            body: profileBody,
            dispatcher: oxylabAgent,
            redirect: 'follow'
        }),
        fetch(`${feedUrl}`, {
            method: 'GET',
            headers: fHeaders,
            dispatcher: oxylabAgent,
            redirect: 'follow'
        })
    ]);

    // Surface any rejection :: from step 2 & from step 3
    if (profileResult.status === 'rejected') { return buildError(c, 500, `profile error: ${profileResult.reason}`); }
    if (feedResult.status === 'rejected') { return buildError(c, 500, `feed error: ${feedResult.reason}`); }

    // Check HTTP status code :: On success response
    if (!profileResult.value.ok) { return buildError(c, 502, `profile api responded with ${profileResult.value.status}`); }
    if (!feedResult.value.ok) { return buildError(c, 502, `feed api responed with ${feedResult.value.status}`); }

    // Parse both response
    let getprofile;
    let getfeed;
    try {
        const profileJson = await profileResult.value.json();
        const feedJson = await feedResult.value.json();

        // Extract
        getprofile = (profileJson as any).data.user ?? null;
        getfeed = (feedJson as any).items ?? []
    } 
    catch (error) { return buildError(c, 500, 'failed to parse profile & feed JSON response'); }

    // Build OwnerObject
    const owner: Owner = {
        id: getprofile.id,
        name: getprofile.full_name,
        username: getprofile.username,
        profileUrl: getprofile.hd_profile_pic_url_info.url,
        account: {
            is_private: getprofile.is_private,
            is_verified: getprofile.is_verified,
            _type: `account type ${getprofile.account_type}`,
            displaylabel: getprofile.category,
            total_media_count: getprofile.media_count,
            followers_count: getprofile.follower_count,
            following_count: getprofile.following_count,
            desc: getprofile.biography,
            external_links: getprofile.bio_links.length >= 1 ? getprofile.bio_links : {},
        }
    };

    // Full Private Person :: Private account + No feed
    if (owner.account.is_private) {
        return c.json({
            success: true,
            response_idx: v7(),
            jar: {
                media: {
                    actual_type: type,
                    expected_type: [ 'image', 'video' ],
                    is_public: false,
                    is_single: null
                },
                sf: {}
            },
            owner: owner,
            message: `private account detected, without public content`,
            timestamp: new Date().toISOString()
        }, 200 as any);
    }

    // Semi - Private Persion :: Public account + No feed
    if (!owner.account.is_private && getfeed.length === 0 && (owner.account.total_media_count ?? 0) === 0) {
        return c.json({
            success: true,
            response_idx: v7(),
            jar: {
                media: {
                    actual_type: type,
                    expected_type: [ 'image', 'video' ],
                    is_public: true,
                    is_single: null
                },
                sf: {}
            },
            owner: owner,
            message: 'public account detected, without content',
            timestamp: new Date().toISOString()
        }, 200 as any);
    }

    // Full Open Person :: Public account + With feed
    if (!owner.account.is_private && getfeed.length >= 1 && (owner.account.total_media_count  ?? 0) >= 1) {
        let feedArray = [];

        // loop through
        for (const elm of getfeed) {

            // images (carousel)
            if (elm.product_type === 'carousel_container') {
                const cmnode = (elm.carousel_media ?? []).map((cm: any) => {
                    const candidates = cm.image_versions2.candidates || [];
                    return [...candidates]
                    .sort((a, b) => (b.width * b.height) - (a.width * a.height))
                    .slice(0,1)
                    .map((img: any) => ({
                        id: `${v7()}`,
                        url: img.url,
                        resolution: `${img.width}x${img.height}`
                    }))[0];
                });
                feedArray.push({ node: cmnode, type: ['image'] });
            }

            // videos / Reels
            if (elm.product_type === 'clips') {
                const candidates = elm.video_versions || [];
                const top3 = [...candidates]
                .sort((a, b) => (b.width * b.height) - (a.width * a.height))
                .slice(0, 1)
                .map((vid: any) => ({
                    id: `${v7()}`,
                    url: vid.url,
                    resolution: `${vid.width}x${vid.height}`
                }))[0];
                feedArray.push({ node: top3, type: ['video'] });
            }

        }

        // return
        return c.json({
            success: true,
            response_idx: v7(),
            jar: {
                media: {
                    actual_type: type,
                    expected_type: [ 'image', 'video' ],
                    is_public: true,
                    is_single: false
                },
                sf: feedArray
            },
            owner: owner,
            message: `public account detected, with content`,
            timestamp: new Date().toISOString()
        }, 200 as any);
    }

    // Fallback — keeps TypeScript + runtime happy
    return buildError(c, 422, 'Unexpected profile/feed state, no matching response'); 
}

// Export
export { rpService, pfService };