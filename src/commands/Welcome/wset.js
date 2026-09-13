import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
} from 'discord.js';
import {
  setWelcomeConfig,
  getWelcomeConfig,
  handleCustomWelcome,
} from '../../features/welcomeCustom.js';

export default {
  data: new SlashCommandBuilder()
    .setName('wset')
    .setDescription('Configura la bienvenida con imagen')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName('on')
        .setDescription('Activa la bienvenida')
        .addChannelOption((opt) =>
          opt
            .setName('canal')
            .setDescription('Canal de bienvenida')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('mensaje')
            .setDescription('{user} {username} {server} {memberCount}')
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName('imagen')
            .setDescription('Link de la imagen')
            .setRequired(false)
        )
        .addBooleanOption((opt) =>
          opt
            .setName('ping')
            .setDescription('Mencionar al usuario')
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('off').setDescription('Apaga la bienvenida')
    )
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('Ver configuración')
    )
    .addSubcommand((sub) =>
      sub.setName('test').setDescription('Probar la bienvenida')
    ),

  category: 'Welcome',

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'on') {
      const channel = interaction.options.getChannel('canal');
      const mensaje =
        interaction.options.getString('mensaje') ||
        'Bienvenido {user} a **{server}**! Ahora somos {memberCount} miembros.';
      const imagen = interaction.options.getString('imagen');
      const ping = interaction.options.getBoolean('ping') ?? true;

      setWelcomeConfig(guildId, {
        enabled: true,
        channelId: channel.id,
        message: mensaje,
        imageUrl: imagen || null,
        ping,
      });

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle('Bienvenida activada')
            .addFields(
              { name: 'Canal', value: `${channel}`, inline: true },
              { name: 'Ping', value: ping ? 'Sí' : 'No', inline: true },
              { name: 'Mensaje', value: mensaje },
              {
                name: 'Imagen',
                value: imagen ? `[Ver](${imagen})` : '`Sin imagen`',
              }
            ),
        ],
      });
    }

    if (sub === 'off') {
      setWelcomeConfig(guildId, { enabled: false });
      return interaction.editReply({ content: 'Bienvenida desactivada.' });
    }

    if (sub === 'status') {
      const cfg = getWelcomeConfig(guildId);
      if (!cfg?.enabled) {
        return interaction.editReply({ content: 'Bienvenida **apagada**.' });
      }
      return interaction.editReply({
        content:
          `Activa\nCanal: <#${cfg.channelId}>\nPing: ${cfg.ping ? 'Sí' : 'No'}\n` +
          `Mensaje: ${cfg.message || 'default'}\nImagen: ${cfg.imageUrl || 'ninguna'}`,
      });
    }

    if (sub === 'test') {
      await handleCustomWelcome(interaction.member);
      return interaction.editReply({
        content: 'Mensaje de prueba enviado.',
      });
    }
  },
};
