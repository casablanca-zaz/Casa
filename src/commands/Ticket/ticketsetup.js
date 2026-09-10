import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
} from 'discord.js';
import {
  sendTicketPanel,
  setTicketFeedbackChannel,
  setTicketLogsChannel,
} from '../../features/wisxoTicket.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ticketsetup')
    .setDescription('Configura panel, feedback y logs de tickets')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((opt) =>
      opt
        .setName('panel')
        .setDescription('Canal donde se enviará el embed para abrir tickets')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addChannelOption((opt) =>
      opt
        .setName('logs')
        .setDescription('Canal de logs (quién creó / reclamó / cerró)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addChannelOption((opt) =>
      opt
        .setName('feedback')
        .setDescription('Canal de calificaciones (estrellas) — opcional')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addStringOption((opt) =>
      opt
        .setName('imagen')
        .setDescription('Link de la imagen del panel (opcional)')
        .setRequired(false)
    ),

  category: 'Ticket',

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const panelChannel = interaction.options.getChannel('panel');
      const logsChannel = interaction.options.getChannel('logs');
      const feedbackChannel = interaction.options.getChannel('feedback');
      const imageUrl = interaction.options.getString('imagen');

      await setTicketLogsChannel(interaction.guild.id, logsChannel.id);

      if (feedbackChannel) {
        await setTicketFeedbackChannel(interaction.guild.id, feedbackChannel.id);
      }

      await sendTicketPanel(panelChannel, imageUrl);

      const fields = [
        { name: '📌 Panel', value: `${panelChannel}`, inline: true },
        { name: '📋 Logs', value: `${logsChannel}`, inline: true },
      ];

      if (feedbackChannel) {
        fields.push({
          name: '⭐ Feedback',
          value: `${feedbackChannel}`,
          inline: true,
        });
      } else {
        fields.push({
          name: '⭐ Feedback',
          value: '`No configurado`',
          inline: true,
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setAuthor({ name: 'zip' })
        .setTitle('Tickets configurados')
        .setDescription('El sistema de tickets quedó listo.')
        .addFields(fields)
        .setFooter({ text: 'Powered by Casa' });

      if (imageUrl) embed.setImage(imageUrl);

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('[ticketsetup] Error:', error);
      await interaction
        .editReply({
          content: `❌ Error:\n\`\`\`${error?.message || error}\`\`\``,
        })
        .catch(() => {});
    }
  },
};
