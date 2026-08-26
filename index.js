require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  RoleSelectMenuBuilder,
  UserSelectMenuBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");
const { status } = require("minecraft-server-util");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User,
    Partials.GuildMember
  ]
});

client.commands = new Collection();
client.cooldowns = new Collection();

const DATA_DIR = path.join(__dirname, "data");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, {
    recursive: true
  });
}

const files = {
  config: path.join(DATA_DIR, "config.json"),
  points: path.join(DATA_DIR, "points.json"),
  giveaways: path.join(DATA_DIR, "giveaways.json"),
  drops: path.join(DATA_DIR, "drops.json"),
  tickets: path.join(DATA_DIR, "tickets.json"),
  invites: path.join(DATA_DIR, "invites.json")
};

const defaultData = {
  config: {},
  points: {},
  giveaways: {},
  drops: {},
  tickets: {},
  invites: {}
};

function ensureFile(file, defaultValue) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(
      file,
      JSON.stringify(defaultValue, null, 2),
      "utf8"
    );
  }
}

ensureFile(files.config, defaultData.config);
ensureFile(files.points, defaultData.points);
ensureFile(files.giveaways, defaultData.giveaways);
ensureFile(files.drops, defaultData.drops);
ensureFile(files.tickets, defaultData.tickets);
ensureFile(files.invites, defaultData.invites);

function loadJSON(file) {
  try {
    return JSON.parse(
      fs.readFileSync(file, "utf8")
    );
  } catch (error) {
    console.error(
      `JSON okuma hatası: ${file}`,
      error
    );

    return {};
  }
}

function saveJSON(file, data) {
  try {
    fs.writeFileSync(
      file,
      JSON.stringify(data, null, 2),
      "utf8"
    );

    return true;
  } catch (error) {
    console.error(
      `JSON kaydetme hatası: ${file}`,
      error
    );

    return false;
  }
}

function getGuildConfig(guildId) {
  const data = loadJSON(files.config);

  if (!data[guildId]) {
    data[guildId] = {
      ticket: {
        enabled: false,
        categoryId: null,
        staffRoleId: null,
        channelId: null,
        options: []
      },

      suggestion: {
        enabled: false,
        channelId: null
      },

      welcome: {
        enabled: false,
        channelId: null
      },

      rating: {
        enabled: false,
        channelId: null
      },

      autoRole: {
        enabled: false,
        roleId: null
      },

      voice: {
        enabled: false,
        triggerChannelId: null,
        categoryId: null
      },

      announcement: {
        enabled: false,
        announcementChannelId: null,
        chatChannelId: null
      }
    };

    saveJSON(files.config, data);
  }

  return data[guildId];
}

function saveGuildConfig(guildId, config) {
  const data = loadJSON(files.config);

  data[guildId] = config;

  saveJSON(files.config, data);
}

function makeEmbed(
  title,
  description,
  color = 0x8b5cf6
) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp()
    .setFooter({
      text: "Modern Discord Bot"
    });
}

function isAdmin(member) {
  return member.permissions.has(
    PermissionsBitField.Flags.Administrator
  );
}

function canManageRole(guild, role) {
  if (!role) return false;

  if (role.id === guild.id) {
    return false;
  }

  if (role.managed) {
    return false;
  }

  const botMember = guild.members.me;

  if (!botMember) {
    return false;
  }

  if (
    role.position >=
    botMember.roles.highest.position
  ) {
    return false;
  }

  return true;
}

function canSend(channel) {
  if (!channel) return false;

  const guild = channel.guild;

  if (!guild || !guild.members.me) {
    return false;
  }

  return channel
    .permissionsFor(guild.members.me)
    ?.has(
      PermissionsBitField.Flags.SendMessages
    );
}

function cleanChannelName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9ğüşıöç\-_]/gi, "-")
    .replace(/-+/g, "-")
    .slice(0, 90);
}

function parseDuration(input) {
  if (!input) return null;

  const match = input
    .toLowerCase()
    .match(
      /^(\d+)\s*(s|sn|sec|seconds?|m|min|minutes?|h|hours?|d|days?|w|weeks?)$/
    );

  if (!match) {
    return null;
  }

  const amount = Number(match[1]);
  const unit = match[2];

  if (!Number.isFinite(amount)) {
    return null;
  }

  const units = {
    s: 1000,
    sn: 1000,
    sec: 1000,
    second: 1000,
    seconds: 1000,

    m: 60 * 1000,
    min: 60 * 1000,
    minute: 60 * 1000,
    minutes: 60 * 1000,

    h: 60 * 60 * 1000,
    hour: 60 * 60 * 1000,
    hours: 60 * 60 * 1000,

    d: 24 * 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,

    w: 7 * 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    weeks: 7 * 24 * 60 * 60 * 1000
  };

  if (!units[unit]) {
    return null;
  }

  return amount * units[unit];
}

function formatDuration(ms) {
  if (!ms || ms <= 0) {
    return "Süre doldu";
  }

  let seconds = Math.floor(ms / 1000);

  const days = Math.floor(
    seconds / 86400
  );

  seconds %= 86400;

  const hours = Math.floor(
    seconds / 3600
  );

  seconds %= 3600;

  const minutes = Math.floor(
    seconds / 60
  );

  seconds %= 60;

  const result = [];

  if (days > 0) {
    result.push(`${days}g`);
  }

  if (hours > 0) {
    result.push(`${hours}s`);
  }

  if (minutes > 0) {
    result.push(`${minutes}d`);
  }

  if (
    seconds > 0 &&
    result.length < 2
  ) {
    result.push(`${seconds}sn`);
  }

  return result.join(" ");
}

function formatDate(date) {
  return `<t:${Math.floor(
    new Date(date).getTime() / 1000
  )}:F>`;
}

client.once("ready", async () => {
  console.log(
    `✅ ${client.user.tag} aktif!`
  );

  console.log(
    `📡 ${client.guilds.cache.size} sunucuda aktif.`
  );

  client.user.setPresence({
    activities: [
      {
        name: "Sunucuları yönetiyor",
        type: 3
      }
    ],
    status: "online"
  });
});

process.on(
  "unhandledRejection",
  error => {
    console.error(
      "❌ Unhandled Rejection:",
      error
    );
  }
);

process.on(
  "uncaughtException",
  error => {
    console.error(
      "❌ Uncaught Exception:",
      error
    );
  }
);

if (!process.env.TOKEN) {
  console.error(
    "❌ TOKEN bulunamadı! .env dosyasını kontrol et."
  );

  process.exit(1);
}

client.login(
  process.env.TOKEN
);
// ======================================================
// MESAJ KOMUTLARI
// ======================================================

client.on("messageCreate", async message => {
  try {
    if (message.author.bot) return;
    if (!message.guild) return;

    const prefix = "!";

    if (!message.content.startsWith(prefix)) {
      return;
    }

    const args = message.content
      .slice(prefix.length)
      .trim()
      .split(/\s+/);

    const command = args.shift()?.toLowerCase();

    if (!command) return;

    // ==================================================
    // AVATAR
    // ==================================================

    if (command === "avatar") {
      let user = message.author;

      const mentionedUser =
        message.mentions.users.first();

      if (mentionedUser) {
        user = mentionedUser;
      }

      const avatar = user.displayAvatarURL({
        extension: "png",
        size: 4096,
        forceStatic: false
      });

      const embed = new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setAuthor({
          name: `${user.username} • Avatar`
        })
        .setImage(avatar)
        .setDescription(
          `👤 **Kullanıcı:** ${user}`
        )
        .setTimestamp()
        .setFooter({
          text: message.guild.name
        });

      const row =
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel("Avatarı Aç")
            .setStyle(ButtonStyle.Link)
            .setURL(avatar)
        );

      return message.reply({
        embeds: [embed],
        components: [row]
      });
    }

    // ==================================================
    // SERVER INFO
    // ==================================================

    if (
      command === "serverinfo" ||
      command === "sunucubilgi"
    ) {
      const guild = message.guild;

      const config =
        getGuildConfig(guild.id);

      const points =
        loadJSON(files.points);

      const guildPoints =
        points[guild.id] || {};

      const ratings =
        Object.values(guildPoints);

      let average = 0;

      if (ratings.length > 0) {
        const total = ratings.reduce(
          (sum, value) =>
            sum + Number(value),
          0
        );

        average =
          total / ratings.length;
      }

      const owner = await guild.fetchOwner();

      const createdTimestamp =
        Math.floor(
          guild.createdTimestamp / 1000
        );

      const ratingText =
        ratings.length > 0
          ? `⭐ **${average.toFixed(1)}/5**`
          : "⭐ **Henüz puan verilmedi**";

      const embed = new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setAuthor({
          name: guild.name,
          iconURL:
            guild.iconURL({
              dynamic: true
            }) || undefined
        })
        .setThumbnail(
          guild.iconURL({
            dynamic: true,
            size: 1024
          }) || null
        )
        .setDescription(
          `## 🏰 ${guild.name}\n` +
          `Sunucu hakkında güncel bilgiler aşağıda gösterilmektedir.`
        )
        .addFields(
          {
            name: "👑 Sunucu Sahibi",
            value: `${owner}`,
            inline: true
          },
          {
            name: "👥 Üye Sayısı",
            value: `**${guild.memberCount}**`,
            inline: true
          },
          {
            name: "📅 Kurulma Zamanı",
            value: `<t:${createdTimestamp}:F>`,
            inline: true
          },
          {
            name: "⭐ Sunucu Puanı",
            value: ratingText,
            inline: true
          },
          {
            name: "📊 Değerlendirme Sayısı",
            value: `**${ratings.length}** kişi`,
            inline: true
          },
          {
            name: "🆔 Sunucu ID",
            value: `\`${guild.id}\``,
            inline: true
          }
        )
        .setTimestamp()
        .setFooter({
          text: `${guild.name} • Sunucu Bilgileri`
        });

      return message.reply({
        embeds: [embed]
      });
    }

    // ==================================================
    // PUAN VER
    // ==================================================

    if (
      command === "puanver" ||
      command === "puan"
    ) {
      const ratingChannelId =
        getGuildConfig(
          message.guild.id
        ).rating.channelId;

      if (
        ratingChannelId &&
        message.channel.id !== ratingChannelId
      ) {
        return message.reply({
          content:
            "❌ Puan vermek için belirlenen puan kanalını kullanmalısın."
        });
      }

      const rating =
        Number(args[0]);

      if (
        !Number.isInteger(rating) ||
        rating < 1 ||
        rating > 5
      ) {
        return message.reply({
          content:
            "❌ Geçerli bir puan gir.\n\n" +
            "Kullanım: `!puanver <1-5>`\n" +
            "Örnek: `!puanver 5`"
        });
      }

      const points =
        loadJSON(files.points);

      if (!points[message.guild.id]) {
        points[message.guild.id] = {};
      }

      const previousRating =
        points[message.guild.id][
          message.author.id
        ];

      points[message.guild.id][
        message.author.id
      ] = rating;

      saveJSON(
        files.points,
        points
      );

      const ratings =
        Object.values(
          points[message.guild.id]
        );

      const average =
        ratings.reduce(
          (sum, value) =>
            sum + Number(value),
          0
        ) / ratings.length;

      const stars =
        "⭐".repeat(rating);

      const embed =
        new EmbedBuilder()
          .setColor(0xfacc15)
          .setTitle("⭐ Sunucu Puanı")
          .setDescription(
            `${message.author} sunucuya **${rating}/5** puan verdi.\n\n` +
            `${stars}\n\n` +
            `📊 Güncel ortalama: **${average.toFixed(1)}/5**`
          )
          .setTimestamp()
          .setFooter({
            text:
              previousRating
                ? "Puanınız güncellendi."
                : "Puanınız kaydedildi."
          });

      return message.reply({
        embeds: [embed]
      });
    }

    // ==================================================
    // KOMUT BİLGİ
    // ==================================================

    if (
      command === "komutbilgi" ||
      command === "yardım" ||
      command === "help"
    ) {
      const admin =
        isAdmin(message.member);

      const playerCommands =
        [
          "`!avatar [@üye]` — Avatar görüntüler.",
          "`!serverinfo` — Sunucu bilgilerini gösterir.",
          "`!puanver <1-5>` — Sunucuya puan verir.",
          "`!öneri <mesaj>` — Öneri gönderir."
        ];

      const adminCommands =
        [
          "`!panel` — Yönetim panelini açar.",
          "`!duyuru <mesaj>` — Duyuru gönderir."
        ];

      const text =
        admin
          ? [
              "## 👑 Yönetici Komutları",
              "",
              ...playerCommands,
              "",
              ...adminCommands
            ].join("\n")
          : [
              "## 👤 Kullanılabilir Komutlar",
              "",
              ...playerCommands
            ].join("\n");

      const embed =
        new EmbedBuilder()
          .setColor(0x8b5cf6)
          .setTitle("📖 Komut Bilgileri")
          .setDescription(text)
          .setTimestamp()
          .setFooter({
            text: `${message.guild.name} • Komut Yardımı`
          });

      return message.reply({
        embeds: [embed]
      });
    }

    // ==================================================
    // YÖNETİCİ KONTROLÜ
    // ==================================================

    if (command === "panel") {
      if (!isAdmin(message.member)) {
        return message.reply({
          content:
            "❌ Bu komutu kullanabilmek için **Yönetici** yetkisine sahip olmalısın."
        });
      }

      const embed =
        new EmbedBuilder()
          .setColor(0x8b5cf6)
          .setTitle("🛠️ Sunucu Yönetim Paneli")
          .setDescription(
            "Aşağıdaki menüden yapmak istediğin işlemi seç.\n\n" +
            "🔐 Bu panel yalnızca **Yönetici** yetkisine sahip kişiler tarafından kullanılabilir."
          )
          .setTimestamp()
          .setFooter({
            text:
              `${message.guild.name} • Yönetim Sistemi`
          });

      const menu =
        new StringSelectMenuBuilder()
          .setCustomId(
            "admin_panel_main"
          )
          .setPlaceholder(
            "⚙️ Bir yönetim işlemi seç..."
          )
          .addOptions(
            new StringSelectMenuOptionBuilder()
              .setLabel("Ticket Kur")
              .setDescription(
                "Ticket sistemini kur ve yapılandır."
              )
              .setEmoji("🎫")
              .setValue("panel_ticket"),

            new StringSelectMenuOptionBuilder()
              .setLabel("Toplu Rol Ver")
              .setDescription(
                "Belirlenen rolü üyelere verir."
              )
              .setEmoji("👥")
              .setValue("panel_mass_role_add"),

            new StringSelectMenuOptionBuilder()
              .setLabel("Toplu Rol Al")
              .setDescription(
                "Belirlenen rolü üyelerden alır."
              )
              .setEmoji("🗑️")
              .setValue("panel_mass_role_remove"),

            new StringSelectMenuOptionBuilder()
              .setLabel("Öneri Kanalı Oluştur")
              .setDescription(
                "Öneri sistemini oluşturur."
              )
              .setEmoji("💡")
              .setValue("panel_suggestion"),

            new StringSelectMenuOptionBuilder()
              .setLabel("Rol Ver")
              .setDescription(
                "Belirlenen üyeye rol verir."
              )
              .setEmoji("👤")
              .setValue("panel_role_give"),

            new StringSelectMenuOptionBuilder()
              .setLabel("Komut Bilgi")
              .setDescription(
                "Kullanılabilir komutları gösterir."
              )
              .setEmoji("📖")
              .setValue("panel_commands"),

            new StringSelectMenuOptionBuilder()
              .setLabel("OtoRol")
              .setDescription(
                "Yeni üyelere otomatik rol verir."
              )
              .setEmoji("🤖")
              .setValue("panel_autorole"),

            new StringSelectMenuOptionBuilder()
              .setLabel("Giriş-Çıkış Kanalı")
              .setDescription(
                "Hoş geldin ve çıkış sistemini kurar."
              )
              .setEmoji("🤩")
              .setValue("panel_welcome"),

            new StringSelectMenuOptionBuilder()
              .setLabel("Puan Verme Kanalı")
              .setDescription(
                "Puan verme kanalını oluşturur."
              )
              .setEmoji("⭐")
              .setValue("panel_rating"),

            new StringSelectMenuOptionBuilder()
              .setLabel("Ses Oluştur")
              .setDescription(
                "Özel ses kanalı sistemini kurar."
              )
              .setEmoji("🔊")
              .setValue("panel_voice"),

            new StringSelectMenuOptionBuilder()
              .setLabel("Anons Ayarları")
              .setDescription(
                "Duyuru ve sohbet kanallarını belirler."
              )
              .setEmoji("📢")
              .setValue("panel_announcement")
          );

      const row =
        new ActionRowBuilder()
          .addComponents(menu);

      return message.reply({
        embeds: [embed],
        components: [row]
      });
    }
  } catch (error) {
    console.error(
      "❌ messageCreate hatası:",
      error
    );

    if (!message.replied) {
      await message.reply({
        content:
          "❌ İşlem sırasında beklenmeyen bir hata oluştu."
      }).catch(() => {});
    }
  }
});
// ======================================================
// PANEL VE SELECT MENU ETKİLEŞİMLERİ
// ======================================================

