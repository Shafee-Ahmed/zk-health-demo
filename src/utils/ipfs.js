import axios from 'axios';
import FormData from 'form-data';

const PINATA_API_KEY = '92afb8e7882c68ee2c4f';
const PINATA_SECRET_API_KEY = '5b15fe1df4b5848b3c9d22198d5b8a969bfabf96fc1d7dad0e7f6294b4c81a6e';

// Upload JSON data to IPFS via Pinata
export const uploadToIPFS = async (data) => {
  const url = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
  
  try {
    const response = await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json',
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_API_KEY
      }
    });
    
    const ipfsHash = response.data.IpfsHash;
    console.log('Uploaded to IPFS:', ipfsHash);
    return ipfsHash;
  } catch (error) {
    console.error('IPFS upload error:', error);
    throw error;
  }
};

// Upload file (e.g., JSON file) – optional, we'll use JSON for simplicity
export const uploadFileToIPFS = async (file) => {
  const url = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await axios.post(url, formData, {
      maxContentLength: 'Infinity',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_API_KEY
      }
    });
    
    const ipfsHash = response.data.IpfsHash;
    console.log('Uploaded file to IPFS:', ipfsHash);
    return ipfsHash;
  } catch (error) {
    console.error('IPFS file upload error:', error);
    throw error;
  }
};

// Fetch JSON from IPFS via public gateway
export const fetchFromIPFS = async (ipfsHash) => {
  const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
  try {
    const response = await axios.get(gatewayUrl);
    return response.data;
  } catch (error) {
    console.error('IPFS fetch error:', error);
    throw error;
  }
};