import { Client, type Slot } from 'resonitelink.js';

const client = new Client({
  // Don't forget to change this! This is different every time you enable ResoniteLink
  port: 56795,
});

// Emitted when connected to ResoniteLink
client.on('connected', async () => {
  console.log('Connected to ResoniteLink!');

  const printSlot = (slots: Slot[], depth?: number) => {
    for (const slot of slots) {
      console.log('  '.repeat(depth ?? 0) + `${slot.name.value} (${slot.id})`);
      printSlot(slot.children ?? [], (depth ?? 0) + 1);
    }
  };

  // Getting a Slot
  console.log('Getting Root Slot:');
  const rootSlot = (await client.getSlot('Root'))!;
  printSlot([rootSlot.encode()]);

  for (const slot of rootSlot.childrens) {
    if (!slot.name.startsWith('User <noparse=')) {
      continue;
    }
    console.log(`Detecting user slot: ${slot.name} (${slot.id})`);
    const userSlot = await client.getSlot(slot.id);
    printSlot(userSlot?.childrens.map(c => c.encode()) ?? [], 1);
    const badgeTemplateSlot = userSlot?.childrens.find(
      s => s.name === 'Badge Templates'
    );
    if (!badgeTemplateSlot) {
      console.log('  No Badge Templates slot found, skipping...');
      continue;
    }

    const badgeSlots = await client.getSlot(badgeTemplateSlot.id);
    if (!badgeSlots) {
      console.log('    Failed to get Badge Templates slot, skipping...');
      continue;
    }
    console.log('  Found Badge Templates slot: ' + badgeTemplateSlot.id);

    // each badge
    for (const badgeSlot of badgeSlots.childrens) {
      const badge = await client.getSlot(badgeSlot.id);
      if (!badge) {
        console.log('    Failed to get badge slot, skipping...');
        continue;
      }
      const staticTexture2D = badge.components
        .map(c => c.encode())
        .find(
          c => c.componentType === '[FrooxEngine]FrooxEngine.StaticTexture2D'
        );
      if (!staticTexture2D) {
        console.log('    No StaticTexture2D component found, skipping...');
        continue;
      }
      const componentData = await client.getComponent(staticTexture2D.id);
      if (!componentData) {
        console.log(
          '    Failed to get StaticTexture2D component data, skipping...'
        );
        continue;
      }
      const members = componentData.members['URL'];
      if (members.$type !== 'Uri') {
        console.log('    URL member is not of type Uri, skipping...');
        continue;
      }
      console.log(
        '    Badge Texture URL: ' + badgeSlot.name + ' - ' + members.value
      );
    }
  }

  console.log('Done!');
  client.disconnect();
});

client.connect();
