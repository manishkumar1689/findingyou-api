/*
These permissions are enforced in code. The value list is for reference in the admin area
*/

const permissionValues = [
  {
    key: 'all',
    name: 'Global permissions',
  },
  {
    key: 'users_admin',
    name: 'Administer users',
  },
  {
    key: 'basic_account',
    name: 'Basic account',
  },
  {
    key: 'basic_image_upload',
    name: 'May upload up to 3 images for public profiles',
  },
  {
    key: 'extra_image_uploads',
    name: 'May upload up to 50 images per profile type',
  },
  {
    key: 'unlimited_image_uploads',
    name: 'Unlimited uploads',
  },
  {
    key: 'protected_profiles',
    name: 'May have protected profile only available to ',
  },
  { key: 'swipe_pass_limit', name: 'Swipe pass limit' },
  { key: 'swipe_like_limit', name: 'Swipe like limit' },
  { key: 'swipe_superstar_limit', name: 'swipe superstar limit' },
  { key: 'swipe_superstar_message', name: 'swipe superstar message' },
  { key: 'swipe_like_message', name: 'swipe like message' },
  { key: 'swipe_like_promote', name: 'swipe like promote' },
  { key: 'swipe_promote_me_limit', name: 'Swipe promote me limit' },
  { key: 'info_who_likes_me', name: 'Info: see who likes me' },
  { key: 'info_history', name: 'Info history access' },
  {
    key: 'compatibility_manual',
    name: 'manual compatibility access'
  },
  { key: 'compatibility_astro', name: 'Astro compatibility test' },
  {
    key: 'compatibility_jungian',
    name: 'compatibility jungian test'
  },
  {
    key: 'compatibility_big5',
    name: 'big Five compatibility test'
  },
  {
    key: 'swipe_luckystar_strength_access',
    name: 'Swipe luckystar strength access'
  },
  { key: 'connecting_others_access', name: 'connecting others access' },
  { key: 'astro_luckyStar_access', name: 'astro luckyStar access' },
  { key: 'chat_message_access', name: 'chat message access' },
  { key: 'chat_video_access', name: 'chat video access' },
  { key: 'outside_range_limit', name: 'Outside range limit' },
  {
    key: 'astro_current_trends_text',
    name: 'Astro current trends text'
  },
  { key: 'astro_natal_chart_text', name: 'astro natal chart text' }
];

export default permissionValues;
