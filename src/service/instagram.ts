import type { Context } from 'hono';
import { fetch, ProxyAgent } from 'undici';
import _Config from '../config/config.js';
import { URLSearchParams, URL } from "node:url";
import { v7 } from 'uuid';
import { oxylabproxy, brightdataproxy } from '../config/proxy.js';
import { rpHeaders, rpPayload, wpiHeaders, feedHeaders, highlightHeaders } from '../helper/igHttpHelper.js';

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

// @interface : JarMedia
interface JarMedia {
    actual_type: string | null;
    expected_type: string[] | null;
    is_public: boolean | null;
    is_single: boolean | null;
}

// @interface : OwnerAccount
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

// @interface :: Owner
interface Owner {
    id: string | null;
    name: string | null;
    username: string | null;
    profileUrl: string | null;
    account: OwnerAccount;
}

// @interface :: ApiResponse
interface ApiResponse {
    success: boolean;
    _idx: string;
    jar: { media: JarMedia; sf: object };
    owner: Owner;
    message: string;
    timestamp: string;
}

// Http Status Code
type HttpStatus = 200 | 404 | 406 | 422 | 500 | 502;

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

// Null :: Empty Jar - May Used In Error Responses
const NullJar: ApiResponse['jar'] = {
    media: {
        actual_type: null,
        expected_type: null,
        is_public: null,
        is_single: null,
    },
    sf: {},
}

/* ================================================================ */
/* =================== Response Builder Helpers =================== */
/* ================================================================ */

// Build Standard Response Envelope & Returns
const buildResponse = (c: Context, status: HttpStatus, partial: Partial<Omit<ApiResponse, '_idx' | 'timestamp'>>) => {
    const body: ApiResponse = {
        success: partial.success ?? false,
        _idx: v7(),
        jar: partial.jar ?? NullJar,
        owner: partial.owner ?? NullOwner,
        message: partial.message ?? '',
        timestamp: new Date().toISOString(),
    };
    return c.json(body, status);
};

// Build Error Response - Avoids Repeating The Full Object
const buildError = (c: Context, status: HttpStatus, message: string) => {
    buildResponse(c, status, { success: false, message });
}

// Build OwnerForRPs - ( Reels / Posts )
const buildOwnerForRPs = (raw: any): Owner => ({
    id: raw.id ?? null,
    name: raw.full_name ?? null,
    username: raw.username ?? null,
    profileUrl: raw.profile_pic_url ?? null,
    account: {
        is_private: raw.is_private ?? null,
        is_verified: raw.is_verified ?? null,
        _type: null,
        displaylabel: null,
        total_media_count: raw.edge_owner_to_timeline_media.count ?? null,
        followers_count: raw.edge_followed_by.count ?? null,
        following_count: null,
        desc: null,
        external_links: {},
    }
});

