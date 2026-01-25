/**
 * Inventory Scan Service
 * Handles API communication for AI-powered furniture/item detection from listing photos
 */

class InventoryScanService {
  constructor() {
    this.apiUrl = '/api/inventory-detection';
  }

  /**
   * Scan inventory for a property by zpid
   * @param {Object} params
   * @param {string|number} params.zpid - Zillow Property ID
   * @param {boolean} [params.forceRefresh=false] - Force re-scan even if cached
   * @returns {Promise<Object>} Scan results
   */
  async scanInventory({ zpid, forceRefresh = false }) {
    if (!zpid) {
      throw new Error('zpid is required for inventory scan');
    }

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zpid, forceRefresh })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `Scan failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Scan inventory from a listing object
   * @param {Object} listing - Listing object with zpid
   * @param {boolean} [forceRefresh=false] - Force re-scan
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async scanFromListing(listing, forceRefresh = false) {
    if (!listing) {
      return { data: null, error: new Error('No listing provided') };
    }

    const zpid = listing.zpid || listing.id;
    if (!zpid) {
      return { data: null, error: new Error('Listing has no zpid') };
    }

    try {
      const data = await this.scanInventory({ zpid, forceRefresh });
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  /**
   * Check if listing has photos (carousel or single image)
   * @param {Object} listing
   * @returns {boolean}
   */
  hasPhotos(listing) {
    if (!listing) return false;

    // Check carouselPhotosComposable
    if (listing.carouselPhotosComposable?.photoData?.length > 0) {
      return true;
    }

    // Check carouselPhotos (various casings)
    if (listing.carouselPhotos?.length > 0 || listing.carouselphotos?.length > 0) {
      return true;
    }

    // Check single image fallback
    if (listing.imgSrc || listing.imgsrc) {
      return true;
    }

    return false;
  }

  /**
   * Check if scan button should be shown for this listing
   * Only shows for FURNISHED listings that have photos
   * (No point scanning empty homes for inventory)
   * @param {Object} listing
   * @returns {boolean}
   */
  canShowScanButton(listing) {
    // Must have photos
    if (!this.hasPhotos(listing)) {
      return false;
    }

    // Only show for furnished listings (already tagged by quick scan)
    // If is_furnished is null/undefined, listing hasn't been quick-scanned yet
    if (listing.is_furnished === false) {
      return false; // Empty home - no inventory to scan
    }

    // Show button if furnished OR if not yet scanned (is_furnished is null)
    return true;
  }

  /**
   * Check if listing has been quick-scanned for furnish status
   * @param {Object} listing
   * @returns {boolean}
   */
  hasBeenQuickScanned(listing) {
    return listing.is_furnished !== null && listing.is_furnished !== undefined;
  }

  /**
   * Check if listing is tagged as furnished
   * @param {Object} listing
   * @returns {boolean}
   */
  isFurnished(listing) {
    return listing.is_furnished === true;
  }

  /**
   * Check if listing is tagged as empty/unfurnished
   * @param {Object} listing
   * @returns {boolean}
   */
  isEmpty(listing) {
    return listing.is_furnished === false;
  }

  /**
   * Format cubic feet for display
   * @param {number} cubicFeet
   * @returns {string}
   */
  formatCubicFeet(cubicFeet) {
    if (!cubicFeet) return '0 cu ft';
    return `${cubicFeet.toLocaleString()} cu ft`;
  }

  /**
   * Get confidence color class based on score
   * @param {number} confidence - 0 to 1
   * @returns {string}
   */
  getConfidenceColor(confidence) {
    if (confidence >= 0.8) return 'text-green-500';
    if (confidence >= 0.6) return 'text-yellow-500';
    return 'text-slate';
  }

  /**
   * Get icon name for a room type
   * @param {string} room
   * @returns {string}
   */
  getRoomIcon(room) {
    const icons = {
      'Living Room': 'Sofa',
      'Bedroom': 'Bed',
      'Kitchen': 'UtensilsCrossed',
      'Dining Room': 'UtensilsCrossed',
      'Bathroom': 'Bath',
      'Office': 'Monitor',
      'Garage': 'Car',
      'Outdoor': 'TreePine',
      'default': 'Package'
    };
    return icons[room] || icons.default;
  }

  /**
   * Format size badge variant
   * @param {string} size
   * @returns {string}
   */
  getSizeBadgeVariant(size) {
    const variants = {
      'small': 'secondary',
      'medium': 'outline',
      'large': 'default'
    };
    return variants[size?.toLowerCase()] || 'outline';
  }
}

export const inventoryScanService = new InventoryScanService();
export default inventoryScanService;
