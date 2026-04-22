// CTP response parsers — raw text → structured JSON
// Tailored to DM-MD8x8 firmware v4.102 output formats

function parseRoutes(raw) {
  const routes = { video: {}, audio: {}, usb: {} };

  // Parse output card sections
  // Format:
  //   Routing Information for Output Card at Slot 17
  //   Video Routed From Input Card at slot 1
  //   Audio Routed From Input Card at slot 1
  //   USB Host Routed to Card at slot 2
  //
  // Output slots start at 17 (Out1=17, Out2=18, ...)
  const sections = raw.split(/Routing Information for Output Card at Slot\s+(\d+)/i);

  for (let i = 1; i < sections.length; i += 2) {
    const slotNum = parseInt(sections[i]);
    const body = sections[i + 1] || '';

    // Map slot number to output number (slot 17 = out 1, etc.)
    const outNum = slotNum - 16;
    if (outNum < 1 || outNum > 16) continue;

    const videoMatch = body.match(/Video\s+Routed\s+From\s+Input\s+Card\s+at\s+slot\s+(\d+)/i);
    if (videoMatch) routes.video[outNum] = parseInt(videoMatch[1]);

    const audioMatch = body.match(/Audio\s+Routed\s+From\s+Input\s+Card\s+at\s+slot\s+(\d+)/i);
    if (audioMatch) routes.audio[outNum] = parseInt(audioMatch[1]);

    const usbMatch = body.match(/USB\s+Host\s+Routed\s+to\s+Card\s+at\s+slot\s+(\d+)/i);
    if (usbMatch) routes.usb[outNum] = parseInt(usbMatch[1]);
  }

  return routes;
}

function parseCards(raw) {
  const cards = [];
  const lines = raw.split('\n');

  for (const line of lines) {
    // Format: "  1: DMC-4K-HD HDMI 4K Input Card [v1.2911.00108, #00EB3249] Stream:b0.0"
    const match = line.match(/^\s*(\d+):\s+(\S+)\s+(.+?)(?:\s+\[v([\d.]+),\s*#([A-Fa-f0-9]+)\])?\s*(?:Stream:(\S+))?$/);
    if (match) {
      const slot = parseInt(match[1]);
      const type = match[2];
      const description = match[3].trim();
      const isInput = slot <= 16;
      const isOutput = slot >= 17 && slot <= 32;

      cards.push({
        slot,
        type,
        description,
        firmware: match[4] || null,
        serial: match[5] || null,
        stream: match[6] || null,
        role: isInput ? 'input' : isOutput ? 'output' : 'system',
        portNum: isInput ? slot : isOutput ? slot - 16 : null,
      });
    }
  }

  return { cards, raw };
}

function parseEdid(raw) {
  return { raw };
}

function parseHdcp(raw) {
  return { raw };
}

function parseNetwork(raw) {
  const result = {};
  const ipMatch = raw.match(/IP\s*(?:Address)?\s*[:\-=]\s*([\d.]+)/i);
  if (ipMatch) result.ip = ipMatch[1];
  const maskMatch = raw.match(/(?:Subnet\s*)?Mask\s*[:\-=]\s*([\d.]+)/i);
  if (maskMatch) result.mask = maskMatch[1];
  const gwMatch = raw.match(/(?:Default\s*)?(?:Router|Gateway)\s*[:\-=]\s*([\d.]+)/i);
  if (gwMatch) result.gateway = gwMatch[1];
  const dhcpMatch = raw.match(/DHCP\s*[:\-=]\s*(\w+)/i);
  if (dhcpMatch) result.dhcp = dhcpMatch[1];
  const hostMatch = raw.match(/Host\s*(?:Name|name)?\s*[:\-=]\s*(\S+)/i);
  if (hostMatch) result.hostname = hostMatch[1];
  const macMatch = raw.match(/(?:MAC|Ethernet)\s*(?:Address)?\s*[:\-=]\s*([0-9A-Fa-f.:]+)/i);
  if (macMatch) result.mac = macMatch[1];
  result.raw = raw;
  return result;
}

function parseVersion(raw) {
  const result = {};
  // Format: "DM-MD8x8 Cntrl Eng [v4.102.352400074 (Sep 23 2019), #00FFC818]"
  const match = raw.match(/(\S+)\s+.*?\[v([\d.]+(?:\s*\([^)]+\))?),?\s*#([A-Fa-f0-9]+)\]/);
  if (match) {
    result.model = match[1];
    result.firmware = match[2];
    result.serial = match[3];
  }
  result.raw = raw;
  return result;
}

function parseErrLog(raw) {
  const entries = [];
  const lines = raw.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.match(/^[-=]+$/) && !trimmed.match(/^Error\s*Log/i)) {
      entries.push(trimmed);
    }
  }
  return { entries, raw };
}

function parseUptime(raw) {
  return { uptime: raw.trim(), raw };
}

function parseMemory(raw) {
  return { raw };
}

function parseTop(raw) {
  return { raw };
}

module.exports = {
  parseRoutes,
  parseCards,
  parseEdid,
  parseHdcp,
  parseNetwork,
  parseVersion,
  parseErrLog,
  parseUptime,
  parseMemory,
  parseTop
};
