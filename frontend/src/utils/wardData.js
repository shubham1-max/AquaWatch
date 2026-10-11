// Utility for dynamic ward and official lookup across Bengaluru
// Resolves incident coordinates to real BBMP Wards, MLAs, MPs, and civic officials

// Helper to normalize any raw constituency string (e.g. "159-PULAKESHI NAGAR (SC)" -> "PULAKESHINAGAR")
export function normalizeConstituencyKey(str) {
  return (str || '')
    .replace(/^[0-9]+-/, '')
    .replace(/\(.*?\)/g, '')
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase();
}

// Point in polygon algorithm (ray casting)
function pointInPolygon(point, vs) {
  const x = point[0]; // lng
  const y = point[1]; // lat
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0];
    const yi = vs[i][1];
    const xj = vs[j][0];
    const yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Check polygon or multipolygon
function isInsideFeature(lng, lat, feature) {
  if (!feature.geometry) return false;
  const geomType = feature.geometry.type;
  const coords = feature.geometry.coordinates;

  if (geomType === 'Polygon') {
    return pointInPolygon([lng, lat], coords[0]);
  } else if (geomType === 'MultiPolygon') {
    for (const poly of coords) {
      if (pointInPolygon([lng, lat], poly[0])) return true;
    }
  }
  return false;
}