client.on("interactionCreate", async interaction => {
  try {
    if (!interaction.guild) return;

    // ==================================================
    // YÖNETİCİ KONTROLÜ
    // ==================================================

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId.startsWith("admin_panel")
    ) {
      if (
        !interaction.member.permissions.has(
          PermissionsBitField.Flags.Administrator
        )
      ) {
        return interaction.reply({
          content:
            "❌ Bu paneli kullanmak için **Yönetici** yetkisine sahip olmalısın.",
          ephemeral: true
        });
      }
    }

    // ==================================================
    // ANA PANEL
    // ==================================================

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId === "admin_panel_main"
    ) {
      const selected =
        interaction.values[0];

      // ----------------------------------------------
      // TICKET
      // ----------------------------------------------

      if (selected === "panel_ticket") {
        const embed =
          new EmbedBuilder()
            .setColor(0x8b5cf6)
            .setTitle("🎫 Ticket Sistemi Kur")
            .setDescription(
              "Ticket sisteminin kurulacağı kategoriyi seç.\n\n" +
              "Daha sonra ticket yetkilisi rolünü ve 4 ticket seçeneğini belirleyeceksin."
            )
            .setFooter({
              text: "Ticket Kurulum • 1/3"
            })
            .setTimestamp();

        const menu =
          new ChannelSelectMenuBuilder()
            .setCustomId(
              "ticket_setup_category"
            )
            .setPlaceholder(
              "📁 Ticket kategorisini seç..."
            )
            .setChannelTypes(
              ChannelType.GuildCategory
            );

        return interaction.update({
          embeds: [embed],
          components: [
            new ActionRowBuilder()
              .addComponents(menu)
          ]
        });
      }

      // ----------------------------------------------
      // TOPLU ROL VER
      // ----------------------------------------------

      if (
        selected === "panel_mass_role_add"
      ) {
        const embed =
          new EmbedBuilder()
            .setColor(0x22c55e)
            .setTitle("👥 Toplu Rol Ver")
            .setDescription(
              "Tüm uygun üyelere verilecek rolü seç."
            )
            .setTimestamp();

        const menu =
          new RoleSelectMenuBuilder()
            .setCustomId(
              "mass_role_add_select"
            )
            .setPlaceholder(
              "👥 Verilecek rolü seç..."
            );

        return interaction.update({
          embeds: [embed],
          components: [
            new ActionRowBuilder()
              .addComponents(menu)
          ]
        });
      }

      // ----------------------------------------------
      // TOPLU ROL AL
      // ----------------------------------------------

      if (
        selected === "panel_mass_role_remove"
      ) {
        const embed =
          new EmbedBuilder()
            .setColor(0xef4444)
            .setTitle("🗑️ Toplu Rol Al")
            .setDescription(
              "Tüm uygun üyelerden alınacak rolü seç."
            )
            .setTimestamp();

        const menu =
          new RoleSelectMenuBuilder()
            .setCustomId(
              "mass_role_remove_select"
            )
            .setPlaceholder(
              "🗑️ Alınacak rolü seç..."
            );

        return interaction.update({
          embeds: [embed],
          components: [
            new ActionRowBuilder()
              .addComponents(menu)
          ]
        });
      }

      // ----------------------------------------------
      // ÖNERİ
      // ----------------------------------------------

      if (
        selected === "panel_suggestion"
      ) {
        const embed =
          new EmbedBuilder()
            .setColor(0xf59e0b)
            .setTitle("💡 Öneri Kanalı Oluştur")
            .setDescription(
              "Öneri kanalının bulunacağı kategoriyi seç."
            )
            .setTimestamp();

        const menu =
          new ChannelSelectMenuBuilder()
            .setCustomId(
              "suggestion_setup_category"
            )
            .setPlaceholder(
              "📁 Kategori seç..."
            )
            .setChannelTypes(
              ChannelType.GuildCategory
            );

        return interaction.update({
          embeds: [embed],
          components: [
            new ActionRowBuilder()
              .addComponents(menu)
          ]
        });
      }

      // ----------------------------------------------
      // ROL VER
      // ----------------------------------------------

      if (
        selected === "panel_role_give"
      ) {
        const embed =
          new EmbedBuilder()
            .setColor(0x3b82f6)
            .setTitle("👤 Rol Ver")
            .setDescription(
              "Önce rol verilecek kişiyi seç."
            )
            .setTimestamp();

        const menu =
          new UserSelectMenuBuilder()
            .setCustomId(
              "role_give_user"
            )
            .setPlaceholder(
              "👤 Kullanıcı seç..."
            );

        return interaction.update({
          embeds: [embed],
          components: [
            new ActionRowBuilder()
              .addComponents(menu)
          ]
        });
      }

      // ----------------------------------------------
      // KOMUT BİLGİ
      // ----------------------------------------------

      if (
        selected === "panel_commands"
      ) {
        const embed =
          new EmbedBuilder()
            .setColor(0x8b5cf6)
            .setTitle("📖 Komut Bilgi")
            .setDescription(
              "Sunucudaki kullanılabilir komutlar aşağıdaki gibidir."
            )
            .addFields(
              {
                name: "👤 Oyuncu Komutları",
                value:
                  "`!avatar [@üye]`\n" +
                  "`!serverinfo`\n" +
                  "`!puanver <1-5>`\n" +
                  "`!öneri <mesaj>`"
              },
              {
                name: "🛡️ Yönetici Komutları",
                value:
                  "`!panel`\n" +
                  "`!duyuru <mesaj>`"
              }
            )
            .setTimestamp();

        return interaction.update({
          embeds: [embed],
          components: []
        });
      }

      // ----------------------------------------------
      // OTOROL
      // ----------------------------------------------

      if (
        selected === "panel_autorole"
      ) {
        const embed =
          new EmbedBuilder()
            .setColor(0x06b6d4)
            .setTitle("🤖 OtoRol")
            .setDescription(
              "Yeni üyeler sunucuya girdiğinde otomatik verilecek rolü seç."
            )
            .setTimestamp();

        const menu =
          new RoleSelectMenuBuilder()
            .setCustomId(
              "autorole_select"
            )
            .setPlaceholder(
              "🤖 Otomatik verilecek rolü seç..."
            );

        return interaction.update({
          embeds: [embed],
          components: [
            new ActionRowBuilder()
              .addComponents(menu)
          ]
        });
      }

      // ----------------------------------------------
      // GİRİŞ ÇIKIŞ
      // ----------------------------------------------

      if (
        selected === "panel_welcome"
      ) {
        const embed =
          new EmbedBuilder()
            .setColor(0x22c55e)
            .setTitle(
              "🤩 Giriş-Çıkış Kanalı Oluştur"
            )
            .setDescription(
              "Giriş-çıkış kanalının oluşturulacağı kategoriyi seç."
            )
            .setTimestamp();

        const menu =
          new ChannelSelectMenuBuilder()
            .setCustomId(
              "welcome_setup_category"
            )
            .setPlaceholder(
              "📁 Kategori seç..."
            )
            .setChannelTypes(
              ChannelType.GuildCategory
            );

        return interaction.update({
          embeds: [embed],
          components: [
            new ActionRowBuilder()
              .addComponents(menu)
          ]
        });
      }

      // ----------------------------------------------
      // PUAN KANALI
      // ----------------------------------------------

      if (
        selected === "panel_rating"
      ) {
        const embed =
          new EmbedBuilder()
            .setColor(0xfacc15)
            .setTitle(
              "⭐ Puan Verme Kanalı"
            )
            .setDescription(
              "Puan kanalının oluşturulacağı kategoriyi seç."
            )
            .setTimestamp();

        const menu =
          new ChannelSelectMenuBuilder()
            .setCustomId(
              "rating_setup_category"
            )
            .setPlaceholder(
              "📁 Kategori seç..."
            )
            .setChannelTypes(
              ChannelType.GuildCategory
            );

        return interaction.update({
          embeds: [embed],
          components: [
            new ActionRowBuilder()
              .addComponents(menu)
          ]
        });
      }

      // ----------------------------------------------
      // SES
      // ----------------------------------------------

      if (
        selected === "panel_voice"
      ) {
        const embed =
          new EmbedBuilder()
            .setColor(0x6366f1)
            .setTitle("🔊 Ses Oluştur")
            .setDescription(
              "Kullanıcıların gireceği ve özel ses odası oluşturacağı kanalın bulunacağı kategoriyi seç."
            )
            .setTimestamp();

        const menu =
          new ChannelSelectMenuBuilder()
            .setCustomId(
              "voice_setup_category"
            )
            .setPlaceholder(
              "📁 Kategori seç..."
            )
            .setChannelTypes(
              ChannelType.GuildCategory
            );

        return interaction.update({
          embeds: [embed],
          components: [
            new ActionRowBuilder()
              .addComponents(menu)
          ]
        });
      }

      // ----------------------------------------------
      // ANONS
      // ----------------------------------------------

      if (
        selected === "panel_announcement"
      ) {
        const embed =
          new EmbedBuilder()
            .setColor(0xf97316)
            .setTitle("📢 Anons Ayarları")
            .setDescription(
              "Önce duyuruların gönderileceği **duyuru kanalını** seç."
            )
            .setTimestamp()
            .setFooter({
              text:
                "Anons Kurulumu • 1/2"
            });

        const menu =
          new ChannelSelectMenuBuilder()
            .setCustomId(
              "announcement_channel_select"
            )
            .setPlaceholder(
              "📢 Duyuru kanalını seç..."
            )
            .setChannelTypes(
              ChannelType.GuildText,
              ChannelType.GuildAnnouncement
            );

        return interaction.update({
          embeds: [embed],
          components: [
            new ActionRowBuilder()
              .addComponents(menu)
          ]
        });
      }
    }

// ======================================================
// GİRİŞ-ÇIKIŞ KATEGORİ SEÇİMİ
// ======================================================

if (
  interaction.isChannelSelectMenu() &&
  interaction.customId === "welcome_setup_category"
) {
  try {
    const categoryId = interaction.values[0];

    const category =
      interaction.guild.channels.cache.get(categoryId);

    if (!category) {
      return interaction.reply({
        content: "❌ Kategori bulunamadı.",
        ephemeral: true
      });
    }

    const existing =
      interaction.guild.channels.cache.find(
        channel =>
          channel.name === "🤩│giriş-çıkış" &&
          channel.parentId === category.id
      );

    if (existing) {
      return interaction.reply({
        content:
          `⚠️ Giriş-çıkış kanalı zaten mevcut: ${existing}`,
        ephemeral: true
      });
    }

    const channel =
      await interaction.guild.channels.create({
        name: "🤩│giriş-çıkış",
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: [
          {
            id: interaction.guild.roles.everyone.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel
            ],
            deny: [
              PermissionsBitField.Flags.SendMessages
            ]
          },
          {
            id: interaction.client.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.EmbedLinks
            ]
          }
        ]
      });

    const config =
      getGuildConfig(interaction.guild.id);

    config.welcome = {
      enabled: true,
      channelId: channel.id
    };

    saveGuildConfig(
      interaction.guild.id,
      config
    );

    return interaction.update({
      embeds: [
        new EmbedBuilder()
          .setColor(0x22c55e)
          .setTitle("🤩 Giriş-Çıkış Sistemi Hazır")
          .setDescription(
            `Giriş ve çıkış mesajlarının gönderileceği kanal oluşturuldu:\n\n` +
            `${channel}\n\n` +
            "✅ Yeni üyeler giriş yaptığında\n" +
            "👋 Üyeler ayrıldığında\n" +
            "mesajlar bu kanala gönderilecek."
          )
          .setTimestamp()
          .setFooter({
            text: "Giriş-Çıkış Sistemi"
          })
      ],
      components: []
    });

  } catch (error) {
    console.error(
      "Giriş-çıkış kurulum hatası:",
      error
    );

    if (
      !interaction.replied &&
      !interaction.deferred
    ) {
      return interaction.reply({
        content:
          "❌ Giriş-çıkış sistemi kurulurken bir hata oluştu.",
        ephemeral: true
      });
    }
  }
}


