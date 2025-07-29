import axios from 'axios';
import { getConfig } from '../config/env';

// Cloudinary configuration from environment
const config = getConfig();
const CLOUDINARY_CLOUD_NAME = config.cloudinary.cloudName;
const CLOUDINARY_UPLOAD_PRESET = config.cloudinary.uploadPreset;
const CLOUDINARY_API_KEY = config.cloudinary.apiKey;
const CLOUDINARY_API_SECRET = config.cloudinary.apiSecret;

export const uploadImageToCloudinary = async (imageUri: string): Promise<string> => {
  try {
    console.log('Starting Cloudinary upload...');
    console.log('Image URI:', imageUri);
    console.log('Cloud name:', CLOUDINARY_CLOUD_NAME);
    console.log('Upload preset:', CLOUDINARY_UPLOAD_PRESET);
    
    // Convert image to blob
    const response = await fetch(imageUri);
    const blob = await response.blob();
    console.log('Blob created, size:', blob.size);
    
    // Create form data with proper React Native handling
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'profile.jpg',
    } as any);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    
    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
    console.log('Upload URL:', uploadUrl);
    
    // Upload to Cloudinary using fetch
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
    });
    
    console.log('Response status:', uploadResponse.status);
    
    const data = await uploadResponse.json();
    console.log('Response data:', data);
    
    if (!uploadResponse.ok) {
      console.error('Cloudinary upload error:', data);
      throw new Error(data.error?.message || `Upload failed with status ${uploadResponse.status}`);
    }
    
    console.log('Upload successful:', data.secure_url);
    return data.secure_url;
  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error);
    throw error;
  }
};

export const uploadAudioToCloudinary = async (audioUri: string): Promise<string> => {
  try {
    console.log('Starting Cloudinary audio upload...');
    console.log('Audio URI:', audioUri);
    
    // Create form data for audio upload
    const formData = new FormData();
    formData.append('file', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'voice_note.m4a',
    } as any);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('resource_type', 'video'); // Cloudinary uses 'video' for audio files
    
    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`;
    console.log('Upload URL:', uploadUrl);
    
    // Upload to Cloudinary using fetch
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
    });
    
    console.log('Response status:', uploadResponse.status);
    
    const data = await uploadResponse.json();
    console.log('Response data:', data);
    
    if (!uploadResponse.ok) {
      console.error('Cloudinary audio upload error:', data);
      throw new Error(data.error?.message || `Upload failed with status ${uploadResponse.status}`);
    }
    
    console.log('Audio upload successful:', data.secure_url);
    return data.secure_url;
  } catch (error) {
    console.error('Error uploading audio to Cloudinary:', error);
    throw error;
  }
};

// Helper function to extract public ID from Cloudinary URL
const extractPublicIdFromUrl = (url: string): string | null => {
  try {
    // Cloudinary URL format: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/filename.jpg
    const urlParts = url.split('/');
    const uploadIndex = urlParts.findIndex(part => part === 'upload');
    
    if (uploadIndex === -1) return null;
    
    // Get everything after 'upload' and before the file extension
    const pathAfterUpload = urlParts.slice(uploadIndex + 2).join('/');
    const publicId = pathAfterUpload.split('.')[0]; // Remove file extension
    
    return publicId;
  } catch (error) {
    console.error('Error extracting public ID from URL:', error);
    return null;
  }
};

export const deleteImageFromCloudinary = async (imageUrl: string): Promise<boolean> => {
  try {
    console.log('Starting Cloudinary delete...');
    console.log('Image URL:', imageUrl);
    
    // Extract public ID from the URL
    const publicId = extractPublicIdFromUrl(imageUrl);
    
    if (!publicId) {
      console.error('Could not extract public ID from URL:', imageUrl);
      return false;
    }
    
    console.log('Extracted public ID:', publicId);
    
    // For now, we'll use a simpler approach without signature
    // In production, this should be handled server-side with proper SHA1 signing
    const deleteUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`;
    
    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('api_key', CLOUDINARY_API_KEY);
    
    console.log('Sending delete request to Cloudinary...');
    console.log('Delete URL:', deleteUrl);
    console.log('Public ID:', publicId);
    
    const response = await fetch(deleteUrl, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
    });
    
    const data = await response.json();
    console.log('Delete response:', data);
    
    if (response.ok && data.result === 'ok') {
      console.log('Image deleted successfully from Cloudinary');
      return true;
    } else {
      console.error('Failed to delete image from Cloudinary:', data);
      return false;
    }
  } catch (error: any) {
    console.error('Error deleting image from Cloudinary:', error);
    return false;
  }
}; 