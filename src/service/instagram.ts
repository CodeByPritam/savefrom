import type { Context } from 'hono';
import { fetch, ProxyAgent } from 'undici';
import _Config from '../config/config.js';
import { URLSearchParams, URL } from "node:url";
import { v7 } from 'uuid';
import { oxylabproxy, brightdataproxy } from '../config/proxy.js';
import { rpHeaders, rpPayload, wpiHeaders, feedHeaders } from '../helper/igHttpHelper.js';

// Handle posts & reels HTTP request
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
    const call = await fetch(`${path}`, {
        method: 'POST',
        headers: headers,
        body: body,
        dispatcher: new ProxyAgent({ uri: oxylabproxy() as string }),
        redirect: 'follow'
    });
    
    // Response
    const rawGraphQl = await call.json();
    const response = (rawGraphQl as any).data.xdt_shortcode_media;

    // Private content
    if (response === null) {
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
            owner: {
                id: null,
                name: null,
                username: null,
                profileUrl: null,
                account: {
                    is_private: null,
                    is_verified: null,
                    type: null,
                    displaylabel: null,
                    total_media_count: null,
                    followers_count: null,
                    following_count: null,
                    desc: null,
                    external_links: {}
                }
            },
            message: `You are trying to download a private ${type}, we do not support private downloading`,
            timestamp: new Date().toISOString()
        }, 404);
    }

    // Public :: Single Post
    if ((response.__typename === "XDTGraphImage" || response.__isXDTGraphMediaInterface === "XDTGraphImage") && !response.is_video) {
        const displayResources = response.display_resources;
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
            owner: {
                id: response.owner.id,
                name: response.owner.full_name,
                username: response.owner.username,
                profileUrl: response.owner.profile_pic_url,
                account: {
                    is_private: response.owner.is_private,
                    is_verified: response.owner.is_verified,
                    type: null,
                    displaylabel: null,
                    total_media_count: response.owner.edge_owner_to_timeline_media.count,
                    followers_count: response.owner.edge_followed_by.count,
                    following_count: null,
                    desc: null,
                    external_links: {}
                }
            },
            message: `${type} fetched successfully`,
            timestamp: new Date().toISOString()
        }, 200);
    }

    // Public :: Multiple Post
    if ((response.__typename === "XDTGraphSidecar" || response.__isXDTGraphMediaInterface === "XDTGraphSidecar") && !response.is_video) {
        const edgeSideCar = response.edge_sidecar_to_children.edges;
        let list = [];

        // Loop through each node
        for (let i = 0; i < edgeSideCar.length; i++) {
            const displayResources = edgeSideCar[i].node.display_resources;
            list.push(displayResources);
        }

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
            owner: {
                id: response.owner.id,
                name: response.owner.full_name,
                username: response.owner.username,
                profileUrl: response.owner.profile_pic_url,
                account: {
                    is_private: response.owner.is_private,
                    is_verified: response.owner.is_verified,
                    type: null, 
                    displaylabel: null,
                    total_media_count: response.owner.edge_owner_to_timeline_media.count,
                    followers_count: response.owner.edge_followed_by.count,
                    following_count: null,
                    desc: null,
                    external_links: {}
                }
            },
            message: `${type} fetched successfully`,
            timestamp: new Date().toISOString()
        }, 200);
    }

    // Public : Reels
    if ((response.__typename === "XDTGraphVideo" || response.__isXDTGraphMediaInterface === "XDTGraphVideo") && response.is_video) {
        const displayResources = response.display_resources;
        const highestQualityPreviewUrl = displayResources[displayResources.length - 1].src;
        const videoUrl = response.video_url;
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
            owner: {
                id: response.owner.id,
                name: response.owner.full_name,
                username: response.owner.username,
                profileUrl: response.owner.profile_pic_url,
                account: {
                    is_private: response.owner.is_private,
                    is_verified: response.owner.is_verified,
                    type: null, 
                    displaylabel: null,
                    total_media_count: response.owner.edge_owner_to_timeline_media.count,
                    followers_count: response.owner.edge_followed_by.count,
                    following_count: null,
                    desc: null,
                    external_links: {}
                }
            },
            message: `${type} fetched successfully`,
            timestamp: new Date().toISOString()
        }, 200);
    }
    
};

