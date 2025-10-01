// Enhanced data mapping function with validation for the Node.js scraper
// This should replace the existing mapItemToRow function in your scraper

/**
 * Enhanced mapItemToRow with data validation and consistent naming
 * This ensures data integrity and proper mapping to database schema
 */
function mapItemToRow(item, areaName, page, runId, regionName = null) {
  // Validate required fields
  const zpid = item?.zpid ?? item?.hdpData?.homeInfo?.zpid ?? null;
  
  if (!zpid) {
    console.warn(`Skipping listing without zpid in ${areaName}:`, {
      item: JSON.stringify(item, null, 2),
      areaName,
      page
    });
    return null;
  }

  // Validate numeric fields
  const validateNumeric = (value, fieldName) => {
    if (value === null || value === undefined) return null;
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? Math.floor(num) : null;
  };

  // Validate price fields
  const price = item?.price ?? null;
  const unformattedPrice = typeof item?.unformattedPrice === "number" 
    ? item.unformattedPrice 
    : null;

  // Build a compact lat/long object for jsonb "latlong"
  const latObj = {
    latitude: item?.latLong?.latitude ?? item?.lat ?? item?.hdpData?.homeInfo?.latitude ?? null,
    longitude: item?.latLong?.longitude ?? item?.lng ?? item?.hdpData?.homeInfo?.longitude ?? null,
  };

  // Ensure consistent address field mapping
  const addressStreet = item?.addressStreet ?? item?.hdpData?.homeInfo?.streetAddress ?? null;
  const addressCity = item?.addressCity ?? item?.hdpData?.homeInfo?.city ?? null;
  const addressState = item?.addressState ?? item?.hdpData?.homeInfo?.state ?? null;

  return {
    // Required unique key (we upsert on this)
    zpid,
    
    // Run tracking
    lastrunid: runId,
    lastseenat: new Date().toISOString(),
    lastcity: areaName,
    lastpage: Number.isFinite(page) && page > 0 ? page : null,
    isjustlisted: page <= 4,

    // Regional identification
    city: areaName,
    region: regionName,

    // --- exact column names from your schema (lowercase) ---
    rawhomestatuscd: item?.rawHomeStatusCd ?? null,
    marketingstatussimplifiedcd: item?.marketingStatusSimplifiedCd ?? null,
    imgsrc: item?.imgSrc ?? null,
    hasimage: item?.hasImage ?? null,
    detailurl: item?.detailUrl ?? null,
    statustype: item?.statusType ?? item?.hdpData?.homeInfo?.homeStatus ?? null,
    statustext: item?.statusText ?? null,
    countrycurrency: item?.countryCurrency ?? null,

    // Price fields - ensure consistent mapping
    price: price, // text field
    unformattedprice: unformattedPrice, // numeric field

    // Address fields - ensure consistent mapping
    address: item?.address ?? addressStreet ?? null,
    addressstreet: addressStreet, // This maps to addressStreet in frontend
    addresszipcode: item?.addressZipcode ?? item?.hdpData?.homeInfo?.zipcode ?? null,
    isundisclosedaddress: item?.isUndisclosedAddress ?? null,
    addresscity: addressCity, // This maps to addresscity in frontend
    addressstate: addressState, // This maps to addressstate in frontend

    // Numeric fields with validation
    beds: validateNumeric(item?.beds ?? item?.hdpData?.homeInfo?.bedrooms, 'beds'),
    baths: validateNumeric(item?.baths ?? item?.hdpData?.homeInfo?.bathrooms, 'baths'),
    area: validateNumeric(item?.area, 'area'),

    // JSONB fields (stringify)
    latlong: JSON.stringify(latObj),
    hdpdata: item?.hdpData ? JSON.stringify(item.hdpData) : null,
    carouselphotos: item?.carouselPhotos ? JSON.stringify(item.carouselPhotos) : null,

    // Boolean fields
    iszillowowned: item?.isZillowOwned ?? null,
    issaved: item?.isSaved ?? null,
    isuserclaimingowner: item?.isUserClaimingOwner ?? null,
    isuserconfirmedclaim: item?.isUserConfirmedClaim ?? null,
    shouldshowzestimateasprice: item?.shouldShowZestimateAsPrice ?? null,
    has3dmodel: item?.has3dModel ?? null,

    // String fields
    flexfieldtext: item?.flexFieldText ?? null,
    contenttype: item?.contentType ?? null,
    pgapt: item?.pgapt ?? null,
    sgapt: item?.sgapt ?? null,
    list: item?.list ?? null,
    info1string: item?.info1String ?? null,
    brokername: item?.brokerName ?? null,
    openhousedescription: item?.openHouseDescription ?? null,
    buildername: item?.builderName ?? null,
    hasvideo: item?.hasVideo ?? null,
    ispropertyresultcdp: item?.isPropertyResultCDP ?? null,
    lotareastring: item?.lotAreaString ?? null,
    providerlistingid: item?.providerListingId ?? null,
    streetviewmetadataurl: item?.streetViewMetadataURL ?? null,
    streetviewurl: item?.streetViewURL ?? null,

    // Timestamps
    openhousestartdate: item?.openHouseStartDate ?? null,
    openhouseenddate: item?.openHouseEndDate ?? null,
    availability_date: item?.availabilityDate ?? null,

    // Additional JSONB fields
    carousel_photos_composable: item?.carouselPhotosComposable
      ? JSON.stringify(item.carouselPhotosComposable)
      : null,
  };
}