// 28 Assembly Constituencies MLAs of Bengaluru (Karnataka Legislative Assembly)
const MLA_DATABASE = {
  'YELAHANKA': { name: 'S. R. Vishwanath', party: 'BJP', photo: '/rep_pc_mohan.png', label: 'Yelahanka', phone: '080-23628888', email: 'srvishwanath.mla@karnataka.gov.in' },
  'DASARAHALLI': { name: 'S. Muniraju', party: 'BJP', photo: '/rep_pc_mohan.png', label: 'Dasarahalli', phone: '080-28391111', email: 'muniraju.mla@karnataka.gov.in' },
  'RAJARAJESHWARINAGAR': { name: 'Munirathna', party: 'BJP', photo: '/rep_pc_mohan.png', label: 'RR Nagar', phone: '080-28603344', email: 'munirathna.mla@karnataka.gov.in' },
  'HEBBAL': { name: 'Byrathi Suresh', party: 'INC', photo: '/rep_rizwan.png', label: 'Hebbal', phone: '080-23539999', email: 'byrathi.suresh@karnataka.gov.in' },
  'YESHVANTHAPURA': { name: 'S. T. Somashekar', party: 'BJP', photo: '/rep_pc_mohan.png', label: 'Yeshwanthpur', phone: '080-28485555', email: 'stsomashekar.mla@karnataka.gov.in' },
  'YESHWANTHPUR': { name: 'S. T. Somashekar', party: 'BJP', photo: '/rep_pc_mohan.png', label: 'Yeshwanthpur', phone: '080-28485555', email: 'stsomashekar.mla@karnataka.gov.in' },
  'MAHALAXMILAYOUT': { name: 'K. Gopalaiah', party: 'BJP', photo: '/rep_pc_mohan.png', label: 'Mahalakshmi Layout', phone: '080-23194444', email: 'gopalaiah.mla@karnataka.gov.in' },
  'MAHALAKSHMILAYOUT': { name: 'K. Gopalaiah', party: 'BJP', photo: '/rep_pc_mohan.png', label: 'Mahalakshmi Layout', phone: '080-23194444', email: 'gopalaiah.mla@karnataka.gov.in' },
  'PULAKESHINAGAR': { name: 'A. C. Srinivasa', party: 'INC', photo: '/rep_ac_srinivasa.jpg', label: 'Pulakeshinagar', phone: '080-25482222', email: 'acsrinivasa.mla@karnataka.gov.in' },
  'MALLESWARAM': { name: 'Dr. C. N. Ashwath Narayan', party: 'BJP', photo: '/rep_pc_mohan.png', label: 'Malleshwaram', phone: '080-23348888', email: 'ashwathnarayan.mla@karnataka.gov.in' },
  'MALLESHWARAM': { name: 'Dr. C. N. Ashwath Narayan', party: 'BJP', photo: '/rep_pc_mohan.png', label: 'Malleshwaram', phone: '080-23348888', email: 'ashwathnarayan.mla@karnataka.gov.in' },
  'KRPURA': { name: 'B. A. Basavaraj', party: 'BJP', photo: '/rep_pc_mohan.png', label: 'K.R. Puram', phone: '080-25617777', email: 'babasavaraj.mla@karnataka.gov.in' },
  'KRPURAM': { name: 'B. A. Basavaraj', party: 'BJP', photo: '/rep_pc_mohan.png', label: 'K.R. Puram', phone: '080-25617777', email: 'babasavaraj.mla@karnataka.gov.in' },
  'SARVARGNANAGAR': { name: 'K. J. George', party: 'INC', photo: '/rep_rizwan.png', label: 'Sarvagnanagar', phone: '080-25494444', email: 'kjgeorge.office@gmail.com' },
  'SARVAGNANAGAR': { name: 'K. J. George', party: 'INC', photo: '/rep_rizwan.png', label: 'Sarvagnanagar', phone: '080-25494444', email: 'kjgeorge.office@gmail.com' },
  'GANDHINAGAR': { name: 'Dinesh Gundu Rao', party: 'INC', photo: '/rep_rizwan.png', label: 'Gandhi Nagar', phone: '080-22253755', email: 'dinesh.gundurao@karnataka.gov.in' },
  'MAHADEVAPURA': { name: 'Manjula S.', party: 'BJP', photo: '/rep_shobha.png', label: 'Mahadevapura', phone: '080-28513333', email: 'manjulas.mla@karnataka.gov.in' },
  'CVRAMANNAGAR': { name: 'S. Raghu', party: 'BJP', photo: '/rep_pc_mohan.png', label: 'C.V. Raman Nagar', phone: '080-25282222', email: 'sraghu.mla@karnataka.gov.in' },
  'GOVINDRAJANAGAR': { name: 'Priya Krishna', party: 'INC', photo: '/rep_rizwan.png', label: 'Govindraj Nagar', phone: '080-23398888', email: 'priyakrishna.mla@karnataka.gov.in' },
  'SHIVAJINAGAR': { name: 'Rizwan Arshad', party: 'INC', photo: '/rep_rizwan.png', label: 'Shivajinagar', phone: '080-22860888', email: 'rizwanarshad.mla@gmail.com' },
  'VIJAYANAGAR': { name: 'M. Krishnappa', party: 'INC', photo: '/rep_rizwan.png', label: 'Vijay Nagar', phone: '080-23351111', email: 'mkrishnappa.mla@karnataka.gov.in' },
  'CHAMARAJPET': { name: 'B. Z. Zameer Ahmed Khan', party: 'INC', photo: '/rep_rizwan.png', label: 'Chamrajpet', phone: '080-22216666', email: 'zameerahmed.mla@karnataka.gov.in' },
  'ANEKAL': { name: 'B. Shivanna', party: 'INC', photo: '/rep_rizwan.png', label: 'Anekal', phone: '080-27832222', email: 'bshivanna.mla@karnataka.gov.in' },
  'CHICKPET': { name: 'Uday B. Garudachar', party: 'BJP', photo: '/rep_uday_garudachar.png', label: 'Chickpet', phone: '080-22873333', email: 'uday.garudachar@gmail.com' },
  'BTMLAYOUT': { name: 'Ramalinga Reddy', party: 'INC', photo: '/rep_rizwan.png', label: 'B.T.M. Layout', phone: '080-22238484', email: 'ramalingareddy.office@gmail.com' },
  'SHANTINAGAR': { name: 'N. A. Haris', party: 'INC', photo: '/rep_rizwan.png', label: 'Shanti Nagar', phone: '080-22271111', email: 'naharis.mla@gmail.com' },
  'PADMANABANAGAR': { name: 'R. Ashoka', party: 'BJP', photo: '/rep_pc_mohan.png', label: 'Padmanabhanagar', phone: '080-26792222', email: 'ashoka.mla@karnataka.gov.in' },
  'PADMANABHANAGAR': { name: 'R. Ashoka', party: 'BJP', photo: '/rep_pc_mohan.png', label: 'Padmanabhanagar', phone: '080-26792222', email: 'ashoka.mla@karnataka.gov.in' },
  'BANGALORESOUTH': { name: 'M. Krishnappa', party: 'BJP', photo: '/rep_pc_mohan.png', label: 'Bangalore South', phone: '080-26581111', email: 'krishnappa.south@karnataka.gov.in' },
  'BOMMANAHALLI': { name: 'M. Satish Reddy', party: 'BJP', photo: '/rep_pc_mohan.png', label: 'Bommanahalli', phone: '080-25725555', email: 'satishreddy.mla@karnataka.gov.in' },
  'BYATARAYANAPURA': { name: 'Krishna Byre Gowda', party: 'INC', photo: '/rep_rizwan.png', label: 'Byatarayanapura', phone: '080-23626666', email: 'kbg.office@karnataka.gov.in' },
  'RAJAJINAGAR': { name: 'S. Suresh Kumar', party: 'BJP', photo: '/rep_pc_mohan.png', label: 'Rajajinagar', phone: '080-23126767', email: 'sureshkumar.mla@karnataka.gov.in' },
  'JAYANAGAR': { name: 'C. K. Ramamurthy', party: 'BJP', photo: '/rep_pc_mohan.png', label: 'Jayanagar', phone: '080-26653333', email: 'ckramamurthy.mla@karnataka.gov.in' },
  'BASAVANAGUDI': { name: 'L. A. Ravi Subramanya', party: 'BJP', photo: '/rep_pc_mohan.png', label: 'Basavanagudi', phone: '080-26678888', email: 'ravisubramanya.mla@karnataka.gov.in' }
};

