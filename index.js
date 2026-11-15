/**
 * Discord Server Cloner
 * -----------------------------------------
 * Clones roles, categories, channels, and permission overwrites
 * from a source guild to a target guild using discord.js v14.
 */

const {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionsBitField,
} = require('discord.js');
require('dotenv').config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const SOURCE_GUILD_ID = process.env.SOURCE_GUILD_ID;
const TARGET_GUILD_ID = process.env.TARGET_GUILD_ID;
const CLEAN_TARGET_FIRST = process.env.CLEAN_TARGET_FIRST === 'true';

// Delay between API calls to prevent Discord 429 rate limit errors
const RATE_LIMIT_DELAY = 600;

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

function log(level, msg) {
  const time = new Date().toLocaleTimeString('tr-TR');
  console.log(`[${time}] [${level}] ${msg}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function cleanTargetGuild(guild) {
  log('INFO', 'Hedef sunucu temizligi baslatildi (CLEAN_TARGET_FIRST = true)...');

  // Kanallari sil
  const channels = await guild.channels.fetch();
  for (const channel of channels.values()) {
    if (!channel) continue;
    try {
      await channel.delete('Temiz klonlama oncesi kanal silindi.');
      log('INFO', `Kanal silindi: #${channel.name}`);
      await sleep(RATE_LIMIT_DELAY);
    } catch (err) {
      log('WARN', `Kanal silinemedi (#${channel.name}): ${err.message}`);
    }
  }

  // Rolleri sil (bot rolleri ve @everyone haric)
  const roles = await guild.roles.fetch();
  for (const role of roles.values()) {
    if (role.name === '@everyone' || role.managed) continue;
    try {
      await role.delete('Temiz klonlama oncesi rol silindi.');
      log('INFO', `Rol silindi: @${role.name}`);
      await sleep(RATE_LIMIT_DELAY);
    } catch (err) {
      log('WARN', `Rol silinemedi (@${role.name}): ${err.message}`);
    }
  }

  log('SUCCESS', 'Hedef sunucu temizligi tamamlandi.');
}

function buildPermissionOverwrites(sourceOverwrites, roleMap, targetGuild) {
  const result = [];

  for (const overwrite of sourceOverwrites.values()) {
    // Yalnizca rol bazli izinler aktarilir
    if (overwrite.type !== 0) continue; // 0 = OverwriteType.Role

    let targetRoleId = null;
    if (overwrite.id === overwrite.channel.guild.id) {
      targetRoleId = targetGuild.roles.everyone.id;
    } else {
      targetRoleId = roleMap.get(overwrite.id);
    }

    if (!targetRoleId) continue;

    result.push({
      id: targetRoleId,
      allow: new PermissionsBitField(overwrite.allow),
      deny: new PermissionsBitField(overwrite.deny),
      type: 0,
    });
  }

  return result;
}

