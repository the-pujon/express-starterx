export const extractPublicId = (url: string) => {
    try {
      const urlParts = new URL(url);
      const pathParts = urlParts.pathname.split('/');
  
      // Find the index of 'upload' and extract everything after it
      const uploadIndex = pathParts.indexOf('upload');
      if (uploadIndex === -1 || uploadIndex === pathParts.length - 1) {
        throw new Error('Invalid Cloudinary URL');
      }
  
      // Extract the public ID (removing the file extension if it exists)
      let publicId = pathParts.slice(uploadIndex + 1).join('/');
      publicId = publicId.replace(/\.[^/.]+$/, ''); // Remove file extension
  
      return publicId;
    } catch (error: any) {
      console.error('Error extracting public ID:', error.message);
      return null;
    }
  };
  