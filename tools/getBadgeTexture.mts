import { ResoniteLink, type Slot } from '@eth0fox/tsrl';
import { WebSocket } from 'ws';

// Don't forget to change this! This is different every time you enable ResoniteLink
const PORT = 49210;

let link: ResoniteLink;
try {
  link = await ResoniteLink.connect(`ws://localhost:${PORT}`, WebSocket as any);
} catch (e) {
  const msg = e != null && typeof e === 'object' && 'message' in e ? String((e as any).message) : String(e);
  console.error(`Failed to connect to ResoniteLink on port ${PORT}: ${msg}`);
  console.error('Make sure Resonite is running and ResoniteLink is enabled (Session tab > Enable ResoniteLink).');
  process.exit(1);
}
console.log('Connected to ResoniteLink!');

const printSlot = (slots: Slot[], depth?: number) => {
  for (const slot of slots) {
    if (slot.isReferenceOnly) continue;
    console.log('  '.repeat(depth ?? 0) + `${slot.name.value} (${slot.id})`);
    printSlot(slot.children ?? [], (depth ?? 0) + 1);
  }
};

// Getting a Slot
console.log('Getting Root Slot:');
const rootSlot = await link.slotGet('Root', true, 1);
printSlot([rootSlot]);

for (const slot of rootSlot.isReferenceOnly ? [] : rootSlot.children) {
  if (!slot.isReferenceOnly && !slot.name.value.startsWith('User <noparse=')) {
    continue;
  }
  const slotName = slot.isReferenceOnly ? slot.id : slot.name.value;
  console.log(`Detecting user slot: ${slotName} (${slot.id})`);

  const userSlot = await link.slotGet(slot.id, true, 1);
  printSlot(userSlot.isReferenceOnly ? [] : userSlot.children, 1);

  const badgeTemplateSlot = userSlot.isReferenceOnly
    ? undefined
    : userSlot.children.find(
        s => !s.isReferenceOnly && s.name.value === 'Badge Templates'
      );
  if (!badgeTemplateSlot) {
    console.log('  No Badge Templates slot found, skipping...');
    continue;
  }

  const badgeSlots = await link.slotGet(badgeTemplateSlot.id, true, 1);
  if (badgeSlots.isReferenceOnly) {
    console.log('    Failed to get Badge Templates slot, skipping...');
    continue;
  }
  console.log('  Found Badge Templates slot: ' + badgeTemplateSlot.id);

  // each badge
  for (const badgeSlot of badgeSlots.children) {
    const badge = await link.slotGet(badgeSlot.id, true, 1);
    if (badge.isReferenceOnly) {
      console.log('    Failed to get badge slot, skipping...');
      continue;
    }
    const staticTexture2D = badge.components.find(
      c => c.componentType === '[FrooxEngine]FrooxEngine.StaticTexture2D'
    );
    if (!staticTexture2D) {
      console.log('    No StaticTexture2D component found, skipping...');
      continue;
    }
    const componentData = await link.componentGet(staticTexture2D.id);
    if (componentData.isReferenceOnly) {
      console.log(
        '    Failed to get StaticTexture2D component data, skipping...'
      );
      continue;
    }
    const members = componentData.members['URL'];
    if (Array.isArray(members) || members.$type !== 'Uri') {
      console.log('    URL member is not of type Uri, skipping...');
      continue;
    }
    const badgeSlotName = badgeSlot.isReferenceOnly
      ? badgeSlot.id
      : badgeSlot.name.value;
    console.log(
      '    Badge Texture URL: ' + badgeSlotName + ' - ' + members.value
    );
  }
}

console.log('Done!');
