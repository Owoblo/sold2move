// Simple tests for filter utilities
import { hasActiveFilters, getFilterCount, clearAllFilters, getFilterDisplayText } from '../filterUtils';

describe('filterUtils', () => {
  const mockProfile = { city_name: 'New York' };

  describe('hasActiveFilters', () => {
    it('should return false when no filters are active', () => {
      const filters = {
        city_name: 'New York',
        searchTerm: '',
        minPrice: null,
        maxPrice: null,
        beds: null,
        baths: null,
        propertyType: null,
        minSqft: null,
        maxSqft: null,
      };
      expect(hasActiveFilters(filters, mockProfile)).toBe(false);
    });

    it('should return true when search term is active', () => {
      const filters = {
        city_name: 'New York',
        searchTerm: 'test search',
        minPrice: null,
        maxPrice: null,
        beds: null,
        baths: null,
        propertyType: null,
        minSqft: null,
        maxSqft: null,
      };
      expect(hasActiveFilters(filters, mockProfile)).toBe(true);
    });

    it('should return true when price filters are active', () => {
      const filters = {
        city_name: 'New York',
        searchTerm: '',
        minPrice: 100000,
        maxPrice: 500000,
        beds: null,
        baths: null,
        propertyType: null,
        minSqft: null,
        maxSqft: null,
      };
      expect(hasActiveFilters(filters, mockProfile)).toBe(true);
    });

    it('should return true when property filters are active', () => {
      const filters = {
        city_name: 'New York',
        searchTerm: '',
        minPrice: null,
        maxPrice: null,
        beds: 2,
        baths: 1,
        propertyType: 'House',
        minSqft: 1000,
        maxSqft: 2000,
      };
      expect(hasActiveFilters(filters, mockProfile)).toBe(true);
    });

    it('should ignore city_name as it is not a user-applied filter', () => {
      const filters = {
        city_name: 'New York',
        searchTerm: '',
        minPrice: null,
        maxPrice: null,
        beds: null,
        baths: null,
        propertyType: null,
        minSqft: null,
        maxSqft: null,
      };
      expect(hasActiveFilters(filters, mockProfile)).toBe(false);
    });
  });

  describe('getFilterCount', () => {
    it('should return 0 when no filters are active', () => {
      const filters = {
        city_name: 'New York',
        searchTerm: '',
        minPrice: null,
        maxPrice: null,
        beds: null,
        baths: null,
        propertyType: null,
        minSqft: null,
        maxSqft: null,
      };
      expect(getFilterCount(filters, mockProfile)).toBe(0);
    });

    it('should return correct count for active filters', () => {
      const filters = {
        city_name: 'New York',
        searchTerm: 'test',
        minPrice: 100000,
        maxPrice: 500000,
        beds: 2,
        baths: null,
        propertyType: 'House',
        minSqft: null,
        maxSqft: null,
      };
      expect(getFilterCount(filters, mockProfile)).toBe(4);
    });
  });

  describe('clearAllFilters', () => {
    it('should return cleared filters with city_name preserved', () => {
      const result = clearAllFilters(mockProfile);
      expect(result).toEqual({
        city_name: 'New York',
        searchTerm: '',
        minPrice: null,
        maxPrice: null,
        beds: null,
        baths: null,
        propertyType: null,
        minSqft: null,
        maxSqft: null,
      });
    });
  });

  describe('getFilterDisplayText', () => {
    it('should return empty array for no active filters', () => {
      const filters = {
        city_name: 'New York',
        searchTerm: '',
        minPrice: null,
        maxPrice: null,
        beds: null,
        baths: null,
        propertyType: null,
        minSqft: null,
        maxSqft: null,
      };
      expect(getFilterDisplayText(filters, mockProfile)).toEqual([]);
    });

    it('should return formatted filter descriptions', () => {
      const filters = {
        city_name: 'New York',
        searchTerm: 'test search',
        minPrice: 100000,
        maxPrice: 500000,
        beds: 2,
        baths: 1,
        propertyType: 'House',
        minSqft: 1000,
        maxSqft: 2000,
      };
      const result = getFilterDisplayText(filters, mockProfile);
      expect(result).toContain('Search: "test search"');
      expect(result).toContain('Price: $100,000 - $500,000');
      expect(result).toContain('2+ Beds');
      expect(result).toContain('1+ Baths');
      expect(result).toContain('Type: House');
      expect(result).toContain('Size: 1,000 - 2,000 sq ft');
    });
  });
});