// Members of Parliament (Lok Sabha)
const MP_DATABASE = {
  'BANGALORENORTH': { name: 'Shobha Karandlaje', party: 'BJP', constituency: 'Bangalore North', photo: '/rep_shobha.png', phone: '080-23604444', email: 'shobha.k@sansad.nic.in' },
  'BANGALORESOUTH': { name: 'Tejasvi Surya', party: 'BJP', constituency: 'Bangalore South', photo: '/rep_tejasvi.png', phone: '080-26567890', email: 'office@tejasvisurya.in' },
  'BANGALORECENTRAL': { name: 'P. C. Mohan', party: 'BJP', constituency: 'Bangalore Central', photo: '/rep_pc_mohan.png', phone: '080-22865555', email: 'pcmohanmp@gmail.com' },
  'BANGALORERURAL': { name: 'Dr. C. N. Manjunath', party: 'BJP', constituency: 'Bangalore Rural', photo: '/rep_pc_mohan.png', phone: '080-22971111', email: 'cnmanjunath.mp@sansad.nic.in' },
  'CHIKBALLAPUR': { name: 'Dr. K. Sudhakar', party: 'BJP', constituency: 'Chikballapur', photo: '/rep_pc_mohan.png', phone: '080-27622222', email: 'drksudhakar.mp@sansad.nic.in' }
};

// Zonal Commissioners of BBMP with official emails and phone lines
const ZONE_DETAILS = {
  'EAST': { name: 'Snehal R., IAS', email: 'jc.east@bbmp.gov.in', phone: '080-22975801' },
  'WEST': { name: 'Yogesh A. M., KAS', email: 'jc.west@bbmp.gov.in', phone: '080-22975601' },
  'SOUTH': { name: 'Jayaram Raipura, IRS', email: 'jc.south@bbmp.gov.in', phone: '080-22975701' },
  'MAHADEVAPURA': { name: 'Dr. K. V. Trilok Chandra, IAS', email: 'jc.mahadevapura@bbmp.gov.in', phone: '080-28512140' },
  'BOMMANAHALLI': { name: 'Muniveerappa, KAS', email: 'jc.bommanahalli@bbmp.gov.in', phone: '080-25732626' },
  'YELAHANKA': { name: 'Poornima B. R., KAS', email: 'jc.yelahanka@bbmp.gov.in', phone: '080-23636671' },
  'NORTH': { name: 'Poornima B. R., KAS', email: 'jc.north@bbmp.gov.in', phone: '080-23636671' },
  'CENTRAL': { name: 'Dr. K. Harish Kumar, KAS', email: 'jc.central@bbmp.gov.in', phone: '080-22975501' },
  'RAJARAJESHWARI NAGAR': { name: 'Dr. Nagaraju, KAS', email: 'jc.rrnagar@bbmp.gov.in', phone: '080-28604652' },
  'DASARAHALLI': { name: 'Balashekar, KAS', email: 'jc.dasarahalli@bbmp.gov.in', phone: '080-28394909' }
};

