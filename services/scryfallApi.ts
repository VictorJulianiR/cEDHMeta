import { SCRYFALL_API_BASE } from '../constants';

const SCRYFALL_REQUEST_HEADERS = { 'User-Agent': 'cEDHCardAnalyzerWebApp/1.0', 'Accept': 'application/json' };
const SCRYFALL_CATALOG_CACHE_KEY = 'scryfallCardNamesCatalog';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function fetchAllScryfallCardNames(): Promise<string[]> {
  try {
    const cachedData = localStorage.getItem(SCRYFALL_CATALOG_CACHE_KEY);
    if (cachedData) {
      const { timestamp, data } = JSON.parse(cachedData);
      if (Date.now() - timestamp < CACHE_DURATION_MS) {
        console.log("Using cached Scryfall card names.");
        return data;
      }
    }
  } catch (error) {
    console.error("Error reading from localStorage:", error);
  }

  try {
    const response = await fetch(`${SCRYFALL_API_BASE}/catalog/card-names`, { headers: SCRYFALL_REQUEST_HEADERS });

    if (!response.ok) {
        console.error(`Scryfall API error for card catalog: ${response.status}`);
        return [];
    }

    const catalogData = await response.json();
    if (catalogData && Array.isArray(catalogData.data)) {
      try {
        const cachePayload = {
          timestamp: Date.now(),
          data: catalogData.data,
        };
        localStorage.setItem(SCRYFALL_CATALOG_CACHE_KEY, JSON.stringify(cachePayload));
      } catch (e) {
         console.error("Error saving Scryfall catalog to localStorage:", e);
      }
      return catalogData.data;
    }
    return [];

  } catch (error) {
    console.error(`Scryfall request error for card catalog:`, error);
    return [];
  }
}

async function _getSingleCardImage(cardName: string): Promise<string | null> {
  const nameToQuery = cardName.trim();
  if (!nameToQuery) return null;

  try {
    await new Promise(res => setTimeout(res, 75)); // Rate limiting
    
    let response = await fetch(`${SCRYFALL_API_BASE}/cards/named?exact=${encodeURIComponent(nameToQuery)}`, { headers: SCRYFALL_REQUEST_HEADERS });

    if (response.status === 404) {
      await new Promise(res => setTimeout(res, 75)); // Rate limiting
      response = await fetch(`${SCRYFALL_API_BASE}/cards/named?fuzzy=${encodeURIComponent(nameToQuery)}`, { headers: SCRYFALL_REQUEST_HEADERS });
    }

    if (!response.ok) {
        // Don't throw for 404, just return null
        if (response.status !== 404) {
            console.error(`Scryfall API error for '${nameToQuery}': ${response.status}`);
        }
        return null;
    }

    const cardData = await response.json();

    if (cardData?.image_uris?.normal) {
      return cardData.image_uris.normal;
    }
    if (cardData?.card_faces?.[0]?.image_uris?.normal) {
      return cardData.card_faces[0].image_uris.normal;
    }

    return null;
  } catch (error) {
    console.error(`Scryfall request error for '${nameToQuery}':`, error);
    return null;
  }
}

export async function fetchScryfallImage(cardName: string): Promise<string | null> {
  return _getSingleCardImage(cardName);
}

export async function fetchPartnerCommanderImages(commanderFullName: string): Promise<string[]> {
  const partnerNames = commanderFullName.split(/\s*\/{2,3}\s*|\s*\/\s*/).map(p => p.trim()).filter(Boolean);
  
  if (partnerNames.length > 1) {
    const urls = await Promise.all(partnerNames.map(name => _getSingleCardImage(name)));
    return urls.filter((url): url is string => url !== null);
  } else {
    const url = await _getSingleCardImage(commanderFullName);
    return url ? [url] : [];
  }
}