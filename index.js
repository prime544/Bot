const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder
} = require("discord.js");

const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildInvites
  ],
  partials: [
    Partials.Channel,
    Partials.GuildMember,
    Partials.User
  ]
});

const PREFIX = "!";

const COLORS = {
  primary: 0x8b5cf6,
  success: 0x22c55e,
  danger: 0xef4444,
  warning: 0xf59e0b
};

const DATA_FILE = "./data.json";

let data = {};

if (fs.existsSync(DATA_FILE)) {
  try {
    data = JSON.parse(
      fs.readFileSync(DATA_FILE, "utf8")
    );
  } catch {
    data = {};
  }
}

function saveData() {
  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify(data, null, 2)
  );
}

function getGuild(guildId) {
  if (!data[guildId]) {
    data[guildId] = {
      welcome: {
        enabled: false,
        channel: null
      },

      leave: {
        enabled: false,
        channel: null
      },

      suggestion: {
        enabled: false,
        channel: null
      },

      clan: {
        channel: null,
        active: false,
        message: null,
        clans: {}
      },

      voice: {
        category: null
      },

      ticket: {
        category: null,
        panelChannel: null
      }
    };

    saveData();
  }

  return data[guildId];
}

function isAdmin(member) {
  return member.permissions.has(
    PermissionFlagsBits.Administrator
  );
}

async function safeReply(interaction, options) {
  try {
    if (
      interaction.replied ||
      interaction.deferred
    ) {
      return await interaction.followUp(options);
    }

    return await interaction.reply(options);
  } catch {}
}

client.once("ready", () => {
  console.log(
    `✅ ${client.user.tag} aktif!`
  );
});

client.on("error", error => {
  console.error(
    "Discord Client Hatası:",
    error
  );
});
// ============================================================
// ADMIN PANEL
// ============================================================

async function sendAdminPanel(message) {

  if (!isAdmin(message.member)) {
    return message.reply(
      "❌ Bu paneli sadece yöneticiler kullanabilir."
    );
  }

  const embed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle("⚙️ LynoxNetwork Yönetim Paneli")
    .setDescription(
      [
        "Sunucu sistemlerini buradan yönetebilirsin.",
        "",
        "🎫 Ticket",
        "🏆 Klan",
        "👋 Giriş / Çıkış",
        "💡 Öneri",
        "🔊 Ses Kanalları"
      ].join("\n")
    );

  const row = new ActionRowBuilder()
    .addComponents(

      new ButtonBuilder()
        .setCustomId("panel_ticket")
        .setLabel("Ticket")
        .setEmoji("🎫")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("panel_clan")
        .setLabel("Klan")
        .setEmoji("🏆")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("panel_welcome")
        .setLabel("Giriş / Çıkış")
        .setEmoji("👋")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("panel_suggestion")
        .setLabel("Öneri")
        .setEmoji("💡")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("panel_voice")
        .setLabel("Ses")
        .setEmoji("🔊")
        .setStyle(ButtonStyle.Secondary)

    );

  await message.reply({
    embeds: [embed],
    components: [row]
  });
}


// ============================================================
// !PANEL
// ============================================================

client.on("messageCreate", async message => {

  if (message.author.bot) return;
  if (!message.guild) return;

  const command =
    message.content.trim().toLowerCase();

  if (command !== `${PREFIX}panel`) return;

  await sendAdminPanel(message);
});


// ============================================================
// ANA PANEL BUTONLARI
// ============================================================

