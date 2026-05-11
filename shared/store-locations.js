export const STORE_LOCATIONS = [
  {
    id: 'kukatpally',
    name: 'Kukatpally',
    address: 'Rajamahendravaram Palavu Centre, Kukatpally, Hyderabad',
    lat: 17.4868,
    lng: 78.3905,
    mapUrl: 'https://maps.app.goo.gl/6aBZsyVV5FMznT1h8',
    embedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3805.4326376020035!2d78.39053927445529!3d17.486849183417338!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bcb91924604bbe5%3A0x3c4549e329f00f8a!2sRajamahendravaram%20Palavu%20Centre!5e0!3m2!1sen!2sin!4v1777492091433!5m2!1sen!2sin',
    phone: '9966655997',
  },
  {
    id: 'bachupally',
    name: 'Bachupally / Nizampet',
    address: 'Rajamahendravaram Pulav Centre, Nizampet, Hyderabad',
    lat: 17.5380,
    lng: 78.3636,
    mapUrl: 'https://maps.app.goo.gl/oaqkunHpwfMsoPxH9',
    embedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d475.54518112008117!2d78.36358605950497!3d17.537969727484953!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bcb8d004f249b39%3A0x8f133a15f45e54a6!2sRajamahendra%20varam%20pulav%20centre%20Nizampet!5e0!3m2!1sen!2sin!4v1777492074627!5m2!1sen!2sin',
    phone: '9966655997',
  },
]

/** Haversine distance in km between two lat/lng points */
export function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Given user coords, return locations sorted by distance with distance attached */
export function rankByDistance(userLat, userLng) {
  return STORE_LOCATIONS.map((loc) => ({
    ...loc,
    distanceKm: getDistanceKm(userLat, userLng, loc.lat, loc.lng),
  })).sort((a, b) => a.distanceKm - b.distanceKm)
}