/**
 * Resolve an incident to its actual BBMP ward, MLA, MP, and administrative chain
 */
export function getWardDetailsForIncident(incident, geoJsonData) {
  if (!incident || !geoJsonData || !geoJsonData.features) {
    return getDefaultWardData();
  }

  // Extract coordinates [lon, lat]
  let lng = 77.5946;
  let lat = 12.9716;

  if (incident.location && incident.location.coordinates) {
    lng = incident.location.coordinates[0];
    lat = incident.location.coordinates[1];
  } else if (incident.latitude && incident.longitude) {
    lat = incident.latitude;
    lng = incident.longitude;
  }

  // Find matching ward polygon
  let matchedFeature = null;

  // Direct match by ward name/id if present
  if (incident.ward || incident.wardName || incident.wardId) {
    const q = (incident.ward || incident.wardName || '').toString().toLowerCase().trim();
    const idQ = incident.wardId ? incident.wardId.toString().trim() : null;
    matchedFeature = geoJsonData.features.find(f => {
      const p = f.properties || {};
      return (idQ && p.id && p.id.toString() === idQ) ||
             (q && p.name_en && p.name_en.toLowerCase().trim() === q) ||
             (q && p.id && p.id.toString() === q) ||
             (q && p.proposed_ward_name_en && p.proposed_ward_name_en.toLowerCase().trim() === q) ||
             (q && p.name_en && p.name_en.toLowerCase().includes(q));
    });
  }

  // Point in polygon match
  if (!matchedFeature) {
    for (const feature of geoJsonData.features) {
      if (isInsideFeature(lng, lat, feature)) {
        matchedFeature = feature;
        break;
      }
    }
  }

  // Fallback to nearest ward by Euclidean distance to vertex
  if (!matchedFeature && geoJsonData.features.length > 0) {
    let minDist = Infinity;
    for (const feature of geoJsonData.features) {
      if (feature.geometry && feature.geometry.coordinates) {
        const ring = feature.geometry.type === 'Polygon' 
          ? feature.geometry.coordinates[0] 
          : (feature.geometry.coordinates[0]?.[0] || []);
        if (ring && ring.length > 0) {
          const pt = ring[0];
          const dist = Math.hypot(lng - pt[0], lat - pt[1]);
          if (dist < minDist) {
            minDist = dist;
            matchedFeature = feature;
          }
        }
      }
    }
  }

  if (!matchedFeature) {
    return getDefaultWardData();
  }

  const props = matchedFeature.properties || {};
  const wardName = props.name_en || props.proposed_ward_name_en || 'Bengaluru Ward';
  const wardId = props.id || '1';

  // Normalize Assembly Constituency name cleanly
  const cleanAssembly = normalizeConstituencyKey(props.assembly_constituency_name_en || 'SHIVAJINAGAR');

  // Normalize Parliamentary Constituency name cleanly
  const cleanParliamentary = normalizeConstituencyKey(props.parliamentary_constituency_name_en || 'BANGALORE CENTRAL');

  // Lookup MLA from normalized key
  const mla = MLA_DATABASE[cleanAssembly] || {
    name: 'Local MLA',
    party: 'INC',
    photo: '/rep_rizwan.png',
    label: cleanAssembly
  };

  // Lookup MP from normalized key
  const mp = MP_DATABASE[cleanParliamentary] || {
    name: 'P. C. Mohan',
    party: 'BJP',
    constituency: 'Bangalore Central',
    photo: '/rep_pc_mohan.png'
  };

  // Determine Zone
  let zoneName = 'Central';
  if (cleanAssembly.includes('YELAHANKA') || cleanAssembly.includes('BYATARAYANAPURA') || cleanAssembly.includes('HEBBAL')) zoneName = 'North';
  else if (cleanAssembly.includes('JAYANAGAR') || cleanAssembly.includes('BASAVANAGUDI') || cleanAssembly.includes('PADMANABA')) zoneName = 'South';
  else if (cleanAssembly.includes('SHIVAJI') || cleanAssembly.includes('PULAKESHI') || cleanAssembly.includes('SARVARGNA') || cleanAssembly.includes('SARVAGNA')) zoneName = 'North';
  else if (cleanAssembly.includes('GANDHI') || cleanAssembly.includes('MALLES') || cleanAssembly.includes('RAJAJI')) zoneName = 'Central';
  else if (cleanAssembly.includes('MAHADEVA') || cleanAssembly.includes('KRPURA')) zoneName = 'East';
  else if (cleanAssembly.includes('BOMMANAHALLI') || cleanAssembly.includes('BTM')) zoneName = 'South';
  else if (cleanAssembly.includes('DASARAHALLI')) zoneName = 'West';
  else if (cleanAssembly.includes('RAJARAJESHWARI')) zoneName = 'West';

  const zonalInfo = ZONE_DETAILS[zoneName] || { name: 'Dr. K. Harish Kumar, KAS', email: 'jc.central@bbmp.gov.in', phone: '080-22975501' };
  const addlCommissioner = zonalInfo.name;

  const profiles = createCivicProfiles({
    wardId,
    wardName,
    zoneName,
    zonalInfo,
    cleanAssembly,
    mla,
    mp
  });

  return {
    wardId,
    wardName,
    wardTitle: `${wardName} #${wardId}`,
    assemblyName: mla.label || cleanAssembly,
    parliamentaryName: mp.constituency || cleanParliamentary,
    zone: zoneName,
    agency: 'BWSSB / BSWML',
    agencyDesc: 'Reports to GBA',
    commissioner: {
      title: 'Commissioner',
      name: 'Tushar Giri Nath, IAS',
      desc: 'GBA / Corporation head · Top of chain'
    },
    additionalCommissioner: {
      title: 'Additional Commissioner',
      name: `${zoneName}-level oversight (${addlCommissioner})`,
      desc: `${zoneName}-level oversight`
    },
    aee: {
      title: 'Asst. Executive Engineer',
      name: `${mla.label || cleanAssembly} Engineering oversight`,
      desc: 'Engineering oversight (AEE)'
    },
    jhi: {
      title: 'Junior Health Inspector',
      name: `Ward #${wardId} frontline officer`,
      desc: 'Frontline ward officer (JHI)'
    },
    corporator: {
      title: 'Corporator',
      status: 'Vacant since 2020'
    },
    mla: {
      name: mla.name,
      party: mla.party,
      role: 'MLA',
      constituency: mla.label || cleanAssembly,
      photo: mla.photo,
      phone: mla.phone,
      email: mla.email
    },
    mp: {
      name: mp.name,
      party: mp.party,
      role: 'MP',
      constituency: mp.constituency,
      photo: mp.photo,
      phone: mp.phone,
      email: mp.email
    },
    ...profiles
  };
}