client.on("interactionCreate", async interaction => {

  if (!interaction.isButton()) return;

  if (!interaction.guild) return;

  if (!isAdmin(interaction.member)) {

    return safeReply(interaction, {
      content:
        "❌ Bu paneli sadece yöneticiler kullanabilir.",
      ephemeral: true
    });

  }

  // ----------------------------------------------------------
  // TICKET
  // ----------------------------------------------------------

  if (
    interaction.customId === "panel_ticket"
  ) {

    const embed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle("🎫 Ticket Ayarları")
      .setDescription(
        "Ticket sistemi ayarlarını buradan yapabilirsin."
      );

    const row =
      new ActionRowBuilder()
        .addComponents(

          new ButtonBuilder()
            .setCustomId("ticket_category")
            .setLabel("Kategori Seç")
            .setEmoji("📂")
            .setStyle(ButtonStyle.Primary),

          new ButtonBuilder()
            .setCustomId("ticket_panel_channel")
            .setLabel("Panel Kanalı")
            .setEmoji("🎫")
            .setStyle(ButtonStyle.Primary),

          new ButtonBuilder()
            .setCustomId("panel_back")
            .setLabel("Geri")
            .setEmoji("↩️")
            .setStyle(ButtonStyle.Secondary)

        );

    return interaction.update({
      embeds: [embed],
      components: [row]
    });
  }


  // ----------------------------------------------------------
  // KLAN
  // ----------------------------------------------------------

  if (
    interaction.customId === "panel_clan"
  ) {

    const guild = getGuild(
      interaction.guild.id
    );

    const clanCount =
      Object.keys(guild.clan.clans).length;

    const embed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle("🏆 Klan Sistemi")
      .setDescription(
        [
          `🗳️ Oylama kanalı: ${
            guild.clan.channel
              ? `<#${guild.clan.channel}>`
              : "❌ Seçilmedi"
          }`,
          `📊 Durum: ${
            guild.clan.active
              ? "🟢 Aktif"
              : "🔴 Kapalı"
          }`,
          `🏆 Klan sayısı: ${clanCount}`
        ].join("\n")
      );

    const row =
      new ActionRowBuilder()
        .addComponents(

          new ButtonBuilder()
            .setCustomId("clan_channel")
            .setLabel("Oylama Kanalı")
            .setEmoji("🗳️")
            .setStyle(ButtonStyle.Primary),

          new ButtonBuilder()
            .setCustomId("clan_start")
            .setLabel("Oylamayı Başlat")
            .setEmoji("▶️")
            .setStyle(ButtonStyle.Success),

          new ButtonBuilder()
            .setCustomId("clan_add")
            .setLabel("Klan Ekle")
            .setEmoji("➕")
            .setStyle(ButtonStyle.Primary),

          new ButtonBuilder()
            .setCustomId("clan_reset")
            .setLabel("Sıfırla")
            .setEmoji("🔄")
            .setStyle(ButtonStyle.Danger),

          new ButtonBuilder()
            .setCustomId("panel_back")
            .setLabel("Geri")
            .setEmoji("↩️")
            .setStyle(ButtonStyle.Secondary)

        );

    return interaction.update({
      embeds: [embed],
      components: [row]
    });
  }


  // ----------------------------------------------------------
  // SES
  // ----------------------------------------------------------

  if (
    interaction.customId === "panel_voice"
  ) {

    const guild = getGuild(
      interaction.guild.id
    );

    const embed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle("🔊 Ses Kanalı Yönetimi")
      .setDescription(
        `📂 Kategori: ${
          guild.voice.category
            ? `<#${guild.voice.category}>`
            : "❌ Seçilmedi"
        }`
      );

    const row =
      new ActionRowBuilder()
        .addComponents(

          new ButtonBuilder()
            .setCustomId("voice_category")
            .setLabel("Kategori Seç")
            .setEmoji("📂")
            .setStyle(ButtonStyle.Primary),

          new ButtonBuilder()
            .setCustomId("voice_create")
            .setLabel("Ses Kanalı Oluştur")
            .setEmoji("🔊")
            .setStyle(ButtonStyle.Success),

          new ButtonBuilder()
            .setCustomId("panel_back")
            .setLabel("Geri")
            .setEmoji("↩️")
            .setStyle(ButtonStyle.Secondary)

        );

    return interaction.update({
      embeds: [embed],
      components: [row]
    });
  }


  // ----------------------------------------------------------
  // GERİ
  // ----------------------------------------------------------

  if (
    interaction.customId === "panel_back"
  ) {

    const embed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle("⚙️ LynoxNetwork Yönetim Paneli")
      .setDescription(
        "Bir sistem seç."
      );

    const row =
      new ActionRowBuilder()
        .addComponents(

          new ButtonBuilder()
            .setCustomId("panel_ticket")
            .setLabel("Ticket")
            .setEmoji("🎫")
            .setStyle(ButtonStyle.Primary),

          new ButtonBuilder()
            .setCustomId("panel_clan")
            .setLabel("Klan")
            .setEmoji("🏆")
            .setStyle(ButtonStyle.Primary),

          new ButtonBuilder()
            .setCustomId("panel_welcome")
            .setLabel("Giriş / Çıkış")
            .setEmoji("👋")
            .setStyle(ButtonStyle.Success),

          new ButtonBuilder()
            .setCustomId("panel_suggestion")
            .setLabel("Öneri")
            .setEmoji("💡")
            .setStyle(ButtonStyle.Secondary),

          new ButtonBuilder()
            .setCustomId("panel_voice")
            .setLabel("Ses")
            .setEmoji("🔊")
            .setStyle(ButtonStyle.Secondary)

        );

    return interaction.update({
      embeds: [embed],
      components: [row]
    });
  }

});
// ============================================================
// 3/10 - KANAL SEÇİMLERİ + GİRİŞ/ÇIKIŞ + ÖNERİ
// ============================================================

// ------------------------------------------------------------
// GİRİŞ / ÇIKIŞ PANELİ
// ------------------------------------------------------------

async function showWelcomePanel(interaction) {

  const guild = getGuild(interaction.guild.id);

  const embed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle("👋 Giriş / Çıkış Sistemi")
    .setDescription(
      [
        `👋 Giriş kanalı: ${
          guild.welcome.channel
            ? `<#${guild.welcome.channel}>`
            : "❌ Seçilmedi"
        }`,
        `🚪 Çıkış kanalı: ${
          guild.leave.channel
            ? `<#${guild.leave.channel}>`
            : "❌ Seçilmedi"
        }`
      ].join("\n")
    );

  const row = new ActionRowBuilder()
    .addComponents(

      new ButtonBuilder()
        .setCustomId("welcome_channel")
        .setLabel("Giriş Kanalı")
        .setEmoji("👋")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("leave_channel")
        .setLabel("Çıkış Kanalı")
        .setEmoji("🚪")
        .setStyle(ButtonStyle.Danger),

      new ButtonBuilder()
        .setCustomId("panel_back")
        .setLabel("Geri")
        .setEmoji("↩️")
        .setStyle(ButtonStyle.Secondary)

    );

  await interaction.update({
    embeds: [embed],
    components: [row]
  });
}


// ------------------------------------------------------------
// ÖNERİ PANELİ
// ------------------------------------------------------------

async function showSuggestionPanel(interaction) {

  const guild = getGuild(interaction.guild.id);

  const embed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle("💡 Öneri Sistemi")
    .setDescription(
      `💡 Öneri kanalı: ${
        guild.suggestion.channel
          ? `<#${guild.suggestion.channel}>`
          : "❌ Seçilmedi"
      }`
    );

  const row = new ActionRowBuilder()
    .addComponents(

      new ButtonBuilder()
        .setCustomId("suggestion_channel")
        .setLabel("Kanal Seç")
        .setEmoji("💡")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("panel_back")
        .setLabel("Geri")
        .setEmoji("↩️")
        .setStyle(ButtonStyle.Secondary)

    );

  await interaction.update({
    embeds: [embed],
    components: [row]
  });
}


// ------------------------------------------------------------
// KANAL SEÇİM MENÜSÜ
// ------------------------------------------------------------

async function channelSelect(
  interaction,
  customId,
  text
) {

  const menu = new ChannelSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder("📢 Kanal seç...")
    .setChannelTypes(ChannelType.GuildText)
    .setMinValues(1)
    .setMaxValues(1);

  await interaction.reply({
    content: text,
    components: [
      new ActionRowBuilder().addComponents(menu)
    ],
    ephemeral: true
  });
}


// ------------------------------------------------------------
// BUTONLAR
// ------------------------------------------------------------

client.on("interactionCreate", async interaction => {

  if (!interaction.isButton()) return;
  if (!interaction.guild) return;

  if (!isAdmin(interaction.member)) {
    return safeReply(interaction, {
      content: "❌ Yetkin yok.",
      ephemeral: true
    });
  }

  // Giriş / çıkış paneli
  if (interaction.customId === "panel_welcome") {
    return showWelcomePanel(interaction);
  }

  // Öneri paneli
  if (interaction.customId === "panel_suggestion") {
    return showSuggestionPanel(interaction);
  }

  // Giriş kanalı
  if (interaction.customId === "welcome_channel") {
    return channelSelect(
      interaction,
      "welcome_channel_select",
      "👋 Giriş mesajlarının gönderileceği kanalı seç:"
    );
  }

  // Çıkış kanalı
  if (interaction.customId === "leave_channel") {
    return channelSelect(
      interaction,
      "leave_channel_select",
      "🚪 Çıkış mesajlarının gönderileceği kanalı seç:"
    );
  }

  // Öneri kanalı
  if (interaction.customId === "suggestion_channel") {
    return channelSelect(
      interaction,
      "suggestion_channel_select",
      "💡 Önerilerin gönderileceği kanalı seç:"
    );
  }

  // Klan oylama kanalı
  if (interaction.customId === "clan_channel") {
    return channelSelect(
      interaction,
      "clan_channel_select",
      "🗳️ Klan oylamalarının yapılacağı kanalı seç:"
    );
  }

  // Ticket panel kanalı
  if (interaction.customId === "ticket_panel_channel") {
    return channelSelect(
      interaction,
      "ticket_panel_channel_select",
      "🎫 Ticket panelinin gönderileceği kanalı seç:"
    );
  }

  // Ticket kategorisi
  if (interaction.customId === "ticket_category") {

    const menu = new ChannelSelectMenuBuilder()
      .setCustomId("ticket_category_select")
      .setPlaceholder("📂 Ticket kategorisini seç...")
      .setChannelTypes(ChannelType.GuildCategory)
      .setMinValues(1)
      .setMaxValues(1);

    return interaction.reply({
      content: "📂 Ticket kanallarının açılacağı kategoriyi seç:",
      components: [
        new ActionRowBuilder().addComponents(menu)
      ],
      ephemeral: true
    });
  }

  // Ses kategorisi
  if (interaction.customId === "voice_category") {

    const menu = new ChannelSelectMenuBuilder()
      .setCustomId("voice_category_select")
      .setPlaceholder("📂 Ses kategorisini seç...")
      .setChannelTypes(ChannelType.GuildCategory)
      .setMinValues(1)
      .setMaxValues(1);

    return interaction.reply({
      content: "📂 Ses kanallarının oluşturulacağı kategoriyi seç:",
      components: [
        new ActionRowBuilder().addComponents(menu)
      ],
      ephemeral: true
    });
  }

});


// ------------------------------------------------------------
// SEÇİLEN KANALLARI KAYDET
// ------------------------------------------------------------

client.on("interactionCreate", async interaction => {

  if (!interaction.isChannelSelectMenu()) return;
  if (!interaction.guild) return;

  if (!isAdmin(interaction.member)) {
    return safeReply(interaction, {
      content: "❌ Yetkin yok.",
      ephemeral: true
    });
  }

  const guild = getGuild(interaction.guild.id);
  const channelId = interaction.values[0];

  // Giriş
  if (
    interaction.customId ===
    "welcome_channel_select"
  ) {

    guild.welcome.channel = channelId;
    guild.welcome.enabled = true;

    saveData();

    return interaction.update({
      content:
        `✅ Giriş kanalı <#${channelId}> olarak ayarlandı.`,
      components: []
    });
  }

  // Çıkış
  if (
    interaction.customId ===
    "leave_channel_select"
  ) {

    guild.leave.channel = channelId;
    guild.leave.enabled = true;

    saveData();

    return interaction.update({
      content:
        `✅ Çıkış kanalı <#${channelId}> olarak ayarlandı.`,
      components: []
    });
  }

  // Öneri
  if (
    interaction.customId ===
    "suggestion_channel_select"
  ) {

    guild.suggestion.channel = channelId;

    saveData();

    return interaction.update({
      content:
        `✅ Öneri kanalı <#${channelId}> olarak ayarlandı.`,
      components: []
    });
  }

  // Klan
  if (
    interaction.customId ===
    "clan_channel_select"
  ) {

    guild.clan.channel = channelId;

    saveData();

    return interaction.update({
      content:
        `✅ Klan oylama kanalı <#${channelId}> olarak ayarlandı.`,
      components: []
    });
  }

  // Ticket panel kanalı
  if (
    interaction.customId ===
    "ticket_panel_channel_select"
  ) {

    guild.ticket.panelChannel = channelId;

    saveData();

    return interaction.update({
      content:
        `✅ Ticket panel kanalı <#${channelId}> olarak ayarlandı.`,
      components: []
    });
  }

  // Ticket kategorisi
  if (
    interaction.customId ===
    "ticket_category_select"
  ) {

    guild.ticket.category = channelId;

    saveData();

    return interaction.update({
      content:
        `✅ Ticket kategorisi <#${channelId}> olarak ayarlandı.`,
      components: []
    });
  }

  // Ses kategorisi
  if (
    interaction.customId ===
    "voice_category_select"
  ) {

    guild.voice.category = channelId;

    saveData();

    return interaction.update({
      content:
        `✅ Ses kategorisi <#${channelId}> olarak ayarlandı.`,
      components: []
    });
  }

});
// ============================================================
// SES KANALI OLUŞTURMA
// ============================================================

