import type { Context } from 'hono';
import { fetch, ProxyAgent } from 'undici';
import _Config from '../config/config.js';
import { URLSearchParams } from "node:url";
import { v7 } from 'uuid';
import { oxylabproxy, brightdataproxy } from '../config/proxy.js';
import { rpHeaders, rpPayload } from '../helper/igHttpHelper.js';

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
                    expected_type: [ 'post' ],
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
                    expected_type: [ 'post' ],
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

// Export
export { rpService };