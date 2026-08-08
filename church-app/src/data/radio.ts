export type RadioStation = {
  id: string
  name: string
  subtitle: string
  streamUrl: string
  website: string
  kind: 'загальне' | 'діти' | 'музика' | 'літургія'
}

/** Безкоштовні християнські станції (публічні потоки). */
export const stations: RadioStation[] = [
  {
    id: 'svitle',
    name: 'Світле радіо',
    subtitle: 'ТРК Еммануїл — сімейний християнський ефір',
    streamUrl: 'https://online.svitle.org:6729/fm',
    website: 'https://svitle.org/',
    kind: 'загальне',
  },
  {
    id: 'svitle-kids',
    name: 'Світле для дітей',
    subtitle: 'Дитячий потік Світлого радіо',
    streamUrl: 'https://online.svitle.org/hls/kids/aac_midfi.m3u8',
    website: 'https://svitle.org/',
    kind: 'діти',
  },
  {
    id: 'dzvony',
    name: 'Радіо «Дзвони»',
    subtitle: 'УГКЦ — молитва, Євангеліє, календар',
    streamUrl: 'https://stream.radiojar.com/amxp793bsbuvv',
    website: 'https://radio-dzvony.online/',
    kind: 'літургія',
  },
  {
    id: 'maria',
    name: 'Радіо Марія',
    subtitle: 'Молитва, катехизація, духовні роздуми',
    streamUrl: 'https://radiomaria.org.ua:8443/stream64',
    website: 'https://radiomaria.org.ua/',
    kind: 'загальне',
  },
  {
    id: 'svitanok',
    name: 'Радіо «Світанок»',
    subtitle: 'Християнське радіо Тернопільської архиєпархії УГКЦ',
    streamUrl: 'http://online.radiosvitanok.org.ua:8000/live',
    website: 'https://radiosvitanok.org.ua/',
    kind: 'літургія',
  },
  {
    id: 'segenswelle',
    name: 'Segenswelle (укр.)',
    subtitle: 'Християнське слово українською',
    streamUrl: 'http://www.segenswelle.de:8000/ukrainisch',
    website: 'https://www.segenswelle.de/',
    kind: 'музика',
  },
]