async function createVoice(interaction) {

  const guildData = getGuild(interaction.guild.id);

  if (!guildData.voice.category) {
    return safeReply(interaction, {
      content: "❌ Önce ses kanalı kategorisini seç.",
      ephemeral: true
    });
  }

  const category = interaction.guild.channels.cache.get(
    guildData.voice.category
  );

  if (!category || category.type !== ChannelType.GuildCategory) {
    return safeReply(interaction, {
      content: "❌ Ses kategorisi bulunamadı.",
      ephemeral: true
    });
  }

  const modal = new ModalBuilder()
    .setCustomId("voice_create_modal")
    .setTitle("🔊 Ses Kanalı Oluştur");

  const name = new TextInputBuilder()
    .setCustomId("voice_name")
    .setLabel("Kanal adı")
    .setPlaceholder("Örn: Sohbet Odası")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);

  modal.addComponents(
    new ActionRowBuilder().addComponents(name)
  );

  await interaction.showModal(modal);
}


// ============================================================
// KLAN EKLEME
// ============================================================

async function addClan(interaction) {

  const modal = new ModalBuilder()
    .setCustomId("clan_add_modal")
    .setTitle("🏆 Klan Ekle");

  const name = new TextInputBuilder()
    .setCustomId("clan_name")
    .setLabel("Klan adı")
    .setPlaceholder("Örn: Lynox")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(50);

  const description = new TextInputBuilder()
    .setCustomId("clan_description")
    .setLabel("Klan açıklaması")
    .setPlaceholder("Klan hakkında kısa bilgi")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(200);

  modal.addComponents(
    new ActionRowBuilder().addComponents(name),
    new ActionRowBuilder().addComponents(description)
  );

  await interaction.showModal(modal);
}