// ======================================================
// PUAN KATEGORİ SEÇİMİ
// ======================================================

if (
  interaction.isChannelSelectMenu() &&
  interaction.customId === "rating_setup_category"
) {
  try {
    const categoryId = interaction.values[0];

    const category =
      interaction.guild.channels.cache.get(categoryId);

    if (!category) {
      return interaction.reply({
        content: "❌ Kategori bulunamadı.",
        ephemeral: true
      });
    }

    const existing =
      interaction.guild.channels.cache.find(
        channel =>
          channel.name === "⭐│puan" &&
          channel.parentId === category.id
      );

    if (existing) {
      return interaction.reply({
        content:
          `⚠️ Puan kanalı zaten mevcut: ${existing}`,
        ephemeral: true
      });
    }

    const channel =
      await interaction.guild.channels.create({
        name: "⭐│puan",
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: [
          {
            id: interaction.guild.roles.everyone.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages
            ]
          },
          {
            id: interaction.client.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.EmbedLinks,
              PermissionsBitField.Flags.ManageMessages
            ]
          }
        ]
      });

    const config =
      getGuildConfig(interaction.guild.id);

    config.rating = {
      enabled: true,
      channelId: channel.id,
      total: 0,
      count: 0,
      users: {}
    };

    saveGuildConfig(
      interaction.guild.id,
      config
    );

    return interaction.update({
      embeds: [
        new EmbedBuilder()
          .setColor(0xfacc15)
          .setTitle("⭐ Puan Sistemi Hazır")
          .setDescription(
            `Puan verme kanalı oluşturuldu:\n\n` +
            `${channel}\n\n` +
            "⭐ Üyeler bu kanalda `!puanver 1-5` komutuyla sunucuya puan verebilir."
          )
          .setTimestamp()
          .setFooter({
            text: "Puan Sistemi"
          })
      ],
      components: []
    });

  } catch (error) {
    console.error(
      "Puan kanalı kurulum hatası:",
      error
    );

    if (
      !interaction.replied &&
      !interaction.deferred
    ) {
      return interaction.reply({
        content:
          "❌ Puan sistemi kurulurken bir hata oluştu.",
        ephemeral: true
      });
    }
  }
}
    
    // ==================================================
    // TICKET KATEGORİ SEÇİMİ
    // ==================================================

    if (
      interaction.isChannelSelectMenu() &&
      interaction.customId ===
        "ticket_setup_category"
    ) {
      const categoryId =
        interaction.values[0];

      const category =
        interaction.guild.channels.cache.get(
          categoryId
        );

      if (!category) {
        return interaction.reply({
          content:
            "❌ Kategori bulunamadı.",
          ephemeral: true
        });
      }

      const embed =
        new EmbedBuilder()
          .setColor(0x8b5cf6)
          .setTitle(
            "🎫 Ticket Yetkilisi"
          )
          .setDescription(
            `📁 Ticket kategorisi: ${category}\n\n` +
            "Şimdi ticketları görebilecek ve yönetebilecek **yetkili rolünü** seç."
          )
          .setTimestamp()
          .setFooter({
            text: "Ticket Kurulum • 2/3"
          });

      const menu =
        new RoleSelectMenuBuilder()
          .setCustomId(
            `ticket_setup_role_${categoryId}`
          )
          .setPlaceholder(
            "🛡️ Ticket yetkilisi rolünü seç..."
          );

      return interaction.update({
        embeds: [embed],
        components: [
          new ActionRowBuilder()
            .addComponents(menu)
        ]
      });
    }

    // ==================================================
    // TICKET ROL SEÇİMİ
    // ==================================================

    if (
      interaction.isRoleSelectMenu() &&
      interaction.customId.startsWith(
        "ticket_setup_role_"
      )
    ) {
      const categoryId =
        interaction.customId.replace(
          "ticket_setup_role_",
          ""
        );

      const roleId =
        interaction.values[0];

      const role =
        interaction.guild.roles.cache.get(
          roleId
        );

      if (!role) {
        return interaction.reply({
          content:
            "❌ Rol bulunamadı.",
          ephemeral: true
        });
      }

      if (
        !canManageRole(
          interaction.guild,
          role
        )
      ) {
        return interaction.reply({
          content:
            "❌ Bot bu rolü yönetemez. Botun rolünün altında bir rol seçmelisin.",
          ephemeral: true
        });
      }

      const embed =
        new EmbedBuilder()
          .setColor(0x8b5cf6)
          .setTitle(
            "🎫 Ticket Seçenekleri"
          )
          .setDescription(
            `📁 Kategori: <#${categoryId}>\n` +
            `🛡️ Yetkili rolü: ${role}\n\n` +
            "Ticket sisteminde kullanılacak **4 seçenek için isimleri** belirle."
          )
          .addFields(
            {
              name: "1️⃣ Seçenek",
              value:
                "Aşağıdaki butona basarak isim belirle.",
              inline: false
            },
            {
              name: "2️⃣ Seçenek",
              value:
                "Aşağıdaki butona basarak isim belirle.",
              inline: false
            },
            {
              name: "3️⃣ Seçenek",
              value:
                "Aşağıdaki butona basarak isim belirle.",
              inline: false
            },
            {
              name: "4️⃣ Seçenek",
              value:
                "Aşağıdaki butona basarak isim belirle.",
              inline: false
            }
          )
          .setTimestamp()
          .setFooter({
            text: "Ticket Kurulum • 3/3"
          });

      const row =
        new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(
                `ticket_option_1_${categoryId}_${roleId}`
              )
              .setLabel(
                "1. Seçeneği Belirle"
              )
              .setStyle(
                ButtonStyle.Primary
              ),

            new ButtonBuilder()
              .setCustomId(
                `ticket_option_2_${categoryId}_${roleId}`
              )
              .setLabel(
                "2. Seçeneği Belirle"
              )
              .setStyle(
                ButtonStyle.Primary
              ),

            new ButtonBuilder()
              .setCustomId(
                `ticket_option_3_${categoryId}_${roleId}`
              )
              .setLabel(
                "3. Seçeneği Belirle"
              )
              .setStyle(
                ButtonStyle.Primary
              ),

            new ButtonBuilder()
              .setCustomId(
                `ticket_option_4_${categoryId}_${roleId}`
              )
              .setLabel(
                "4. Seçeneği Belirle"
              )
              .setStyle(
                ButtonStyle.Primary
              )
          );

      const row2 =
        new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(
                `ticket_finish_${categoryId}_${roleId}`
              )
              .setLabel(
                "🎫 Ticket Sistemini Kur"
              )
              .setStyle(
                ButtonStyle.Success
              )
          );

      const config =
        getGuildConfig(
          interaction.guild.id
        );

      config.ticket.setup = {
        categoryId,
        staffRoleId: roleId,
        options: [
          {
            id: 1,
            name: null
          },
          {
            id: 2,
            name: null
          },
          {
            id: 3,
            name: null
          },
          {
            id: 4,
            name: null
          }
        ]
      };

      saveGuildConfig(
        interaction.guild.id,
        config
      );

      return interaction.update({
        embeds: [embed],
        components: [
          row,
          row2
        ]
      });
    }
  } catch (error) {
    console.error(
      "❌ Panel interaction hatası:",
      error
    );

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content:
          "❌ İşlem sırasında bir hata oluştu.",
        ephemeral: true
      }).catch(() => {});
    }
  }
});
// ======================================================
// TICKET BUTONLARI VE MODAL SİSTEMİ
// ======================================================

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

client.on("interactionCreate", async interaction => {
  try {
    if (!interaction.guild) return;

    // ==================================================
    // TICKET SEÇENEĞİ İSİM BELİRLEME
    // ==================================================

    if (
      interaction.isButton() &&
      interaction.customId.startsWith(
        "ticket_option_"
      )
    ) {
      if (
        !interaction.member.permissions.has(
          PermissionsBitField.Flags.Administrator
        )
      ) {
        return interaction.reply({
          content:
            "❌ Bu işlemi yalnızca yöneticiler yapabilir.",
          ephemeral: true
        });
      }

      const parts =
        interaction.customId.split("_");

      const optionNumber =
        parts[2];

      const categoryId =
        parts[3];

      const roleId =
        parts[4];

      const modal =
        new ModalBuilder()
          .setCustomId(
            `ticket_option_modal_${optionNumber}_${categoryId}_${roleId}`
          )
          .setTitle(
            `${optionNumber}. Ticket Seçeneği`
          );

      const input =
        new TextInputBuilder()
          .setCustomId(
            "ticket_option_name"
          )
          .setLabel(
            "Ticket seçeneğinin adı"
          )
          .setPlaceholder(
            "Örn: Genel Destek"
          )
          .setStyle(
            TextInputStyle.Short
          )
          .setRequired(true)
          .setMaxLength(50);

      modal.addComponents(
        new ActionRowBuilder()
          .addComponents(input)
      );

      return interaction.showModal(
        modal
      );
    }

    // ==================================================
    // TICKET SEÇENEĞİ MODAL
    // ==================================================

    if (
      interaction.isModalSubmit() &&
      interaction.customId.startsWith(
        "ticket_option_modal_"
      )
    ) {
      if (
        !interaction.member.permissions.has(
          PermissionsBitField.Flags.Administrator
        )
      ) {
        return interaction.reply({
          content:
            "❌ Bu işlemi yalnızca yöneticiler yapabilir.",
          ephemeral: true
        });
      }

      const parts =
        interaction.customId.split("_");

      const optionNumber =
        Number(parts[3]);

      const categoryId =
        parts[4];

      const roleId =
        parts[5];

      const optionName =
        interaction.fields
          .getTextInputValue(
            "ticket_option_name"
          )
          .trim();

      if (!optionName) {
        return interaction.reply({
          content:
            "❌ Seçenek adı boş bırakılamaz.",
          ephemeral: true
        });
      }

      const config =
        getGuildConfig(
          interaction.guild.id
        );

      if (
        !config.ticket.setup ||
        !config.ticket.setup.options
      ) {
        return interaction.reply({
          content:
            "❌ Ticket kurulumu bulunamadı. `!panel` üzerinden tekrar başlat.",
          ephemeral: true
        });
      }

      const option =
        config.ticket.setup.options.find(
          item =>
            item.id === optionNumber
        );

      if (!option) {
        return interaction.reply({
          content:
            "❌ Ticket seçeneği bulunamadı.",
          ephemeral: true
        });
      }

      option.name =
        optionName;

      config.ticket.setup.categoryId =
        categoryId;

      config.ticket.setup.staffRoleId =
        roleId;

      saveGuildConfig(
        interaction.guild.id,
        config
      );

      return interaction.reply({
        content:
          `✅ **${optionNumber}. ticket seçeneği** \`${optionName}\` olarak ayarlandı.`,
        ephemeral: true
      });
    }

    // ==================================================
    // TICKET SİSTEMİNİ KUR
    // ==================================================

    if (
      interaction.isButton() &&
      interaction.customId.startsWith(
        "ticket_finish_"
      )
    ) {
      if (
        !interaction.member.permissions.has(
          PermissionsBitField.Flags.Administrator
        )
      ) {
        return interaction.reply({
          content:
            "❌ Bu işlemi yalnızca yöneticiler yapabilir.",
          ephemeral: true
        });
      }

      const parts =
        interaction.customId.split("_");

      const categoryId =
        parts[2];

      const roleId =
        parts[3];

      const config =
        getGuildConfig(
          interaction.guild.id
        );

      if (
        !config.ticket.setup
      ) {
        return interaction.reply({
          content:
            "❌ Ticket kurulum bilgileri bulunamadı.",
          ephemeral: true
        });
      }

      const setup =
        config.ticket.setup;

      const options =
        setup.options || [];

      if (
        options.length !== 4 ||
        options.some(
          option =>
            !option.name ||
            option.name.trim().length === 0
        )
      ) {
        return interaction.reply({
          content:
            "❌ Ticket sistemini kurmadan önce 4 seçeneğin tamamının adını belirlemelisin.",
          ephemeral: true
        });
      }

      const category =
        interaction.guild.channels.cache.get(
          categoryId
        );

      const staffRole =
        interaction.guild.roles.cache.get(
          roleId
        );

      if (!category) {
        return interaction.reply({
          content:
            "❌ Ticket kategorisi bulunamadı.",
          ephemeral: true
        });
      }

      if (
        category.type !==
        ChannelType.GuildCategory
      ) {
        return interaction.reply({
          content:
            "❌ Seçilen kanal bir kategori değil.",
          ephemeral: true
        });
      }

      if (!staffRole) {
        return interaction.reply({
          content:
            "❌ Ticket yetkilisi rolü bulunamadı.",
          ephemeral: true
        });
      }

      if (
        !canManageRole(
          interaction.guild,
          staffRole
        )
      ) {
        return interaction.reply({
          content:
            "❌ Bot bu ticket yetkilisi rolünü yönetemiyor.",
          ephemeral: true
        });
      }

      // ----------------------------------------------
      // TICKET PANELİ İÇİN KANAL SEÇ
      // ----------------------------------------------

      const embed =
        new EmbedBuilder()
          .setColor(0x8b5cf6)
          .setTitle(
            "🎫 Ticket Panel Kanalı"
          )
          .setDescription(
            `Ticket kategorisi: ${category}\n` +
            `Ticket yetkilisi: ${staffRole}\n\n` +
            "Şimdi ticket panelinin gönderileceği **metin kanalını** seç."
          )
          .setTimestamp()
          .setFooter({
            text:
              "Ticket Kurulumu • Son Aşama"
          });

      const menu =
        new ChannelSelectMenuBuilder()
          .setCustomId(
            `ticket_panel_channel_${categoryId}_${roleId}`
          )
          .setPlaceholder(
            "💬 Ticket panel kanalını seç..."
          )
          .setChannelTypes(
            ChannelType.GuildText
          );

      return interaction.update({
        embeds: [embed],
        components: [
          new ActionRowBuilder()
            .addComponents(menu)
        ]
      });
    }

    // ==================================================
    // TICKET PANEL KANALI SEÇİMİ
    // ==================================================

    if (
      interaction.isChannelSelectMenu() &&
      interaction.customId.startsWith(
        "ticket_panel_channel_"
      )
    ) {
      if (
        !interaction.member.permissions.has(
          PermissionsBitField.Flags.Administrator
        )
      ) {
        return interaction.reply({
          content:
            "❌ Bu işlemi yalnızca yöneticiler yapabilir.",
          ephemeral: true
        });
      }

      const parts =
        interaction.customId.split("_");

      const categoryId =
        parts[3];

      const roleId =
        parts[4];

      const channelId =
        interaction.values[0];

      const panelChannel =
        interaction.guild.channels.cache.get(
          channelId
        );

      const category =
        interaction.guild.channels.cache.get(
          categoryId
        );

      const staffRole =
        interaction.guild.roles.cache.get(
          roleId
        );

      if (!panelChannel) {
        return interaction.reply({
          content:
            "❌ Panel kanalı bulunamadı.",
          ephemeral: true
        });
      }

      const config =
        getGuildConfig(
          interaction.guild.id
        );

      if (
        !config.ticket.setup ||
        !config.ticket.setup.options
      ) {
        return interaction.reply({
          content:
            "❌ Ticket kurulumu bulunamadı.",
          ephemeral: true
        });
      }

      const options =
        config.ticket.setup.options;

      // ----------------------------------------------
      // TICKET BUTONLARI
      // ----------------------------------------------

      const ticketButtons =
        new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(
                "ticket_open_1"
              )
              .setLabel(
                options[0].name
              )
              .setEmoji("🎫")
              .setStyle(
                ButtonStyle.Primary
              ),

            new ButtonBuilder()
              .setCustomId(
                "ticket_open_2"
              )
              .setLabel(
                options[1].name
              )
              .setEmoji("🎫")
              .setStyle(
                ButtonStyle.Primary
              ),

            new ButtonBuilder()
              .setCustomId(
                "ticket_open_3"
              )
              .setLabel(
                options[2].name
              )
              .setEmoji("🎫")
              .setStyle(
                ButtonStyle.Primary
              ),

            new ButtonBuilder()
              .setCustomId(
                "ticket_open_4"
              )
              .setLabel(
                options[3].name
              )
              .setEmoji("🎫")
              .setStyle(
                ButtonStyle.Primary
              )
          );

      const ticketEmbed =
        new EmbedBuilder()
          .setColor(0x8b5cf6)
          .setTitle(
            "🎫 Destek Merkezi"
          )
          .setDescription(
            "## Yardıma mı ihtiyacın var?\n\n" +
            "Aşağıdaki seçeneklerden sana uygun olanı seçerek bir ticket oluşturabilirsin.\n\n" +
            "🔒 Her kullanıcı aynı anda yalnızca **1 ticket** açabilir.\n\n" +
            "📌 Ticket açarken doğru seçeneği kullanmaya dikkat et."
          )
          .addFields({
            name: "🛡️ Ticket Yetkilileri",
            value: `${staffRole}`,
            inline: true
          })
          .setThumbnail(
            interaction.guild.iconURL({
              dynamic: true,
              size: 1024
            }) || null
          )
          .setTimestamp()
          .setFooter({
            text:
              `${interaction.guild.name} • Destek Sistemi`
          });

      const sentMessage =
        await panelChannel.send({
          embeds: [ticketEmbed],
          components: [ticketButtons]
        });

      // ----------------------------------------------
      // KALICI TICKET AYARLARI
      // ----------------------------------------------

      config.ticket = {
        enabled: true,
        categoryId,
        staffRoleId: roleId,
        channelId,
        panelMessageId:
          sentMessage.id,
        options: options.map(
          option => ({
            id: option.id,
            name: option.name
          })
        )
      };

      delete config.ticket.setup;

      saveGuildConfig(
        interaction.guild.id,
        config
      );

      const successEmbed =
        new EmbedBuilder()
          .setColor(0x22c55e)
          .setTitle(
            "✅ Ticket Sistemi Kuruldu"
          )
          .setDescription(
            `Ticket sistemi başarıyla kuruldu.\n\n` +
            `📁 **Kategori:** ${category}\n` +
            `🛡️ **Yetkili Rolü:** ${staffRole}\n` +
            `💬 **Panel Kanalı:** ${panelChannel}\n\n` +
            `🎫 Panel mesajı gönderildi.`
          )
          .setTimestamp();

      return interaction.update({
        embeds: [successEmbed],
        components: []
      });
    }
  } catch (error) {
    console.error(
      "❌ Ticket kurulum hatası:",
      error
    );

    if (
      !interaction.replied &&
      !interaction.deferred
    ) {
      await interaction.reply({
        content:
          "❌ İşlem sırasında beklenmeyen bir hata oluştu.",
        ephemeral: true
      }).catch(() => {});
    }
  }
});
// ======================================================
// TICKET AÇMA / KAPATMA / TRANSCRIPT
// ======================================================

