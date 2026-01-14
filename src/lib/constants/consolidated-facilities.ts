/**
 * Consolidated Approach/TRACON Facilities
 * 
 * Large regional TRACONs that handle approach/departure for multiple airports.
 * When a controller logs in as one of these facilities, they provide APP coverage
 * to all airports in their covered list.
 * 
 * Example: SOCAL_APP provides approach services to LAX, SAN, SNA, ONT, etc.
 */

export const CONSOLIDATED_APPROACH_FACILITIES: Record<string, string[]> = {
// Southern California TRACON
'SOCAL': ['KLAX', 'KSAN', 'KSNA', 'KONT', 'KLGB', 'KBUR', 'KSBD', 'KPSP'],
// Northern California TRACON
'NORCAL': ['KSFO', 'KOAK', 'KSJC', 'KSAC', 'KSMF'],
// Potomac TRACON (DC area)
'POTOMAC': ['KDCA', 'KIAD', 'KBWI'],
'PCT': ['KDCA', 'KIAD', 'KBWI'], // Alternative callsign for Potomac
// New York TRACON
'N90': ['KJFK', 'KLGA', 'KEWR', 'KTEB', 'KHPN'],
// Boston TRACON
'A90': ['KBOS', 'KMHT', 'KBDL', 'KPVD'],
// Atlanta TRACON
'A80': ['KATL', 'KPDK', 'KFTY'],
// Chicago TRACON
'C90': ['KORD', 'KMDW', 'KGYY', 'KPWK'],
// Dallas-Fort Worth TRACON
'D10': ['KDFW', 'KDAL', 'KADS'],
// Houston TRACON
'I90': ['KIAH', 'KHOU', 'KDWH'],
// Phoenix TRACON
'P50': ['KPHX', 'KSDL', 'KDVT'],
// Las Vegas TRACON
'L30': ['KLAS', 'KVGT', 'KHND'],
// Denver TRACON
'D01': ['KDEN', 'KAPA', 'KBJC'],
// Miami TRACON
'M03': ['KMIA', 'KFLL', 'KPBI'],
// Seattle TRACON
'S46': ['KSEA', 'KBFI', 'KPAE'],
// Twin Cities TRACON
'M98': ['KMSP', 'KSTP']
};