// ============================================================
// BUTONLAR
// ============================================================

client.on("interactionCreate", async interaction => {

  if (!interaction.guild) return;

  if (!isAdmin(interaction.member)) {
    if (
      interaction.isButton() &&
      [
        "voice_create",
        "clan_add",
        "clan_start",
        "clan_reset"
      ].includes(interaction.customId)
    ) {
      return safeReply(interaction, {
        content: "❌ Bu işlemi sadece yöneticiler yapabilir.",
        ephemeral: true
      });
    }
  }

  // ----------------------------------------------------------
  // SES KANALI OLUŞTUR
  // ----------------------------------------------------------

  if (
    interaction.isButton() &&
    interaction.customId === "voice_create"
  ) {
    return createVoice(interaction);
  }

  // ----------------------------------------------------------
  // KLAN EKLE
  // ----------------------------------------------------------

  if (
    interaction.isButton() &&
    interaction.customId === "clan_add"
  ) {
    return addClan(interaction);
  }

  // ----------------------------------------------------------
  // KLAN OYLAMASINI BAŞLAT
  // ----------------------------------------------------------

  if (
    interaction.isButton() &&
    interaction.customId === "clan_start"
  ) {

    const guildData =
      getGuild(interaction.guild.id);

    if (!guildData.clan.channel) {
      return safeReply(interaction, {
        content:
          "❌ Önce klan oylamasının yapılacağı kanalı seç.",
        ephemeral: true
      });
    }

    guildData.clan.active = true;

    saveData();

    return safeReply(interaction, {
      content:
        "✅ Klan sistemi aktif edildi.\n\n" +
        "🏆 Artık **Klan Ekle** butonuyla klanları ekleyebilirsin.",
      ephemeral: true
    });
  }

  // ----------------------------------------------------------
  // KLAN SIFIRLA
  // ----------------------------------------------------------

  if (
    interaction.isButton() &&
    interaction.customId === "clan_reset"
  ) {

    const guildData =
      getGuild(interaction.guild.id);

    guildData.clan.active = false;
    guildData.clan.message = null;
    guildData.clan.clans = {};

    saveData();

    return safeReply(interaction, {
      content:
        "🔄 Klan sistemi sıfırlandı.",
      ephemeral: true
    });
  }
});


// ============================================================
// MODAL İŞLEMLERİ
// ============================================================

client.on("interactionCreate", async interaction => {

  if (!interaction.isModalSubmit()) return;
  if (!interaction.guild) return;

  if (!isAdmin(interaction.member)) {
    return safeReply(interaction, {
      content: "❌ Yetkin yok.",
      ephemeral: true
    });
  }

  const guildData =
    getGuild(interaction.guild.id);

  // ----------------------------------------------------------
  // SES KANALI
  // ----------------------------------------------------------

  if (
    interaction.customId ===
    "voice_create_modal"
  ) {

    const name =
      interaction.fields.getTextInputValue(
        "voice_name"
      );

    try {

      const channel =
        await interaction.guild.channels.create({
          name,
          type: ChannelType.GuildVoice,
          parent: guildData.voice.category
        });

      return safeReply(interaction, {
        content:
          `✅ ${channel} ses kanalı oluşturuldu.`,
        ephemeral: true
      });

    } catch (error) {

      console.error(
        "Ses kanalı oluşturma:",
        error
      );

      return safeReply(interaction, {
        content:
          "❌ Ses kanalı oluşturulamadı. Botun **Kanalları Yönet** yetkisini kontrol et.",
        ephemeral: true
      });
    }
  }

  // ----------------------------------------------------------
  // KLAN EKLE
  // ----------------------------------------------------------

  if (
    interaction.customId ===
    "clan_add_modal"
  ) {

    if (!guildData.clan.active) {
      return safeReply(interaction, {
        content:
          "❌ Önce klan oylamasını başlat.",
        ephemeral: true
      });
    }

    const name =
      interaction.fields.getTextInputValue(
        "clan_name"
      );

    const description =
      interaction.fields.getTextInputValue(
        "clan_description"
      );

    const id =
      Date.now().toString();

    guildData.clan.clans[id] = {
      id,
      name,
      description,
      votes: []
    };

    saveData();

    return safeReply(interaction, {
      content:
        `✅ **${name}** klanı eklendi.\n` +
        `🏆 Toplam klan: **${
          Object.keys(guildData.clan.clans).length
        }**`,
      ephemeral: true
    });
  }
});
// ============================================================
// KLAN OYLAMASINI YAYINLA
// ============================================================

async function publishClanVote(interaction) {

  const guildData = getGuild(
    interaction.guild.id
  );

  if (!guildData.clan.active) {
    return safeReply(interaction, {
      content:
        "❌ Önce klan oylamasını başlat.",
      ephemeral: true
    });
  }

  const clans = Object.values(
    guildData.clan.clans
  );

  if (clans.length < 2) {
    return safeReply(interaction, {
      content:
        "❌ Oylamayı başlatmak için en az 2 klan gerekli.",
      ephemeral: true
    });
  }

  const channel =
    interaction.guild.channels.cache.get(
      guildData.clan.channel
    );

  if (!channel) {
    return safeReply(interaction, {
      content:
        "❌ Klan oylama kanalı bulunamadı.",
      ephemeral: true
    });
  }

  const menu =
    new StringSelectMenuBuilder()
      .setCustomId("clan_vote")
      .setPlaceholder(
        "🏆 Oy vermek istediğin klanı seç..."
      )
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(
        clans.slice(0, 25).map(clan => ({
          label: clan.name.slice(0, 100),
          value: clan.id,
          description:
            `${clan.votes.length} oy`,
          emoji: "🏆"
        }))
      );

  const embed =
    new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle("🏆 KLAN OYLAMASI")
      .setDescription(
        "Aşağıdaki menüden desteklediğin klanı seç.\n\n" +
        "🗳️ Her kullanıcı yalnızca **1 oy** kullanabilir.\n" +
        "🔄 İstersen daha sonra oyununu değiştirebilirsin."
      )
      .setFooter({
        text:
          "LynoxNetwork • Klan Oylaması"
      })
      .setTimestamp();

  const message =
    await channel.send({
      embeds: [embed],
      components: [
        new ActionRowBuilder()
          .addComponents(menu)
      ]
    });

  guildData.clan.message =
    message.id;

  saveData();

  await safeReply(interaction, {
    content:
      `✅ Klan oylaması ${channel} kanalında yayınlandı.`,
    ephemeral: true
  });
}