async function findUserTicket(guild, userId) {
  const config = getGuildConfig(guild.id);

  if (!config.ticket?.enabled) {
    return null;
  }

  const category = guild.channels.cache.get(
    config.ticket.categoryId
  );

  if (!category) {
    return null;
  }

  const channels = guild.channels.cache.filter(
    channel =>
      channel.parentId === category.id &&
      channel.type === ChannelType.GuildText &&
      channel.topic?.includes(`ticketOwner:${userId}`)
  );

  return channels.first() || null;
}

async function collectTicketMessages(channel) {
  const messages = [];
  let lastId;

  while (true) {
    const options = {
      limit: 100
    };

    if (lastId) {
      options.before = lastId;
    }

    const batch =
      await channel.messages.fetch(options);

    if (!batch.size) {
      break;
    }

    messages.push(
      ...Array.from(batch.values())
    );

    lastId =
      batch.last().id;

    if (
      batch.size < 100 ||
      messages.length >= 5000
    ) {
      break;
    }
  }

  return messages.reverse();
}

function createTranscriptText(
  channel,
  messages
) {
  const lines = [];

  lines.push(
    "=================================================="
  );

  lines.push(
    "                 TICKET TRANSCRIPT"
  );

  lines.push(
    "=================================================="
  );

  lines.push("");

  lines.push(
    `Sunucu: ${channel.guild.name}`
  );

  lines.push(
    `Kanal: #${channel.name}`
  );

  lines.push(
    `Kanal ID: ${channel.id}`
  );

  lines.push(
    `Oluşturulma: ${new Date(
      channel.createdTimestamp
    ).toLocaleString("tr-TR")}`
  );

  lines.push("");

  lines.push(
    "=================================================="
  );

  lines.push("");

  for (const message of messages) {
    const date =
      new Date(
        message.createdTimestamp
      ).toLocaleString("tr-TR");

    const author =
      `${message.author.tag} (${message.author.id})`;

    let content =
      message.content || "";

    if (
      message.attachments &&
      message.attachments.size
    ) {
      const attachments =
        Array.from(
          message.attachments.values()
        )
          .map(
            attachment =>
              `[Dosya: ${attachment.url}]`
          )
          .join(" ");

      content +=
        content ? ` ${attachments}` : attachments;
    }

    if (!content.trim()) {
      content = "[Mesaj içeriği yok]";
    }

    lines.push(
      `[${date}] ${author}: ${content}`
    );
  }

  lines.push("");

  lines.push(
    "=================================================="
  );

  lines.push(
    "                 TRANSCRIPT SONU"
  );

  lines.push(
    "=================================================="
  );

  return lines.join("\n");
}

async function sendTranscript(
  guild,
  ticketChannel,
  ticketOwnerId
) {
  const messages =
    await collectTicketMessages(
      ticketChannel
    );

  const transcript =
    createTranscriptText(
      ticketChannel,
      messages
    );

  const buffer =
    Buffer.from(
      transcript,
      "utf8"
    );

  const fileName =
    `transcript-${ticketChannel.name}.txt`;

  const config =
    getGuildConfig(guild.id);

  const ticketStaffRole =
    guild.roles.cache.get(
      config.ticket.staffRoleId
    );

  const ticketOwner =
    await guild.members.fetch(
      ticketOwnerId
    ).catch(() => null);

  const guildOwner =
    await guild.fetchOwner().catch(
      () => null
    );

  const receivers = new Map();

  if (ticketOwner) {
    receivers.set(
      ticketOwner.id,
      ticketOwner.user
    );
  }

  if (guildOwner) {
    receivers.set(
      guildOwner.id,
      guildOwner.user
    );
  }

  if (ticketStaffRole) {
    for (
      const [, member]
      of ticketStaffRole.members
    ) {
      receivers.set(
        member.id,
        member.user
      );
    }
  }

  const embed =
    new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle(
        "🎫 Ticket Transcript"
      )
      .setDescription(
        `**Sunucu:** ${guild.name}\n` +
        `**Ticket:** #${ticketChannel.name}\n` +
        `**Ticket Sahibi:** <@${ticketOwnerId}>\n\n` +
        "Ticket kapatıldı ve konuşma kaydı oluşturuldu."
      )
      .setTimestamp()
      .setFooter({
        text:
          "Ticket Yönetim Sistemi"
      });

  let sentCount = 0;

  for (
    const [, user]
    of receivers
  ) {
    try {
      await user.send({
        embeds: [embed],
        files: [
          {
            attachment: buffer,
            name: fileName
          }
        ]
      });

      sentCount++;
    } catch (error) {
      console.log(
        `Transcript DM gönderilemedi: ${user.tag}`
      );
    }
  }

  return sentCount;
}

// ======================================================
// TICKET ETKİLEŞİMLERİ
// ======================================================

client.on(
  "interactionCreate",
  async interaction => {
    try {
      if (!interaction.guild) {
        return;
      }

      // ==================================================
      // TICKET AÇ
      // ==================================================

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "ticket_open_"
        )
      ) {
        const config =
          getGuildConfig(
            interaction.guild.id
          );

        if (!config.ticket?.enabled) {
          return interaction.reply({
            content:
              "❌ Ticket sistemi şu anda aktif değil.",
            ephemeral: true
          });
        }

        const optionId =
          Number(
            interaction.customId.replace(
              "ticket_open_",
              ""
            )
          );

        const selectedOption =
          config.ticket.options.find(
            option =>
              option.id === optionId
          );

        if (!selectedOption) {
          return interaction.reply({
            content:
              "❌ Ticket seçeneği bulunamadı.",
            ephemeral: true
          });
        }

        // ----------------------------------------------
        // ZATEN AÇIK TICKET VAR MI?
        // ----------------------------------------------

        const existingTicket =
          await findUserTicket(
            interaction.guild,
            interaction.user.id
          );

        if (existingTicket) {
          return interaction.reply({
            content:
              `❌ Zaten açık bir ticketın var: ${existingTicket}`,
            ephemeral: true
          });
        }

        const category =
          interaction.guild.channels.cache.get(
            config.ticket.categoryId
          );

        const staffRole =
          interaction.guild.roles.cache.get(
            config.ticket.staffRoleId
          );

        if (!category) {
          return interaction.reply({
            content:
              "❌ Ticket kategorisi bulunamadı.",
            ephemeral: true
          });
        }

        if (!staffRole) {
          return interaction.reply({
            content:
              "❌ Ticket yetkilisi rolü bulunamadı.",
            ephemeral: true
          });
        }

        // ----------------------------------------------
        // TICKET KANAL ADI
        // ----------------------------------------------

        const safeUsername =
          cleanChannelName(
            interaction.user.username
          );

        const channelName =
          `ticket-${safeUsername}`;

        // ----------------------------------------------
        // TICKET KANALI
        // ----------------------------------------------

        const ticketChannel =
          await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: category.id,
            topic:
              `ticketOwner:${interaction.user.id} | option:${selectedOption.id}`,
            permissionOverwrites: [
              {
                id:
                  interaction.guild.roles.everyone.id,
                deny: [
                  PermissionsBitField.Flags.ViewChannel
                ]
              },
              {
                id: interaction.user.id,
                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.SendMessages,
                  PermissionsBitField.Flags.ReadMessageHistory,
                  PermissionsBitField.Flags.AttachFiles,
                  PermissionsBitField.Flags.EmbedLinks
                ]
              },
              {
                id: staffRole.id,
                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.SendMessages,
                  PermissionsBitField.Flags.ReadMessageHistory,
                  PermissionsBitField.Flags.AttachFiles,
                  PermissionsBitField.Flags.EmbedLinks,
                  PermissionsBitField.Flags.ManageMessages
                ]
              },
              {
                id:
                  interaction.client.user.id,
                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.SendMessages,
                  PermissionsBitField.Flags.ReadMessageHistory,
                  PermissionsBitField.Flags.ManageChannels,
                  PermissionsBitField.Flags.ManageMessages,
                  PermissionsBitField.Flags.AttachFiles,
                  PermissionsBitField.Flags.EmbedLinks
                ]
              }
            ]
          });

        // ----------------------------------------------
        // TICKET BİLGİLERİNİ KAYDET
        // ----------------------------------------------

        const tickets =
          loadJSON(files.tickets);

        if (!tickets[interaction.guild.id]) {
          tickets[interaction.guild.id] = {};
        }

        tickets[interaction.guild.id][
          ticketChannel.id
        ] = {
          channelId:
            ticketChannel.id,
          ownerId:
            interaction.user.id,
          staffRoleId:
            staffRole.id,
          optionId:
            selectedOption.id,
          optionName:
            selectedOption.name,
          createdAt:
            Date.now()
        };

        saveJSON(
          files.tickets,
          tickets
        );

        // ----------------------------------------------
        // TICKET EMBED
        // ----------------------------------------------

        const ticketEmbed =
          new EmbedBuilder()
            .setColor(0x8b5cf6)
            .setTitle(
              "🎫 Ticket Açıldı"
            )
            .setDescription(
              `Merhaba ${interaction.user}, hoş geldin!\n\n` +
              `📌 **Konu:** ${selectedOption.name}\n` +
              `👤 **Ticket Sahibi:** ${interaction.user}\n` +
              `🛡️ **Yetkili:** ${staffRole}\n\n` +
              "Sorununuzu veya talebinizi detaylı şekilde açıklayabilirsiniz.\n\n" +
              "🔒 Ticket kapatıldığında konuşma transcripti oluşturulacaktır."
            )
            .addFields({
              name:
                "📋 Ticket Bilgileri",
              value:
                `Kategori: **${selectedOption.name}**\n` +
                `Oluşturulma: <t:${Math.floor(
                  Date.now() / 1000
                )}:F>`
            })
            .setThumbnail(
              interaction.user.displayAvatarURL({
                dynamic: true,
                size: 512
              })
            )
            .setTimestamp()
            .setFooter({
              text:
                `${interaction.guild.name} • Ticket Sistemi`
            });

        const ticketControls =
          new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(
                  "ticket_close"
                )
                .setLabel(
                  "Ticket Kapat"
                )
                .setEmoji("🔒")
                .setStyle(
                  ButtonStyle.Danger
                )
            );

        await ticketChannel.send({
          content:
            `${interaction.user} ${staffRole}`,
          embeds: [ticketEmbed],
          components: [
            ticketControls
          ]
        });

        await interaction.reply({
          content:
            `✅ Ticketın oluşturuldu: ${ticketChannel}`,
          ephemeral: true
        });

        return;
      }

      // ==================================================
      // TICKET KAPAT
      // ==================================================

      if (
        interaction.isButton() &&
        interaction.customId ===
          "ticket_close"
      ) {
        const tickets =
          loadJSON(files.tickets);

        const guildTickets =
          tickets[
            interaction.guild.id
          ] || {};

        const ticketData =
          guildTickets[
            interaction.channel.id
          ];

        if (!ticketData) {
          return interaction.reply({
            content:
              "❌ Bu kanal kayıtlı bir ticket değil.",
            ephemeral: true
          });
        }

        const isOwner =
          interaction.user.id ===
          ticketData.ownerId;

        const isStaff =
          interaction.member.roles.cache.has(
            ticketData.staffRoleId
          );

        const isAdmin =
          interaction.member.permissions.has(
            PermissionsBitField.Flags.Administrator
          );

        if (
          !isOwner &&
          !isStaff &&
          !isAdmin
        ) {
          return interaction.reply({
            content:
              "❌ Bu ticketı kapatmak için ticket sahibi veya ticket yetkilisi olmalısın.",
            ephemeral: true
          });
        }

        const confirmRow =
          new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(
                  "ticket_close_confirm"
                )
                .setLabel(
                  "Evet, Ticketı Kapat"
                )
                .setEmoji("🔒")
                .setStyle(
                  ButtonStyle.Danger
                ),

              new ButtonBuilder()
                .setCustomId(
                  "ticket_close_cancel"
                )
                .setLabel(
                  "İptal"
                )
                .setEmoji("↩️")
                .setStyle(
                  ButtonStyle.Secondary
                )
            );

        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xef4444)
              .setTitle(
                "🔒 Ticket Kapatılsın mı?"
              )
              .setDescription(
                "Ticket kapatıldığında konuşmalar transcript olarak kaydedilecek ve ticket sahibi ile ticket yetkililerine gönderilecektir."
              )
          ],
          components: [confirmRow],
          ephemeral: true
        });
      }

      // ==================================================
      // KAPATMA İPTAL
      // ==================================================

      if (
        interaction.isButton() &&
        interaction.customId ===
          "ticket_close_cancel"
      ) {
        return interaction.update({
          content:
            "↩️ Ticket kapatma işlemi iptal edildi.",
          embeds: [],
          components: []
        });
      }

      // ==================================================
      // KAPATMA ONAY
      // ==================================================

      if (
        interaction.isButton() &&
        interaction.customId ===
          "ticket_close_confirm"
      ) {
        const tickets =
          loadJSON(files.tickets);

        const guildTickets =
          tickets[
            interaction.guild.id
          ] || {};

        const ticketData =
          guildTickets[
            interaction.channel.id
          ];

        if (!ticketData) {
          return interaction.update({
            content:
              "❌ Ticket verisi bulunamadı.",
            embeds: [],
            components: []
          });
        }

        const isOwner =
          interaction.user.id ===
          ticketData.ownerId;

        const isStaff =
          interaction.member.roles.cache.has(
            ticketData.staffRoleId
          );

        const isAdmin =
          interaction.member.permissions.has(
            PermissionsBitField.Flags.Administrator
          );

        if (
          !isOwner &&
          !isStaff &&
          !isAdmin
        ) {
          return interaction.update({
            content:
              "❌ Bu ticketı kapatma yetkin yok.",
            embeds: [],
            components: []
          });
        }

        await interaction.update({
          content:
            "⏳ Ticket kapatılıyor ve transcript hazırlanıyor...",
          embeds: [],
          components: []
        });

        // ----------------------------------------------
        // TRANSCRIPT GÖNDER
        // ----------------------------------------------

        let transcriptCount = 0;

        try {
          transcriptCount =
            await sendTranscript(
              interaction.guild,
              interaction.channel,
              ticketData.ownerId
            );
        } catch (error) {
          console.error(
            "Transcript oluşturma hatası:",
            error
          );
        }

        // ----------------------------------------------
        // VERİYİ SİL
        // ----------------------------------------------

        delete guildTickets[
          interaction.channel.id
        ];

        tickets[
          interaction.guild.id
        ] = guildTickets;

        saveJSON(
          files.tickets,
          tickets
        );

        // ----------------------------------------------
        // KAPAT
        // ----------------------------------------------

        await interaction.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0xef4444)
              .setTitle(
                "🔒 Ticket Kapatılıyor"
              )
              .setDescription(
                `🎫 Ticket kapatıldı.\n\n` +
                `📄 Transcript ${transcriptCount} kişiye gönderildi.\n` +
                "Kanal birkaç saniye içinde silinecek."
              )
              .setTimestamp()
          ]
        });

        setTimeout(
          async () => {
            await interaction.channel
              .delete(
                "Ticket kapatıldı"
              )
              .catch(() => {});
          },
          5000
        );
      }
    } catch (error) {
      console.error(
        "❌ Ticket sistemi hatası:",
        error
      );

      if (
        !interaction.replied &&
        !interaction.deferred
      ) {
        await interaction.reply({
          content:
            "❌ Ticket işlemi sırasında bir hata oluştu.",
          ephemeral: true
        }).catch(() => {});
      }
    }
  }
);
// ======================================================
// AVATAR + SERVERINFO + PUAN + OTOROL + GİRİŞ/ÇIKIŞ
// ======================================================

