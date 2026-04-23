// CTP response parsers — raw text → structured JSON

function toPositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseModelDimensions(value) {
  const match = String(value || '').match(/MD(\d+)x(\d+)/i);
  if (!match) return null;
  return {
    inputCount: Number.parseInt(match[1], 10),
    outputCount: Number.parseInt(match[2], 10),
  };
}

function parseStreamPort(stream) {
  const match = String(stream || '').match(/^([bc])(\d+)(?:\.\d+)?$/i);
  if (!match) return null;

  return {
    role: match[1].toLowerCase() === 'b' ? 'input' : 'output',
    portNum: Number.parseInt(match[2], 10) + 1,
  };
}

function getMaxStreamPort(cards, role) {
  let maxPort = 0;

  for (const card of cards) {
    if (card.streamInfo?.role === role && card.streamInfo.portNum > maxPort) {
      maxPort = card.streamInfo.portNum;
    }
  }

  return maxPort || null;
}

function inferOutputSlotOffset(cards, inputCount) {
  const outputSlots = cards
    .filter(card => card.streamInfo?.role === 'output')
    .map(card => card.slot)
    .filter(Number.isInteger);

  if (outputSlots.length > 0) {
    return Math.min(...outputSlots) - 1;
  }

  return toPositiveInt(inputCount);
}

function resolveCardLayout(cards, options = {}) {
  const modelDimensions = parseModelDimensions(options.model) || parseModelDimensions(options.prompt);
  const inputCount = toPositiveInt(options.inputCount) || modelDimensions?.inputCount || getMaxStreamPort(cards, 'input') || 16;
  const outputCount = toPositiveInt(options.outputCount) || modelDimensions?.outputCount || getMaxStreamPort(cards, 'output') || inputCount;
  const outputSlotOffset = toPositiveInt(options.outputSlotOffset) || modelDimensions?.inputCount || inferOutputSlotOffset(cards, inputCount) || inputCount;

  return { inputCount, outputCount, outputSlotOffset };
}

function stripInternalCardFields(card) {
  const { streamInfo, ...cleanCard } = card;
  return cleanCard;
}

function parseRoutes(raw, options = {}) {
  const routes = { video: {}, audio: {}, usb: {} };
  const outputCount = toPositiveInt(options.outputCount);
  const outputSlotOffset = toPositiveInt(options.outputSlotOffset) || 16;
  const inputSlotMap = options.inputSlotMap || {};
  const outputSlotMap = options.outputSlotMap || {};

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

    const outNum = outputSlotMap[slotNum] || (slotNum - outputSlotOffset);
    if (outNum < 1) continue;
    if (outputCount && outNum > outputCount) continue;

    const videoMatch = body.match(/Video\s+Routed\s+From\s+Input\s+Card\s+at\s+slot\s+(\d+)/i);
    if (videoMatch) {
      const inSlot = parseInt(videoMatch[1], 10);
      routes.video[outNum] = inputSlotMap[inSlot] || inSlot;
    }

    const audioMatch = body.match(/Audio\s+Routed\s+From\s+Input\s+Card\s+at\s+slot\s+(\d+)/i);
    if (audioMatch) {
      const inSlot = parseInt(audioMatch[1], 10);
      routes.audio[outNum] = inputSlotMap[inSlot] || inSlot;
    }

    const usbMatch = body.match(/USB\s+Host\s+Routed\s+to\s+Card\s+at\s+slot\s+(\d+)/i);
    if (usbMatch) {
      const inSlot = parseInt(usbMatch[1], 10);
      routes.usb[outNum] = inputSlotMap[inSlot] || inSlot;
    }
  }

  return routes;
}

function parseCards(raw, options = {}) {
  const baseCards = [];
  const lines = raw.split('\n');

  for (const line of lines) {
    // Format: "  1: DMC-4K-HD HDMI 4K Input Card [v1.2911.00108, #00EB3249] Stream:b0.0"
    const match = line.match(/^\s*(\d+):\s+(\S+)\s+(.+?)(?:\s+\[v([\d.]+),\s*#([A-Fa-f0-9]+)\])?\s*(?:Stream:(\S+))?$/);
    if (match) {
      const slot = parseInt(match[1]);
      const type = match[2];
      const description = match[3].trim();
      const stream = match[6] || null;

      baseCards.push({
        slot,
        type,
        description,
        firmware: match[4] || null,
        serial: match[5] || null,
        stream,
        streamInfo: parseStreamPort(stream),
      });
    }
  }

  const layout = resolveCardLayout(baseCards, options);
  const cards = baseCards.map((card) => {
    let role = 'system';
    let portNum = null;

    if (card.streamInfo) {
      role = card.streamInfo.role;
      portNum = card.streamInfo.portNum;
    } else if (card.slot >= 1 && card.slot <= layout.inputCount) {
      role = 'input';
      portNum = card.slot;
    } else if (card.slot > layout.outputSlotOffset && card.slot <= layout.outputSlotOffset + layout.outputCount) {
      role = 'output';
      portNum = card.slot - layout.outputSlotOffset;
    }

    return stripInternalCardFields({
      ...card,
      role,
      portNum,
    });
  });

  return {
    cards,
    raw,
    inputCount: layout.inputCount,
    outputCount: layout.outputCount,
    outputSlotOffset: layout.outputSlotOffset,
  };
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

function buildDeviceCapabilities({ version = {}, cards = {}, prompt = null } = {}) {
  const model = version.model || String(prompt || '').replace(/>$/, '') || null;
  const parsedCards = Array.isArray(cards.cards)
    ? cards
    : parseCards(cards.raw || '', { model, prompt });

  const inputSlotMap = {};
  const outputSlotMap = {};

  for (const card of parsedCards.cards || []) {
    if (card.role === 'input' && card.portNum != null) {
      inputSlotMap[card.slot] = card.portNum;
    }
    if (card.role === 'output' && card.portNum != null) {
      outputSlotMap[card.slot] = card.portNum;
    }
  }

  return {
    model,
    firmware: version.firmware || null,
    serial: version.serial || null,
    prompt: prompt || null,
    inputCount: parsedCards.inputCount || null,
    outputCount: parsedCards.outputCount || null,
    outputSlotOffset: parsedCards.outputSlotOffset || null,
    inputSlotMap,
    outputSlotMap,
    cards: parsedCards.cards || [],
    raw: {
      version: version.raw || '',
      cards: parsedCards.raw || '',
    },
  };
}

module.exports = {
  parseModelDimensions,
  parseRoutes,
  parseCards,
  parseEdid,
  parseHdcp,
  parseNetwork,
  parseVersion,
  parseErrLog,
  parseUptime,
  parseMemory,
  parseTop,
  buildDeviceCapabilities
};
