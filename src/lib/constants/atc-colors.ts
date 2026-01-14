/**
 * ATC Position Color Configuration
 * Centralized styling for all ATC position badges and displays
 */

export const ATC_COLORS: Record<string, {
badge: string;
text: string;
text80: string;
text60: string;
}> = {
purple: {
badge: 'bg-purple-900/50 text-purple-300 border-purple-700 font-bold',
text: 'text-purple-300',
text80: 'text-purple-300/80',
text60: 'text-purple-300/60'
},
yellow: {
badge: 'bg-yellow-900/50 text-yellow-300 border-yellow-700 font-bold',
text: 'text-yellow-300',
text80: 'text-yellow-300/80',
text60: 'text-yellow-300/60'
},
red: {
badge: 'bg-red-900/50 text-red-300 border-red-700 font-bold',
text: 'text-red-300',
text80: 'text-red-300/80',
text60: 'text-red-300/60'
},
blue: {
badge: 'bg-blue-900/50 text-blue-300 border-blue-700 font-bold',
text: 'text-blue-300',
text80: 'text-blue-300/80',
text60: 'text-blue-300/60'
},
green: {
badge: 'bg-green-900/50 text-green-300 border-green-700 font-bold',
text: 'text-green-300',
text80: 'text-green-300/80',
text60: 'text-green-300/60'
}
};
