/* ═══════════════════════════════════════════════
   BuildMarshal — Configuration
   ═══════════════════════════════════════════════ */

const APP_CONFIG = {
  API_URL: localStorage.getItem('bmarshal_api_url') || '',
  MODEL: localStorage.getItem('bmarshal_model') || 'gemini-2.5-flash',
  TOP_K: parseInt(localStorage.getItem('bmarshal_top_k') || '5', 10),
  MAX_FILE_SIZE: 50 * 1024 * 1024,
  ACCEPTED_EXTENSIONS: ['.pdf','.xlsx','.xls','.csv','.png','.jpg','.jpeg','.gif','.webp','.bmp','.tiff','.doc','.docx'],
  FILE_ICONS: { pdf:'📕', xlsx:'📗', xls:'📗', csv:'📗', png:'🖼️', jpg:'🖼️', jpeg:'🖼️', gif:'🖼️', webp:'🖼️', bmp:'🖼️', tiff:'🖼️', doc:'📘', docx:'📘' },
  FILE_TYPE_CLASS: { pdf:'pdf', xlsx:'excel', xls:'excel', csv:'excel', png:'image', jpg:'image', jpeg:'image', gif:'image', webp:'image', bmp:'image', tiff:'image', doc:'doc', docx:'doc' },
  STORAGE_KEYS: { API_URL:'bmarshal_api_url', MODEL:'bmarshal_model', TOP_K:'bmarshal_top_k', CHATS:'bmarshal_chats', ACTIVE_CHAT:'bmarshal_active_chat' }
};

/* ── Demo Data ── */
const DEMO_DATA = {
  currentProject: 'Pan Pacific Model Room FFE Specification Package Test',
  projects: [
    { id: 'proj-1', name: 'Pan Pacific Model Room FFE Specification Package Test' },
    { id: 'proj-2', name: 'Harbor View Tower Phase 2' },
    { id: 'proj-3', name: 'Downtown Office Complex' }
  ],
  teamMembers: [
    { id:'tm-1', name:'admin', email:'admin@bm.ai', department:'—', category:'internal' },
    { id:'tm-2', name:'Jim Co', email:'jim@buildmarshal.ai', department:'Finance & Accounts', category:'internal' },
    { id:'tm-3', name:'Clover Paints', email:'clover@paints.com', company:'Clover Paints', contactName:'Khairul Shaon', category:'vendor', vendorType:'Material Supplier', trade:'Painting' },
    { id:'tm-4', name:"Jim's electrical Company", email:'shaon2k', company:"Jim's electrical Company", contactName:'Khairul Shaon', category:'vendor', vendorType:'Material Supplier', trade:'Electrical' }
  ],
  trades: [
    { id:'tr-1', name:'Carpentry', description:'-', status:'Active' },
    { id:'tr-2', name:'Concrete', description:'-', status:'Active' },
    { id:'tr-3', name:'Drywall', description:'-', status:'Active' },
    { id:'tr-4', name:'Electrical', description:'-', status:'Active' },
    { id:'tr-5', name:'Exterior Works', description:'-', status:'Active' },
    { id:'tr-6', name:'Flooring / Finishing', description:'-', status:'Active' },
    { id:'tr-7', name:'HVAC', description:'-', status:'Active' },
    { id:'tr-8', name:'Insulation', description:'-', status:'Active' },
    { id:'tr-9', name:'Landscaping', description:'-', status:'Active' },
    { id:'tr-10', name:'Masonry', description:'-', status:'Active' },
    { id:'tr-11', name:'Painting', description:'-', status:'Active' },
    { id:'tr-12', name:'Plumbing', description:'-', status:'Active' },
    { id:'tr-13', name:'Roofing', description:'-', status:'Active' }
  ],
  vendors: [
    { id:'v-1', name:'Clover Paints', vendorType:'Material Supplier', trade:'Painting', activeProjects:0, status:'Active' },
    { id:'v-2', name:"Jim's electrical Company", vendorType:'Material Supplier', trade:'Electrical', activeProjects:1, status:'Active' }
  ],
  documents: [
    { id:'doc-1', name:'A62C6270-717A-4CEA-93A3-CBA6A92743D2.heic', provider:'OneDrive', projectName:'Pan Pacific Model Room FFE Specification' },
    { id:'doc-2', name:'7F266AE2-BB74-4A36-99D7-5BD0E14965D9.heic', provider:'Google', projectName:'Pan Pacific Model Room FFE Specification' },
    { id:'doc-3', name:'A62C6270-717A-4CEA-93A3-CBA6A92743D2.heic', provider:'Google', projectName:'Pan Pacific Model Room FFE Specification' },
    { id:'doc-4', name:'A62C6270-717A-4CEA-93A3-CBA6A92743D2.heic', provider:'BuildMarshal', projectName:'Pan Pacific Model Room FFE Specification' }
  ],
  photos: []
};

// Generate demo photo data with placeholder images
(function() {
  const photoNames = ['A62C6270-717...','1B20E043-CAC...','IMG_20260120_...','full-shot-man-...','working-with-bl...','pointing-sketch...','full-shot-man-...','remodelacion.jpg','4DF432C7-6E4...','405389571_727...'];
  const colors = ['e74c3c','3498db','2ecc71','f39c12','9b59b6','1abc9c','e67e22','34495e','16a085','c0392b'];
  for (let i = 0; i < 51; i++) {
    const idx = i % photoNames.length;
    DEMO_DATA.photos.push({
      id: 'photo-' + (i+1),
      name: photoNames[idx],
      url: `https://placehold.co/320x240/${colors[idx]}/ffffff?text=Photo+${i+1}`,
      thumbnail: `https://placehold.co/320x240/${colors[idx]}/ffffff?text=Photo+${i+1}`,
      provider: ['OneDrive','Google','BuildMarshal'][i % 3],
      date: 'Feb 11, 2026'
    });
  }
})();
