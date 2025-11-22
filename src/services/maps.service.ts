import axios from 'axios';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import type { NearestClinic, Location } from '../types/index.js';

export class MapsService {
  async findNearestClinic(
    location: Location,
    keyword: string = 'phòng khám bệnh viện'
  ): Promise<NearestClinic | null> {
    try {
      if (!config.googleMaps.apiKey) {
        logger.warn('Google Maps API key not configured');
        return null;
      }

      logger.info('Searching for nearest clinic...');

      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
        {
          params: {
            location: `${location.lat},${location.lng}`,
            radius: 5000, // 5km radius
            keyword: keyword,
            language: 'vi',
            key: config.googleMaps.apiKey
          }
        }
      );

      if (response.data.results && response.data.results.length > 0) {
        const place = response.data.results[0];
        
        // Calculate distance (approximate)
        const distance = this.calculateDistance(
          location.lat,
          location.lng,
          place.geometry.location.lat,
          place.geometry.location.lng
        );

        const clinic: NearestClinic = {
          name: place.name,
          distance_km: Math.round(distance * 10) / 10,
          address: place.vicinity,
          rating: place.rating
        };

        logger.info(`Found clinic: ${clinic.name}`);
        return clinic;
      }

      logger.warn('No clinics found nearby');
      return null;
    } catch (error) {
      logger.error({ error }, 'Google Maps API error');
      return null;
    }
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    // Haversine formula for calculating distance between two points
    const R = 6371; // Radius of the Earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

