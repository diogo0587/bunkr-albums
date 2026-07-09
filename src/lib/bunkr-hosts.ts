export const BUNKR_HOSTS = [
  'bunkr.sk',
  'bunkr.ru',
  'bunkr.si',
  'bunkr.is',
  'bunkr.ph',
  'bunkr.ax',
  'bunkr.cr',
  'bunkr.cat',
  'bunkr.ac',
  'bunkr.la',
  'bunkr.ws',
  'bunkr.st',
  'bunkr.fi',
  'bunkr.ci',
  'bunkr.ps',
  'bunkr.ch',
  'bunkr.cm',
  'bunkr.vc',
  'bunkr.cl',
  'bunkr.pm',
  'bunkr.sh',
  'bunkr.to',
  'bunkr.sg',
  'bunkr.pt',
  'bunkr.frl',
  'bunkr.studio',
  'bunkr.black',
  'bunkr.pm',
  'bunkr.ec',
  'bunkr.hk',
  'bunkr.nu',
  'bunkr.gy',
  'bunkr.li',
  'bunkr.pe',
  'bunkr.tk',
  'bunkr.at',
  'bunkr.blue',
  'bunkr.red',
  'bunkr.green',
  'bunkr.today',
  'bunkr.email',
];

export function isBunkrUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return BUNKR_HOSTS.some(host => parsed.hostname === host || parsed.hostname.endsWith('.' + host));
  } catch {
    return false;
  }
}

export function extractAlbumId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/a\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
