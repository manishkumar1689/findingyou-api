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
    key: 'basic_search',
    name: 'Basic search',
  },
  {
    key: 'advanced_search',
    name: 'Advanced search',
  },
  {
    key: 'image_upload',
    name: 'May upload up to 3 images per profile type',
  },
  {
    key: 'image_upload_extra',
    name: 'May upload up to 15 images per profile type',
  },
  {
    key: 'contact_other_members',
    name: 'Contact other members',
  },
  {
    key: 'protected_profiles',
    name: 'Add protected profiles',
  },
  {
    key: 'private_profiles',
    name: 'Add private profiles',
  },
  {
    key: 'advanced_matching',
    name: 'Advanced matchmaking',
  },
  {
    key: 'advanced_charting',
    name: 'Advanced Astrological charting',
  },
  {
    key: 'personal_astrologer',
    name: 'personal astrologer',
  },
];

export default permissionValues;
