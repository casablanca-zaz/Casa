import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.join(__dirname, '../../data/wl-role.json');

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_ACCOUNT_DAYS = 50;

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

export function getWlConfig(guildId) {
  return readConfig()[guildId] || null;
}

export function setWlConfig(guildId, data) {
  const config = readConfig();
  config[guildId] = { ...(config[guildId] || {}), ...data };
  writeConfig(config);
}

function accountAgeDays(user) {
  return (Date.now() - user.createdTimestamp) / DAY_MS;
}

export async function handleWlMessage(message) {
  if (!message.guild || message.author.bot) return;

  const cfg = getWlConfig(message.guild.id);
  if (!cfg?.enabled || !cfg.channelId || !cfg.roleId) return;

  // Solo en el canal configurado
  if (message.channel.id !== cfg.channelId) return;

  const content = message.content.trim().toLowerCase();
  if (content !== 'wl') return;

  const member = message.member;
  if (!member) return;

  const successEmoji = cfg.successEmoji || '✅';
  const youngEmoji = cfg.youngEmoji || '⚠️';
  const age = accountAgeDays(message.author);

  try {
    // Cuenta nueva (< 50 días): NO da el rol, solo ⚠️ + DM
    if (age < MIN_ACCOUNT_DAYS) {
      await message.react(youngEmoji).catch(() => {});

      const dmText =
        'Hola caballero, su cuenta tiene menos de 50 días de creada. ' +
        'Suba a sala de espera para que le puedan verificar la identidad ' +
        'y que no sea alguien spoofeado. Espero comprendas que esto es parte del sistema de antispoof.';

      await message.author.send(dmText).catch(() => {
        message.channel
          .send({
            content: `${message.author}, no pude enviarte DM. Ábrelos o ve a sala de espera para verificación (cuenta nueva).`,
          })
          .catch(() => {});
      });
      return;
    }

    // Cuenta OK (≥ 50 días): da el rol + ✅
    if (!member.roles.cache.has(cfg.roleId)) {
      await member.roles.add(cfg.roleId);
    }
    await message.react(successEmoji).catch(() => {});
  } catch (err) {
    console.error('[wlRole]', err.message);
    await message
      .reply({
        content:
          'No pude darte el rol. Revisa que el rol del bot esté **por encima** del rol WL.',
      })
      .catch(() => {});
  }
}