// Handle profile & feed HTTP request
const pfService = async (c: Context, url: string, shortcode: string, type: string) => {
    const headers = wpiHeaders(url);

    /* ================================================== */
    /* ========== Step 1 :: Obtain UserID =============== */
    /* ================================================== */
    const wpiUrl = new URL(`https://instagram.com/api/v1/users/web_profile_info`);
    wpiUrl.searchParams.set("username", shortcode);

    // Error Handling
    let userID;
    let owner;
    try {
        const wpiCall = await fetch(wpiUrl, {
            method: 'GET',
            headers: headers,
            dispatcher: new ProxyAgent({
                uri: brightdataproxy().replace('https://', 'http://'),
                proxyTls: { rejectUnauthorized: false },
                requestTls: { rejectUnauthorized: false }
            }),
            redirect: 'follow'
        });

        // Response
        const wpiJson = await wpiCall.json();
        userID = (wpiJson as any).data.user.id ?? null;

        // UserID null
        if (userID === null) {
            owner = {
                id: null,
                name: null,
                username: null,
                profileUrl: null,
                account: {
                    is_private: null,
                    is_verified: null,
                    type: null, 
                    displaylabel: null,
                    total_media_count: null,
                    followers_count: null,
                    following_count: null,
                    desc: null,
                    external_links: {}
                }
            };
        }
    } catch (error) {
        return c.json({
            success: false,
            response_idx: v7(),
            jar: {
                media: {
                    actual_type: null,
                    expected_type: null,
                    is_public: null,
                    is_single: null
                },
                sf: {}
            },
            owner: {
                id: null,
                name: null,
                username: null,
                profileUrl: null,
                account: {
                    is_private: null,
                    is_verified: null,
                    type: null,
                    displaylabel: null,
                    total_media_count: null,
                    followers_count: null,
                    following_count: null,
                    desc: null,
                    external_links: {}
                }
            },
            message: `wpi internal server error`,
            timestamp: new Date().toISOString()
        }, 500);
    }

    /* ================================================== */
    /* ========== Step 2 :: Get Profile ================= */
    /* ================================================== */ 
    const getProfilePath = "https://www.instagram.com/graphql/query/";
    const friendlyName = 'PolarisProfilePageContentQuery';

    // Prepare headers & payload
    const profileHeaders = rpHeaders(friendlyName, url);
    const profilePayload = rpPayload(friendlyName, ({
        id: userID,
        render_surface: 'PROFILE'
    } as any));

    // Generate Body & Response
    const profileBody = new URLSearchParams(profilePayload as any).toString();

    // Error Handling
    let getprofile;
    try {
        const profileCall = await fetch(`${getProfilePath}`, {
            method: 'POST',
            headers: profileHeaders,
            body: profileBody,
            dispatcher: new ProxyAgent({ uri: oxylabproxy() }),
            redirect: 'follow'
        });

        // Response
        const profileJson = await profileCall.json();
        getprofile = (profileJson as any).data.user ?? null;
        
        // Store in owner
        owner = {
            id: getprofile.id,
            name: getprofile.full_name,
            username: getprofile.username,
            profileUrl: getprofile.hd_profile_pic_url_info.url,
            account: {
                is_private: getprofile.is_private,
                is_verified: getprofile.is_verified,
                type: `account type ${getprofile.account_type}`,
                displaylabel: getprofile.category,
                total_media_count: getprofile.media_count,
                followers_count: getprofile.follower_count,
                following_count: getprofile.following_count,
                desc: getprofile.biography,
                external_links: getprofile.bio_links.length >= 1 ? getprofile.bio_links : {}
            }
        }
    } catch (error) {
        return c.json({
            success: false,
            response_idx: v7(),
            jar: {
                media: {
                    actual_type: null,
                    expected_type: null,
                    is_public: null,
                    is_single: null
                },
                sf: {}
            },
            owner: {
                id: null,
                name: null,
                username: null,
                profileUrl: null,
                account: {
                    is_private: null,
                    is_verified: null,
                    type: null,
                    displaylabel: null,
                    total_media_count: null,
                    followers_count: null,
                    following_count: null,
                    desc: null,
                    external_links: {}
                }
            },
            message: `profile internal server error`,
            timestamp: new Date().toISOString()
        }, 500);
    }
    
    /* ================================================== */
    /* ========== Step 3 :: Get Feed ==================== */
    /* ================================================== */

    // Prepare Headers
    const fHeaders = feedHeaders(url);

    // Ready Url
    const feedUrl = new URL(`https://www.instagram.com/api/v1/feed/user/${shortcode}/username/`);
    feedUrl.searchParams.set("count", "12");

    // Error Handling
    let getfeed;
    try {
        // Generate Response
        const feedCall = await fetch(feedUrl, {
            method: 'GET',
            headers: fHeaders,
            dispatcher: new ProxyAgent({ uri: oxylabproxy() }),
            redirect: 'follow'
        });

        // Response
        const feedJson = await feedCall.json()
        getfeed = (feedJson as any).items;
    } catch (error) {
        return c.json({
            success: false,
            response_idx: v7(),
            jar: {
                media: {
                    actual_type: null,
                    expected_type: null,
                    is_public: null,
                    is_single: null
                },
                sf: {}
            },
            owner: {
                id: null,
                name: null,
                username: null,
                profileUrl: null,
                account: {
                    is_private: null,
                    is_verified: null,
                    type: null,
                    displaylabel: null,
                    total_media_count: null,
                    followers_count: null,
                    following_count: null,
                    desc: null,
                    external_links: {}
                }
            },
            message: `Feed internal server error`,
            timestamp: new Date().toISOString()
        }, 500);
    }

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
            message: `private account detected, with without content`,
            timestamp: new Date().toISOString()
        }, 200);
    }

    // Semi - Private Persion :: Public account + No feed
    if (!owner.account.is_private && getfeed.length === 0 && owner.account.total_media_count === 0) {
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
            message: 'public account detected, with without content',
            timestamp: new Date().toISOString()
        }, 200);
    }

    // Full Open Person :: Public account + With feed
    if (!owner.account.is_private && getfeed.length >= 1 && owner.account.total_media_count >= 1) {
        let feedArray = [];
        for (const elm of getfeed) {

            // images
            if (elm.product_type === 'carousel_container') {
                const cmnode = elm.carousel_media.map((cm: any) => cm.image_versions2.candidates);
                feedArray.push({ node: cmnode, type: ['image'] });
            }

            // videos
            if (elm.product_type === 'clips') {
                feedArray.push({ node: elm.video_versions, type: ['video'] });
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
                sf: { feedArray }
            },
            owner: owner,
            message: `public account detected, with content`,
            timestamp: new Date().toISOString()
        }, 200);
    }

}

// Export
export { rpService, pfService };