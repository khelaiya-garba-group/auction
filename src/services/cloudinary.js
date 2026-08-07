// Uploads a file to Cloudinary using unsigned preset
export const uploadToCloudinary = async (file) => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary credentials are not configured.");
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("Cloudinary upload response not OK:", errorData);
    throw new Error(errorData.error?.message || "Failed to upload image to Cloudinary.");
  }

  const data = await response.json();
  return data.secure_url;
};

export const deleteFromCloudinary = async (fileUrl) => {
  if (!fileUrl) return;
  const parts = fileUrl.split('/upload/');
  if (parts.length < 2) return;
  
  let publicIdWithVersion = parts[1];
  if (publicIdWithVersion.match(/^v\d+\//)) {
    publicIdWithVersion = publicIdWithVersion.substring(publicIdWithVersion.indexOf('/') + 1);
  }
  const lastDotIndex = publicIdWithVersion.lastIndexOf('.');
  const publicId = lastDotIndex !== -1 ? publicIdWithVersion.substring(0, lastDotIndex) : publicIdWithVersion;

  const apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY;
  const apiSecret = import.meta.env.VITE_CLOUDINARY_API_SECRET;
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  
  if (!apiKey || !apiSecret || !cloudName) {
    console.warn("Cloudinary Key/Secret/Name missing. Cannot delete image.");
    return;
  }

  const timestamp = Math.round((new Date).getTime() / 1000);
  const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  
  const encoder = new TextEncoder();
  const dataToSign = encoder.encode(stringToSign);
  const hashBuffer = await crypto.subtle.digest('SHA-1', dataToSign);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  const formData = new FormData();
  formData.append('public_id', publicId);
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp);
  formData.append('signature', signature);

  try {
    await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
      method: 'POST',
      body: formData
    });
  } catch (error) {
    console.error("Cloudinary delete error:", error);
  }
};

// Returns optimized version of Cloudinary URL using on-the-fly transformations
export const getOptimizedImageUrl = (url, widthParam = 600) => {
  if (!url) return url;
  if (typeof url !== 'string') return url;
  if (!url.includes('res.cloudinary.com')) return url; // Not a Cloudinary URL
  
  const uploadMarker = '/upload/';
  const index = url.indexOf(uploadMarker);
  if (index === -1) return url;
  
  const before = url.substring(0, index + uploadMarker.length);
  const after = url.substring(index + uploadMarker.length);
  
  // Check if it already has transformations (e.g. starts with q_auto)
  if (after.startsWith('q_auto') || after.startsWith('c_')) {
    return url;
  }
  
  const width = (typeof widthParam === 'object' && widthParam !== null)
    ? (widthParam.width || 600)
    : (widthParam || 600);

  return `${before}q_auto,f_auto,w_${width}/${after}`;
};