// ======================================================
// AVATAR KOMUTU
// ======================================================

client.on("messageCreate", async message => {
  try {
    if (
      message.author.bot ||
      !message.guild
    ) {
      return;
    }

    if (
      !message.content
        .toLowerCase()
        .startsWith("!avatar")
    ) {
      return;
    }

    const args =
      message.content
        .trim()
        .split(/\s+/)
        .slice(1);

    let user =
      message.mentions.users.first();

    if (!user && args[0]) {
      const userId =
        args[0].replace(/[<@!>]/g, "");

      user =
        await client.users.fetch(
          userId
        ).catch(() => null);
    }

    if (!user) {
      user = message.author;
    }

    const avatar =
      user.displayAvatarURL({
        dynamic: true,
        size: 4096
      });

    const embed =
      new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle(
          `🖼️ ${user.username} • Avatar`
        )
        .setImage(avatar)
        .setDescription(
          `[🔗 Avatarı yeni sekmede aç](${avatar})`
        )
        .setTimestamp()
        .setFooter({
          text:
            `${message.guild.name} • Avatar Sistemi`
        });

    await message.reply({
      embeds: [embed]
    });

  } catch (error) {
    console.error(
      "Avatar hatası:",
      error
    );
  }
});

// ======================================================
// SERVERINFO
// ======================================================

client.on("messageCreate", async message => {
  try {
    if (
      message.author.bot ||
      !message.guild ||
      message.content
        .toLowerCase()
        !== "!serverinfo"
    ) {
      return;
    }

    const guild =
      message.guild;

    const config =
      getGuildConfig(
        guild.id
      );

    const rating =
      config.rating || {
        total: 0,
        count: 0,
        users: {}
      };

    const average =
      rating.count > 0
        ? (
            rating.total /
            rating.count
          ).toFixed(1)
        : "0.0";

    const memberCount =
      guild.memberCount;

    const owner =
      await guild.fetchOwner()
        .catch(() => null);

    const createdTimestamp =
      Math.floor(
        guild.createdTimestamp /
          1000
      );

    const stars =
      createStars(
        Number(average)
      );

    const embed =
      new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle(
          `🏰 ${guild.name}`
        )
        .setDescription(
          `## 🌐 Sunucu Bilgileri\n\n` +
          `${stars} **${average}/5**\n\n` +
          "Sunucu hakkında tüm temel bilgiler aşağıda."
        )
        .addFields(
          {
            name:
              "👑 Sunucu Sahibi",
            value:
              owner
                ? `${owner}`
                : "Bilinmiyor",
            inline: true
          },
          {
            name:
              "👥 Üye Sayısı",
            value:
              `**${memberCount.toLocaleString("tr-TR")}**`,
            inline: true
          },
          {
            name:
              "📅 Kurulma Zamanı",
            value:
              `<t:${createdTimestamp}:F>\n<t:${createdTimestamp}:R>`,
            inline: true
          },
          {
            name:
              "⭐ Sunucu Puanı",
            value:
              `**${average}/5**\n${stars}`,
            inline: true
          },
          {
            name:
              "🆔 Sunucu ID",
            value:
              `\`${guild.id}\``,
            inline: true
          },
          {
            name:
              "🌍 Bölge",
            value:
              guild.preferredLocale ||
              "Bilinmiyor",
            inline: true
          }
        )
        .setThumbnail(
          guild.iconURL({
            dynamic: true,
            size: 1024
          }) || null
        )
        .setTimestamp()
        .setFooter({
          text:
            `${guild.name} • Server Info`
        });

    await message.reply({
      embeds: [embed]
    });

  } catch (error) {
    console.error(
      "ServerInfo hatası:",
      error
    );
  }
});

// ======================================================
// PUAN VER
// ======================================================

client.on("messageCreate", async message => {
  try {
    if (
      message.author.bot ||
      !message.guild
    ) {
      return;
    }

    const config =
      getGuildConfig(
        message.guild.id
      );

    const ratingChannelId =
      config.rating?.channelId;

    const isRatingCommand =
      message.content
        .toLowerCase()
        .startsWith("!puanver");

    // --------------------------------------------------
    // PUAN KANALINDA SADECE PUANVER ÇALIŞSIN
    // --------------------------------------------------

    if (
      ratingChannelId &&
      message.channel.id ===
        ratingChannelId &&
      !isRatingCommand
    ) {
      await message.delete()
        .catch(() => {});

      const warning =
        await message.channel.send({
          content:
            `❌ ${message.author}, bu kanal sadece **sunucuya puan vermek** için kullanılabilir.\n` +
            "`!puanver <1-5>` şeklinde kullanabilirsin."
        });

      setTimeout(
        () =>
          warning.delete()
            .catch(() => {}),
        5000
      );

      return;
    }

    if (!isRatingCommand) {
      return;
    }

    if (
      ratingChannelId &&
      message.channel.id !==
        ratingChannelId
    ) {
      return message.reply({
        content:
          `❌ Puan vermek için <#${ratingChannelId}> kanalını kullanmalısın.`
      });
    }

    const args =
      message.content
        .trim()
        .split(/\s+/);

    const score =
      Number(args[1]);

    if (
      !Number.isInteger(score) ||
      score < 1 ||
      score > 5
    ) {
      return message.reply({
        content:
          "❌ Puan **1 ile 5 arasında** olmalıdır.\n\n" +
          "Örnek: `!puanver 5`"
      });
    }

    if (!config.rating) {
      config.rating = {
        total: 0,
        count: 0,
        users: {}
      };
    }

    if (!config.rating.users) {
      config.rating.users = {};
    }

    // --------------------------------------------------
    // AYNI KİŞİ TEKRAR PUAN VEREMESİN
    // --------------------------------------------------

    const previous =
      config.rating.users[
        message.author.id
      ];

    if (
      typeof previous === "number"
    ) {
      return message.reply({
        content:
          `⚠️ Daha önce **${previous}/5** puan verdin.\n` +
          "Puanını değiştirmek için birazdan ekleyeceğimiz sistem kullanılacak."
      });
    }

    config.rating.total +=
      score;

    config.rating.count +=
      1;

    config.rating.users[
      message.author.id
    ] = score;

    saveGuildConfig(
      message.guild.id,
      config
    );

    const average =
      (
        config.rating.total /
        config.rating.count
      ).toFixed(1);

    const stars =
      createStars(
        Number(average)
      );

    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xfacc15)
          .setTitle(
            "⭐ Puanın Kaydedildi!"
          )
          .setDescription(
            `${message.author}, sunucuya **${score}/5** puan verdin.\n\n` +
            `📊 **Güncel Sunucu Puanı:** ${average}/5\n` +
            `${stars}\n\n` +
            `👥 Toplam değerlendirme: **${config.rating.count}**`
          )
          .setTimestamp()
      ]
    });

  } catch (error) {
    console.error(
      "Puan sistemi hatası:",
      error
    );
  }
});

// ======================================================
// ÖNERİ KANALI KURULUMU
// ======================================================

client.on(
  "interactionCreate",
  async interaction => {
    try {
      if (
        !interaction.guild ||
        !interaction.isChannelSelectMenu()
      ) {
        return;
      }

      if (
        interaction.customId !==
        "suggestion_setup_category"
      ) {
        return;
      }

      if (
        !interaction.member.permissions.has(
          PermissionsBitField.Flags.Administrator
        )
      ) {
        return interaction.reply({
          content:
            "❌ Bu işlemi yalnızca yöneticiler yapabilir.",
          ephemeral: true
        });
      }

      const categoryId =
        interaction.values[0];

      const category =
        interaction.guild.channels.cache.get(
          categoryId
        );

      if (!category) {
        return interaction.reply({
          content:
            "❌ Kategori bulunamadı.",
          ephemeral: true
        });
      }

      const existing =
        interaction.guild.channels.cache.find(
          channel =>
            channel.name ===
              "🆘│öneri" &&
            channel.parentId ===
              categoryId
        );

      if (existing) {
        return interaction.reply({
          content:
            `⚠️ Öneri kanalı zaten mevcut: ${existing}`,
          ephemeral: true
        });
      }

      const channel =
        await interaction.guild.channels.create({
          name: "🆘│öneri",
          type: ChannelType.GuildText,
          parent: category.id,
          topic:
            "Sunucu öneri kanalı • !öneri <öneri>",
          permissionOverwrites: [
            {
              id:
                interaction.guild
                  .roles
                  .everyone
                  .id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.ReadMessageHistory
              ],
              deny: [
                PermissionsBitField.Flags.SendMessages
              ]
            },
            {
              id:
                interaction.client.user.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory,
                PermissionsBitField.Flags.ManageMessages
              ]
            }
          ]
        });

      const config =
        getGuildConfig(
          interaction.guild.id
        );

      config.suggestion = {
        channelId:
          channel.id,
        categoryId:
          category.id
      };

      saveGuildConfig(
        interaction.guild.id,
        config
      );

      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x8b5cf6)
            .setTitle(
              "💡 Öneri Merkezi"
            )
            .setDescription(
              "Sunucumuzun gelişmesine katkıda bulun!\n\n" +
              "📝 Öneri göndermek için:\n" +
              "`!öneri <önerin>`\n\n" +
              "Öneriler diğer üyeler tarafından desteklenebilir."
            )
            .setThumbnail(
              interaction.guild.iconURL({
                dynamic: true
              }) || null
            )
            .setTimestamp()
            .setFooter({
              text:
                `${interaction.guild.name} • Öneri Sistemi`
            })
        ]
      });

      return interaction.update({
        embeds: [
          new EmbedBuilder()
            .setColor(0x22c55e)
            .setTitle(
              "✅ Öneri Kanalı Oluşturuldu"
            )
            .setDescription(
              `Öneri sistemi başarıyla kuruldu.\n\n` +
              `💡 Kanal: ${channel}\n` +
              `📁 Kategori: ${category}`
            )
            .setTimestamp()
        ],
        components: []
      });

    } catch (error) {
      console.error(
        "Öneri kanal kurulum hatası:",
        error
      );
    }
  }
);