async function cloneServer() {
  if (!BOT_TOKEN) {
    log('ERROR', '.env dosyasinda BOT_TOKEN tanimli degil.');
    return;
  }
  if (!SOURCE_GUILD_ID || !TARGET_GUILD_ID) {
    log('ERROR', 'SOURCE_GUILD_ID veya TARGET_GUILD_ID eksik.');
    return;
  }
  if (SOURCE_GUILD_ID === TARGET_GUILD_ID) {
    log('ERROR', 'Kaynak sunucu ve hedef sunucu ID bilgileri ayni olamaz.');
    return;
  }

  log('INFO', 'Sunucu bilgileri aliniyor...');
  const sourceGuild = await client.guilds.fetch(SOURCE_GUILD_ID).catch(() => null);
  const targetGuild = await client.guilds.fetch(TARGET_GUILD_ID).catch(() => null);

  if (!sourceGuild) {
    log('ERROR', `Kaynak sunucu bulunamadi (ID: ${SOURCE_GUILD_ID}). Bot bu sunucuda ekli mi?`);
    return;
  }
  if (!targetGuild) {
    log('ERROR', `Hedef sunucu bulunamadi (ID: ${TARGET_GUILD_ID}). Bot bu sunucuda ekli mi?`);
    return;
  }

  log('INFO', `Kaynak Sunucu: "${sourceGuild.name}" (${sourceGuild.id})`);
  log('INFO', `Hedef Sunucu:  "${targetGuild.name}" (${targetGuild.id})`);

  if (CLEAN_TARGET_FIRST) {
    await cleanTargetGuild(targetGuild);
  }

  // 1. ADIM: ROLLER
  log('INFO', '--- [1/3] Roller aktariliyor ---');
  const sourceRoles = await sourceGuild.roles.fetch();
  const targetRoles = await targetGuild.roles.fetch();

  try {
    await targetGuild.roles.everyone.setPermissions(
      sourceGuild.roles.everyone.permissions,
      'Kaynak sunucudan @everyone izinleri kopyalandi'
    );
    log('SUCCESS', '@everyone izinleri guncellendi.');
  } catch (err) {
    log('WARN', `@everyone izinleri guncellenemedi: ${err.message}`);
  }

  const roleMap = new Map();
  roleMap.set(sourceGuild.id, targetGuild.id);

  const sortedSourceRoles = Array.from(sourceRoles.values())
    .filter((r) => r.name !== '@everyone' && !r.managed)
    .sort((a, b) => a.position - b.position);

  let rolesCreated = 0;
  let rolesUpdated = 0;

  for (const sRole of sortedSourceRoles) {
    try {
      let tRole = targetRoles.find((r) => r.name === sRole.name && !r.managed);

      if (!tRole) {
        tRole = await targetGuild.roles.create({
          name: sRole.name,
          color: sRole.color,
          hoist: sRole.hoist,
          permissions: sRole.permissions,
          mentionable: sRole.mentionable,
          reason: 'Klonlama: Yeni rol olusturuldu',
        });
        rolesCreated++;
        log('SUCCESS', `Rol olusturuldu: @${tRole.name}`);
      } else {
        await tRole.edit({
          color: sRole.color,
          hoist: sRole.hoist,
          permissions: sRole.permissions,
          mentionable: sRole.mentionable,
          reason: 'Klonlama: Mevcut rol guncellendi',
        });
        rolesUpdated++;
        log('INFO', `Rol guncellendi: @${tRole.name}`);
      }

      roleMap.set(sRole.id, tRole.id);
      await sleep(RATE_LIMIT_DELAY);
    } catch (err) {
      log('WARN', `Rol aktarilamadi (@${sRole.name}): ${err.message}`);
    }
  }

  log('INFO', `Rol islemleri tamamlandi. Olusturulan: ${rolesCreated}, Guncellenen: ${rolesUpdated}`);

  // 2. ADIM: KATEGORILER
  log('INFO', '--- [2/3] Kategoriler aktariliyor ---');
  const sourceChannels = await sourceGuild.channels.fetch();
  const targetChannels = await targetGuild.channels.fetch();

  const categoryMap = new Map();

  const sourceCategories = Array.from(sourceChannels.values())
    .filter((c) => c && c.type === ChannelType.GuildCategory)
    .sort((a, b) => a.position - b.position);

  for (const cat of sourceCategories) {
    try {
      const overwrites = buildPermissionOverwrites(cat.permissionOverwrites.cache, roleMap, targetGuild);

      let tCat = targetChannels.find(
        (c) => c && c.type === ChannelType.GuildCategory && c.name === cat.name
      );

      if (!tCat) {
        tCat = await targetGuild.channels.create({
          name: cat.name,
          type: ChannelType.GuildCategory,
          position: cat.position,
          permissionOverwrites: overwrites,
          reason: 'Klonlama: Kategori olusturuldu',
        });
        log('SUCCESS', `Kategori olusturuldu: [${tCat.name}]`);
      } else {
        await tCat.permissionOverwrites.set(overwrites);
        log('INFO', `Kategori izinleri guncellendi: [${tCat.name}]`);
      }

      categoryMap.set(cat.id, tCat.id);
      await sleep(RATE_LIMIT_DELAY);
    } catch (err) {
      log('WARN', `Kategori aktarilamadi ([${cat.name}]): ${err.message}`);
    }
  }

  // 3. ADIM: KANALLAR
  log('INFO', '--- [3/3] Kanallar aktariliyor ---');

  const regularChannels = Array.from(sourceChannels.values())
    .filter((c) => c && c.type !== ChannelType.GuildCategory && !c.isThread?.())
    .sort((a, b) => a.position - b.position);

  let channelsCreated = 0;

  for (const channel of regularChannels) {
    try {
      const targetParentId = channel.parentId ? categoryMap.get(channel.parentId) || null : null;
      const overwrites = buildPermissionOverwrites(channel.permissionOverwrites.cache, roleMap, targetGuild);

      const allowedTypes = [
        ChannelType.GuildText,
        ChannelType.GuildVoice,
        ChannelType.GuildAnnouncement,
        ChannelType.GuildStageVoice,
        ChannelType.GuildForum,
      ];

      if (!allowedTypes.includes(channel.type)) {
        continue;
      }

      const channelData = {
        name: channel.name,
        type: channel.type,
        parent: targetParentId,
        permissionOverwrites: overwrites,
        position: channel.position,
        reason: 'Klonlama: Kanal olusturuldu',
      };

      if (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement) {
        channelData.topic = channel.topic || undefined;
        channelData.nsfw = channel.nsfw || false;
        channelData.rateLimitPerUser = channel.rateLimitPerUser || undefined;
      }

      if (channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice) {
        channelData.userLimit = channel.userLimit || undefined;
        const maxBitrate = targetGuild.maximumBitrate || 96000;
        channelData.bitrate = Math.min(channel.bitrate || 64000, maxBitrate);
      }

      const newChannel = await targetGuild.channels.create(channelData);
      channelsCreated++;
      log('SUCCESS', `Kanal olusturuldu: #${newChannel.name} (Tip: ${channel.type})`);

      await sleep(RATE_LIMIT_DELAY);
    } catch (err) {
      log('WARN', `Kanal aktarilamadi (#${channel.name}): ${err.message}`);
    }
  }

  log('INFO', '------------------------------------------');
  log('SUCCESS', 'Sunucu klonlama islemi basariyla tamamlandi.');
  log('INFO', `Toplam Aktarilan Rol Sayisi:     ${rolesCreated + rolesUpdated}`);
  log('INFO', `Toplam Aktarilan Kategori:      ${categoryMap.size}`);
  log('INFO', `Toplam Aktarilan Kanal Sayisi:   ${channelsCreated}`);
  log('INFO', '------------------------------------------');
}

client.once('clientReady', async () => {
  log('INFO', `Bot oturum acti: ${client.user.tag}`);
  try {
    await cloneServer();
  } catch (err) {
    console.error('Kritik Hata:', err);
  } finally {
    log('INFO', 'Islem tamamlandi, bot baglantisi kapatiliyor.');
    client.destroy();
    process.exit(0);
  }
});

client.login(BOT_TOKEN);