/**
 * Enhanced upsert function with better error handling and validation
 */
async function upsertListingsWithValidation(mappedRows, tableName) {
  // Filter out null rows and validate data
  const validRows = mappedRows.filter((r) => {
    if (!r || !r.zpid) {
      console.warn(`Skipping invalid row:`, r);
      return false;
    }
    return true;
  });

  if (validRows.length === 0) {
    console.log(`No valid rows to upsert for ${tableName}`);
    return;
  }

  // Deduplicate by zpid - keep the last occurrence of each zpid
  const uniqueRows = Array.from(
    new Map(validRows.map(row => [row.zpid, row])).values()
  );
  
  console.log(`📊 Validated and deduplicated ${validRows.length} rows to ${uniqueRows.length} unique listings for ${tableName}`);

  const totalBatches = Math.ceil(uniqueRows.length / UPSERT_BATCH_SIZE);
  console.log(`📦 Processing ${uniqueRows.length} listings in ${totalBatches} batches of ${UPSERT_BATCH_SIZE}...`);

  for (let i = 0; i < uniqueRows.length; i += UPSERT_BATCH_SIZE) {
    const slice = uniqueRows.slice(i, i + UPSERT_BATCH_SIZE);

    let attempt = 0;
    let lastErr = null;
    while (attempt < UPSERT_RETRIES) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .upsert(slice, { onConflict: "zpid" });

        if (error) {
          // Log detailed error information
          console.error(`Upsert error for ${tableName}:`, {
            error: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            batchSize: slice.length,
            batchNumber: Math.floor(i / UPSERT_BATCH_SIZE) + 1
          });
          throw error;
        }

        const batchNumber = Math.floor(i / UPSERT_BATCH_SIZE) + 1;
        console.log(
          `✅ Upserted ${slice.length} rows into ${tableName} (batch ${batchNumber}/${totalBatches})`
        );
        
        // Small delay between batches to prevent overwhelming the database
        if (i + UPSERT_BATCH_SIZE < uniqueRows.length) {
          await sleep(100);
        }
        break;
      } catch (err) {
        lastErr = err;
        attempt++;
        const wait = 500 * attempt ** 2;
        console.warn(`❌ Upsert attempt ${attempt} failed for ${tableName}: ${err.message}. Retry in ${wait}ms`);
        await sleep(wait);
      }
    }
    
    if (lastErr && attempt === UPSERT_RETRIES) {
      console.error(`💥 Upsert failed after ${UPSERT_RETRIES} retries for ${tableName}:`, lastErr);
      // Continue with next batch instead of failing completely
    }
  }
}

/**
 * Enhanced data validation for listings before storage
 */
function validateListingData(listing) {
  const errors = [];
  
  // Required fields
  if (!listing.zpid) errors.push('Missing zpid');
  
  // Validate numeric fields
  if (listing.beds !== null && (listing.beds < 0 || listing.beds > 20)) {
    errors.push(`Invalid beds value: ${listing.beds}`);
  }
  
  if (listing.baths !== null && (listing.baths < 0 || listing.baths > 20)) {
    errors.push(`Invalid baths value: ${listing.baths}`);
  }
  
  if (listing.area !== null && (listing.area < 0 || listing.area > 100000)) {
    errors.push(`Invalid area value: ${listing.area}`);
  }
  
  if (listing.unformattedprice !== null && (listing.unformattedprice < 0 || listing.unformattedprice > 100000000)) {
    errors.push(`Invalid price value: ${listing.unformattedprice}`);
  }
  
  // Validate address fields
  if (!listing.addressstreet && !listing.address) {
    errors.push('Missing address information');
  }
  
  if (!listing.addresscity) {
    errors.push('Missing city information');
  }
  
  if (!listing.addressstate) {
    errors.push('Missing state information');
  }
  
  if (errors.length > 0) {
    console.warn(`Data validation errors for listing ${listing.zpid}:`, errors);
    return false;
  }
  
  return true;
}

module.exports = {
  mapItemToRow,
  upsertListingsWithValidation,
  validateListingData
};