// ======================================================
// OTOROL SEÇİMİ
// ======================================================

client.on(
  "interactionCreate",
  async interaction => {
    try {
      if (
        !interaction.guild ||
        !interaction.isRoleSelectMenu() ||
        interaction.customId !==
          "autorole_select"
      ) {
        return;
      }

      if (
        !interaction.member.permissions.has(
          PermissionsBitField.Flags.Administrator
        )
      ) {
        return interaction.reply({
          content:
            "❌ Bu işlemi yalnızca yöneticiler yapabilir.",
          ephemeral: true
        });
      }

      const roleId =
        interaction.values[0];

      const role =
        interaction.guild.roles.cache.get(
          roleId
        );

      if (!role) {
        return interaction.reply({
          content:
            "❌ Rol bulunamadı.",
          ephemeral: true
        });
      }

      if (
        !canManageRole(
          interaction.guild,
          role
        )
      ) {
        return interaction.reply({
          content:
            "❌ Bot bu rolü veremez. Bot rolünün altında bir rol seç.",
          ephemeral: true
        });
      }

      const config =
        getGuildConfig(
          interaction.guild.id
        );

      config.autorole = {
        enabled: true,
        roleId
      };

      saveGuildConfig(
        interaction.guild.id,
        config
      );

      return interaction.update({
        embeds: [
          new EmbedBuilder()
            .setColor(0x22c55e)
            .setTitle(
              "🤖 OtoRol Aktif"
            )
            .setDescription(
              `Sunucuya yeni giren üyelere otomatik olarak ${role} rolü verilecek.`
            )
            .setTimestamp()
        ],
        components: []
      });

    } catch (error) {
      console.error(
        "OtoRol hatası:",
        error
      );
    }
  }
);

// ======================================================
// ÜYE GİRİŞİ
// ======================================================

client.on(
  "guildMemberAdd",
  async member => {
    try {
      const config =
        getGuildConfig(
          member.guild.id
        );

      // ------------------------------------------------
      // OTOROL
      // ------------------------------------------------

      if (
        config.autorole?.enabled &&
        config.autorole.roleId
      ) {
        const role =
          member.guild.roles.cache.get(
            config.autorole.roleId
          );

        if (
          role &&
          canManageRole(
            member.guild,
            role
          )
        ) {
          await member.roles
            .add(role)
            .catch(error =>
              console.error(
                "OtoRol verilemedi:",
                error
              )
            );
        }
      }

      // ------------------------------------------------
      // GİRİŞ-ÇIKIŞ KANALI
      // ------------------------------------------------

      const welcomeChannel =
        member.guild.channels.cache.get(
          config.welcome?.channelId
        );

      if (!welcomeChannel) {
        return;
      }

      const accountAge =
        Date.now() -
        member.user.createdTimestamp;

      const days =
        Math.floor(
          accountAge /
            (1000 * 60 * 60 * 24)
        );

      const months =
        days / 30.44;

      let reliability;
      let reliabilityEmoji;

      if (months < 2) {
        reliability =
          "Güvenilir değil";
        reliabilityEmoji =
          "⚠️";
      } else if (months < 5) {
        reliability =
          "Stabil";
        reliabilityEmoji =
          "🟡";
      } else if (months < 24) {
        reliability =
          "Güvenilir";
        reliabilityEmoji =
          "🟢";
      } else {
        reliability =
          "%100 Güvenilir";
        reliabilityEmoji =
          "💎";
      }

      const embed =
        new EmbedBuilder()
          .setColor(0x22c55e)
          .setTitle(
            "🤩 Yeni Bir Üye Geldi!"
          )
          .setDescription(
            `## Hoş geldin ${member}!\n\n` +
            "Aramıza katıldığın için mutluyuz. 🎉"
          )
          .addFields(
            {
              name:
                "👤 Üye",
              value:
                `${member}\n\`${member.user.tag}\``,
              inline: true
            },
            {
              name:
                "📅 Giriş Tarihi",
              value:
                `<t:${Math.floor(
                  Date.now() / 1000
                )}:F>`,
              inline: true
            },
            {
              name:
                "🗓️ Hesap Tarihi",
              value:
                `<t:${Math.floor(
                  member.user.createdTimestamp /
                    1000
                )}:F>\n<t:${Math.floor(
                  member.user.createdTimestamp /
                    1000
                )}:R>`,
              inline: true
            },
            {
              name:
                `${reliabilityEmoji} Güvenilirlik`,
              value:
                `**${reliability}**`,
              inline: true
            },
            {
              name:
                "⌛ Hesap Yaşı",
              value:
                `**${days.toLocaleString(
                  "tr-TR"
                )} gün**`,
              inline: true
            }
          )
          .setThumbnail(
            member.user.displayAvatarURL({
              dynamic: true,
              size: 1024
            })
          )
          .setTimestamp()
          .setFooter({
            text:
              `${member.guild.name} • Giriş Sistemi`
          });

      await welcomeChannel.send({
        content:
          `${member} 🎉`,
        embeds: [embed]
      });

    } catch (error) {
      console.error(
        "Üye giriş sistemi hatası:",
        error
      );
    }
  }
);

// ======================================================
// ÜYE ÇIKIŞI
// ======================================================

client.on(
  "guildMemberRemove",
  async member => {
    try {
      const config =
        getGuildConfig(
          member.guild.id
        );

      const channel =
        member.guild.channels.cache.get(
          config.welcome?.channelId
        );

      if (!channel) {
        return;
      }

      const embed =
        new EmbedBuilder()
          .setColor(0xef4444)
          .setTitle(
            "👋 Bir Üye Ayrıldı"
          )
          .setDescription(
            `**${member.user.tag}** sunucudan ayrıldı.`
          )
          .addFields({
            name:
              "👤 Üye",
            value:
              `${member.user}`,
            inline: true
          })
          .addFields({
            name:
              "📅 Ayrılma Tarihi",
            value:
              `<t:${Math.floor(
                Date.now() / 1000
              )}:F>`,
            inline: true
          })
          .setThumbnail(
            member.user.displayAvatarURL({
              dynamic: true,
              size: 512
            })
          )
          .setTimestamp()
          .setFooter({
            text:
              `${member.guild.name} • Giriş-Çıkış`
          });

      await channel.send({
        embeds: [embed]
      });

    } catch (error) {
      console.error(
        "Üye çıkış sistemi hatası:",
        error
      );
    }
  }
);

// ======================================================
// YARDIMCI FONKSİYONLAR
// ======================================================

function createStars(score) {
  const rounded =
    Math.round(score);

  return (
    "⭐".repeat(
      Math.max(
        0,
        Math.min(
          5,
          rounded
        )
      )
    ) +
    "☆".repeat(
      Math.max(
        0,
        5 -
          Math.min(
            5,
            rounded
            )
      )
    )
  );
}
// ======================================================
// 8/8 — SES OLUŞTURMA + ANONS + PANEL
// ======================================================

// ======================================================
// SES OLUŞTURMA KANALI KURULUMU
// ======================================================

client.on(
  "interactionCreate",
  async interaction => {
    try {
      if (
        !interaction.guild ||
        !interaction.isChannelSelectMenu()
      ) {
        return;
      }

      if (
        interaction.customId !==
        "voice_setup_category"
      ) {
        return;
      }

      if (
        !interaction.member.permissions.has(
          PermissionsBitField.Flags.Administrator
        )
      ) {
        return interaction.reply({
          content:
            "❌ Bu işlemi yalnızca yöneticiler kullanabilir.",
          ephemeral: true
        });
      }

      const categoryId =
        interaction.values[0];

      const category =
        interaction.guild.channels.cache.get(
          categoryId
        );

      if (!category) {
        return interaction.reply({
          content:
            "❌ Kategori bulunamadı.",
          ephemeral: true
        });
      }

      const existing =
        interaction.guild.channels.cache.find(
          channel =>
            channel.name ===
              "🔊│ses-oluştur" &&
            channel.parentId ===
              category.id
        );

      if (existing) {
        return interaction.reply({
          content:
            `⚠️ Ses oluşturma kanalı zaten mevcut: ${existing}`,
          ephemeral: true
        });
      }

      const voiceChannel =
        await interaction.guild.channels.create({
          name: "🔊│ses-oluştur",
          type: ChannelType.GuildVoice,
          parent: category.id,
          permissionOverwrites: [
            {
              id:
                interaction.guild.roles.everyone.id,
              allow: [
                PermissionsBitField.Flags.Connect,
                PermissionsBitField.Flags.ViewChannel
              ]
            },
            {
              id:
                interaction.client.user.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.Connect,
                PermissionsBitField.Flags.MoveMembers,
                PermissionsBitField.Flags.ManageChannels
              ]
            }
          ]
        });

      const config =
        getGuildConfig(
          interaction.guild.id
        );

      config.voiceCreator = {
        enabled: true,
        categoryId:
          category.id,
        channelId:
          voiceChannel.id
      };

      saveGuildConfig(
        interaction.guild.id,
        config
      );

      return interaction.update({
        embeds: [
          new EmbedBuilder()
            .setColor(0x22c55e)
            .setTitle(
              "🔊 Ses Oluşturma Sistemi Hazır"
            )
            .setDescription(
              `Kullanıcıların gireceği kanal oluşturuldu:\n\n` +
              `${voiceChannel}\n\n` +
              "Bir kullanıcı bu kanala girdiğinde kendisine özel ses odası otomatik oluşturulacak ve kullanıcı o odaya taşınacak."
            )
            .setTimestamp()
        ],
        components: []
      });

    } catch (error) {
      console.error(
        "Ses oluşturma kurulum hatası:",
        error
      );
    }
  }
);

// ======================================================
// ÖZEL SES ODASI OLUŞTUR
// ======================================================

client.on(
  "voiceStateUpdate",
  async (oldState, newState) => {
    try {
      const guild =
        newState.guild;

      if (!guild) {
        return;
      }

      const config =
        getGuildConfig(
          guild.id
        );

      if (
        !config.voiceCreator?.enabled
      ) {
        return;
      }

      const creatorId =
        config.voiceCreator.channelId;

      // --------------------------------------------------
      // KULLANICI SES OLUŞTUR KANALINA GİRDİ
      // --------------------------------------------------

      if (
        newState.channelId === creatorId
      ) {
        const member =
          newState.member;

        if (!member) {
          return;
        }

        const category =
          guild.channels.cache.get(
            config.voiceCreator.categoryId
          );

        if (!category) {
          return;
        }

        const safeName = member.displayName;

        const roomName =
          `🔊 ${safeName}'ın Odası`;

        const room =
          await guild.channels.create({
            name: roomName,
            type: ChannelType.GuildVoice,
            parent: category.id,
            permissionOverwrites: [
              {
                id:
                  guild.roles.everyone.id,
                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.Connect
                ]
              },
              {
                id:
                  member.id,
                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.Connect,
                  PermissionsBitField.Flags.Speak,
                  PermissionsBitField.Flags.Stream,
                  PermissionsBitField.Flags.MoveMembers,
                  PermissionsBitField.Flags.ManageChannels
                ]
              },
              {
                id:
                  client.user.id,
                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.Connect,
                  PermissionsBitField.Flags.MoveMembers,
                  PermissionsBitField.Flags.ManageChannels
                ]
              }
            ]
          });

        // ------------------------------------------------
        // ODA VERİSİ
        // ------------------------------------------------

        const rooms =
          loadJSON(files.voiceRooms);

        if (!rooms[guild.id]) {
          rooms[guild.id] = {};
        }

        rooms[guild.id][room.id] = {
          channelId:
            room.id,
          ownerId:
            member.id,
          limit: 0,
          locked: false,
          createdAt:
            Date.now()
        };

        saveJSON(
          files.voiceRooms,
          rooms
        );

        // ------------------------------------------------
        // KULLANICIYI ODAYA TAŞI
        // ------------------------------------------------

        await member.voice
          .setChannel(room)
          .catch(() => {});

        // ------------------------------------------------
        // ODA KONTROL MESAJI
        // ------------------------------------------------

        const controlEmbed =
          new EmbedBuilder()
            .setColor(0x6366f1)
            .setTitle(
              "🔊 Özel Ses Odan"
            )
            .setDescription(
              `Merhaba ${member}!\n\n` +
              "Bu oda sana özel oluşturuldu.\n\n" +
              "Aşağıdaki butonlardan odanı yönetebilirsin."
            )
            .addFields(
              {
                name:
                  "👥 Kullanıcı Limiti",
                value:
                  "Sınırsız",
                inline: true
              },
              {
                name:
                  "🔓 Oda Durumu",
                value:
                  "Açık",
                inline: true
              }
            )
            .setTimestamp()
            .setFooter({
              text:
                "Ses Odası Yönetimi"
            });

        const controls =
          new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(
                  `voice_limit_${room.id}`
                )
                .setLabel(
                  "Limit"
                )
                .setEmoji("👥")
                .setStyle(
                  ButtonStyle.Primary
                ),

              new ButtonBuilder()
                .setCustomId(
                  `voice_lock_${room.id}`
                )
                .setLabel(
                  "Kilitle"
                )
                .setEmoji("🔒")
                .setStyle(
                  ButtonStyle.Danger
                ),

              new ButtonBuilder()
                .setCustomId(
                  `voice_unlock_${room.id}`
                )
                .setLabel(
                  "Kilidi Aç"
                )
                .setEmoji("🔓")
                .setStyle(
                  ButtonStyle.Success
                ),

              new ButtonBuilder()
                .setCustomId(
                  `voice_delete_${room.id}`
                )
                .setLabel(
                  "Odayı Sil"
                )
                .setEmoji("🗑️")
                .setStyle(
                  ButtonStyle.Secondary
                )
            );

        await room.send({
          embeds: [
            controlEmbed
          ],
          components: [
            controls
          ]
        }).catch(() => {});
      }

      // --------------------------------------------------
      // ESKİ ODADA KİMSE KALMADI
      // --------------------------------------------------

      if (
        oldState.channelId &&
        oldState.channelId !==
          creatorId
      ) {
        const rooms =
          loadJSON(files.voiceRooms);

        const roomData =
          rooms[guild.id]?.[
            oldState.channelId
          ];

        if (
          roomData &&
          oldState.channel
        ) {
          if (
            oldState.channel.members.size ===
            0
          ) {
            delete rooms[guild.id][
              oldState.channelId
            ];

            saveJSON(
              files.voiceRooms,
              rooms
            );

            await oldState.channel
              .delete(
                "Özel ses odasında kimse kalmadı"
              )
              .catch(() => {});
          }
        }
      }

    } catch (error) {
      console.error(
        "VoiceState hatası:",
        error
      );
    }
  }
);