// ============================================================
// KLAN OYLAMASI BUTONU
// ============================================================

client.on("interactionCreate", async interaction => {

  if (!interaction.isButton()) return;
  if (!interaction.guild) return;

  if (
    interaction.customId ===
    "clan_publish"
  ) {

    if (!isAdmin(interaction.member)) {
      return safeReply(interaction, {
        content: "❌ Yetkin yok.",
        ephemeral: true
      });
    }

    return publishClanVote(
      interaction
    );
  }
});


// ============================================================
// KLAN OYU
// ============================================================

client.on("interactionCreate", async interaction => {

  if (!interaction.isStringSelectMenu()) return;
  if (!interaction.guild) return;

  if (
    interaction.customId !==
    "clan_vote"
  ) {
    return;
  }

  const guildData =
    getGuild(interaction.guild.id);

  if (!guildData.clan.active) {
    return safeReply(interaction, {
      content:
        "❌ Aktif klan oylaması yok.",
      ephemeral: true
    });
  }

  const clanId =
    interaction.values[0];

  const selectedClan =
    guildData.clan.clans[clanId];

  if (!selectedClan) {
    return safeReply(interaction, {
      content:
        "❌ Klan bulunamadı.",
      ephemeral: true
    });
  }

  // Kullanıcının eski oyunu varsa kaldır
  for (
    const clan of Object.values(
      guildData.clan.clans
    )
  ) {

    clan.votes =
      clan.votes.filter(
        id =>
          id !== interaction.user.id
      );
  }

  // Yeni oyu ekle
  selectedClan.votes.push(
    interaction.user.id
  );

  saveData();

  // Oylama mesajını güncelle
  await updateClanMessage(
    interaction.guild
  );

  await safeReply(interaction, {
    content:
      `✅ **${selectedClan.name}** klanına oy verdin.`,
    ephemeral: true
  });
});


// ============================================================
// KLAN MESAJINI GÜNCELLE
// ============================================================

async function updateClanMessage(guild) {

  const guildData =
    getGuild(guild.id);

  if (!guildData.clan.message) {
    return;
  }

  const channel =
    guild.channels.cache.get(
      guildData.clan.channel
    );

  if (!channel) return;

  const message =
    await channel.messages.fetch(
      guildData.clan.message
    ).catch(() => null);

  if (!message) return;

  const clans =
    Object.values(
      guildData.clan.clans
    ).sort(
      (a, b) =>
        b.votes.length -
        a.votes.length
    );

  const result =
    clans.map(
      (clan, index) =>
        `**${index + 1}. 🏆 ${clan.name}** — 🗳️ **${clan.votes.length} oy**`
    ).join("\n");

  const menu =
    new StringSelectMenuBuilder()
      .setCustomId("clan_vote")
      .setPlaceholder(
        "🏆 Oy vermek istediğin klanı seç..."
      )
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(
        clans.slice(0, 25).map(clan => ({
          label:
            clan.name.slice(0, 100),
          value:
            clan.id,
          description:
            `${clan.votes.length} oy`,
          emoji:
            "🏆"
        }))
      );

  const embed =
    new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle(
        "🏆 KLAN OYLAMASI"
      )
      .setDescription(
        `${result}\n\n` +
        "🗳️ Her kullanıcı yalnızca **1 oy** kullanabilir."
      )
      .setFooter({
        text:
          "LynoxNetwork • Klan Oylaması"
      })
      .setTimestamp();

  await message.edit({
    embeds: [embed],
    components: [
      new ActionRowBuilder()
        .addComponents(menu)
    ]
  }).catch(() => {});
}
// ============================================================
// KLAN PANELİNİ GÜNCELLE
// ============================================================

