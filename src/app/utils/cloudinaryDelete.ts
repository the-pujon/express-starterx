import { v2 as cloudinary } from 'cloudinary';

// Configure cloudinary with your credentials
import config from '../config';
cloudinary.config({
  cloud_name: config.cloudinary_cloud_name,
  api_key: config.cloudinary_api_key,
  api_secret: config.cloudinary_api_secret,
});

/**
 * Extract public ID from Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string} The public ID
 */
const extractPublicId = (url: string): string => {
  // Check if it's a cloudinary URL
  if (!url || !url.includes('cloudinary.com')) {
    return '';
  }
  
  // Find the 'upload/' part and extract everything after it
  const uploadIndex = url.indexOf('upload/');
  if (uploadIndex === -1) return '';
  
  // Extract the part after the version number
  const versionPartStart = uploadIndex + 7; // 'upload/' is 7 chars
  const versionPart = url.substring(versionPartStart);
  
  // Find the first slash after version number
  const versionEndIndex = versionPart.indexOf('/');
  if (versionEndIndex === -1) return '';
  
  // Extract everything after the version number
  const publicId = versionPart.substring(versionEndIndex + 1);
  
  // Remove any query parameters if present
  const queryParamIndex = publicId.indexOf('?');
  return queryParamIndex === -1 ? publicId : publicId.substring(0, queryParamIndex);
};

function extractPath(url:any) {
    // Find the part after "/upload/"
    const index = url.indexOf("/upload/");
    if (index === -1) return null; // Return null if "/upload/" is not found

    let path = url.slice(index + 8); // Extract the part after "/upload/"

    // Remove the version prefix (e.g., "v1741237117/")
    if (path.startsWith("v")) {
        path = path.slice(path.indexOf("/") + 1); // Remove the version part
    }

    // Remove duplicate ".jpg" at the end
    if (path.endsWith(".jpg.jpg")) {
        path = path.slice(0, -4); // Remove the extra ".jpg"
    }

    return path;
}
/**
 * Delete images from Cloudinary
 * @param {string[]} urls - Array of Cloudinary URLs
 * @returns {Promise<{success: string[], errors: {url: string, error: any}[]}>} Results of deletion operations
 */
export const deleteCloudinaryImages = async (urls: any): Promise<{
  success: string[],
  errors: {url: string, error: any}[]
}> => {
  const results = {
    success: [] as string[],
    errors: [] as {url: string, error: any}[]
  };
  
  for (const url of urls) {
    try {
      const publicId = extractPath(url);
      // console.log('publicId', publicId);
      if (!publicId) {
        results.errors.push({ url, error: 'Could not extract public ID' });
        continue;
      }
      
      // Delete the image from Cloudinary
      const result = await cloudinary.uploader.destroy(publicId);

      // console.log("cloudinary successfully deleted", result);
      
      if (result.result === 'ok') {
        results.success.push(url);
      } else {
        results.errors.push({ url, error: result });
      }
    } catch (error) {
      results.errors.push({ url, error });
    }
  }
  
  return results;
};