// ======================================================
// SES ODASI BUTONLARI
// ======================================================

client.on(
  "interactionCreate",
  async interaction => {
    try {
      if (
        !interaction.guild ||
        !interaction.isButton()
      ) {
        return;
      }

      if (
        !interaction.customId.startsWith(
          "voice_"
        )
      ) {
        return;
      }

      const parts =
        interaction.customId.split("_");

      const action =
        parts[1];

      const roomId =
        parts.slice(2).join("_");

      const rooms =
        loadJSON(
          files.voiceRooms
        );

      const roomData =
        rooms[
          interaction.guild.id
        ]?.[roomId];

      if (!roomData) {
        return interaction.reply({
          content:
            "❌ Bu ses odası artık mevcut değil.",
          ephemeral: true
        });
      }

      if (
        interaction.user.id !==
        roomData.ownerId
      ) {
        return interaction.reply({
          content:
            "❌ Bu ses odasını yalnızca oda sahibi yönetebilir.",
          ephemeral: true
        });
      }

      const room =
        interaction.guild.channels.cache.get(
          roomId
        );

      if (!room) {
        return interaction.reply({
          content:
            "❌ Ses odası bulunamadı.",
          ephemeral: true
        });
      }

      // --------------------------------------------------
      // LİMİT
      // --------------------------------------------------

      if (
        action === "limit"
      ) {
        const modal =
          new ModalBuilder()
            .setCustomId(
              `voice_limit_modal_${roomId}`
            )
            .setTitle(
              "👥 Kullanıcı Limiti"
            );

        const input =
          new TextInputBuilder()
            .setCustomId(
              "voice_limit_value"
            )
            .setLabel(
              "Kaç kişi gelebilsin?"
            )
            .setPlaceholder(
              "0 = sınırsız, 1-99 arası sayı"
            )
            .setStyle(
              TextInputStyle.Short
            )
            .setRequired(true)
            .setMaxLength(2);

        modal.addComponents(
          new ActionRowBuilder()
            .addComponents(input)
        );

        return interaction.showModal(
          modal
        );
      }

      // --------------------------------------------------
      // KİLİTLE
      // --------------------------------------------------

      if (
        action === "lock"
      ) {
        await room.permissionOverwrites.edit(
          interaction.guild.roles.everyone,
          {
            Connect: false
          }
        );

        roomData.locked = true;

        saveJSON(
          files.voiceRooms,
          rooms
        );

        return interaction.reply({
          content:
            "🔒 Ses odası kilitlendi. Yeni kullanıcılar odaya katılamaz.",
          ephemeral: true
        });
      }

      // --------------------------------------------------
      // KİLİDİ AÇ
      // --------------------------------------------------

      if (
        action === "unlock"
      ) {
        await room.permissionOverwrites.edit(
          interaction.guild.roles.everyone,
          {
            Connect: true
          }
        );

        roomData.locked = false;

        saveJSON(
          files.voiceRooms,
          rooms
        );

        return interaction.reply({
          content:
            "🔓 Ses odasının kilidi açıldı.",
          ephemeral: true
        });
      }

      // --------------------------------------------------
      // ODAYI SİL
      // --------------------------------------------------

      if (
        action === "delete"
      ) {
        delete rooms[
          interaction.guild.id
        ][roomId];

        saveJSON(
          files.voiceRooms,
          rooms
        );

        await room.delete(
          "Oda sahibi tarafından silindi"
        );

        return interaction.reply({
          content:
            "🗑️ Ses odan silindi.",
          ephemeral: true
        });
      }

    } catch (error) {
      console.error(
        "Ses odası buton hatası:",
        error
      );
    }
  }
);

// ======================================================
// SES LİMİT MODAL
// ======================================================

client.on(
  "interactionCreate",
  async interaction => {
    try {
      if (
        !interaction.guild ||
        !interaction.isModalSubmit()
      ) {
        return;
      }

      if (
        !interaction.customId.startsWith(
          "voice_limit_modal_"
        )
      ) {
        return;
      }

      const roomId =
        interaction.customId.replace(
          "voice_limit_modal_",
          ""
        );

      const rooms =
        loadJSON(
          files.voiceRooms
        );

      const roomData =
        rooms[
          interaction.guild.id
        ]?.[roomId];

      if (!roomData) {
        return interaction.reply({
          content:
            "❌ Ses odası bulunamadı.",
          ephemeral: true
        });
      }

      if (
        interaction.user.id !==
        roomData.ownerId
      ) {
        return interaction.reply({
          content:
            "❌ Bu işlemi yalnızca oda sahibi yapabilir.",
          ephemeral: true
        });
      }

      const value =
        Number(
          interaction.fields
            .getTextInputValue(
              "voice_limit_value"
            )
        );

      if (
        !Number.isInteger(value) ||
        value < 0 ||
        value > 99
      ) {
        return interaction.reply({
          content:
            "❌ Limit 0 ile 99 arasında olmalıdır.\n`0` sınırsız anlamına gelir.",
          ephemeral: true
        });
      }

      const room =
        interaction.guild.channels.cache.get(
          roomId
        );

      if (!room) {
        return interaction.reply({
          content:
            "❌ Ses odası bulunamadı.",
          ephemeral: true
        });
      }

      await room.setUserLimit(
        value
      );

      roomData.limit =
        value;

      saveJSON(
        files.voiceRooms,
        rooms
      );

      return interaction.reply({
        content:
          value === 0
            ? "👥 Ses odası kullanıcı limiti **sınırsız** olarak ayarlandı."
            : `👥 Ses odası limiti **${value} kişi** olarak ayarlandı.`,
        ephemeral: true
      });

    } catch (error) {
      console.error(
        "Ses limit hatası:",
        error
      );
    }
  }
);

// ======================================================
// ANONS KANALI 1
// ======================================================

client.on(
  "interactionCreate",
  async interaction => {
    try {
      if (
        !interaction.guild ||
        !interaction.isChannelSelectMenu()
      ) {
        return;
      }

      if (
        interaction.customId !==
        "announcement_channel_select"
      ) {
        return;
      }

      if (
        !interaction.member.permissions.has(
          PermissionsBitField.Flags.Administrator
        )
      ) {
        return interaction.reply({
          content:
            "❌ Bu işlemi yalnızca yöneticiler yapabilir.",
          ephemeral: true
        });
      }

      const channelId =
        interaction.values[0];

      const channel =
        interaction.guild.channels.cache.get(
          channelId
        );

      if (!channel) {
        return interaction.reply({
          content:
            "❌ Kanal bulunamadı.",
          ephemeral: true
        });
      }

      const embed =
        new EmbedBuilder()
          .setColor(0xf97316)
          .setTitle(
            "💬 Anons Sohbet Kanalı"
          )
          .setDescription(
            `Duyuru kanalı olarak ${channel} seçildi.\n\n` +
            "Şimdi duyuruların ayrıca gönderileceği **sohbet kanalını** seç."
          )
          .setTimestamp()
          .setFooter({
            text:
              "Anons Kurulumu • 2/2"
          });

      const menu =
        new ChannelSelectMenuBuilder()
          .setCustomId(
            `announcement_chat_select_${channelId}`
          )
          .setPlaceholder(
            "💬 Sohbet kanalını seç..."
          )
          .setChannelTypes(
            ChannelType.GuildText
          );

      return interaction.update({
        embeds: [
          embed
        ],
        components: [
          new ActionRowBuilder()
            .addComponents(menu)
        ]
      });

    } catch (error) {
      console.error(
        "Anons kanal 1 hatası:",
        error
      );
    }
  }
);

// ======================================================
// ANONS KANALI 2
// ======================================================

client.on(
  "interactionCreate",
  async interaction => {
    try {
      if (
        !interaction.guild ||
        !interaction.isChannelSelectMenu()
      ) {
        return;
      }

      if (
        !interaction.customId.startsWith(
          "announcement_chat_select_"
        )
      ) {
        return;
      }

      if (
        !interaction.member.permissions.has(
          PermissionsBitField.Flags.Administrator
        )
      ) {
        return interaction.reply({
          content:
            "❌ Bu işlemi yalnızca yöneticiler yapabilir.",
          ephemeral: true
        });
      }

      const announcementId =
        interaction.customId.replace(
          "announcement_chat_select_",
          ""
        );

      const chatId =
        interaction.values[0];

      const announcementChannel =
        interaction.guild.channels.cache.get(
          announcementId
        );

      const chatChannel =
        interaction.guild.channels.cache.get(
          chatId
        );

      if (
        !announcementChannel ||
        !chatChannel
      ) {
        return interaction.reply({
          content:
            "❌ Kanallardan biri bulunamadı.",
          ephemeral: true
        });
      }

      const config =
        getGuildConfig(
          interaction.guild.id
        );

      config.announcement = {
        enabled: true,
        announcementChannelId:
          announcementId,
        chatChannelId:
          chatId
      };

      saveGuildConfig(
        interaction.guild.id,
        config
      );

      return interaction.update({
        embeds: [
          new EmbedBuilder()
            .setColor(0x22c55e)
            .setTitle(
              "✅ Anons Sistemi Kuruldu"
            )
            .setDescription(
              `📢 **Duyuru Kanalı:** ${announcementChannel}\n` +
              `💬 **Sohbet Kanalı:** ${chatChannel}\n\n` +
              "Artık `!duyuru <mesaj>` komutu kullanıldığında mesaj iki kanala da gönderilecek.\n\n" +
              "📢 Duyuru kanalında: **@everyone + @here**\n" +
              "💬 Sohbet kanalında: **etiketsiz**"
            )
            .setTimestamp()
        ],
        components: []
      });

    } catch (error) {
      console.error(
        "Anons kanal 2 hatası:",
        error
      );
    }
  }
);

// ======================================================
// DUYURU KOMUTU
// ======================================================

client.on(
  "messageCreate",
  async message => {
    try {
      if (
        message.author.bot ||
        !message.guild
      ) {
        return;
      }

      if (
        !message.content
          .toLowerCase()
          .startsWith("!duyuru")
      ) {
        return;
      }

      if (
        !message.member.permissions.has(
          PermissionsBitField.Flags.Administrator
        )
      ) {
        return message.reply({
          content:
            "❌ Bu komutu yalnızca yöneticiler kullanabilir."
        });
      }

      const config =
        getGuildConfig(
          message.guild.id
        );

      if (
        !config.announcement?.enabled
      ) {
        return message.reply({
          content:
            "❌ Anons sistemi henüz kurulmamış. `!panel` üzerinden kurabilirsin."
        });
      }

      const announcementText =
        message.content
          .slice("!duyuru".length)
          .trim();

      if (!announcementText) {
        return message.reply({
          content:
            "❌ Duyuru metni boş bırakılamaz.\n\n" +
            "Örnek:\n" +
            "`!duyuru Sunucumuzda yeni etkinlik başladı!`"
        });
      }

      const announcementChannel =
        message.guild.channels.cache.get(
          config.announcement
            .announcementChannelId
        );

      const chatChannel =
        message.guild.channels.cache.get(
          config.announcement
            .chatChannelId
        );

      if (
        !announcementChannel ||
        !chatChannel
      ) {
        return message.reply({
          content:
            "❌ Anons kanallarından biri bulunamadı."
        });
      }

      const announcementEmbed =
        new EmbedBuilder()
          .setColor(0xf97316)
          .setTitle(
            "📢 SUNUCU DUYURUSU"
          )
          .setDescription(
            announcementText
          )
          .addFields({
            name:
              "📣 Duyuru Sahibi",
            value:
              `${message.author}`,
            inline: true
          })
          .setThumbnail(
            message.guild.iconURL({
              dynamic: true,
              size: 512
            }) || null
          )
          .setTimestamp()
          .setFooter({
            text:
              `${message.guild.name} • Duyuru Sistemi`
          });

      // ------------------------------------------------
      // DUYURU KANALI
      // ------------------------------------------------

      await announcementChannel.send({
        content:
          "@everyone @here",
        embeds: [
          announcementEmbed
        ],
        allowedMentions: {
          parse: [
            "everyone"
          ]
        }
      });

      // ------------------------------------------------
      // SOHBET KANALI
      // ------------------------------------------------

      const chatEmbed =
        EmbedBuilder.from(
          announcementEmbed
        )
          .setTitle(
            "📢 Yeni Duyuru"
          )
          .setDescription(
            announcementText
          );

      await chatChannel.send({
        embeds: [
          chatEmbed
        ],
        allowedMentions: {
          parse: []
        }
      });

      await message.delete()
        .catch(() => {});

      const confirmation =
        await chatChannel.send({
          content:
            `✅ ${message.author} tarafından duyuru yayınlandı.`
        });

      setTimeout(
        () =>
          confirmation.delete()
            .catch(() => {}),
        5000
      );

    } catch (error) {
      console.error(
        "Duyuru sistemi hatası:",
        error
      );
    }
  }
);

// ======================================================
// !ÖNERİ KOMUTU
// ======================================================