async function refreshClanPanel(interaction) {

  const guildData =
    getGuild(interaction.guild.id);

  const clans =
    Object.values(
      guildData.clan.clans
    );

  const clanList =
    clans.length
      ? clans.map(
          (clan, index) =>
            `**${index + 1}.** 🏆 ${clan.name}`
        ).join("\n")
      : "Henüz klan eklenmedi.";

  const embed =
    new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle(
        "🏆 Klan Yönetim Paneli"
      )
      .setDescription(
        [
          `🗳️ Oylama kanalı: ${
            guildData.clan.channel
              ? `<#${guildData.clan.channel}>`
              : "❌ Seçilmedi"
          }`,

          `📊 Sistem: ${
            guildData.clan.active
              ? "🟢 Aktif"
              : "🔴 Kapalı"
          }`,

          "",

          "### 🏆 Eklenen Klanlar",

          clanList
        ].join("\n")
      )
      .setFooter({
        text:
          "Klan ekleme paneli kalıcıdır."
      });

  const row1 =
    new ActionRowBuilder()
      .addComponents(

        new ButtonBuilder()
          .setCustomId(
            "clan_channel"
          )
          .setLabel(
            "Oylama Kanalı"
          )
          .setEmoji("🗳️")
          .setStyle(
            ButtonStyle.Primary
          ),

        new ButtonBuilder()
          .setCustomId(
            "clan_start"
          )
          .setLabel(
            "Oylamayı Başlat"
          )
          .setEmoji("▶️")
          .setStyle(
            ButtonStyle.Success
          ),

        new ButtonBuilder()
          .setCustomId(
            "clan_add"
          )
          .setLabel(
            "Klan Ekle"
          )
          .setEmoji("➕")
          .setStyle(
            ButtonStyle.Primary
          )

      );

  const row2 =
    new ActionRowBuilder()
      .addComponents(

        new ButtonBuilder()
          .setCustomId(
            "clan_publish"
          )
          .setLabel(
            "Oylamayı Yayınla"
          )
          .setEmoji("📢")
          .setStyle(
            ButtonStyle.Success
          ),

        new ButtonBuilder()
          .setCustomId(
            "clan_reset"
          )
          .setLabel(
            "Sıfırla"
          )
          .setEmoji("🔄")
          .setStyle(
            ButtonStyle.Danger
          ),

        new ButtonBuilder()
          .setCustomId(
            "panel_back"
          )
          .setLabel(
            "Geri"
          )
          .setEmoji("↩️")
          .setStyle(
            ButtonStyle.Secondary
          )

      );

  await interaction.update({
    embeds: [embed],
    components: [
      row1,
      row2
    ]
  });
}


// ============================================================
// KLAN BUTONLARI
// ============================================================

client.on("interactionCreate", async interaction => {

  if (!interaction.isButton()) return;
  if (!interaction.guild) return;

  if (
    ![
      "clan_add",
      "clan_start",
      "clan_publish",
      "clan_reset"
    ].includes(
      interaction.customId
    )
  ) {
    return;
  }

  if (!isAdmin(interaction.member)) {
    return safeReply(interaction, {
      content:
        "❌ Bu işlemi sadece yöneticiler yapabilir.",
      ephemeral: true
    });
  }

  // Klan ekleme
  if (
    interaction.customId ===
    "clan_add"
  ) {
    return addClan(interaction);
  }

  // Oylama başlat
  if (
    interaction.customId ===
    "clan_start"
  ) {

    const guildData =
      getGuild(interaction.guild.id);

    if (!guildData.clan.channel) {
      return safeReply(interaction, {
        content:
          "❌ Önce oylama kanalını seç.",
        ephemeral: true
      });
    }

    guildData.clan.active =
      true;

    saveData();

    return refreshClanPanel(
      interaction
    );
  }

  // Oylamayı yayınla
  if (
    interaction.customId ===
    "clan_publish"
  ) {
    return publishClanVote(
      interaction
    );
  }

  // Sıfırla
  if (
    interaction.customId ===
    "clan_reset"
  ) {

    const guildData =
      getGuild(interaction.guild.id);

    guildData.clan.active =
      false;

    guildData.clan.message =
      null;

    guildData.clan.clans =
      {};

    saveData();

    return refreshClanPanel(
      interaction
    );
  }
});


// ============================================================
// KLAN EKLENDİKTEN SONRA PANELİ GÜNCELLE
// ============================================================

const oldClanAddModal =
  client.listeners("interactionCreate");
// ============================================================
// TICKET SİSTEMİ
// ============================================================

async function createTicketPanel(interaction) {

  const guildData =
    getGuild(interaction.guild.id);

  if (!guildData.ticket.category) {
    return safeReply(interaction, {
      content:
        "❌ Önce ticket kategorisini seç.",
      ephemeral: true
    });
  }

  const embed =
    new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle("🎫 LynoxNetwork Destek")
      .setDescription(
        "Destek almak için aşağıdaki butona basarak ticket oluşturabilirsin."
      );

  const row =
    new ActionRowBuilder()
      .addComponents(

        new ButtonBuilder()
          .setCustomId("ticket_create")
          .setLabel("Ticket Aç")
          .setEmoji("🎫")
          .setStyle(ButtonStyle.Primary)

      );

  const channel =
    guildData.ticket.panelChannel
      ? interaction.guild.channels.cache.get(
          guildData.ticket.panelChannel
        )
      : interaction.channel;

  if (!channel) {
    return safeReply(interaction, {
      content:
        "❌ Ticket panel kanalı bulunamadı.",
      ephemeral: true
    });
  }

  await channel.send({
    embeds: [embed],
    components: [row]
  });

  return safeReply(interaction, {
    content:
      `✅ Ticket paneli ${channel} kanalına gönderildi.`,
    ephemeral: true
  });
}


// ============================================================
// TICKET OLUŞTUR
// ============================================================

async function openTicket(interaction) {

  const guildData =
    getGuild(interaction.guild.id);

  if (!guildData.ticket.category) {
    return safeReply(interaction, {
      content:
        "❌ Ticket kategorisi ayarlanmamış.",
      ephemeral: true
    });
  }

  const existing =
    interaction.guild.channels.cache.find(
      channel =>
        channel.type === ChannelType.GuildText &&
        channel.topic ===
          `ticket:${interaction.user.id}`
    );

  if (existing) {
    return safeReply(interaction, {
      content:
        `❌ Zaten açık bir ticketın var: ${existing}`,
      ephemeral: true
    });
  }

  try {

    const channel =
      await interaction.guild.channels.create({
        name:
          `ticket-${interaction.user.username}`
            .toLowerCase()
            .replace(/[^a-z0-9-_]/g, "")
            .slice(0, 20),

        type:
          ChannelType.GuildText,

        parent:
          guildData.ticket.category,

        topic:
          `ticket:${interaction.user.id}`,

        permissionOverwrites: [

          {
            id:
              interaction.guild.roles.everyone.id,

            deny: [
              PermissionFlagsBits.ViewChannel
            ]
          },

          {
            id:
              interaction.user.id,

            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory
            ]
          },

          {
            id:
              interaction.client.user.id,

            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.ManageChannels
            ]
          }

        ]

      });

    const embed =
      new EmbedBuilder()
        .setColor(COLORS.primary)
        .setTitle("🎫 Destek Talebi")
        .setDescription(
          [
            `👤 Yetkili: ${interaction.user}`,
            "",
            "Destek ekibimiz en kısa sürede ilgilenecektir."
          ].join("\n")
        );

    const row =
      new ActionRowBuilder()
        .addComponents(

          new ButtonBuilder()
            .setCustomId("ticket_close")
            .setLabel("Ticket Kapat")
            .setEmoji("🔒")
            .setStyle(ButtonStyle.Danger)

        );

    await channel.send({
      content:
        `${interaction.user}`,
      embeds: [embed],
      components: [row]
    });

    return safeReply(interaction, {
      content:
        `✅ Ticketın oluşturuldu: ${channel}`,
      ephemeral: true
    });

  } catch (error) {

    console.error(
      "Ticket oluşturma hatası:",
      error
    );

    return safeReply(interaction, {
      content:
        "❌ Ticket oluşturulamadı. Botun **Kanalları Yönet** yetkisini kontrol et.",
      ephemeral: true
    });
  }
}


// ============================================================
// TICKET BUTONLARI
// ============================================================

client.on("interactionCreate", async interaction => {

  if (!interaction.isButton()) return;
  if (!interaction.guild) return;

  if (
    interaction.customId ===
    "ticket_create"
  ) {
    return openTicket(interaction);
  }

  if (
    interaction.customId ===
    "ticket_close"
  ) {

    const channel =
      interaction.channel;

    if (
      !channel ||
      !channel.topic ||
      !channel.topic.startsWith("ticket:")
    ) {
      return safeReply(interaction, {
        content:
          "❌ Bu kanal bir ticket değil.",
        ephemeral: true
      });
    }

    if (
      !isAdmin(interaction.member) &&
      !channel.topic.includes(
        interaction.user.id
      )
    ) {
      return safeReply(interaction, {
        content:
          "❌ Bu ticketı kapatma yetkin yok.",
        ephemeral: true
      });
    }

    await safeReply(interaction, {
      content:
        "🔒 Ticket kapatılıyor...",
      ephemeral: true
    });

    setTimeout(() => {
      channel.delete(
        "Ticket kapatıldı."
      ).catch(() => {});
    }, 1500);
  }

});
// ============================================================
// ÖNERİ SİSTEMİ
// ============================================================

async function sendSuggestion(message) {

  const guildData =
    getGuild(message.guild.id);

  if (!guildData.suggestion.channel) {
    return message.reply(
      "❌ Öneri kanalı ayarlanmamış."
    );
  }

  const channel =
    message.guild.channels.cache.get(
      guildData.suggestion.channel
    );

  if (!channel) {
    return message.reply(
      "❌ Öneri kanalı bulunamadı."
    );
  }

  const text =
    message.content
      .slice(
        `${PREFIX}öneri`.length
      )
      .trim();

  if (!text) {
    return message.reply(
      "❌ Önerini yazmalısın.\nÖrnek: `!öneri Yeni sistem gelsin`"
    );
  }

  const embed =
    new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle("💡 Yeni Öneri")
      .setDescription(text)
      .addFields({
        name: "👤 Öneren",
        value: `${message.author}`,
        inline: true
      })
      .setFooter({
        text:
          "LynoxNetwork • Öneri Sistemi"
      })
      .setTimestamp();

  const row =
    new ActionRowBuilder()
      .addComponents(

        new ButtonBuilder()
          .setCustomId("suggestion_yes")
          .setLabel("0")
          .setEmoji("👍")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId("suggestion_no")
          .setLabel("0")
          .setEmoji("👎")
          .setStyle(ButtonStyle.Danger)

      );

  await channel.send({
    embeds: [embed],
    components: [row]
  });

  await message.reply(
    `✅ Önerin ${channel} kanalına gönderildi.`
  );
}


// ============================================================
// ÖNERİ OYLAMA
// ============================================================

client.on("interactionCreate", async interaction => {

  if (!interaction.isButton()) return;

  if (
    ![
      "suggestion_yes",
      "suggestion_no"
    ].includes(interaction.customId)
  ) {
    return;
  }

  const message =
    interaction.message;

  const embed =
    message.embeds[0];

  if (!embed) return;

  if (!message.suggestionVotes) {
    message.suggestionVotes = {};
  }

  const userId =
    interaction.user.id;

  const old =
    message.suggestionVotes[userId];

  const vote =
    interaction.customId ===
    "suggestion_yes"
      ? "yes"
      : "no";

  if (old === vote) {

    return safeReply(interaction, {
      content:
        "⚠️ Zaten bu seçeneğe oy verdin.",
      ephemeral: true
    });

  }

  message.suggestionVotes[userId] =
    vote;

  let yes = 0;
  let no = 0;

  for (
    const value of Object.values(
      message.suggestionVotes
    )
  ) {

    if (value === "yes") yes++;
    if (value === "no") no++;

  }

  const row =
    new ActionRowBuilder()
      .addComponents(

        new ButtonBuilder()
          .setCustomId("suggestion_yes")
          .setLabel(String(yes))
          .setEmoji("👍")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId("suggestion_no")
          .setLabel(String(no))
          .setEmoji("👎")
          .setStyle(ButtonStyle.Danger)

      );

  await message.edit({
    components: [row]
  });

  await safeReply(interaction, {
    content:
      vote === "yes"
        ? "👍 Olumlu oyun kaydedildi."
        : "👎 Olumsuz oyun kaydedildi.",
    ephemeral: true
  });

});


// ============================================================
// GİRİŞ MESAJI
// ============================================================

client.on("guildMemberAdd", async member => {

  const guildData =
    getGuild(member.guild.id);

  if (
    !guildData.welcome.enabled ||
    !guildData.welcome.channel
  ) {
    return;
  }

  const channel =
    member.guild.channels.cache.get(
      guildData.welcome.channel
    );

  if (!channel) return;

  const embed =
    new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle("👋 Hoş Geldin!")
      .setDescription(
        `${member} sunucuya katıldı!\n\n` +
        `🎉 Sunucumuzda artık **${member.guild.memberCount}** kişi var.`
      )
      .setThumbnail(
        member.user.displayAvatarURL()
      )
      .setTimestamp();

  await channel.send({
    embeds: [embed]
  }).catch(() => {});
});


// ============================================================
// ÇIKIŞ MESAJI
// ============================================================

client.on("guildMemberRemove", async member => {

  const guildData =
    getGuild(member.guild.id);

  if (
    !guildData.leave.enabled ||
    !guildData.leave.channel
  ) {
    return;
  }

  const channel =
    member.guild.channels.cache.get(
      guildData.leave.channel
    );

  if (!channel) return;

  const embed =
    new EmbedBuilder()
      .setColor(COLORS.danger)
      .setTitle("🚪 Görüşmek Üzere")
      .setDescription(
        `${member.user.tag} sunucudan ayrıldı.`
      )
      .setTimestamp();

  await channel.send({
    embeds: [embed]
  }).catch(() => {});
});
// ============================================================
// TEMEL KOMUTLAR
// ============================================================

client.on("messageCreate", async message => {

  if (message.author.bot) return;
  if (!message.guild) return;

  const content =
    message.content.trim();

  const command =
    content.split(/\s+/)[0].toLowerCase();

  // ----------------------------------------------------------
  // !KLAN
  // ----------------------------------------------------------

  if (command === "!klan") {

    if (!isAdmin(message.member)) {
      return message.reply(
        "❌ Bu komutu sadece yöneticiler kullanabilir."
      );
    }

    const g =
      getGuild(message.guild.id);

    const clans =
      Object.values(g.clan.clans);

    const list =
      clans.length
        ? clans.map(
            (clan, i) =>
              `**${i + 1}.** 🏆 ${clan.name}`
          ).join("\n")
        : "Henüz klan eklenmedi.";

    const embed =
      new EmbedBuilder()
        .setColor(COLORS.primary)
        .setTitle("🏆 Klan Yönetimi")
        .setDescription(
          [
            `🗳️ Oylama kanalı: ${
              g.clan.channel
                ? `<#${g.clan.channel}>`
                : "❌ Seçilmedi"
            }`,

            `📊 Sistem: ${
              g.clan.active
                ? "🟢 Aktif"
                : "🔴 Kapalı"
            }`,

            "",

            "🏆 **Klanlar**",
            list
          ].join("\n")
        );

    const row1 =
      new ActionRowBuilder()
        .addComponents(

          new ButtonBuilder()
            .setCustomId("clan_channel")
            .setLabel("Oylama Kanalı")
            .setEmoji("🗳️")
            .setStyle(ButtonStyle.Primary),

          new ButtonBuilder()
            .setCustomId("clan_start")
            .setLabel("Oylamayı Başlat")
            .setEmoji("▶️")
            .setStyle(ButtonStyle.Success),

          new ButtonBuilder()
            .setCustomId("clan_add")
            .setLabel("Klan Ekle")
            .setEmoji("➕")
            .setStyle(ButtonStyle.Primary)

        );

    const row2 =
      new ActionRowBuilder()
        .addComponents(

          new ButtonBuilder()
            .setCustomId("clan_publish")
            .setLabel("Oylamayı Yayınla")
            .setEmoji("📢")
            .setStyle(ButtonStyle.Success),

          new ButtonBuilder()
            .setCustomId("clan_reset")
            .setLabel("Sıfırla")
            .setEmoji("🔄")
            .setStyle(ButtonStyle.Danger)

        );

    return message.reply({
      embeds: [embed],
      components: [row1, row2]
    });
  }


  // ----------------------------------------------------------
  // !ÖNERİ
  // ----------------------------------------------------------

  if (command === "!öneri") {
    return sendSuggestion(message);
  }


  // ----------------------------------------------------------
  // !PANEL
  // ----------------------------------------------------------

  if (command === "!panel") {
    return sendAdminPanel(message);
  }

});


// ============================================================
// PANEL KANALINDA TICKET PANELİ OLUŞTUR
// ============================================================

client.on("interactionCreate", async interaction => {

  if (!interaction.isButton()) return;
  if (!interaction.guild) return;

  if (
    interaction.customId ===
    "ticket_panel"
  ) {

    if (!isAdmin(interaction.member)) {
      return safeReply(interaction, {
        content: "❌ Yetkin yok.",
        ephemeral: true
      });
    }

    return createTicketPanel(
      interaction
    );
  }

});


// ============================================================
// KLAN EKLEME SONRASI PANELİ YENİLE
// ============================================================

client.on("interactionCreate", async interaction => {

  if (!interaction.isModalSubmit()) return;
  if (!interaction.guild) return;

  if (
    interaction.customId !==
    "clan_add_modal"
  ) {
    return;
  }

  const g =
    getGuild(interaction.guild.id);

  const name =
    interaction.fields.getTextInputValue(
      "clan_name"
    );

  const description =
    interaction.fields.getTextInputValue(
      "clan_description"
    );

  if (!g.clan.active) {
    return safeReply(interaction, {
      content:
        "❌ Önce klan oylamasını başlat.",
      ephemeral: true
    });
  }

  const id =
    `${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 7)}`;

  g.clan.clans[id] = {
    id,
    name,
    description:
      description || "Klan",
    votes: []
  };

  saveData();

  await safeReply(interaction, {
    content:
      `✅ **${name}** klanı eklendi.`,
    ephemeral: true
  });
});


// ============================================================
// SES MODALINI GÜVENLİ ŞEKİLDE İŞLE
// ============================================================

client.on("interactionCreate", async interaction => {

  if (!interaction.isModalSubmit()) return;
  if (!interaction.guild) return;

  if (
    interaction.customId !==
    "voice_create_modal"
  ) {
    return;
  }

  const g =
    getGuild(interaction.guild.id);

  const name =
    interaction.fields.getTextInputValue(
      "voice_name"
    );

  if (!g.voice.category) {
    return safeReply(interaction, {
      content:
        "❌ Önce ses kategorisini seç.",
      ephemeral: true
    });
  }

  try {

    const channel =
      await interaction.guild.channels.create({
        name,
        type: ChannelType.GuildVoice,
        parent: g.voice.category
      });

    await safeReply(interaction, {
      content:
        `✅ ${channel} oluşturuldu.`,
      ephemeral: true
    });

  } catch (error) {

    console.error(
      "Ses oluşturma hatası:",
      error
    );

    await safeReply(interaction, {
      content:
        "❌ Ses kanalı oluşturulamadı. Botun **Kanalları Yönet** yetkisini kontrol et.",
      ephemeral: true
    });
  }

});
// ============================================================
// BOTU BAŞLAT
// ============================================================

process.on("unhandledRejection", error => {
  console.error(
    "Yakalanmamış Promise hatası:",
    error
  );
});

process.on("uncaughtException", error => {
  console.error(
    "Yakalanmamış hata:",
    error
  );
});


// ============================================================
// BOT TOKEN
// ============================================================

const TOKEN =
  process.env.DISCORD_TOKEN ||
  process.env.TOKEN;

if (!TOKEN) {

  console.error(
    "❌ DISCORD_TOKEN veya TOKEN bulunamadı!"
  );

  process.exit(1);
}


// ============================================================
// BOTU LOGIN ET
// ============================================================

client.login(TOKEN)
  .then(() => {

    console.log(
      "🔐 Discord bağlantısı başlatıldı."
    );

  })
  .catch(error => {

    console.error(
      "❌ Discord giriş hatası:",
      error
    );

  });
