"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToCloudinary = uploadToCloudinary;
exports.deleteFromCloudinary = deleteFromCloudinary;
exports.extractPublicIdFromUrl = extractPublicIdFromUrl;
const cloudinary_1 = require("cloudinary");
const env_1 = require("../config/env");
const stream_1 = require("stream");
cloudinary_1.v2.config({
    cloud_name: env_1.env.cloudinary.cloudName,
    api_key: env_1.env.cloudinary.apiKey,
    api_secret: env_1.env.cloudinary.apiSecret,
});
async function uploadToCloudinary(buffer, folder, publicId) {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary_1.v2.uploader.upload_stream({
            folder,
            public_id: publicId,
            resource_type: 'image',
        }, (error, result) => {
            if (error) {
                reject(error);
            }
            else if (result) {
                resolve({
                    url: result.url,
                    publicId: result.public_id,
                    secureUrl: result.secure_url,
                });
            }
            else {
                reject(new Error('Upload failed: no result'));
            }
        });
        const readable = new stream_1.Readable();
        readable.push(buffer);
        readable.push(null);
        readable.pipe(uploadStream);
    });
}
async function deleteFromCloudinary(publicId) {
    return new Promise((resolve, reject) => {
        cloudinary_1.v2.uploader.destroy(publicId, (error, result) => {
            if (error) {
                reject(error);
            }
            else {
                resolve();
            }
        });
    });
}
function extractPublicIdFromUrl(url) {
    try {
        // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{folder}/{public_id}.{ext}
        const urlParts = url.split('/');
        const uploadIndex = urlParts.findIndex(part => part === 'upload');
        if (uploadIndex === -1)
            return null;
        // Skip version (v1234567890) and get everything after
        const afterUpload = urlParts.slice(uploadIndex + 1);
        if (afterUpload.length === 0)
            return null;
        // First part after upload is usually version (v1234567890), skip it
        const startIndex = afterUpload[0]?.startsWith('v') ? 1 : 0;
        const publicIdParts = afterUpload.slice(startIndex);
        if (publicIdParts.length === 0)
            return null;
        const publicIdWithExt = publicIdParts.join('/');
        // Remove file extension
        return publicIdWithExt.replace(/\.[^/.]+$/, '');
    }
    catch {
        return null;
    }
}
