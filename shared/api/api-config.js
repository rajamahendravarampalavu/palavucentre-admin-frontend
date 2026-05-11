import { getAssetBaseUrl } from '../media'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
export const ASSET_BASE_URL = getAssetBaseUrl(API_BASE_URL)