client.on(
  "messageCreate",
  async message => {
    try {
      if (
        message.author.bot ||
        !message.guild
      ) {
        return;
      }

      const content =
        message.content.trim();

      if (
        !content
          .toLowerCase()
          .startsWith("!öneri")
      ) {
        return;
      }

      const config =
        getGuildConfig(
          message.guild.id
        );

      const suggestionChannelId =
        config.suggestion?.channelId;

      if (!suggestionChannelId) {
        return message.reply({
          content:
            "❌ Öneri sistemi henüz kurulmamış. `!panel` üzerinden **Öneri Kanalı** sistemini kur."
        });
      }

      if (
        message.channel.id !==
        suggestionChannelId
      ) {
        return message.reply({
          content:
            `❌ Öneri vermek için <#${suggestionChannelId}> kanalını kullanmalısın.`
        });
      }

      const suggestion =
        content
          .slice("!öneri".length)
          .trim();

      if (!suggestion) {
        return message.reply({
          content:
            "❌ Bir öneri yazmalısın.\n\nÖrnek:\n`!öneri Sunucuya yeni bir etkinlik gelsin.`"
        });
      }

      await message.delete()
        .catch(() => {});

      const embed =
        new EmbedBuilder()
          .setColor(0xf59e0b)
          .setTitle("💡 Yeni Sunucu Önerisi")
          .setDescription(
            `> ${suggestion}`
          )
          .addFields(
            {
              name: "👤 Öneren",
              value:
                `${message.author}\n\`${message.author.tag}\``,
              inline: true
            },
            {
              name: "📊 Durum",
              value:
                "🟡 Değerlendiriliyor",
              inline: true
            }
          )
          .setThumbnail(
            message.author.displayAvatarURL({
              dynamic: true,
              size: 512
            })
          )
          .setTimestamp()
          .setFooter({
            text:
              `${message.guild.name} • Öneri Sistemi`
          });

      const suggestionMessage =
        await message.channel.send({
          embeds: [embed]
        });

      await suggestionMessage.react("👍");
      await suggestionMessage.react("👎");

    } catch (error) {
      console.error(
        "❌ Öneri sistemi hatası:",
        error
      );
    }
  }
);

// ======================================================
// 🌐 LYNoxNETWORK !IP SİSTEMİ
// ======================================================

const ipMessages = new Map();

const MC_SERVER_IP = "play.lynoxnetwork.com.tr";
const MC_SERVER_PORT = 25565;


// ======================================================
// 🌐 SUNUCU DURUMUNU KONTROL ET
// ======================================================

async function getMinecraftStatus() {
  try {

    const result = await status(
      MC_SERVER_IP,
      MC_SERVER_PORT,
      {
        timeout: 5000
      }
    );

    return {
      online: true,

      playersOnline:
        result.players?.online ?? 0,

      playersMax:
        result.players?.max ?? 0,

      ping:
        result.roundTripLatency ?? 0
    };

  } catch (error) {

    return {
      online: false,
      playersOnline: 0,
      playersMax: 0,
      ping: 0
    };
  }
}


// ======================================================
// 🌐 IP EMBED
// ======================================================

async function createIPEmbed() {

  const server =
    await getMinecraftStatus();

  const embed =
    new EmbedBuilder()
      .setTitle(
        "🌐 LynoxNetwork Sunucu Durumu"
      )
      .setTimestamp()
      .setFooter({
        text:
          "LynoxNetwork • Canlı Sunucu Sistemi"
      });

  // --------------------------------------------------
  // SUNUCU AÇIK
  // --------------------------------------------------

  if (server.online) {

    embed
      .setColor(0x22c55e)
      .setDescription(
        "🟢 **Sunucu şu anda AÇIK!**"
      )
      .addFields(
        {
          name: "🎮 Sunucu IP",
          value:
            `\`${MC_SERVER_IP}\``,
          inline: false
        },
        {
          name: "👥 Oyuncular",
          value:
            `**${server.playersOnline} / ${server.playersMax}**`,
          inline: true
        },
        {
          name: "📡 Ping",
          value:
            `**${Math.round(server.ping)}ms**`,
          inline: true
        },
        {
          name: "🔄 Güncelleme",
          value:
            "**10 saniyede bir**",
          inline: true
        }
      );

  }

  // --------------------------------------------------
  // SUNUCU KAPALI
  // --------------------------------------------------

  else {

    embed
      .setColor(0xef4444)
      .setDescription(
        "🔴 **Sunucu şu anda KAPALI!**"
      )
      .addFields(
        {
          name: "🎮 Sunucu IP",
          value:
            `\`${MC_SERVER_IP}\``,
          inline: false
        },
        {
          name: "👥 Oyuncular",
          value:
            "**-**",
          inline: true
        },
        {
          name: "📡 Ping",
          value:
            "**-**",
          inline: true
        },
        {
          name: "🔄 Güncelleme",
          value:
            "**10 saniyede bir**",
          inline: true
        }
      );
  }

  return embed;
}


// ======================================================
// !IP KOMUTU
// ======================================================

client.on(
  "messageCreate",
  async message => {

    try {

      if (
        message.author.bot ||
        !message.guild
      ) {
        return;
      }

      if (
        message.content
          .trim()
          .toLowerCase() !== "!ip"
      ) {
        return;
      }

      // ------------------------------------------------
      // ESKİ MESAJI SİL
      // ------------------------------------------------

      const oldMessage =
        ipMessages.get(
          message.channel.id
        );

      if (oldMessage) {

        await oldMessage
          .delete()
          .catch(() => {});

      }

      // ------------------------------------------------
      // KOMUTU SİL
      // ------------------------------------------------

      await message
        .delete()
        .catch(() => {});

      // ------------------------------------------------
      // DURUMU KONTROL ET
      // ------------------------------------------------

      const embed =
        await createIPEmbed();

      // ------------------------------------------------
      // MESAJI GÖNDER
      // ------------------------------------------------

      const ipMessage =
        await message.channel.send({
          embeds: [
            embed
          ]
        });

      ipMessages.set(
        message.channel.id,
        ipMessage
      );

    } catch (error) {

      console.error(
        "❌ !ip komut hatası:",
        error
      );

    }

  }
);


// ======================================================
// 🔄 HER 10 SANİYEDE GÜNCELLE
// ======================================================

setInterval(
  async () => {

    for (
      const [
        channelId,
        ipMessage
      ] of ipMessages
    ) {

      try {

        const embed =
          await createIPEmbed();

        await ipMessage.edit({
          embeds: [
            embed
          ]
        });

      } catch (error) {

        console.error(
          `❌ IP mesajı güncellenemedi (${channelId}):`,
          error.message
        );

        ipMessages.delete(
          channelId
        );
      }

    }

  },
  10 * 1000
);

// ======================================================
// !PANEL KOMUTU
// ======================================================

client.on(
  "messageCreate",
  async message => {
    try {
      if (
        message.author.bot ||
        !message.guild
      ) {
        return;
      }

      if (
        message.content
          .toLowerCase()
          .trim() !== "!panel"
      ) {
        return;
      }

      if (
        !message.member.permissions.has(
          PermissionsBitField.Flags.Administrator
        )
      ) {
        return message.reply({
          content:
            "❌ Bu paneli kullanmak için **Yönetici** yetkisine sahip olmalısın."
        });
      }

      const embed =
        new EmbedBuilder()
          .setColor(0x8b5cf6)
          .setTitle(
            "⚙️ Yönetim Paneli"
          )
          .setDescription(
            "## LynoxNetwork Yönetim Merkezi\n\n" +
            "Aşağıdaki menüden kurmak veya yönetmek istediğin sistemi seç.\n\n" +
            "🎫 **Ticket** — 4 seçenekli ticket sistemi\n" +
            "👥 **Toplu Rol** — Üyelere toplu rol işlemleri\n" +
            "💡 **Öneri** — Öneri kanalı\n" +
            "👤 **Rol Ver** — Belirli kullanıcıya rol\n" +
            "📖 **Komut Bilgi** — Kullanıcıya göre komutlar\n" +
            "🤖 **OtoRol** — Yeni üyelere otomatik rol\n" +
            "🤩 **Giriş-Çıkış** — Üye giriş/çıkış sistemi\n" +
            "⭐ **Puan** — Sunucu puan sistemi\n" +
            "🔊 **Ses** — Özel ses odaları\n" +
            "📢 **Anons** — Merkezi duyuru sistemi"
          )
          .setThumbnail(
            message.guild.iconURL({
              dynamic: true,
              size: 1024
            }) || null
          )
          .setTimestamp()
          .setFooter({
            text:
              `${message.guild.name} • Yönetim Paneli`
          });

      const menu =
        new StringSelectMenuBuilder()
          .setCustomId(
            "admin_panel_main"
          )
          .setPlaceholder(
            "⚙️ Bir sistem seç..."
          )
          .addOptions(
            {
              label:
                "Ticket Kur",
              description:
                "4 seçenekli ticket sistemi kur",
              value:
                "panel_ticket",
              emoji:
                "🎫"
            },
            {
              label:
                "Toplu Rol Ver",
              description:
                "Üyelere seçilen rolü ver",
              value:
                "panel_mass_role_add",
              emoji:
                "👥"
            },
            {
              label:
                "Toplu Rol Al",
              description:
                "Üyelerden seçilen rolü al",
              value:
                "panel_mass_role_remove",
              emoji:
                "🗑️"
            },
            {
              label:
                "Öneri Kanalı",
              description:
                "🆘│öneri kanalı oluştur",
              value:
                "panel_suggestion",
              emoji:
                "💡"
            },
            {
              label:
                "Rol Ver",
              description:
                "Belirlenen kullanıcıya rol ver",
              value:
                "panel_role_give",
              emoji:
                "👤"
            },
            {
              label:
                "Komut Bilgi",
              description:
                "Kullanıcının kullanabileceği komutları göster",
              value:
                "panel_commands",
              emoji:
                "📖"
            },
            {
              label:
                "OtoRol",
              description:
                "Yeni üyelere otomatik rol ver",
              value:
                "panel_autorole",
              emoji:
                "🤖"
            },
            {
              label:
                "Giriş-Çıkış",
              description:
                "🤩│giriş-çıkış kanalı oluştur",
              value:
                "panel_welcome",
              emoji:
                "🤩"
            },
            {
              label:
                "Puan Kanalı",
              description:
                "⭐│puan kanalı oluştur",
              value:
                "panel_rating",
              emoji:
                "⭐"
            },
            {
              label:
                "Ses Oluştur",
              description:
                "Özel ses odası sistemi kur",
              value:
                "panel_voice",
              emoji:
                "🔊"
            },
            {
              label:
                "Anons Sistemi",
              description:
                "Duyuru ve sohbet kanallarını ayarla",
              value:
                "panel_announcement",
              emoji:
                "📢"
            }
          );

      await message.channel.send({
        embeds: [
          embed
        ],
        components: [
          new ActionRowBuilder()
            .addComponents(
              menu
            )
        ]
      });

    } catch (error) {
      console.error(
        "Panel komutu hatası:",
        error
      );
    }
  }
);

// ======================================================
// TOPLU ROL VER
// ======================================================

client.on(
  "interactionCreate",
  async interaction => {
    try {
      if (
        !interaction.guild ||
        !interaction.isRoleSelectMenu()
      ) {
        return;
      }

      if (
        interaction.customId !==
        "mass_role_add_select"
      ) {
        return;
      }

      if (
        !interaction.member.permissions.has(
          PermissionsBitField.Flags.Administrator
        )
      ) {
        return interaction.reply({
          content:
            "❌ Yönetici yetkisi gerekli.",
          ephemeral: true
        });
      }

      const role =
        interaction.guild.roles.cache.get(
          interaction.values[0]
        );

      if (!role) {
        return interaction.reply({
          content:
            "❌ Rol bulunamadı.",
          ephemeral: true
        });
      }

      if (
        !canManageRole(
          interaction.guild,
          role
        )
      ) {
        return interaction.reply({
          content:
            "❌ Bot bu rolü yönetemez.",
          ephemeral: true
        });
      }

      await interaction.reply({
        content:
          `⏳ ${role} rolü uygun üyelere veriliyor...`,
        ephemeral: true
      });

      await interaction.guild.members.fetch();

      let success = 0;
      let failed = 0;

      for (
        const [, member]
        of interaction.guild.members.cache
      ) {
        if (
          member.user.bot ||
          member.roles.cache.has(
            role.id
          )
        ) {
          continue;
        }

        try {
          await member.roles.add(
            role
          );

          success++;
        } catch {
          failed++;
        }
      }

      return interaction.editReply({
        content:
          `✅ Toplu rol verme tamamlandı.\n\n` +
          `👥 Verilen: **${success}**\n` +
          `❌ Başarısız: **${failed}**`
      });

    } catch (error) {
      console.error(
        "Toplu rol verme hatası:",
        error
      );
    }
  }
);

// ======================================================
// TOPLU ROL AL
// ======================================================

client.on(
  "interactionCreate",
  async interaction => {
    try {
      if (
        !interaction.guild ||
        !interaction.isRoleSelectMenu()
      ) {
        return;
      }

      if (
        interaction.customId !==
        "mass_role_remove_select"
      ) {
        return;
      }

      if (
        !interaction.member.permissions.has(
          PermissionsBitField.Flags.Administrator
        )
      ) {
        return interaction.reply({
          content:
            "❌ Yönetici yetkisi gerekli.",
          ephemeral: true
        });
      }

      const role =
        interaction.guild.roles.cache.get(
          interaction.values[0]
        );

      if (!role) {
        return interaction.reply({
          content:
            "❌ Rol bulunamadı.",
          ephemeral: true
        });
      }

      if (
        !canManageRole(
          interaction.guild,
          role
        )
      ) {
        return interaction.reply({
          content:
            "❌ Bot bu rolü yönetemez.",
          ephemeral: true
        });
      }

      await interaction.reply({
        content:
          `⏳ ${role} rolü üyelerden alınıyor...`,
        ephemeral: true
      });

      await interaction.guild.members.fetch();

      let success = 0;
      let failed = 0;

      for (
        const [, member]
        of interaction.guild.members.cache
      ) {
        if (
          member.user.bot ||
          !member.roles.cache.has(
            role.id
          )
        ) {
          continue;
        }

        try {
          await member.roles.remove(
            role
          );

          success++;
        } catch {
          failed++;
        }
      }

      return interaction.editReply({
        content:
          `✅ Toplu rol alma tamamlandı.\n\n` +
          `👥 Alınan: **${success}**\n` +
          `❌ Başarısız: **${failed}**`
      });

    } catch (error) {
      console.error(
        "Toplu rol alma hatası:",
        error
      );
    }
  }
);

// ======================================================
// YARDIMCI: ROL YÖNETİLEBİLİYOR MU?
// ======================================================

function canManageRole(
  guild,
  role
) {
  const botMember =
    guild.members.me;

  if (!botMember) {
    return false;
  }

  if (
    role.id ===
    guild.roles.everyone.id
  ) {
    return false;
  }

  return (
    role.position <
    botMember.roles.highest.position
  );
}

// ======================================================
// YARDIMCI: SÜRE
// ======================================================

function parseDuration(
  value
) {
  if (!value) {
    return null;
  }

  const match =
    value
      .toLowerCase()
      .match(
        /^(\d+)(s|m|h|d|w)$/
      );

  if (!match) {
    return null;
  }

  const amount =
    Number(match[1]);

  const unit =
    match[2];

  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000
  };

  return (
    amount *
    multipliers[unit]
  );
                 }
