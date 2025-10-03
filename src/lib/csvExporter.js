import Papa from 'papaparse';

export const exportToCSV = (data, filename = 'export.csv') => {
  if (!data || data.length === 0) {
    console.warn("No data to export.");
    return;
  }
  
  const csv = Papa.unparse(data);
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// Enhanced export function for listings with contact information
export const exportListingsWithContact = (listings, filename = 'listings-export.csv', includeContactInfo = true) => {
  if (!listings || listings.length === 0) {
    console.warn("No listings to export.");
    return;
  }

  const exportData = listings.map(listing => {
    const baseData = {
      'Property ID': listing.id,
      'Address': listing.addressStreet || 'Not Available',
      'City': listing.addresscity || 'Not Available',
      'State': listing.addressstate || 'Not Available',
      'ZIP Code': listing.addresszip || 'Not Available',
      'Price': listing.unformattedprice ? `$${listing.unformattedprice.toLocaleString()}` : 'Not Available',
      'Bedrooms': listing.beds || 'N/A',
      'Bathrooms': listing.baths || 'N/A',
      'Square Feet': listing.area ? listing.area.toLocaleString() : 'N/A',
      'Property Type': listing.statustext || 'N/A',
      'Date Listed': listing.lastseenat ? new Date(listing.lastseenat).toLocaleDateString() : 'N/A',
      'MLS Number': listing.mls_number || 'N/A',
      'Listing Agent': listing.listing_agent || 'Not Available',
      'Listing Office': listing.listing_office || 'Not Available',
    };

    // Add contact information if available and requested
    if (includeContactInfo) {
      return {
        ...baseData,
        'Agent Phone': listing.agent_phone || 'Not Available',
        'Agent Email': listing.agent_email || 'Not Available',
        'Office Phone': listing.office_phone || 'Not Available',
        'Office Email': listing.office_email || 'Not Available',
        'Website': listing.website || 'Not Available',
        'Notes': listing.notes || '',
      };
    }

    return baseData;
  });

  exportToCSV(exportData, filename);
};

// Export function for CRM integration
export const exportForCRM = (listings, crmType = 'generic') => {
  if (!listings || listings.length === 0) {
    console.warn("No listings to export.");
    return;
  }

  let exportData;
  
  switch (crmType.toLowerCase()) {
    case 'salesforce':
      exportData = listings.map(listing => ({
        'Name': `${listing.addressStreet || 'Property'} - ${listing.addresscity || 'City'}`,
        'Street': listing.addressStreet || '',
        'City': listing.addresscity || '',
        'State': listing.addressstate || '',
        'PostalCode': listing.addresszip || '',
        'Price': listing.unformattedprice || 0,
        'Beds': listing.beds || 0,
        'Baths': listing.baths || 0,
        'SquareFeet': listing.area || 0,
        'PropertyType': listing.statustext || '',
        'ListingDate': listing.lastseenat ? new Date(listing.lastseenat).toISOString() : null,
        'MLSNumber': listing.mls_number || '',
        'ListingAgent': listing.listing_agent || '',
        'AgentPhone': listing.agent_phone || '',
        'AgentEmail': listing.agent_email || '',
        'Description': `Property listed on ${listing.lastseenat ? new Date(listing.lastseenat).toLocaleDateString() : 'Unknown date'}`,
      }));
      break;
      
    case 'hubspot':
      exportData = listings.map(listing => ({
        'Property Address': listing.addressStreet || '',
        'City': listing.addresscity || '',
        'State/Region': listing.addressstate || '',
        'Postal Code': listing.addresszip || '',
        'Property Value': listing.unformattedprice || 0,
        'Number of Bedrooms': listing.beds || 0,
        'Number of Bathrooms': listing.baths || 0,
        'Square Footage': listing.area || 0,
        'Property Type': listing.statustext || '',
        'Listing Date': listing.lastseenat ? new Date(listing.lastseenat).toISOString() : null,
        'MLS Number': listing.mls_number || '',
        'Listing Agent': listing.listing_agent || '',
        'Agent Phone': listing.agent_phone || '',
        'Agent Email': listing.agent_email || '',
        'Notes': `Property listed on ${listing.lastseenat ? new Date(listing.lastseenat).toLocaleDateString() : 'Unknown date'}`,
      }));
      break;
      
    default: // Generic format
      exportData = listings.map(listing => ({
        'Property Address': listing.addressStreet || '',
        'City': listing.addresscity || '',
        'State': listing.addressstate || '',
        'ZIP': listing.addresszip || '',
        'Price': listing.unformattedprice || 0,
        'Bedrooms': listing.beds || 0,
        'Bathrooms': listing.baths || 0,
        'Square Feet': listing.area || 0,
        'Type': listing.statustext || '',
        'Listed Date': listing.lastseenat ? new Date(listing.lastseenat).toLocaleDateString() : '',
        'MLS': listing.mls_number || '',
        'Agent': listing.listing_agent || '',
        'Agent Phone': listing.agent_phone || '',
        'Agent Email': listing.agent_email || '',
        'Office': listing.listing_office || '',
        'Office Phone': listing.office_phone || '',
        'Office Email': listing.office_email || '',
      }));
  }

  const filename = `listings-${crmType}-${new Date().toISOString().split('T')[0]}.csv`;
  exportToCSV(exportData, filename);
};

// Generate mail merge template
export const generateMailMergeTemplate = (listings) => {
  if (!listings || listings.length === 0) {
    console.warn("No listings to generate template for.");
    return;
  }

  const template = `Dear [Agent Name],

I hope this email finds you well. I noticed you have a property listed at [Property Address] in [City], [State] that recently sold for $[Price]. 

As a local moving company, I wanted to reach out to see if you might have any clients who are planning to move and could benefit from our professional moving services.

Our services include:
- Local and long-distance moves
- Packing and unpacking services
- Storage solutions
- Professional moving team

Would you be interested in referring your clients to us? We offer competitive rates and excellent service.

Best regards,
[Your Name]
[Your Company]
[Your Phone]
[Your Email]

---
Property Details:
- Address: [Property Address]
- City: [City], [State] [ZIP]
- Price: $[Price]
- Bedrooms: [Bedrooms]
- Bathrooms: [Bathrooms]
- Square Feet: [Square Feet]
- Listed: [Listed Date]
- MLS: [MLS Number]`;

  const blob = new Blob([template], { type: 'text/plain;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'mail-merge-template.txt');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};