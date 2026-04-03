/**
 * World Bank Open Data API client for Tech Readiness rankings.
 *
 * Fetches three indicators and computes a composite score:
 *   - IT.NET.USER.ZS  — Internet users (% of population)     → 30% weight
 *   - IT.CEL.SETS.P2  — Mobile subscriptions (per 100 people) → 15% weight
 *   - GB.XPD.RSDV.GD.ZS — R&D expenditure (% of GDP)         → 35% weight
 *   - (Broadband is derived from the internet metric at 20% weight for scoring)
 *
 * Data is cached for 6 hours to avoid excessive API calls.
 */

import { logger } from '../utils/logger';

const WB_BASE = 'https://api.worldbank.org/v2';
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

// Indicator codes
const INTERNET_USERS = 'IT.NET.USER.ZS';
const MOBILE_SUBS = 'IT.CEL.SETS.P2';
const RD_EXPENDITURE = 'GB.XPD.RSDV.GD.ZS';

// Scoring weights (must sum to 1.0)
const WEIGHTS = {
    broadband: 0.20,
    internet: 0.30,
    mobile: 0.15,
    rdSpend: 0.35,
};

export interface TechReadinessScore {
    components: {
        broadband: number | null;
        internet: number | null;
        mobile: number | null;
        rdSpend: number | null;
    };
    country: string;       // ISO3 code
    countryName: string;
    rank: number;
    score: number;          // 0-100 composite
}

// Module-level cache
let cachedRankings: TechReadinessScore[] = [];
let cacheTimestamp = 0;

interface WBIndicatorValue {
    country: { id: string; value: string };
    date: string;
    indicator: { id: string; value: string };
    value: number | null;
}

/**
 * Fetch the most recent value per country for a given indicator.
 * Uses date range 2019-2024 and picks the latest non-null value per country.
 */
async function fetchIndicator(indicatorCode: string): Promise<Map<string, { name: string; value: number }>> {
    const perPage = 500;
    const dateRange = '2019:2024';
    const url = `${WB_BASE}/country/all/indicator/${indicatorCode}?format=json&date=${dateRange}&per_page=${perPage}`;

    const results = new Map<string, { name: string; value: number }>();

    try {
        const response = await fetch(url, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(15_000),
        });

        if (!response.ok) {
            logger.warn(`[WorldBank] HTTP ${response.status} for ${indicatorCode}`);
            return results;
        }

        const json = await response.json();

        // World Bank API returns [metadata, data[]] as a 2-element array
        if (!Array.isArray(json) || json.length < 2 || !Array.isArray(json[1])) {
            return results;
        }

        const entries: WBIndicatorValue[] = json[1];

        // Sort by date descending so first occurrence per country is the most recent
        entries.sort((a, b) => b.date.localeCompare(a.date));

        for (const entry of entries) {
            if (entry.value === null || entry.value === undefined) continue;
            const code = entry.country.id;
            // Skip aggregate/regional codes (they start with specific prefixes)
            if (code.length !== 3) continue;
            if (!results.has(code)) {
                results.set(code, { name: entry.country.value, value: entry.value });
            }
        }

        // If we got pagination metadata, fetch remaining pages
        const metadata = json[0];
        if (metadata && metadata.pages > 1) {
            const totalPages = Math.min(metadata.pages, 5); // cap at 5 pages
            const pagePromises: Promise<void>[] = [];

            for (let page = 2; page <= totalPages; page++) {
                pagePromises.push(
                    (async () => {
                        try {
                            const pageUrl = `${url}&page=${page}`;
                            const pageResp = await fetch(pageUrl, {
                                headers: { 'Accept': 'application/json' },
                                signal: AbortSignal.timeout(15_000),
                            });
                            if (!pageResp.ok) return;
                            const pageJson = await pageResp.json();
                            if (!Array.isArray(pageJson) || pageJson.length < 2 || !Array.isArray(pageJson[1])) return;

                            const pageEntries: WBIndicatorValue[] = pageJson[1];
                            pageEntries.sort((a, b) => b.date.localeCompare(a.date));

                            for (const entry of pageEntries) {
                                if (entry.value === null || entry.value === undefined) continue;
                                const code = entry.country.id;
                                if (code.length !== 3) continue;
                                if (!results.has(code)) {
                                    results.set(code, { name: entry.country.value, value: entry.value });
                                }
                            }
                        } catch {
                            // Skip failed pages silently
                        }
                    })(),
                );
            }

            await Promise.all(pagePromises);
        }
    } catch (error) {
        logger.warn(`[WorldBank] Failed to fetch ${indicatorCode}:`, error);
    }

    return results;
}