/* ============================================================ */
/* =========== Reels & Posts Service ( rpService ) ============ */
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
    const body = new URLSearchParams(payload as any).toString();

    // Service Fetch
    let rawGraphQl: any;
    try {
        const call = await fetch(`${path}`, {
            method: 'POST',
            headers: headers,
            body: body,
            dispatcher: oxylabAgent,
            redirect: 'follow',
        });

        // Call failed
        if (!call.ok) {
            return buildError(c, 502, `reels & posts service responded with ${call.status}`);
        }

        // Process
        rawGraphQl = await call.json();
    } catch (error) {
        return buildError(c, 500, `reels & posts service error: ${(error as Error).message}`);
    }

    // Further processing
    const response = (rawGraphQl as any).data.xdt_shortcode_media ?? null;

    // Private content
    if (response === null || response === undefined) {
        return buildResponse(c, 404, {
            success: false,
            jar: {
                media: {
                    actual_type: type,
                    expected_type: null,
                    is_public: null,
                    is_single: null,
                },
                sf: {},
            },
            message: `you are trying to download a private ${type}, private content is not supported`,
        });
    }

    // Public :: Single Post
    if ((response.__typename === "XDTGraphImage" || response.__isXDTGraphMediaInterface === "XDTGraphImage") && !response.is_video) {
        const dr = (response.display_resources ?? []).map((leaf: any) => ({
            qualityid: v7(),
            src: leaf.src,
            width: leaf.config_width ?? null,
            height: leaf.config_height ?? null,
        }));

        // Response
        return buildResponse(c, 200, {
            success: true,
            jar: {
                media: {
                    actual_type: type,
                    expected_type: [ 'image' ],
                    is_public: true,
                    is_single: true,
                },
                sf: { 
                    idpost: v7(), 
                    qualities: dr,
                },
            },
            owner: buildOwnerForRPs(response.owner),
            message: `${type} fetched successfully`,
        });
    }

    // Public :: Multiple Post
    if ((response.__typename === "XDTGraphSidecar" || response.__isXDTGraphMediaInterface === "XDTGraphSidecar") && !response.is_video) {
        const edgeSideCar: any[] = response.edge_sidecar_to_children.edges ?? [];
        const mp = edgeSideCar.map((edge: any) => {

            // Each qualities will get, its own pid, qid & return
            const qualities = (edge.node.display_resources ?? []).map((leaf: any) => ({
                qualityid: v7(),
                src: leaf.src,
                width: leaf.config_width ?? null,
                height: leaf.config_height ?? null,
            }));
            return { idpost: v7(), qualities }
        });

        // Response
        return buildResponse(c, 200, {
            success: true,
            jar: {
                media: {
                    actual_type: type,
                    expected_type: [ 'image' ],
                    is_public: true,
                    is_single: false
                },
                sf: mp
            },
            owner: buildOwnerForRPs(response.owner),
            message: `${type} fetched successfully`,
        });
    }

    // Public : Reels + Audio ( v2 )
    if ((response.__typename === "XDTGraphVideo" || response.__isXDTGraphMediaInterface === "XDTGraphVideo") && response.is_video) {
        const displayResources: any[] = response.display_resources ?? [];
        const highestQualityPreviewUrl = displayResources.at(-1).src ?? null;
        const videoUrl = response.video_url ?? null;

        // Return
        return buildResponse(c, 200, {
            success: true,
            jar: {
                media: {
                    actual_type: type,
                    expected_type: [ 'video' ],
                    is_public: true,
                    is_single: true,
                },
                sf: {
                    idreel: v7(),
                    previewUrl: highestQualityPreviewUrl,
                    vidoeUrl: videoUrl,
                },
            },
            owner: buildOwnerForRPs(response.owner),
            message: `${type} fetched successfully`,
        });
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

        // No userID :: Account Does Not Exist Or Blocked
        if (!userID) {
            return buildResponse(c, 404, {
                success: false,
                message: `user "${shortcode}" not found or account does not exist`,
            });
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

    // Surface Network-level rejections
    if (profileResult.status === 'rejected') { return buildError(c, 500, `profile fetch failed: ${profileResult.reason}`); }
    if (feedResult.status === 'rejected') { return buildError(c, 500, `feed fetch failed: ${feedResult.reason}`); }

    // Surface HTTP-level errors
    if (!profileResult.value.ok) { return buildError(c, 502, `profile API responded with ${profileResult.value.status}`); }
    if (!feedResult.value.ok) { return buildError(c, 502, `feed API responed with ${feedResult.value.status}`); }

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
        profileUrl: getprofile.hd_profile_pic_url_info.url ?? null,
        account: {
            is_private: getprofile.is_private,
            is_verified: getprofile.is_verified,
            _type: `account type ${getprofile.account_type}`,
            displaylabel: getprofile.category ?? null,
            total_media_count: getprofile.media_count ?? null,
            followers_count: getprofile.follower_count ?? null,
            following_count: getprofile.following_count ?? null,
            desc: getprofile.biography ?? null,
            external_links: getprofile.bio_links.length >= 1 ? getprofile.bio_links : {},
        }
    };

    // Shared JarMedia
    const sharedJarMedia: JarMedia = {
        actual_type: type,
        expected_type: [ 'image', 'video' ],
        is_public: null,
        is_single: null,
    }

    // Full Private Person :: Private account + No feed
    if (owner.account.is_private) {
        return buildResponse(c, 200, {
            success: true,
            jar: {
                media: sharedJarMedia,
                sf: {},
            },
            owner: owner,
            message: `private account detected, no public content available`
        });
    }

    // Semi - Private Persion :: Public account + No feed
    if (!owner.account.is_private && getfeed.length === 0 && (owner.account.total_media_count ?? 0) === 0) {
        return buildResponse(c, 200, {
            success: true,
            jar: {
                media: sharedJarMedia,
                sf: {},
            },
            owner: owner,
            message: 'public account detected, no public content available',
        });
    }

    // Full Open Person :: Public account + With feed
    if (!owner.account.is_private && getfeed.length >= 1 && (owner.account.total_media_count  ?? 0) >= 1) {
        let feedArray = [];
        for (const elm of getfeed) {

            // images (carousel)
            if (elm.product_type === 'carousel_container') {
                const cmnode = (elm.carousel_media ?? []).map((cm: any) => {
                    const candidates: any[] = cm.image_versions2.candidates || [];
                    return candidates
                    .sort((a, b) => (b.width * b.height) - (a.width * a.height))
                    .slice(0,1)
                    .map((img: any) => ({
                        qualityid: v7(),
                        url: img.url,
                        width: img.width,
                        height: img.height,
                    }))[0];
                });
                feedArray.push({ idpost: v7(), node: cmnode, type: 'image' });
            }

            // videos / Reels
            if (elm.product_type === 'clips') {
                const candidates: any[] = elm.video_versions || [];
                const best = candidates
                .sort((a, b) => (b.width * b.height) - (a.width * a.height))
                .slice(0, 1)
                .map((vid: any) => ({
                    qualityid: v7(),
                    url: vid.url,
                    width: vid.width,
                    height: vid.height,
                }))[0];
                feedArray.push({ idreel: v7(), node: best, type: 'video' });
            }

        }

        // return
        return buildResponse(c, 200, {
            success: true,
            jar: {
                media: {
                    ...sharedJarMedia, 
                    is_public: true, 
                    is_single: (owner.account.total_media_count as number) > 1 ? false : true,
                },
                sf: feedArray
            },
            owner: owner,
            message: `public account detected, profile and feed fetched successfully`,
        });
    }

    // Fallback — keeps TypeScript + runtime happy
    return buildError(c, 422, 'Unexpected profile or feed state, no matching response'); 
}

