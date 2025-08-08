

import { CEDH_GRAPHQL_ENDPOINT } from '../constants';
import { Commander, DeckEntry } from '../types';

const REQUEST_HEADERS = { 'Content-Type': 'application/json', 'Accept': 'application/json' };

async function _send_cedh_graphql_request<T,>(query: string, variables: Record<string, any>): Promise<T> {
  try {
    const response = await fetch(CEDH_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: REQUEST_HEADERS,
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText.substring(0, 500)}`);
    }

    const jsonResponse = await response.json();
    if (jsonResponse.errors) {
      const errorMessage = jsonResponse.errors.map((err: any) => err.message || 'Unknown GraphQL error').join(', ');
      
      // Provide a more user-friendly message for generic errors.
      if (errorMessage.toLowerCase().includes('unexpected error') || errorMessage.toLowerCase().includes('internal server error')) {
          throw new Error(`The cEDH database returned an error. This could be due to an unrecognized card or commander name, or a temporary issue with their server. Please check your spelling and try again.`);
      }

      throw new Error(`cEDHTop16 GraphQL API Error: ${errorMessage}`);
    }

    if (!jsonResponse.data) {
      throw new Error("cEDHTop16 GraphQL response missing 'data' field.");
    }
    
    return jsonResponse.data;
  } catch (error) {
    console.error("GraphQL request failed:", error);
    throw error;
  }
}

export async function fetchCardData(cardName: string): Promise<{ cardPreviewImageUrl: string | null } | null> {
    const query = `
      query GetCardData($name: String!) {
        card(name: $name) {
          cardPreviewImageUrl
        }
      }
    `;
    try {
      const data = await _send_cedh_graphql_request<{ card: { cardPreviewImageUrl: string | null } }>(query, { name: cardName });
      return data.card;
    } catch (error) {
      console.error(`Failed to fetch card data for '${cardName}':`, error);
      return null;
    }
}

export async function getAllCommanderNames(timePeriod: string, limitPerPage = 200, maxPages = 10): Promise<Commander[]> {
  const allCommanders: Commander[] = [];
  let currentCursor: string | null = null;
  let hasNextPage = true;
  let pagesFetched = 0;

  const query = `
    query ListAllCommanders($limit: Int, $after: String, $timePeriod: TimePeriod) {
      commanders(first: $limit, after: $after, sortBy: POPULARITY, timePeriod: $timePeriod) {
        edges { node { name id } }
        pageInfo { hasNextPage endCursor }
      }
    }
  `;

  while (hasNextPage && pagesFetched < maxPages) {
    const variables = { limit: limitPerPage, after: currentCursor, timePeriod };
    const data = await _send_cedh_graphql_request<{ commanders: { edges: { node: Commander }[], pageInfo: { hasNextPage: boolean, endCursor: string | null } } }>(query, variables);
    
    if (data?.commanders?.edges) {
      allCommanders.push(...data.commanders.edges.map(edge => edge.node));
      const pageInfo = data.commanders.pageInfo;
      hasNextPage = pageInfo.hasNextPage;
      currentCursor = pageInfo.endCursor;
      if (!currentCursor && hasNextPage) break;
    } else {
      break;
    }
    pagesFetched++;
    if(hasNextPage) await new Promise(res => setTimeout(res, 100)); // Rate limiting
  }

  const uniqueNames = Array.from(new Set(allCommanders.map(c => c.name)))
    .map(name => allCommanders.find(c => c.name === name)!)
    .sort((a, b) => a.name.localeCompare(b.name));
    
  return uniqueNames;
}


export async function fetchCommanderEntries(
  commanderName: string, 
  standingLimit: number, 
  timePeriod: string,
  entriesPerPage = 100, 
  maxTotalEntries = 2000
): Promise<{entries: DeckEntry[], officialName: string}> {
  
  const allEntries: DeckEntry[] = [];
  let currentCursor: string | null = null;
  let hasNextPage = true;
  let apiOfficialName = commanderName;

  const query = `
    query GetCommanderEntries($commanderName: String!, $maxStandingVal: Int, $limitPerPage: Int, $cursor: String, $timePeriod: TimePeriod) {
      commander(name: $commanderName) {
        id
        name
        entries(first: $limitPerPage, after: $cursor, filters: {maxStanding: $maxStandingVal, timePeriod: $timePeriod}) {
          edges { 
            node { 
              id 
              wins 
              losses 
              draws 
              decklist 
              maindeck { 
                name 
                cardPreviewImageUrl
              }
              commander {
                cards {
                  cardPreviewImageUrl
                }
              }
            } 
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    }
  `;

  while (hasNextPage && allEntries.length < maxTotalEntries) {
    const variables = { commanderName, maxStandingVal: standingLimit, limitPerPage: entriesPerPage, cursor: currentCursor, timePeriod };
    const data = await _send_cedh_graphql_request<{ commander: { name: string; entries: { edges: { node: DeckEntry }[], pageInfo: { hasNextPage: boolean, endCursor: string | null } } } }>(query, variables);

    if (!data?.commander) {
      if (allEntries.length === 0) throw new Error(`Commander '${commanderName}' not found for the specified filters.`);
      break;
    }

    if(allEntries.length === 0 && data.commander.name) {
      apiOfficialName = data.commander.name;
    }

    const entriesNode = data.commander.entries;
    if (!entriesNode || !entriesNode.edges || entriesNode.edges.length === 0) {
      break;
    }

    allEntries.push(...entriesNode.edges.map(edge => edge.node));
    
    const pageInfo = entriesNode.pageInfo;
    hasNextPage = pageInfo.hasNextPage;
    currentCursor = pageInfo.endCursor;

    if (!currentCursor && hasNextPage) break;
    if (hasNextPage) await new Promise(res => setTimeout(res, 100)); // Rate limiting
  }

  return { entries: allEntries, officialName: apiOfficialName };
}