/* ═══════════════════════════════════════════════
   BuildMarshal — Configuration
   ═══════════════════════════════════════════════ */

const APP_CONFIG = {
  API_URL: localStorage.getItem('bmarshal_api_url') || '',
  MODEL: localStorage.getItem('bmarshal_model') || 'gemini-2.5-flash',
  TOP_K: parseInt(localStorage.getItem('bmarshal_top_k') || '5', 10),
  MAX_FILE_SIZE: 50 * 1024 * 1024,

  // All accepted file types — documents, images, audio, video, archives
  ACCEPTED_EXTENSIONS: [
    '.pdf','.xlsx','.xls','.csv','.png','.jpg','.jpeg','.gif','.webp','.bmp','.tiff',
    '.doc','.docx','.pptx','.ppt','.txt','.rtf','.odt','.ods',
    '.mp3','.wav','.ogg','.m4a','.flac','.aac','.wma','.opus',
    '.mp4','.webm','.mov','.avi','.mkv',
    '.zip','.rar','.7z','.tar','.gz',
    '.json','.xml','.html','.css','.js','.py','.java','.c','.cpp','.md'
  ],

  FILE_ICONS: {
    pdf:'📕', xlsx:'📗', xls:'📗', csv:'📗',
    png:'🖼️', jpg:'🖼️', jpeg:'🖼️', gif:'🖼️', webp:'🖼️', bmp:'🖼️', tiff:'🖼️',
    doc:'📘', docx:'📘', pptx:'📊', ppt:'📊', txt:'📄', rtf:'📄', odt:'📄', ods:'📗',
    mp3:'🎵', wav:'🎵', ogg:'🎵', m4a:'🎵', flac:'🎵', aac:'🎵', wma:'🎵', opus:'🎵',
    mp4:'🎬', webm:'🎬', mov:'🎬', avi:'🎬', mkv:'🎬',
    zip:'📦', rar:'📦', '7z':'📦', tar:'📦', gz:'📦',
    json:'📋', xml:'📋', html:'🌐', css:'🎨', js:'⚡', py:'🐍', java:'☕',
    c:'⚙️', cpp:'⚙️', md:'📝'
  },

  FILE_TYPE_CLASS: {
    pdf:'pdf', xlsx:'excel', xls:'excel', csv:'excel',
    png:'image', jpg:'image', jpeg:'image', gif:'image', webp:'image', bmp:'image', tiff:'image',
    doc:'doc', docx:'doc', pptx:'doc', ppt:'doc', txt:'doc', rtf:'doc', odt:'doc', ods:'excel',
    mp3:'audio', wav:'audio', ogg:'audio', m4a:'audio', flac:'audio', aac:'audio', wma:'audio', opus:'audio',
    mp4:'video', webm:'video', mov:'video', avi:'video', mkv:'video',
    zip:'archive', rar:'archive', '7z':'archive', tar:'archive', gz:'archive',
    json:'code', xml:'code', html:'code', css:'code', js:'code', py:'code', java:'code',
    c:'code', cpp:'code', md:'code'
  },

  // Previewable types
  PREVIEWABLE_IMAGE: ['png','jpg','jpeg','gif','webp','bmp','tiff','svg'],
  PREVIEWABLE_AUDIO: ['mp3','wav','ogg','m4a','flac','aac','wma','opus'],
  PREVIEWABLE_VIDEO: ['mp4','webm','mov'],
  PREVIEWABLE_TEXT:  ['txt','csv','json','xml','html','css','js','py','java','c','cpp','md','rtf'],
  PREVIEWABLE_PDF:   ['pdf'],

  STORAGE_KEYS: {
    API_URL:'bmarshal_api_url', MODEL:'bmarshal_model', TOP_K:'bmarshal_top_k',
    CHATS:'bmarshal_chats', ACTIVE_CHAT:'bmarshal_active_chat'
  }
};