function createCivicProfiles({ wardId, wardName, zoneName, zonalInfo, cleanAssembly, mla, mp }) {
  return {
    agencyProfile: {
      tag: 'BWSSB / BSWML',
      title: 'Bengaluru Water Supply and Sewerage Board',
      subtitle: 'Manages all waterlogging, drains & sewage contractors · Reports to GBA',
      actions: [
        { type: 'whatsapp', label: 'WhatsApp Sahaaya', url: `https://wa.me/919480685700?text=${encodeURIComponent(`Waterlogging / drainage issue at ${wardName} (Ward #${wardId})`)}` },
        { type: 'whatsapp', label: 'WhatsApp BWSSB (8762228888)', url: `https://wa.me/918762228888?text=${encodeURIComponent(`BWSSB grievance at ${wardName} (Ward #${wardId})`)}` },
        { type: 'email', label: 'Email SWM / Drainage Commissioner', url: `mailto:comm@bbmp.gov.in?subject=${encodeURIComponent(`Waterlogging at ${wardName} #${wardId}`)}` },
        { type: 'email', label: 'Email BWSSB Chairman', url: `mailto:chairman@bwssb.gov.in?subject=${encodeURIComponent(`Drainage / Waterlogging at ${wardName}`)}` },
        { type: 'phone', label: 'Call water helpline (1916)', url: 'tel:1916' },
        { type: 'phone', label: 'Call helpline (1533)', url: 'tel:1533' }
      ]
    },
    commissionerProfile: {
      tag: 'TOP OF CHAIN',
      title: 'Commissioner',
      subtitle: 'GBA / Corporation Commissioner · IAS officer',
      actions: [
        { type: 'email', label: 'Email SWM Commissioner', url: `mailto:comm@bbmp.gov.in?subject=${encodeURIComponent(`Civic Grievance: ${wardName} #${wardId}`)}` },
        { type: 'email', label: 'Email Joint Commissioner', url: `mailto:${zonalInfo.email}?subject=${encodeURIComponent(`Zonal Escalation: ${wardName} #${wardId}`)}` },
        { type: 'phone', label: 'Call helpline (1533)', url: 'tel:1533' }
      ]
    },
    acProfile: {
      tag: 'ZONAL OVERSIGHT',
      title: 'Additional Commissioner',
      subtitle: `${zonalInfo.name} · ${zoneName}-level oversight`,
      actions: [
        { type: 'whatsapp', label: 'WhatsApp Sahaaya', url: 'https://wa.me/919480685700' },
        { type: 'email', label: `Email ${zoneName} Joint Commissioner`, url: `mailto:${zonalInfo.email}?subject=${encodeURIComponent(`Ward #${wardId} Issue - ${wardName}`)}` },
        { type: 'phone', label: `Call Zonal Office (${zonalInfo.phone})`, url: `tel:${zonalInfo.phone.replace(/[^0-9]/g, '')}` },
        { type: 'phone', label: 'Call helpline (1533)', url: 'tel:1533' }
      ]
    },
    aeeProfile: {
      tag: 'ENGINEERING OVERSIGHT',
      title: 'Asst. Executive Engineer (AEE)',
      subtitle: `${mla.label || cleanAssembly} Engineering oversight · SWD & Roads`,
      actions: [
        { type: 'whatsapp', label: 'WhatsApp Sahaaya', url: 'https://wa.me/919480685700' },
        { type: 'email', label: 'Email Stormwater Engineering (SWD)', url: `mailto:ce.swd@bbmp.gov.in?subject=${encodeURIComponent(`Stormwater Drain Maintenance: ${wardName}`)}` },
        { type: 'phone', label: 'Call Sub-Division Control (1533)', url: 'tel:1533' }
      ]
    },
    jhiProfile: {
      tag: 'FRONTLINE WARD OFFICER',
      title: 'Junior Health Inspector (JHI)',
      subtitle: `Ward #${wardId} frontline officer · Inspection & marshals squad`,
      actions: [
        { type: 'whatsapp', label: 'WhatsApp Sahaaya', url: 'https://wa.me/919480685700' },
        { type: 'phone', label: 'Call Ward Helpline (1533)', url: 'tel:1533' }
      ]
    },
    corporatorProfile: {
      tag: 'CIVIC REPRESENTATIVE',
      title: 'Corporator',
      subtitle: 'Vacant since 2020 · Municipal Elections Pending',
      notice: 'In the absence of an elected corporator, ward governance is administered directly by the designated BBMP Nodal Officer & Zonal Joint Commissioner under the Karnataka Municipal Corporations (KMC) Act.',
      actions: [
        { type: 'whatsapp', label: 'WhatsApp Sahaaya', url: 'https://wa.me/919480685700' },
        { type: 'phone', label: 'Call Ward Helpline (1533)', url: 'tel:1533' }
      ]
    },
    mlaProfile: {
      tag: 'ELECTED REPRESENTATIVE',
      title: `${mla.name} (MLA)`,
      subtitle: `${mla.party} · Karnataka Legislative Assembly · ${mla.label || cleanAssembly}`,
      actions: [
        { type: 'email', label: 'Email MLA Office', url: `mailto:${mla.email || 'mla.office@karnataka.gov.in'}?subject=${encodeURIComponent(`Citizen Representation: ${wardName}`)}` },
        { type: 'phone', label: `Call MLA Constituency Office (${mla.phone || '080-22253755'})`, url: `tel:${(mla.phone || '080-22253755').replace(/[^0-9]/g, '')}` },
        { type: 'whatsapp', label: 'WhatsApp Sahaaya', url: 'https://wa.me/919480685700' }
      ]
    },
    mpProfile: {
      tag: 'MEMBER OF PARLIAMENT',
      title: `${mp.name} (MP)`,
      subtitle: `${mp.party} · Lok Sabha MP · ${mp.constituency}`,
      actions: [
        { type: 'email', label: 'Email MP Office', url: `mailto:${mp.email || 'office@sansad.nic.in'}?subject=${encodeURIComponent(`Citizen Representation: ${mp.constituency}`)}` },
        { type: 'phone', label: `Call MP Office (${mp.phone || '080-22865555'})`, url: `tel:${(mp.phone || '080-22865555').replace(/[^0-9]/g, '')}` }
      ]
    }
  };
}

export function getDefaultWardData() {
  const mla = MLA_DATABASE['SHIVAJINAGAR'] || { name: 'Rizwan Arshad', party: 'INC', label: 'Shivajinagar', photo: '/rep_rizwan.png', phone: '080-22860888', email: 'rizwanarshad.mla@gmail.com' };
  const mp = MP_DATABASE['BANGALORECENTRAL'] || { name: 'P. C. Mohan', party: 'BJP', constituency: 'Bangalore Central', photo: '/rep_pc_mohan.png', phone: '080-22865555', email: 'pcmohanmp@gmail.com' };
  const zonalInfo = ZONE_DETAILS['CENTRAL'];
  const profiles = createCivicProfiles({
    wardId: '4',
    wardName: 'Sampangiram Nagar',
    zoneName: 'Central',
    zonalInfo,
    cleanAssembly: 'SHIVAJINAGAR',
    mla,
    mp
  });

  return {
    wardId: '4',
    wardName: 'Sampangiram Nagar',
    wardTitle: 'Central #4',
    assemblyName: 'Shivajinagar',
    parliamentaryName: 'Bangalore Central',
    zone: 'Central',
    agency: 'BWSSB / BSWML',
    agencyDesc: 'Reports to GBA',
    commissioner: {
      title: 'Commissioner',
      name: 'Tushar Giri Nath, IAS',
      desc: 'GBA / Corporation head · Top of chain'
    },
    additionalCommissioner: {
      title: 'Additional Commissioner',
      name: 'Central-level oversight',
      desc: 'Central-level oversight'
    },
    aee: {
      title: 'Asst. Executive Engineer',
      name: 'Central Engineering oversight',
      desc: 'Engineering oversight (AEE)'
    },
    jhi: {
      title: 'Junior Health Inspector',
      name: 'Frontline ward officer (JHI)',
      desc: 'Frontline ward officer (JHI)'
    },
    corporator: {
      title: 'Corporator',
      status: 'Vacant since 2020'
    },
    mla: {
      name: 'Rizwan Arshad',
      party: 'INC',
      role: 'MLA',
      constituency: 'Shivajinagar',
      photo: '/rep_rizwan.png',
      phone: mla.phone,
      email: mla.email
    },
    mp: {
      name: 'P. C. Mohan',
      party: 'BJP',
      role: 'MP',
      constituency: 'Bangalore Central',
      photo: '/rep_pc_mohan.png',
      phone: mp.phone,
      email: mp.email
    },
    ...profiles
  };
}

/**
 * Group incidents by ward with MLA and count statistics for the Ward-Level List View
 */
export function getWardGroups(incidents, geoJsonData) {
  if (!geoJsonData || !geoJsonData.features) return [];

  const wardMap = new Map();

  // Initialize wards from GeoJSON features
  for (const feature of geoJsonData.features) {
    const props = feature.properties || {};
    const wardId = props.id ? props.id.toString() : '0';
    const wardName = props.name_en || props.proposed_ward_name_en || `Ward ${wardId}`;
    
    // Normalize Assembly name
    const cleanAssembly = normalizeConstituencyKey(props.assembly_constituency_name_en || 'SHIVAJINAGAR');
    const cleanParliamentary = normalizeConstituencyKey(props.parliamentary_constituency_name_en || 'BANGALORE CENTRAL');

    // Determine Zone
    let zone = 'Central';
    if (cleanAssembly.includes('YELAHANKA') || cleanAssembly.includes('BYATARAYANAPURA') || cleanAssembly.includes('HEBBAL')) zone = 'North';
    else if (cleanAssembly.includes('JAYANAGAR') || cleanAssembly.includes('BASAVANAGUDI') || cleanAssembly.includes('PADMANABA')) zone = 'South';
    else if (cleanAssembly.includes('SHIVAJI') || cleanAssembly.includes('PULAKESHI') || cleanAssembly.includes('SARVARGNA') || cleanAssembly.includes('SARVAGNA')) zone = 'North';
    else if (cleanAssembly.includes('GANDHI') || cleanAssembly.includes('MALLES') || cleanAssembly.includes('RAJAJI')) zone = 'Central';
    else if (cleanAssembly.includes('MAHADEVA') || cleanAssembly.includes('KRPURA')) zone = 'East';
    else if (cleanAssembly.includes('BOMMANAHALLI') || cleanAssembly.includes('BTM')) zone = 'South';
    else if (cleanAssembly.includes('DASARAHALLI')) zone = 'West';
    else if (cleanAssembly.includes('RAJARAJESHWARI')) zone = 'West';

    const mla = MLA_DATABASE[cleanAssembly] || { name: 'Local MLA', party: 'INC', photo: '/rep_rizwan.png' };
    const mp = MP_DATABASE[cleanParliamentary] || { name: 'P. C. Mohan', party: 'BJP', photo: '/rep_pc_mohan.png', constituency: 'Bangalore Central' };

    // Common popular area names mapped to official BBMP ward names
    const WARD_ALIASES = {
      'Chickpete': 'Chickpet Chickpete Gandhi Nagar',
      'S K Garden': 'Pulakeshinagar Pulakeshi Nagar Frazer Town',
      'Basaveshwara Nagar': 'Rajajinagar Rajaji Nagar West',
      'Sanjaya Nagar': 'Sanjay Nagar RT Nagar R.T. Nagar Hebbal',
      'Vishwanath Nagenahalli': 'Ganganagar Ganga Nagar RT Nagar Hebbal',
      'Ganganagara': 'Ganganagar Ganga Nagar RT Nagar Hebbal',
      'HAL 2nd Stage': 'Indiranagar Old Airport Road',
      'Jeevan Bima Nagar': 'Indiranagar',
      'Jeevanbheemanagar': 'Indiranagar',
      'Domlur': 'Indiranagar EGL',
      'White Field': 'Whitefield ITPL',
      'Bellanduru': 'Bellandur EcoSpace ORR',
      'HSR Layout': 'HSR Sector 1-7 Bommanahalli',
      'J P Nagar': 'JP Nagar Phase 1-6',
      'Sarakki': 'JP Nagar',
      'B.T.M. Layout': 'BTM Layout Tavarekere',
      'Malleswaram': 'Malleshwaram',
      'Koramangala': 'Koramangala Sony World'
    };

    const aliases = WARD_ALIASES[wardName] || '';

    wardMap.set(wardId, {
      wardId,
      wardName,
      zone,
      zoneTag: `${zone} #${wardId}`,
      cleanAssembly,
      aliases,
      searchTerms: `${wardName} ${zone} ${cleanAssembly} ${mla.name} ${aliases} ${props.proposed_ward_name_en || ''}`.toLowerCase(),
      mlaName: mla.name,
      mlaParty: mla.party,
      mlaPhoto: mla.photo || '/rep_rizwan.png',
      mpName: mp.name,
      mpParty: mp.party,
      mpPhoto: mp.photo || '/rep_pc_mohan.png',
      parliamentaryName: mp.constituency || cleanParliamentary,
      incidents: [],
      totalReports: 0,
      unresolvedReports: 0
    });
  }

  // Populate incidents into wards purely from real MongoDB database
  for (const incident of (incidents || [])) {
    const wardInfo = getWardDetailsForIncident(incident, geoJsonData);
    let wardEntry = wardMap.get(wardInfo.wardId.toString());
    if (!wardEntry && incident.wardId) {
      wardEntry = wardMap.get(incident.wardId.toString());
    }
    if (wardEntry) {
      wardEntry.incidents.push(incident);
      wardEntry.totalReports += 1;
      if (incident.status !== 'resolved') {
        wardEntry.unresolvedReports += 1;
      }
    }
  }

  // Convert to array
  const allWards = Array.from(wardMap.values());

  // Return BBMP wards sorted purely by real database reports:
  // 1) Active unresolved reports first (highest to lowest)
  // 2) Total reports (highest to lowest)
  // 3) Alphabetically by ward name
  return allWards.sort((a, b) => {
    if (b.unresolvedReports !== a.unresolvedReports) {
      return b.unresolvedReports - a.unresolvedReports;
    }
    if (b.totalReports !== a.totalReports) {
      return b.totalReports - a.totalReports;
    }
    return a.wardName.localeCompare(b.wardName);
  });
}
