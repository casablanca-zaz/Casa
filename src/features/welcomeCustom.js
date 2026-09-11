import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.join(__dirname, '../../data/welcome-custom.json');

function ensureConfigFile() {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(CONFIG_PATH)) fs.writeFileSync(CONFIG_PATH, '{}', 'utf8');
}

function readConfig() {
  try {
    ensureConfigFile();
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8') || '{}');
  } catch {
    return {};
  }
}

function writeConfig(data) {
  ensureConfigFile();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf8');
}

export function getWelcomeConfig(guildId) {
  return readConfig()[guildId] || null;
}

export function setWelcomeConfig(guildId, data) {
  const config = readConfig();
  config[guildId] = { ...(config[guildId] || {}), ...data };
  writeConfig(config);
}

function formatMessage(template, member) {
  return (template || 'Bienvenido {user} a {server}!')
    .replace(/{user}/g, `${member}`)
    .replace(/{username}/g, member.user.username)
    .replace(/{server}/g, member.guild.name)
    .replace(/{memberCount}/g, String(member.guild.memberCount));
}

export async function handleCustomWelcome(member) {
  const cfg = getWelcomeConfig(member.guild.id);
  if (!cfg?.enabled || !cfg.channelId) return;

  const channel =
    member.guild.channels.cache.get(cfg.channelId) ||
    (await member.guild.channels.fetch(cfg.channelId).catch(() => null));

  if (!channel?.isTextBased?.()) return;

  const me = member.guild.members.me;
  const perms = channel.permissionsFor(me);
  if (
    !perms?.has([
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
    ])
  ) {
    return;
  }

  const text = formatMessage(cfg.message, member);
  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setAuthor({
      name: member.guild.name,
      iconURL: member.guild.iconURL({ size: 128 }) || undefined,
    })
    .setTitle('¡Bienvenido!')
    .setDescription(text)
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setTimestamp()
    .setFooter({ text: 'Powered by Casa' });

  if (cfg.imageUrl) {
    embed.setImage(cfg.imageUrl);
  }

  const content = cfg.ping ? `${member}` : undefined;

  await channel.send({ content, embeds: [embed] }).catch((err) => {
    console.error('[welcomeCustom]', err.message);
  });
}