/* ============================================================ */
/* ========= Handle Reels & Normal Audio HTTP Request ========= */
/* ============================================================ */
const aService = async (c: Context, url: string, shortcode: string, type: string) => {
    return buildResponse(c, 200, {
        success: true,
        jar: {
            media: {
                actual_type: type,
                expected_type: [ 'audio/mp3' ],
                is_public: null,
                is_single: null,
            },
            sf: {},
        },
        message: `audio links are not supported yet, use the reels URL to download audio`,
    });
}

/* ============================================================ */
/* =============== Handle Highlight HTTP Request ============== */
/* ============================================================ */
const hlService = async (c: Context, url: string, shortcode: string, type: string) => {
    const hlPath = `https://i.instagram.com/api/v1/feed/reels_media/?reel_ids=highlight:${shortcode}`;

    // Prepare headers
    const hlHeaders = highlightHeaders(url);

    // Highlights Fetch
    let hlJson: unknown;
    try {
        const hlCall = await fetch(`${hlPath}`, {
            method: 'GET',
            headers: hlHeaders,
            dispatcher: oxylabAgent,
            redirect: 'follow'
        });

        // hlCall failed
        if (!hlCall.ok) {
            return buildError(c, 500, `highlights service responded with ${hlCall.status}`);
        }

        // Process
        hlJson = await hlCall.json();
    } catch (error) {
        return buildError(c, 500, `highlights service error: ${(error as Error).message}`);
    }

    // Further processing
    const hlGet = (hlJson as any).reels ?? null;

    // Return :: Private Highlight
    if (!hlGet || Object.keys(hlGet).length === 0) {
        return buildResponse(c, 404, {
            success: false,
            jar: {
                media: {
                    actual_type: type,
                    expected_type: [ 'image', 'video' ],
                    is_public: null,
                    is_single: null,
                },
                sf: {},
            },
            message: `you are trying to download a private ${type}, private content is not supported`,
        })
    }

    // Further processing
    const highlight = hlGet[`highlight:${shortcode}`];
    const user = highlight.user ?? null
    const rawItems: any[] = highlight.items ?? [];

    // Build OwnerObject
    const owner: Owner = {
        id: user.id ?? null,
        name: user.full_name ?? null,
        username: user.username ?? null,
        profileUrl: user.profile_pic_url ?? null,
        account: {
            is_private: user.is_private ?? null,
            is_verified: user.is_verified ?? null,
            _type: null,
            displaylabel: null,
            total_media_count: null,
            followers_count: null,
            following_count: null,
            desc: null,
            external_links: {},
        }
    }

    // Loop through items
    const items = rawItems.map((elm: any) => {

        // Media type 1: Image Highlight
        if (elm.media_type === 1) {
            const candidates: any[] = elm.image_versions2.candidates ?? [];
            const qualities = candidates
            .sort((a, b) => (b.width * b.height) - (a.width * a.height))
            .slice(0, 3)
            .map((x: any) => ({
                qualityid: v7(),
                url: x.url ?? null,
                width: x.width ?? null,
                height: x.height ?? null,
            }));

            // Return
            return {
                idpost: v7(),
                type: 'image',
                qualities,
            };
        }

        // Media type 2: Video Highlight
        if (elm.media_type === 2) {
            const videoVersions: any[] = elm.video_versions ?? [];
            const candidates: any[] = elm.image_versions2.candidates ?? [];

            // Video highest download quality
            const bestVideo = videoVersions.reduce((best: any, v: any) =>
                (v.bandwidth ?? 0) > (best.bandwidth ?? 0) ? v : best, videoVersions[0] ?? null
            );

            // candidates[0] = highest resolution thumbnail & return
            const highestQualityPreviewUrl = candidates[0] ?? null;
            return {
                idreel: v7(),
                type: 'video',
                videoUrl: bestVideo.url ?? null,
                width: bestVideo.width ?? null,
                height: bestVideo.height ?? null,
                thumbnail: {
                    previewUrl: highestQualityPreviewUrl.url ?? null,
                    width: highestQualityPreviewUrl.width ?? null,
                    height: highestQualityPreviewUrl.height ?? null,
                }
            };
        }
    });

    // Return
    return buildResponse(c, 200, {
        success: true,
        jar: {
            media: {
                actual_type: type,
                expected_type: [ 'image', 'video' ],
                is_public: true,
                is_single: highlight.media_count === 1,
            },
            sf: items,
        },
        owner: owner,
        message: `${type} fetched successfully`,
    })
}

/* ============================================================ */
/* ================ Handle Stories HTTP Request =============== */
/* ============================================================ */
const storyService = async (c: Context, url: string, shortcode: string, type: string) => {
    return buildResponse(c, 406, {
        success: false,
        message: 'stories downloading is not yet implemented, comming soon',
    });
}

// Export
export { rpService, pfService, aService, hlService, storyService };