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