/**
 * Compute a composite tech readiness score (0-100) from indicator values.
 *
 * Normalization:
 *   - Internet users: already 0-100 (%)
 *   - Mobile subs: cap at 150 (many countries exceed 100), normalize to 0-100
 *   - R&D expenditure: cap at 5% GDP, scale to 0-100
 *   - Broadband: estimated as internet × 0.6 (proxy; real broadband indicator often has sparse data)
 */
function computeScore(
    internet: number | null,
    mobile: number | null,
    rdSpend: number | null,
): number {
    const internetNorm = internet !== null ? Math.min(100, internet) : null;
    const mobileNorm = mobile !== null ? Math.min(100, (mobile / 150) * 100) : null;
    const rdNorm = rdSpend !== null ? Math.min(100, (rdSpend / 5) * 100) : null;
    // Broadband proxy: 60% of internet penetration
    const broadbandNorm = internetNorm !== null ? internetNorm * 0.6 : null;

    // Weighted average — only include components with data
    let weightSum = 0;
    let valueSum = 0;

    if (internetNorm !== null) {
        valueSum += internetNorm * WEIGHTS.internet;
        weightSum += WEIGHTS.internet;
    }
    if (mobileNorm !== null) {
        valueSum += mobileNorm * WEIGHTS.mobile;
        weightSum += WEIGHTS.mobile;
    }
    if (rdNorm !== null) {
        valueSum += rdNorm * WEIGHTS.rdSpend;
        weightSum += WEIGHTS.rdSpend;
    }
    if (broadbandNorm !== null) {
        valueSum += broadbandNorm * WEIGHTS.broadband;
        weightSum += WEIGHTS.broadband;
    }

    if (weightSum === 0) return 0;
    return Math.round((valueSum / weightSum) * 10) / 10;
}

/**
 * Fetch all three indicators and compute ranked tech readiness scores.
 */
export async function getTechReadinessRankings(): Promise<TechReadinessScore[]> {
    // Return cached data if fresh
    if (cachedRankings.length > 0 && Date.now() - cacheTimestamp < CACHE_TTL) {
        return cachedRankings;
    }

    logger.info('[WorldBank] Fetching tech readiness indicators…');

    // Fetch all three indicators in parallel
    const [internetMap, mobileMap, rdMap] = await Promise.all([
        fetchIndicator(INTERNET_USERS),
        fetchIndicator(MOBILE_SUBS),
        fetchIndicator(RD_EXPENDITURE),
    ]);

    // Collect all country codes
    const allCodes = new Set<string>();
    for (const code of internetMap.keys()) allCodes.add(code);
    for (const code of mobileMap.keys()) allCodes.add(code);
    for (const code of rdMap.keys()) allCodes.add(code);

    // Build scores
    const scores: TechReadinessScore[] = [];
    for (const code of allCodes) {
        const internet = internetMap.get(code)?.value ?? null;
        const mobile = mobileMap.get(code)?.value ?? null;
        const rdSpend = rdMap.get(code)?.value ?? null;

        // Need at least 2 data points to compute a meaningful score
        const dataPoints = [internet, mobile, rdSpend].filter((v) => v !== null).length;
        if (dataPoints < 2) continue;

        const score = computeScore(internet, mobile, rdSpend);
        const countryName =
            internetMap.get(code)?.name ?? mobileMap.get(code)?.name ?? rdMap.get(code)?.name ?? code;

        scores.push({
            components: {
                broadband: internet !== null ? Math.round(internet * 0.6 * 10) / 10 : null,
                internet: internet !== null ? Math.round(internet * 10) / 10 : null,
                mobile: mobile !== null ? Math.round(mobile * 10) / 10 : null,
                rdSpend: rdSpend !== null ? Math.round(rdSpend * 100) / 100 : null,
            },
            country: code,
            countryName,
            rank: 0, // filled below
            score,
        });
    }

    // Sort by score descending and assign ranks
    scores.sort((a, b) => b.score - a.score);
    for (let i = 0; i < scores.length; i++) {
        scores[i].rank = i + 1;
    }

    cachedRankings = scores;
    cacheTimestamp = Date.now();

    logger.info(`[WorldBank] Computed tech readiness for ${scores.length} countries`);
    return scores;
}
