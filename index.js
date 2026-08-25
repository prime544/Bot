const {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");

// =====================================================
// TOKEN
// =====================================================

const TOKEN = process.env.DISCORD_TOKEN;

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN bulunamadı!");
  process.exit(1);
}

// =====================================================
// DATABASE
// =====================================================

const DATA_FILE = path.join(__dirname, "data.json");

let db = {
  guilds: {},
  tickets: {},
  giveaways: {},
  drops: {},
  clanPolls: {}
};

if (fs.existsSync(DATA_FILE)) {
  try {
    const saved = JSON.parse(
      fs.readFileSync(DATA_FILE, "utf8")
    );

    db = {
      ...db,
      ...saved
    };
  } catch (error) {
    console.error(
      "❌ data.json okunamadı:",
      error
    );
  }
}

function saveData() {
  try {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(db, null, 2),
      "utf8"
    );
  } catch (error) {
    console.error(
      "❌ Veriler kaydedilemedi:",
      error
    );
  }
}

// =====================================================
// GUILD CONFIG
// =====================================================

function getGuildConfig(guildId) {

  if (!db.guilds[guildId]) {

    db.guilds[guildId] = {

      ticket: {
        enabled: false,
        categoryId: null,
        panelChannelId: null,
        staffRoleId: null,
        categories: []
      },

      suggestionChannelId: null,

      welcomeChannelId: null,

      ratingChannelId: null,

      announcementChannelId: null,

      voiceJoinChannelId: null,

      voiceCategoryId: null,

      autoRoleId: null,

      ratings: {},

      profanityProtection: true,

      clan: {
        enabled: false,
        duration: null,
        clans: [],
        activePoll: null
      }

    };

    saveData();
  }

  return db.guilds[guildId];
}

// =====================================================
// CLIENT
// =====================================================

const client = new Client({

  intents: [

    GatewayIntentBits.Guilds,

    GatewayIntentBits.GuildMembers,

    GatewayIntentBits.GuildMessages,

    GatewayIntentBits.MessageContent,

    GatewayIntentBits.GuildVoiceStates

  ],

  partials: [

    Partials.Channel,

    Partials.Message,

    Partials.User

  ]

});

// =====================================================
// YARDIMCI FONKSİYONLAR
// =====================================================

function isAdmin(member) {

  return member.permissions.has(
    PermissionsBitField.Flags.Administrator
  );

}

function formatDate(timestamp) {

  return `<t:${Math.floor(timestamp / 1000)}:F>`;

}

function formatRelative(timestamp) {

  return `<t:${Math.floor(timestamp / 1000)}:R>`;

}

function cleanName(name) {

  return String(name)
    .toLocaleLowerCase("tr-TR")
    .replace(
      /[^a-z0-9ğüşöçıİĞÜŞÖÇ-]/gi,
      "-"
    )
    .replace(/-+/g, "-")
    .slice(0, 70) || "ticket";

}

function parseDuration(value) {

  if (!value) return null;

  const match =
    String(value)
      .trim()
      .toLocaleLowerCase("tr-TR")
      .match(
        /^(\d+(?:\.\d+)?)\s*(s|sn|m|dk|h|sa|d|g|w)$/
      );

  if (!match) return null;

  const number =
    Number(match[1]);

  const unit =
    match[2];

  const units = {

    s: 1000,
    sn: 1000,

    m: 60 * 1000,
    dk: 60 * 1000,

    h: 60 * 60 * 1000,
    sa: 60 * 60 * 1000,

    d: 24 * 60 * 60 * 1000,
    g: 24 * 60 * 60 * 1000,

    w: 7 * 24 * 60 * 60 * 1000

  };

  return number * units[unit];

}

function getReliability(user) {

  const age =
    Date.now() -
    user.createdTimestamp;

  const days =
    age / 86400000;

  const months =
    days / 30.44;

  if (months < 2) {

    return "🔴 Güvenilir değil";

  }

  if (months < 5) {

    return "🟡 Stabil";

  }

  if (months < 24) {

    return "🟢 Güvenilir";

  }

  return "💎 %100 Güvenilir";

}

// =====================================================
// KÜFÜR KORUMA
// =====================================================

const profanityPatterns = [

  /a[\W_]*m[\W_]*k/i,
  /a[\W_]*q/i,
  /amq/i,
  /a[\W_]*m[\W_]*q/i,

  /s[\W_]*i[\W_]*k/i,
  /s[\W_]*i[\W_]*k[\W_]*t[\W_]*i[\W_]*r/i,

  /o[\W_]*r[\W_]*o[\W_]*s[\W_]*p[\W_]*u/i,

  /p[\W_]*i[\W_]*ç/i,
  /p[\W_]*i[\W_]*c/i,

  /y[\W_]*a[\W_]*v[\W_]*ş[\W_]*a[\W_]*k/i,

  /f[\W_]*u[\W_]*c[\W_]*k/i,
  /s[\W_]*h[\W_]*i[\W_]*t/i

];

function containsProfanity(text) {

  let clean =
    String(text)
      .normalize("NFKC")
      .toLocaleLowerCase("tr-TR");

  clean =
    clean
      .replace(/ı/g, "i")
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c");

  return profanityPatterns.some(
    pattern =>
      pattern.test(clean)
  );

}

// =====================================================
// BOT HAZIR
// =====================================================

client.once("ready", () => {

  console.log(
    "===================================="
  );

  console.log(
    `🤖 ${client.user.tag} aktif!`
  );

  console.log(
    `🏠 ${client.guilds.cache.size} sunucu`
  );

  console.log(
    "===================================="
  );

  client.user.setPresence({

    activities: [

      {
        name: "LynoxNetwork",
        type: 3
      }

    ],

    status: "online"

  });

});

// =====================================================
// ÜYE GİRİŞ
// =====================================================

client.on(
  "guildMemberAdd",
  async member => {

    const config =
      getGuildConfig(
        member.guild.id
      );

    if (config.autoRoleId) {

      const role =
        member.guild.roles.cache.get(
          config.autoRoleId
        );

      if (
        role &&
        member.guild.members.me &&
        role.position <
          member.guild.members.me.roles.highest.position
      ) {

        await member.roles
          .add(role)
          .catch(() => {});

      }

    }

    if (!config.welcomeChannelId)
      return;

    const channel =
      member.guild.channels.cache.get(
        config.welcomeChannelId
      );

    if (!channel?.isTextBased())
      return;

    const embed =
      new EmbedBuilder()

        .setColor(0x8b5cf6)

        .setTitle(
          "🤩 Sunucumuza Hoş Geldin!"
        )

        .setDescription(
          `**${member.user.username}**, aramıza hoş geldin! 🎉`
        )

        .setThumbnail(
          member.user.displayAvatarURL({
            size: 256
          })
        )

        .addFields(

          {
            name: "👤 Üye",
            value: `${member}`,
            inline: true
          },

          {
            name: "📅 Giriş tarihi",
            value:
              formatDate(Date.now()),
            inline: true
          },

          {
            name: "🗓️ Hesap tarihi",
            value:
              formatDate(
                member.user.createdTimestamp
              ),
            inline: true
          },

          {
            name: "🛡️ Güvenilirlik",
            value:
              getReliability(
                member.user
              )
          }

        )

        .setFooter({

          text:
            "LynoxNetwork • Hoş Geldin"

        })

        .setTimestamp();

    await channel.send({

      content:
        `🤩 Hoş geldin ${member}!`,

      embeds: [embed]

    }).catch(() => {});

  }
);

// =====================================================
// ÜYE ÇIKIŞ
// =====================================================

client.on(
  "guildMemberRemove",
  async member => {

    const config =
      getGuildConfig(
        member.guild.id
      );

    if (!config.welcomeChannelId)
      return;

    const channel =
      member.guild.channels.cache.get(
        config.welcomeChannelId
      );

    if (!channel?.isTextBased())
      return;

    const embed =
      new EmbedBuilder()

        .setColor(0xef4444)

        .setTitle(
          "👋 Üye Ayrıldı"
        )

        .setDescription(
          `**${member.user.tag}** sunucudan ayrıldı.`
        )

        .setThumbnail(
          member.user.displayAvatarURL({
            size: 256
          })
        )

        .setTimestamp();

    await channel.send({

      embeds: [embed]

    }).catch(() => {});

  }
);

// =====================================================
// MESAJ SİSTEMİ
// =====================================================

client.on(
  "messageCreate",
  async message => {

    if (message.author.bot)
      return;

    if (!message.guild)
      return;

    const config =
      getGuildConfig(
        message.guild.id
      );

    // =================================================
    // KÜFÜR KORUMA
    // =================================================

    if (
      config.profanityProtection &&
      !isAdmin(message.member) &&
      containsProfanity(
        message.content
      )
    ) {

      await message.delete()
        .catch(() => {});

      const warning =
        await message.channel
          .send({

            content:
              `🛡️ ${message.author}, lütfen uygun bir dil kullan.`

          })
          .catch(() => null);

      if (warning) {

        setTimeout(() => {

          warning.delete()
            .catch(() => {});

        }, 3000);

      }

      return;

    }

    // =================================================
    // PUAN KANALI KORUMASI
    // =================================================

    if (
      config.ratingChannelId &&
      message.channel.id ===
        config.ratingChannelId &&
      !message.content
        .toLocaleLowerCase("tr-TR")
        .startsWith("!puanver")
    ) {

      await message.delete()
        .catch(() => {});

      const warning =
        await message.channel
          .send(
            "⭐ Bu kanal yalnızca puan vermek için kullanılabilir."
          )
          .catch(() => null);

      if (warning) {

        setTimeout(() => {

          warning.delete()
            .catch(() => {});

        }, 3000);

      }

      return;

    }

    // =================================================
    // PREFIX
    // =================================================

    if (!message.content.startsWith("!"))
      return;

    const args =
      message.content
        .slice(1)
        .trim()
        .split(/\s+/);

    const command =
      args
        .shift()
        ?.toLocaleLowerCase("tr-TR");

    // =================================================
    // AVATAR
    // =================================================

    if (command === "avatar") {

      const user =
        message.mentions.users.first() ||
        message.author;

      const embed =
        new EmbedBuilder()

          .setColor(0x8b5cf6)

          .setTitle(
            `🖼️ ${user.username}`
          )

          .setImage(
            user.displayAvatarURL({
              size: 1024,
              extension: "png"
            })
          )

          .setFooter({

            text:
              "LynoxNetwork • Avatar"

          });

      await message.reply({

        embeds: [embed]

      });

      return;

    }

    // =================================================
    // SERVERINFO
    // =================================================

    if (command === "serverinfo") {

      const ratings =
        Object.values(
          config.ratings
        );

      const average =
        ratings.length
          ? (
              ratings.reduce(
                (a, b) => a + b,
                0
              ) /
              ratings.length
            ).toFixed(2)
          : "0.00";

      const embed =
        new EmbedBuilder()

          .setColor(0x5865f2)

          .setTitle(
            `🖥️ ${message.guild.name}`
          )

          .setThumbnail(
            message.guild.iconURL({
              size: 256
            })
          )

          .addFields(

            {
              name:
                "👑 Sunucu Sahibi",
              value:
                `<@${message.guild.ownerId}>`,
              inline: true
            },

            {
              name:
                "👥 Üye Sayısı",
              value:
                `${message.guild.memberCount}`,
              inline: true
            },

            {
              name:
                "📅 Kurulma zamanı",
              value:
                formatDate(
                  message.guild.createdTimestamp
                ),
              inline: true
            },

            {
              name:
                "⭐ Sunucu puanı",
              value:
                `${average}/5\n${ratings.length} oy`,
              inline: true
            }

          )

          .setFooter({

            text:
              "LynoxNetwork • Server Info"

          })

          .setTimestamp();

      await message.reply({

        embeds: [embed]

      });

      return;

    }

    // =================================================
    // PUANVER
    // =================================================

    if (command === "puanver") {

      const score =
        Number(args[0]);

      if (
        !Number.isInteger(score) ||
        score < 1 ||
        score > 5
      ) {

        await message.reply(
          "❌ Kullanım: `!puanver <1-5>`"
        );

        return;

      }

      if (
        config.ratingChannelId &&
        message.channel.id !==
          config.ratingChannelId
      ) {

        return;

      }

      if (
        Object.prototype.hasOwnProperty.call(
          config.ratings,
          message.author.id
        )
      ) {

        await message.reply(
          "❌ Daha önce oy verdin, oyun değiştirilemez."
        );

        return;

      }

      config.ratings[
        message.author.id
      ] = score;

      saveData();

      const embed =
        new EmbedBuilder()

          .setColor(0xfacc15)

          .setTitle(
            "⭐ Oy Kaydedildi"
          )

          .setDescription(
            `${message.author} sunucuya **${score}/5** puan verdi.`
          )

          .setFooter({

            text:
              "LynoxNetwork • Sunucu Puanı"

          })

          .setTimestamp();

      await message.reply({

        embeds: [embed]

      });

      return;

    }

    // =================================================
    // ÖNERİ
    // =================================================

    if (
      command === "öneri" ||
      command === "oneri"
    ) {

      if (!config.suggestionChannelId) {

        await message.reply(
          "❌ Öneri sistemi henüz kurulmamış."
        );

        return;

      }

      const suggestion =
        args.join(" ").trim();

      if (!suggestion) {

        await message.reply(
          "❌ Kullanım: `!öneri <öneriniz>`"
        );

        return;

      }

      const channel =
        message.guild.channels.cache.get(
          config.suggestionChannelId
        );

      if (!channel?.isTextBased()) {

        await message.reply(
          "❌ Öneri kanalı bulunamadı."
        );

        return;

      }

      const embed =
        new EmbedBuilder()

          .setColor(0x8b5cf6)

          .setTitle(
            "💡 Yeni Öneri"
          )

          .setDescription(
            suggestion
          )

          .addFields({

            name: "👤 Öneren",

            value:
              `${message.author}`

          })

          .setThumbnail(
            message.author.displayAvatarURL({
              size: 128
            })
          )

          .setFooter({

            text:
              "LynoxNetwork • Öneri Sistemi"

          })

          .setTimestamp();

      const sent =
        await channel.send({

          embeds: [embed]

        });

      await sent.react("👍")
        .catch(() => {});

      await sent.react("👎")
        .catch(() => {});

      await message.reply(
        "✅ Önerin başarıyla gönderildi!"
      );

      return;

    }

    // =================================================
    // HELP
    // =================================================

    if (command === "help") {

      const embed =
        new EmbedBuilder()

          .setColor(0x8b5cf6)

          .setTitle(
            "🤖 LynoxNetwork Bot"
          )

          .setDescription(

            [
              "`!avatar [@kişi]`",
              "`!serverinfo`",
              "`!puanver <1-5>`",
              "`!öneri <öneri>`",
              "`!çekiliş <süre> <kazanan> <ödül>`",
              "`!drop <ödül>`",
              "`!panel`"
            ].join("\n")

          );

      await message.reply({

        embeds: [embed]

      });

      return;

    }
        // =================================================
    // ÇEKİLİŞ
    // =================================================

    if (
      command === "çekiliş" ||
      command === "cekilis"
    ) {

      if (!isAdmin(message.member)) {

        await message.reply(
          "❌ Çekiliş başlatmak için Yönetici iznine sahip olmalısın."
        );

        return;

      }

      if (args.length < 3) {

        await message.reply(
          "❌ Kullanım: `!çekiliş <süre> <kazanan sayısı> <ödül>`\nÖrnek: `!çekiliş 10m 2 Nitro`"
        );

        return;

      }

      const duration =
        parseDuration(args[0]);

      if (!duration) {

        await message.reply(
          "❌ Geçersiz süre. Örnekler: `30s`, `10m`, `2h`, `3d`"
        );

        return;

      }

      const winnerCount =
        Number(args[1]);

      if (
        !Number.isInteger(winnerCount) ||
        winnerCount < 1
      ) {

        await message.reply(
          "❌ Kazanan sayısı 1 veya daha büyük bir sayı olmalıdır."
        );

        return;

      }

      const prize =
        args.slice(2).join(" ").trim();

      if (!prize) {

        await message.reply(
          "❌ Çekiliş ödülünü belirtmelisin."
        );

        return;

      }

      const giveawayId =
        `${message.guild.id}-${Date.now()}`;

      const endAt =
        Date.now() + duration;

      db.giveaways[giveawayId] = {

        id: giveawayId,

        guildId:
          message.guild.id,

        channelId:
          message.channel.id,

        messageId: null,

        hostId:
          message.author.id,

        prize,

        winnerCount,

        endAt,

        participants: [],

        ended: false

      };

      saveData();

      const embed =
        new EmbedBuilder()

          .setColor(0xa855f7)

          .setAuthor({

            name:
              "🎉 LynoxNetwork • Çekiliş",

            iconURL:
              message.guild.iconURL() ||
              client.user.displayAvatarURL()

          })

          .setTitle(
            `🎁 ${prize}`
          )

          .setDescription(

            [
              "🎉 **Çekilişe katılmak için aşağıdaki butona bas!**",
              "",
              `🏆 Kazanan sayısı: **${winnerCount}**`,
              `⏰ Bitiş: ${formatRelative(endAt)}`,
              `👤 Başlatan: ${message.author}`,
              "",
              "🍀 Herkese bol şans!"
            ].join("\n")

          )

          .setThumbnail(
            message.guild.iconURL({
              size: 256
            }) ||
            client.user.displayAvatarURL()
          )

          .setFooter({

            text:
              "LynoxNetwork • Çekiliş Sistemi"

          })

          .setTimestamp();

      const row =
        new ActionRowBuilder()
          .addComponents(

            new ButtonBuilder()

              .setCustomId(
                `giveaway_join_${giveawayId}`
              )

              .setLabel(
                "Çekilişe Katıl"
              )

              .setEmoji("🎉")

              .setStyle(
                ButtonStyle.Success
              )

          );

      const giveawayMessage =
        await message.channel.send({

          embeds: [embed],

          components: [row]

        });

      db.giveaways[
        giveawayId
      ].messageId =
        giveawayMessage.id;

      saveData();

      return;

    }

    // =================================================
    // DROP
    // =================================================

    if (command === "drop") {

      if (!isAdmin(message.member)) {

        await message.reply(
          "❌ Drop başlatmak için Yönetici iznine sahip olmalısın."
        );

        return;

      }

      const prize =
        args.join(" ").trim();

      if (!prize) {

        await message.reply(
          "❌ Kullanım: `!drop <verilecek ödül>`"
        );

        return;

      }

      const dropId =
        `${message.guild.id}-${Date.now()}`;

      db.drops[dropId] = {

        id:
          dropId,

        guildId:
          message.guild.id,

        channelId:
          message.channel.id,

        messageId:
          null,

        prize,

        winnerId:
          null,

        ended:
          false

      };

      saveData();

      const embed =
        new EmbedBuilder()

          .setColor(0xef4444)

          .setAuthor({

            name:
              "⚡ LynoxNetwork • DROP",

            iconURL:
              message.guild.iconURL() ||
              client.user.displayAvatarURL()

          })

          .setTitle(
            `🎁 ${prize}`
          )

          .setDescription(

            [
              "⚡ **İLK BASAN KAZANIR!**",
              "",
              "Aşağıdaki butona ilk basan kişi ödülü kazanır.",
              "",
              "🎫 Kazanan kişi ödülünü almak için ticket açarak talep edebilir.",
              "",
              "🍀 Bol şans!"
            ].join("\n")

          )

          .setFooter({

            text:
              "LynoxNetwork • Drop Sistemi"

          })

          .setTimestamp();

      const row =
        new ActionRowBuilder()
          .addComponents(

            new ButtonBuilder()

              .setCustomId(
                `drop_join_${dropId}`
              )

              .setLabel(
                "Ödülü Al"
              )

              .setEmoji("⚡")

              .setStyle(
                ButtonStyle.Danger
              )

          );

      const dropMessage =
        await message.channel.send({

          embeds: [embed],

          components: [row]

        });

      db.drops[
        dropId
      ].messageId =
        dropMessage.id;

      saveData();

      return;

    }

    // =================================================
    // PANEL
    // =================================================

    if (command === "panel") {

      if (!isAdmin(message.member)) {

        await message.reply(
          "❌ Bu paneli yalnızca **Yönetici** iznine sahip kişiler kullanabilir."
        );

        return;

      }

      const embed =
        new EmbedBuilder()

          .setColor(0x7c3aed)

          .setAuthor({

            name:
              "LynoxNetwork • Yönetim Merkezi",

            iconURL:
              message.guild.iconURL() ||
              client.user.displayAvatarURL()

          })

          .setTitle(
            "⚙️ Admin Paneli"
          )

          .setDescription(

            [
              "Sunucu sistemlerini aşağıdaki butonlardan yönetebilirsin.",
              "",
              "🎫 **Ticket Kur**",
              "👥 **Rol Yönetimi**",
              "💡 **Öneri Kanalı**",
              "🤖 **OtoRol**",
              "🤩 **Giriş / Çıkış**",
              "⭐ **Puan Kanalı**",
              "🔊 **Ses Oluştur**",
              "🗳️ **Klan Oylaması**",
              "📢 **Anons**"
            ].join("\n")

          )

          .setFooter({

            text:
              "LynoxNetwork • Yönetim Paneli"

          })

          .setTimestamp();

      const row1 =
        new ActionRowBuilder()
          .addComponents(

            new ButtonBuilder()

              .setCustomId(
                "panel_ticket"
              )

              .setLabel(
                "Ticket Kur"
              )

              .setEmoji("🎫")

              .setStyle(
                ButtonStyle.Primary
              ),

            new ButtonBuilder()

              .setCustomId(
                "panel_roles"
              )

              .setLabel(
                "Rol Yönetimi"
              )

              .setEmoji("👥")

              .setStyle(
                ButtonStyle.Secondary
              ),

            new ButtonBuilder()

              .setCustomId(
                "panel_suggestion"
              )

              .setLabel(
                "Öneri Kanalı"
              )

              .setEmoji("💡")

              .setStyle(
                ButtonStyle.Success
              ),

            new ButtonBuilder()

              .setCustomId(
                "panel_autorole"
              )

              .setLabel(
                "OtoRol"
              )

              .setEmoji("🤖")

              .setStyle(
                ButtonStyle.Secondary
              )

          );

      const row2 =
        new ActionRowBuilder()
          .addComponents(

            new ButtonBuilder()

              .setCustomId(
                "panel_welcome"
              )

              .setLabel(
                "Giriş / Çıkış"
              )

              .setEmoji("🤩")

              .setStyle(
                ButtonStyle.Success
              ),

            new ButtonBuilder()

              .setCustomId(
                "panel_rating"
              )

              .setLabel(
                "Puan Kanalı"
              )

              .setEmoji("⭐")

              .setStyle(
                ButtonStyle.Secondary
              ),

            new ButtonBuilder()

              .setCustomId(
                "panel_voice"
              )

              .setLabel(
                "Ses Oluştur"
              )

              .setEmoji("🔊")

              .setStyle(
                ButtonStyle.Primary
              ),

            new ButtonBuilder()

              .setCustomId(
                "panel_clan"
              )

              .setLabel(
                "Klan Oylaması"
              )

              .setEmoji("🗳️")

              .setStyle(
                ButtonStyle.Primary
              )

          );

      const row3 =
        new ActionRowBuilder()
          .addComponents(

            new ButtonBuilder()

              .setCustomId(
                "panel_announcement"
              )

              .setLabel(
                "Anons"
              )

              .setEmoji("📢")

              .setStyle(
                ButtonStyle.Danger
              )

          );

      await message.channel.send({

        embeds: [
          embed
        ],

        components: [
          row1,
          row2,
          row3
        ]

      });

      return;

    }

    // =================================================
    // KLÁN KOMUTLARI KAPALI
    // =================================================

    if (command === "klan") {

      await message.reply(
        "🗳️ Klan sistemi yalnızca **Yönetim Paneli → Klan Oylaması** üzerinden yönetilir."
      );

      return;

    }

    // =================================================
    // TICKET KOMUTU KAPALI
    // =================================================

    if (command === "ticket") {

      await message.reply(
        "🎫 Ticket sistemi panel üzerinden kurulmuştur. Ticket açmak için ticket panelindeki butonları kullan."
      );

      return;

    }
        // =================================================
    // ESKİ / MANUEL YÖNETİM KOMUTLARI
    // =================================================

    if (
      command === "rolver" ||
      command === "toplurolver" ||
      command === "toplurolal" ||
      command === "otorol"
    ) {

      if (!isAdmin(message.member)) {

        await message.reply(
          "❌ Bu işlemi yalnızca Yönetici kullanabilir."
        );

        return;

      }

      // -----------------------------------------------
      // ROL VER
      // -----------------------------------------------

      if (command === "rolver") {

        const target =
          message.mentions.members.first();

        const role =
          message.mentions.roles.first();

        if (!target || !role) {

          await message.reply(
            "❌ Kullanım: `!rolver @üye @rol`"
          );

          return;

        }

        if (
          role.managed ||
          role.position >=
            message.guild.members.me.roles.highest.position
        ) {

          await message.reply(
            "❌ Bu rolü veremiyorum. Rolümün altında bir rol seç."
          );

          return;

        }

        try {

          await target.roles.add(role);

          await message.reply(
            `✅ ${target} kullanıcısına ${role} rolü verildi.`
          );

        } catch {

          await message.reply(
            "❌ Rol verilirken bir hata oluştu."
          );

        }

        return;

      }

      // -----------------------------------------------
      // TOPLU ROL VER
      // -----------------------------------------------

      if (command === "toplurolver") {

        const role =
          message.mentions.roles.first();

        if (!role) {

          await message.reply(
            "❌ Kullanım: `!toplurolver @rol`"
          );

          return;

        }

        if (
          role.managed ||
          role.position >=
            message.guild.members.me.roles.highest.position
        ) {

          await message.reply(
            "❌ Bu rolü dağıtamam. Bot rolünün altında olmalı."
          );

          return;

        }

        const loading =
          await message.reply(
            "⏳ Rol tüm üyelere dağıtılıyor..."
          );

        const members =
          await message.guild.members.fetch();

        let success = 0;
        let failed = 0;

        for (
          const member
          of members.values()
        ) {

          if (member.user.bot)
            continue;

          if (
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

        const result =
          new EmbedBuilder()

            .setColor(0x22c55e)

            .setTitle(
              "👥 Toplu Rol Verme Tamamlandı"
            )

            .setDescription(

              [
                `🏷️ Rol: ${role}`,
                "",
                `✅ Başarılı: **${success}**`,
                `❌ Başarısız: **${failed}**`
              ].join("\n")

            )

            .setTimestamp();

        await loading.edit({

          content: "",

          embeds: [result]

        }).catch(() => {});

        return;

      }

      // -----------------------------------------------
      // TOPLU ROL AL
      // -----------------------------------------------

      if (command === "toplurolal") {

        const role =
          message.mentions.roles.first();

        if (!role) {

          await message.reply(
            "❌ Kullanım: `!toplurolal @rol`"
          );

          return;

        }

        if (
          role.managed ||
          role.position >=
            message.guild.members.me.roles.highest.position
        ) {

          await message.reply(
            "❌ Bu rolü alamam. Bot rolünün altında olmalı."
          );

          return;

        }

        const loading =
          await message.reply(
            "⏳ Rol üyelerden alınıyor..."
          );

        const members =
          await message.guild.members.fetch();

        let success = 0;
        let failed = 0;

        for (
          const member
          of members.values()
        ) {

          if (member.user.bot)
            continue;

          if (
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

        const result =
          new EmbedBuilder()

            .setColor(0xef4444)

            .setTitle(
              "👥 Toplu Rol Alma Tamamlandı"
            )

            .setDescription(

              [
                `🏷️ Rol: ${role}`,
                "",
                `✅ Başarılı: **${success}**`,
                `❌ Başarısız: **${failed}**`
              ].join("\n")

            )

            .setTimestamp();

        await loading.edit({

          content: "",

          embeds: [result]

        }).catch(() => {});

        return;

      }

      // -----------------------------------------------
      // OTOROL
      // -----------------------------------------------

      if (command === "otorol") {

        const role =
          message.mentions.roles.first();

        if (!role) {

          await message.reply(
            "❌ Kullanım: `!otorol @rol`"
          );

          return;

        }

        if (
          role.managed ||
          role.position >=
            message.guild.members.me.roles.highest.position
        ) {

          await message.reply(
            "❌ Bu rol botun en yüksek rolünün altında olmalı."
          );

          return;

        }

        config.autoRoleId =
          role.id;

        saveData();

        await message.reply({

          embeds: [

            new EmbedBuilder()

              .setColor(0x22c55e)

              .setTitle(
                "🤖 OtoRol Aktif"
              )

              .setDescription(
                `Yeni katılan üyeler artık ${role} rolünü otomatik olarak alacak.`
              )

              .setTimestamp()

          ]

        });

        return;

      }

    }

    // =================================================
    // ÖNERİ KANALI OLUŞTUR
    // =================================================

    if (
      command === "önerikanalı" ||
      command === "onerikanali"
    ) {

      if (!isAdmin(message.member)) {

        await message.reply(
          "❌ Bu işlemi yalnızca Yönetici kullanabilir."
        );

        return;

      }

      const existing =
        message.guild.channels.cache.find(
          channel =>
            channel.name === "🆘|öneri" &&
            channel.type ===
              ChannelType.GuildText
        );

      if (existing) {

        config.suggestionChannelId =
          existing.id;

        saveData();

        await message.reply(
          `💡 Öneri kanalı zaten mevcut: ${existing}`
        );

        return;

      }

      const channel =
        await message.guild.channels.create({

          name:
            "🆘|öneri",

          type:
            ChannelType.GuildText,

          reason:
            "LynoxNetwork öneri sistemi"

        }).catch(() => null);

      if (!channel) {

        await message.reply(
          "❌ Öneri kanalı oluşturulamadı."
        );

        return;

      }

      config.suggestionChannelId =
        channel.id;

      saveData();

      const embed =
        new EmbedBuilder()

          .setColor(0x8b5cf6)

          .setTitle(
            "💡 Öneri Sistemi"
          )

          .setDescription(

            [
              "Sunucumuz için bir fikrin mi var?",
              "",
              "Aşağıdaki komutu kullan:",
              "",
              "💡 `!öneri <önerin>`",
              "",
              "📌 Öneriler yönetim ekibi tarafından incelenir."
            ].join("\n")

          )

          .setFooter({

            text:
              "LynoxNetwork • Öneri Sistemi"

          })

          .setTimestamp();

      await channel.send({

        embeds: [embed]

      }).catch(() => {});

      await message.reply(
        `✅ Öneri kanalı oluşturuldu: ${channel}`
      );

      return;

    }

    // =================================================
    // PUAN KANALI OLUŞTUR
    // =================================================

    if (
      command === "puankanali"
    ) {

      if (!isAdmin(message.member)) {

        await message.reply(
          "❌ Bu işlemi yalnızca Yönetici kullanabilir."
        );

        return;

      }

      const existing =
        message.guild.channels.cache.find(
          channel =>
            channel.name ===
              "⭐|sunucu-puanı" &&
            channel.type ===
              ChannelType.GuildText
        );

      if (existing) {

        config.ratingChannelId =
          existing.id;

        saveData();

        await message.reply(
          `⭐ Puan kanalı zaten mevcut: ${existing}`
        );

        return;

      }

      const channel =
        await message.guild.channels.create({

          name:
            "⭐|sunucu-puanı",

          type:
            ChannelType.GuildText,

          reason:
            "LynoxNetwork puan sistemi"

        }).catch(() => null);

      if (!channel) {

        await message.reply(
          "❌ Puan kanalı oluşturulamadı."
        );

        return;

      }

      config.ratingChannelId =
        channel.id;

      saveData();

      const embed =
        new EmbedBuilder()

          .setColor(0xfacc15)

          .setTitle(
            "⭐ Sunucu Puanlama"
          )

          .setDescription(

            [
              "Sunucumuzu değerlendirmek için aşağıdaki komutu kullan:",
              "",
              "⭐ `!puanver 1`",
              "⭐ `!puanver 2`",
              "⭐ `!puanver 3`",
              "⭐ `!puanver 4`",
              "⭐ `!puanver 5`",
              "",
              "⚠️ Her üye yalnızca **1 kez** oy verebilir.",
              "⚠️ Verilen oy sonradan değiştirilemez."
            ].join("\n")

          )

          .setFooter({

            text:
              "LynoxNetwork • Puan Sistemi"

          })

          .setTimestamp();

      await channel.send({

        embeds: [embed]

      }).catch(() => {});

      await message.reply(
        `✅ Puan kanalı oluşturuldu: ${channel}`
      );

      return;

    }

    // =================================================
    // HOŞ GELDİN / GİRİŞ-ÇIKIŞ KANALI
    // =================================================

    if (
      command === "hosgeldinkanali" ||
      command === "hoşgeldinkanali"
    ) {

      if (!isAdmin(message.member)) {

        await message.reply(
          "❌ Bu işlemi yalnızca Yönetici kullanabilir."
        );

        return;

      }

      let category =
        message.guild.channels.cache.find(
          channel =>
            channel.type ===
              ChannelType.GuildCategory &&
            (
              channel.name
                .toLocaleLowerCase("tr-TR")
                .includes("giriş") ||
              channel.name
                .toLocaleLowerCase("tr-TR")
                .includes("giris")
            )
        );

      if (!category) {

        category =
          await message.guild.channels.create({

            name:
              "Giriş • Çıkış",

            type:
              ChannelType.GuildCategory,

            reason:
              "LynoxNetwork giriş çıkış sistemi"

          }).catch(() => null);

      }

      const existing =
        message.guild.channels.cache.find(
          channel =>
            channel.name ===
              "🤩|giriş-çıkış" &&
            channel.type ===
              ChannelType.GuildText
        );

      if (existing) {

        config.welcomeChannelId =
          existing.id;

        saveData();

        await message.reply(
          `🤩 Giriş-çıkış kanalı zaten mevcut: ${existing}`
        );

        return;

      }

      const channel =
        await message.guild.channels.create({

          name:
            "🤩|giriş-çıkış",

          type:
            ChannelType.GuildText,

          parent:
            category?.id || undefined,

          reason:
            "LynoxNetwork giriş çıkış sistemi"

        }).catch(() => null);

      if (!channel) {

        await message.reply(
          "❌ Giriş-çıkış kanalı oluşturulamadı."
        );

        return;

      }

      config.welcomeChannelId =
        channel.id;

      saveData();

      await message.reply(
        `✅ Giriş-çıkış sistemi oluşturuldu: ${channel}`
      );

      return;

    }

    // =================================================
    // ANONS KANALI
    // =================================================

    if (
      command === "anonskanali"
    ) {

      if (!isAdmin(message.member)) {

        await message.reply(
          "❌ Bu işlemi yalnızca Yönetici kullanabilir."
        );

        return;

      }

      const channel =
        message.mentions.channels.first();

      if (!channel) {

        await message.reply(
          "❌ Kullanım: `!anonskanali #kanal`"
        );

        return;

      }

      config.announcementChannelId =
        channel.id;

      saveData();

      await message.reply(
        `📢 Anons kanalı ${channel} olarak ayarlandı.`
      );

      return;

      }
        // =================================================
    // SES OLUŞTURMA AYARI
    // =================================================

    if (
      command === "sesolustur" ||
      command === "sesoluştur"
    ) {

      if (!isAdmin(message.member)) {

        await message.reply(
          "❌ Bu işlemi yalnızca Yönetici kullanabilir."
        );

        return;

      }

      const voiceChannel =
        message.mentions.channels.first();

      if (
        !voiceChannel ||
        voiceChannel.type !==
          ChannelType.GuildVoice
      ) {

        await message.reply(
          "❌ Bir ses kanalı etiketlemelisin.\nÖrnek: `!sesoluştur #Oluşturma`"
        );

        return;

      }

      config.voiceJoinChannelId =
        voiceChannel.id;

      config.voiceCategoryId =
        voiceChannel.parentId || null;

      saveData();

      await message.reply({

        embeds: [

          new EmbedBuilder()

            .setColor(0x8b5cf6)

            .setTitle(
              "🔊 Ses Oluşturma Sistemi"
            )

            .setDescription(
              `Oyuncular ${voiceChannel} kanalına girdiğinde kendilerine özel ses kanalı oluşturulacak.`
            )

            .setFooter({
              text:
                "LynoxNetwork • Ses Sistemi"
            })

            .setTimestamp()

        ]

      });

      return;

    }

    // =================================================
    // KLÂN SİSTEMİ KOMUTU
    // =================================================

    if (
      command === "klan"
    ) {

      await message.reply({

        embeds: [

          new EmbedBuilder()

            .setColor(0x8b5cf6)

            .setTitle(
              "🗳️ Klan Oylaması"
            )

            .setDescription(
              "Klan sistemi komutlarla değil, **Yönetim Paneli → Klan Oylaması** üzerinden yönetilir."
            )

            .setFooter({
              text:
                "LynoxNetwork • Klan Sistemi"
            })

        ]

      });

      return;

    }

    // =================================================
    // PANEL
    // =================================================

    if (
      command === "panel"
    ) {

      if (!isAdmin(message.member)) {

        await message.reply(
          "❌ Bu paneli yalnızca **Yönetici** iznine sahip kişiler kullanabilir."
        );

        return;

      }

      const panelEmbed =
        new EmbedBuilder()

          .setColor(0x7c3aed)

          .setAuthor({

            name:
              "LynoxNetwork • Yönetim Merkezi",

            iconURL:
              message.guild.iconURL() ||
              client.user.displayAvatarURL()

          })

          .setTitle(
            "⚙️ Admin Paneli"
          )

          .setDescription(

            [
              "Sunucunun tüm gelişmiş sistemlerini buradan yönetebilirsin.",
              "",
              "🎫 **Ticket Sistemi**",
              "👥 **Rol Yönetimi**",
              "💡 **Öneri Sistemi**",
              "🤖 **OtoRol**",
              "🤩 **Giriş / Çıkış**",
              "⭐ **Puan Sistemi**",
              "🔊 **Ses Oluşturma**",
              "🗳️ **Klan Oylaması**",
              "📢 **Anons Sistemi**",
              "",
              "🔒 Bu panel yalnızca Yönetici yetkisine sahip kişiler tarafından kullanılabilir."
            ].join("\n")

          )

          .setThumbnail(
            message.guild.iconURL({
              size: 256
            }) ||
            client.user.displayAvatarURL()
          )

          .setFooter({

            text:
              "LynoxNetwork • Yönetim Paneli"

          })

          .setTimestamp();

      const row1 =
        new ActionRowBuilder()
          .addComponents(

            new ButtonBuilder()

              .setCustomId(
                "panel_ticket"
              )

              .setLabel(
                "Ticket Kur"
              )

              .setEmoji("🎫")

              .setStyle(
                ButtonStyle.Primary
              ),

            new ButtonBuilder()

              .setCustomId(
                "panel_roles"
              )

              .setLabel(
                "Rol Yönetimi"
              )

              .setEmoji("👥")

              .setStyle(
                ButtonStyle.Secondary
              ),

            new ButtonBuilder()

              .setCustomId(
                "panel_suggestion"
              )

              .setLabel(
                "Öneri"
              )

              .setEmoji("💡")

              .setStyle(
                ButtonStyle.Success
              ),

            new ButtonBuilder()

              .setCustomId(
                "panel_autorole"
              )

              .setLabel(
                "OtoRol"
              )

              .setEmoji("🤖")

              .setStyle(
                ButtonStyle.Secondary
              )

          );

      const row2 =
        new ActionRowBuilder()
          .addComponents(

            new ButtonBuilder()

              .setCustomId(
                "panel_welcome"
              )

              .setLabel(
                "Giriş / Çıkış"
              )

              .setEmoji("🤩")

              .setStyle(
                ButtonStyle.Success
              ),

            new ButtonBuilder()

              .setCustomId(
                "panel_rating"
              )

              .setLabel(
                "Puan Sistemi"
              )

              .setEmoji("⭐")

              .setStyle(
                ButtonStyle.Secondary
              ),

            new ButtonBuilder()

              .setCustomId(
                "panel_voice"
              )

              .setLabel(
                "Ses Oluştur"
              )

              .setEmoji("🔊")

              .setStyle(
                ButtonStyle.Primary
              ),

            new ButtonBuilder()

              .setCustomId(
                "panel_clan"
              )

              .setLabel(
                "Klan Oylaması"
              )

              .setEmoji("🗳️")

              .setStyle(
                ButtonStyle.Primary
              )

          );

      const row3 =
        new ActionRowBuilder()
          .addComponents(

            new ButtonBuilder()

              .setCustomId(
                "panel_announcement"
              )

              .setLabel(
                "Anons"
              )

              .setEmoji("📢")

              .setStyle(
                ButtonStyle.Danger
              )

          );

      await message.channel.send({

        embeds: [
          panelEmbed
        ],

        components: [
          row1,
          row2,
          row3
        ]

      });

      return;

    }

    // =================================================
    // MESAJ KOMUTLARININ SONU
    // =================================================

    // Buradan sonraki sistemler:
    // - Panel interactionları
    // - Ticket oluşturma
    // - Ticket kapatma
    // - Transcript
    // - Çekiliş butonu
    // - Drop butonu
    // - Klan oylaması
    // - Anons modalı
    // - Rol işlemleri
    // - Ses kanalı sistemi
    // =================================================
    }
);

// =====================================================
// BUTON / MENÜ / MODAL SİSTEMİ
// =====================================================

client.on(
  "interactionCreate",
  async interaction => {

    if (!interaction.guild)
      return;

    const config =
      getGuildConfig(
        interaction.guild.id
      );

    // =================================================
    // BUTONLAR
    // =================================================

    if (interaction.isButton()) {

      // =================================================
      // ÇEKİLİŞ KATIL
      // =================================================

      if (
        interaction.customId
          .startsWith("giveaway_join_")
      ) {

        const giveawayId =
          interaction.customId
            .replace(
              "giveaway_join_",
              ""
            );

        const giveaway =
          db.giveaways[
            giveawayId
          ];

        if (!giveaway) {

          await interaction.reply({

            content:
              "❌ Bu çekiliş bulunamadı.",

            ephemeral: true

          });

          return;

        }

        if (giveaway.ended) {

          await interaction.reply({

            content:
              "❌ Bu çekiliş sona ermiş.",

            ephemeral: true

          });

          return;

        }

        if (
          giveaway.participants
            .includes(
              interaction.user.id
            )
        ) {

          await interaction.reply({

            content:
              "⚠️ Zaten çekilişe katıldın!",

            ephemeral: true

          });

          return;

        }

        giveaway.participants.push(
          interaction.user.id
        );

        saveData();

        await interaction.reply({

          content:
            "🎉 Çekilişe başarıyla katıldın! Bol şans! 🍀",

          ephemeral: true

        });

        return;

      }

      // =================================================
      // DROP KATIL
      // =================================================

      if (
        interaction.customId
          .startsWith("drop_join_")
      ) {

        const dropId =
          interaction.customId
            .replace(
              "drop_join_",
              ""
            );

        const drop =
          db.drops[
            dropId
          ];

        if (!drop) {

          await interaction.reply({

            content:
              "❌ Bu drop bulunamadı.",

            ephemeral: true

          });

          return;

        }

        if (drop.ended) {

          await interaction.reply({

            content:
              "❌ Bu drop zaten kazanılmış.",

            ephemeral: true

          });

          return;

        }

        // İlk basan kişi
        drop.winnerId =
          interaction.user.id;

        drop.ended =
          true;

        saveData();

        const channel =
          interaction.channel;

        const winner =
          interaction.user;

        const embed =
          new EmbedBuilder()

            .setColor(0x22c55e)

            .setTitle(
              "⚡ DROP KAZANILDI!"
            )

            .setDescription(

              [
                `🎁 **Ödül:** ${drop.prize}`,
                "",
                `🏆 **Kazanan:** ${winner}`,
                "",
                "🎫 Ödülünü almak için **ticket açarak ödülünü talep edebilirsin.**"
              ].join("\n")

            )

            .setThumbnail(
              winner.displayAvatarURL({
                size: 256
              })
            )

            .setFooter({

              text:
                "LynoxNetwork • Drop Sistemi"

            })

            .setTimestamp();

        await interaction.update({

          embeds: [embed],

          components: []

        }).catch(() => {});

        await channel.send({

          content:
            `🎉 Tebrikler ${winner}! Ödülün **${drop.prize}**.\n🎫 Ticket açarak ödülünü talep edebilirsin.`

        }).catch(() => {});

        return;

      }

      // =================================================
      // PANEL TICKET
      // =================================================

      if (
        interaction.customId ===
        "panel_ticket"
      ) {

        if (
          !isAdmin(
            interaction.member
          )
        ) {

          await interaction.reply({

            content:
              "❌ Bu bölümü yalnızca Yönetici kullanabilir.",

            ephemeral: true

          });

          return;

        }

        const embed =
          new EmbedBuilder()

            .setColor(0x8b5cf6)

            .setTitle(
              "🎫 Ticket Sistemi Kurulumu"
            )

            .setDescription(

              [
                "Ticket sistemini kurmak için aşağıdaki bilgileri gireceksin.",
                "",
                "📁 Ticket kategorisini seç",
                "📢 Ticket panelinin gönderileceği kanalı seç",
                "👮 Ticket görevlisi rolünü seç",
                "",
                "Ayrıca birden fazla ticket kategorisi oluşturabilirsin."
              ].join("\n")

            )

            .setFooter({

              text:
                "LynoxNetwork • Ticket Kurulum"

            });

        const row =
          new ActionRowBuilder()
            .addComponents(

              new ButtonBuilder()

                .setCustomId(
                  "ticket_setup_start"
                )

                .setLabel(
                  "Ticket Kurulumunu Başlat"
                )

                .setEmoji("🎫")

                .setStyle(
                  ButtonStyle.Success
                ),

              new ButtonBuilder()

                .setCustomId(
                  "ticket_setup_categories"
                )

                .setLabel(
                  "Kategorileri Yönet"
                )

                .setEmoji("📁")

                .setStyle(
                  ButtonStyle.Secondary
                )

            );

        await interaction.reply({

          embeds: [embed],

          components: [row],

          ephemeral: true

        });

        return;

      }

      // =================================================
      // TICKET KURULUM BAŞLAT
      // =================================================

      if (
        interaction.customId ===
        "ticket_setup_start"
      ) {

        if (
          !isAdmin(
            interaction.member
          )
        ) {

          await interaction.reply({

            content:
              "❌ Yetkin yok.",

            ephemeral: true

          });

          return;

        }

        const modal =
          new ModalBuilder()

            .setCustomId(
              "ticket_setup_modal"
            )

            .setTitle(
              "🎫 Ticket Sistemi Kur"
            );

        const categoryInput =
          new TextInputBuilder()

            .setCustomId(
              "ticket_category_id"
            )

            .setLabel(
              "Ticket kategorisi ID"
            )

            .setPlaceholder(
              "Örn: 123456789012345678"
            )

            .setStyle(
              TextInputStyle.Short
            )

            .setRequired(true);

        const channelInput =
          new TextInputBuilder()

            .setCustomId(
              "ticket_panel_channel_id"
            )

            .setLabel(
              "Ticket panel kanalı ID"
            )

            .setPlaceholder(
              "Panelin gönderileceği kanal ID"
            )

            .setStyle(
              TextInputStyle.Short
            )

            .setRequired(true);

        const roleInput =
          new TextInputBuilder()

            .setCustomId(
              "ticket_staff_role_id"
            )

            .setLabel(
              "Ticket görevli rolü ID"
            )

            .setPlaceholder(
              "Ticket görevlilerinin rol ID'si"
            )

            .setStyle(
              TextInputStyle.Short
            )

            .setRequired(true);

        const categoryNameInput =
          new TextInputBuilder()

            .setCustomId(
              "ticket_category_name"
            )

            .setLabel(
              "Ticket türünün adı"
            )

            .setPlaceholder(
              "Örn: Destek"
            )

            .setStyle(
              TextInputStyle.Short
            )

            .setRequired(true);

        modal.addComponents(

          new ActionRowBuilder()
            .addComponents(
              categoryInput
            ),

          new ActionRowBuilder()
            .addComponents(
              channelInput
            ),

          new ActionRowBuilder()
            .addComponents(
              roleInput
            ),

          new ActionRowBuilder()
            .addComponents(
              categoryNameInput
            )

        );

        await interaction.showModal(
          modal
        );

        return;

      }

      // =================================================
      // PANEL ÖNERİ
      // =================================================

      if (
        interaction.customId ===
        "panel_suggestion"
      ) {

        if (
          !isAdmin(
            interaction.member
          )
        ) {

          await interaction.reply({

            content:
              "❌ Yetkin yok.",

            ephemeral: true

          });

          return;

        }

        const existing =
          interaction.guild.channels.cache.find(
            channel =>
              channel.name ===
                "🆘|öneri" &&
              channel.type ===
                ChannelType.GuildText
          );

        if (existing) {

          config.suggestionChannelId =
            existing.id;

          saveData();

          await interaction.reply({

            content:
              `💡 Öneri kanalı zaten mevcut: ${existing}`,

            ephemeral: true

          });

          return;

        }

        const channel =
          await interaction.guild.channels.create({

            name:
              "🆘|öneri",

            type:
              ChannelType.GuildText,

            reason:
              "LynoxNetwork öneri sistemi"

          }).catch(() => null);

        if (!channel) {

          await interaction.reply({

            content:
              "❌ Kanal oluşturulamadı.",

            ephemeral: true

          });

          return;

        }

        config.suggestionChannelId =
          channel.id;

        saveData();

        const embed =
          new EmbedBuilder()

            .setColor(0x8b5cf6)

            .setTitle(
              "💡 Öneri Sistemi"
            )

            .setDescription(

              [
                "Sunucumuz için bir önerin varsa:",
                "",
                "`!öneri <öneriniz>`",
                "",
                "Öneriler yönetim ekibi tarafından incelenir."
              ].join("\n")

            )

            .setFooter({

              text:
                "LynoxNetwork • Öneri"

            });

        await channel.send({

          embeds: [embed]

        }).catch(() => {});

        await interaction.reply({

          content:
            `✅ Öneri kanalı oluşturuldu: ${channel}`,

          ephemeral: true

        });

        return;

      }

      // =================================================
      // PANEL OTOROL
      // =================================================

      if (
        interaction.customId ===
        "panel_autorole"
      ) {

        if (
          !isAdmin(
            interaction.member
          )
        ) {

          await interaction.reply({

            content:
              "❌ Yetkin yok.",

            ephemeral: true

          });

          return;

        }

        const modal =
          new ModalBuilder()

            .setCustomId(
              "autorole_modal"
            )

            .setTitle(
              "🤖 OtoRol Ayarla"
            );

        const roleInput =
          new TextInputBuilder()

            .setCustomId(
              "autorole_role_id"
            )

            .setLabel(
              "Rol ID"
            )

            .setPlaceholder(
              "Yeni üyelerin alacağı rol ID"
            )

            .setStyle(
              TextInputStyle.Short
            )

            .setRequired(true);

        modal.addComponents(

          new ActionRowBuilder()
            .addComponents(
              roleInput
            )

        );

        await interaction.showModal(
          modal
        );

        return;

      }

      // =================================================
      // PANEL PUAN
      // =================================================

      if (
        interaction.customId ===
        "panel_rating"
      ) {

        if (
          !isAdmin(
            interaction.member
          )
        ) {

          await interaction.reply({

            content:
              "❌ Yetkin yok.",

            ephemeral: true

          });

          return;

        }

        const existing =
          interaction.guild.channels.cache.find(
            channel =>
              channel.name ===
                "⭐|sunucu-puanı" &&
              channel.type ===
                ChannelType.GuildText
          );

        if (existing) {

          config.ratingChannelId =
            existing.id;

          saveData();

          await interaction.reply({

            content:
              `⭐ Puan kanalı zaten mevcut: ${existing}`,

            ephemeral: true

          });

          return;

        }

        const channel =
          await interaction.guild.channels.create({

            name:
              "⭐|sunucu-puanı",

            type:
              ChannelType.GuildText,

            reason:
              "LynoxNetwork puan sistemi"

          }).catch(() => null);

        if (!channel) {

          await interaction.reply({

            content:
              "❌ Puan kanalı oluşturulamadı.",

            ephemeral: true

          });

          return;

        }

        config.ratingChannelId =
          channel.id;

        saveData();

        const embed =
          new EmbedBuilder()

            .setColor(0xfacc15)

            .setTitle(
              "⭐ Sunucu Puanlama"
            )

            .setDescription(

              [
                "Sunucumuzu 1 ile 5 arasında değerlendirebilirsin.",
                "",
                "⭐ `!puanver 1`",
                "⭐ `!puanver 2`",
                "⭐ `!puanver 3`",
                "⭐ `!puanver 4`",
                "⭐ `!puanver 5`",
                "",
                "⚠️ Her üye yalnızca bir kez oy verebilir.",
                "⚠️ Verilen oy değiştirilemez."
              ].join("\n")

            )

            .setFooter({

              text:
                "LynoxNetwork • Puan Sistemi"

            });

        await channel.send({

          embeds: [embed]

        }).catch(() => {});

        await interaction.reply({

          content:
            `✅ Puan kanalı oluşturuldu: ${channel}`,

          ephemeral: true

        });

        return;

      }

      // =================================================
      // PANEL GİRİŞ / ÇIKIŞ
      // =================================================

      if (
        interaction.customId ===
        "panel_welcome"
      ) {

        if (
          !isAdmin(
            interaction.member
          )
        ) {

          await interaction.reply({

            content:
              "❌ Yetkin yok.",

            ephemeral: true

          });

          return;

        }

        let category =
          interaction.guild.channels.cache.find(
            channel =>
              channel.type ===
                ChannelType.GuildCategory &&
              (
                channel.name
                  .toLocaleLowerCase("tr-TR")
                  .includes("giriş") ||
                channel.name
                  .toLocaleLowerCase("tr-TR")
                  .includes("giris")
              )
          );

        if (!category) {

          category =
            await interaction.guild.channels.create({

              name:
                "Giriş • Çıkış",

              type:
                ChannelType.GuildCategory,

              reason:
                "LynoxNetwork giriş çıkış sistemi"

            }).catch(() => null);

        }

        const existing =
          interaction.guild.channels.cache.find(
            channel =>
              channel.name ===
                "🤩|giriş-çıkış" &&
              channel.type ===
                ChannelType.GuildText
          );

        if (existing) {

          config.welcomeChannelId =
            existing.id;

          saveData();

          await interaction.reply({

            content:
              `🤩 Giriş-çıkış kanalı zaten mevcut: ${existing}`,

            ephemeral: true

          });

          return;

        }

        const channel =
          await interaction.guild.channels.create({

            name:
              "🤩|giriş-çıkış",

            type:
              ChannelType.GuildText,

            parent:
              category?.id || undefined,

            reason:
              "LynoxNetwork giriş çıkış sistemi"

          }).catch(() => null);

        if (!channel) {

          await interaction.reply({

            content:
              "❌ Giriş-çıkış kanalı oluşturulamadı.",

            ephemeral: true

          });

          return;

        }

        config.welcomeChannelId =
          channel.id;

        saveData();

        await interaction.reply({

          content:
            `✅ Giriş / çıkış sistemi oluşturuldu: ${channel}`,

          ephemeral: true

        });

        return;

          }
            // =================================================
      // PANEL SES OLUŞTUR
      // =================================================

      if (
        interaction.customId ===
        "panel_voice"
      ) {

        if (
          !isAdmin(
            interaction.member
          )
        ) {

          await interaction.reply({

            content:
              "❌ Bu bölümü yalnızca Yönetici kullanabilir.",

            ephemeral: true

          });

          return;

        }

        const modal =
          new ModalBuilder()

            .setCustomId(
              "voice_setup_modal"
            )

            .setTitle(
              "🔊 Ses Sistemi Kur"
            );

        const channelInput =
          new TextInputBuilder()

            .setCustomId(
              "voice_join_channel"
            )

            .setLabel(
              "Oluşturma ses kanalı ID"
            )

            .setPlaceholder(
              "Üyelerin gireceği ses kanalı ID"
            )

            .setStyle(
              TextInputStyle.Short
            )

            .setRequired(true);

        const categoryInput =
          new TextInputBuilder()

            .setCustomId(
              "voice_category"
            )

            .setLabel(
              "Özel kanalların kategorisi ID"
            )

            .setPlaceholder(
              "Kategori ID"
            )

            .setStyle(
              TextInputStyle.Short
            )

            .setRequired(false);

        modal.addComponents(

          new ActionRowBuilder()
            .addComponents(
              channelInput
            ),

          new ActionRowBuilder()
            .addComponents(
              categoryInput
            )

        );

        await interaction.showModal(
          modal
        );

        return;

      }

      // =================================================
      // PANEL ROL YÖNETİMİ
      // =================================================

      if (
        interaction.customId ===
        "panel_roles"
      ) {

        if (
          !isAdmin(
            interaction.member
          )
        ) {

          await interaction.reply({

            content:
              "❌ Bu bölümü yalnızca Yönetici kullanabilir.",

            ephemeral: true

          });

          return;

        }

        const embed =
          new EmbedBuilder()

            .setColor(0x5865f2)

            .setTitle(
              "👥 Rol Yönetimi"
            )

            .setDescription(
              "Yapmak istediğin işlemi seç:"
            );

        const row =
          new ActionRowBuilder()
            .addComponents(

              new ButtonBuilder()

                .setCustomId(
                  "roles_give_all"
                )

                .setLabel(
                  "Toplu Rol Ver"
                )

                .setEmoji("➕")

                .setStyle(
                  ButtonStyle.Success
                ),

              new ButtonBuilder()

                .setCustomId(
                  "roles_remove_all"
                )

                .setLabel(
                  "Toplu Rol Al"
                )

                .setEmoji("➖")

                .setStyle(
                  ButtonStyle.Danger
                ),

              new ButtonBuilder()

                .setCustomId(
                  "roles_give_user"
                )

                .setLabel(
                  "Rolver"
                )

                .setEmoji("👤")

                .setStyle(
                  ButtonStyle.Primary
                )

            );

        await interaction.reply({

          embeds: [embed],

          components: [row],

          ephemeral: true

        });

        return;

      }

      // =================================================
      // TOPLU ROL VER
      // =================================================

      if (
        interaction.customId ===
        "roles_give_all"
      ) {

        if (
          !isAdmin(
            interaction.member
          )
        ) {

          await interaction.reply({

            content:
              "❌ Yetkin yok.",

            ephemeral: true

          });

          return;

        }

        const modal =
          new ModalBuilder()

            .setCustomId(
              "roles_give_all_modal"
            )

            .setTitle(
              "➕ Toplu Rol Ver"
            );

        const roleInput =
          new TextInputBuilder()

            .setCustomId(
              "role_id"
            )

            .setLabel(
              "Verilecek rol ID"
            )

            .setPlaceholder(
              "Rol ID"
            )

            .setStyle(
              TextInputStyle.Short
            )

            .setRequired(true);

        modal.addComponents(

          new ActionRowBuilder()
            .addComponents(
              roleInput
            )

        );

        await interaction.showModal(
          modal
        );

        return;

      }

      // =================================================
      // TOPLU ROL AL
      // =================================================

      if (
        interaction.customId ===
        "roles_remove_all"
      ) {

        if (
          !isAdmin(
            interaction.member
          )
        ) {

          await interaction.reply({

            content:
              "❌ Yetkin yok.",

            ephemeral: true

          });

          return;

        }

        const modal =
          new ModalBuilder()

            .setCustomId(
              "roles_remove_all_modal"
            )

            .setTitle(
              "➖ Toplu Rol Al"
            );

        const roleInput =
          new TextInputBuilder()

            .setCustomId(
              "role_id"
            )

            .setLabel(
              "Alınacak rol ID"
            )

            .setPlaceholder(
              "Rol ID"
            )

            .setStyle(
              TextInputStyle.Short
            )

            .setRequired(true);

        modal.addComponents(

          new ActionRowBuilder()
            .addComponents(
              roleInput
            )

        );

        await interaction.showModal(
          modal
        );

        return;

      }

      // =================================================
      // TEK KİŞİYE ROL VER
      // =================================================

      if (
        interaction.customId ===
        "roles_give_user"
      ) {

        if (
          !isAdmin(
            interaction.member
          )
        ) {

          await interaction.reply({

            content:
              "❌ Yetkin yok.",

            ephemeral: true

          });

          return;

        }

        const modal =
          new ModalBuilder()

            .setCustomId(
              "roles_give_user_modal"
            )

            .setTitle(
              "👤 Rolver"
            );

        const userInput =
          new TextInputBuilder()

            .setCustomId(
              "user_id"
            )

            .setLabel(
              "Üye ID"
            )

            .setPlaceholder(
              "Rol verilecek üyenin ID'si"
            )

            .setStyle(
              TextInputStyle.Short
            )

            .setRequired(true);

        const roleInput =
          new TextInputBuilder()

            .setCustomId(
              "role_id"
            )

            .setLabel(
              "Rol ID"
            )

            .setPlaceholder(
              "Verilecek rolün ID'si"
            )

            .setStyle(
              TextInputStyle.Short
            )

            .setRequired(true);

        modal.addComponents(

          new ActionRowBuilder()
            .addComponents(
              userInput
            ),

          new ActionRowBuilder()
            .addComponents(
              roleInput
            )

        );

        await interaction.showModal(
          modal
        );

        return;

      }

      // =================================================
      // PANEL KLÂN OYLAMASI
      // =================================================

      if (
        interaction.customId ===
        "panel_clan"
      ) {

        if (
          !isAdmin(
            interaction.member
          )
        ) {

          await interaction.reply({

            content:
              "❌ Bu sistemi yalnızca Yönetici kullanabilir.",

            ephemeral: true

          });

          return;

        }

        const embed =
          new EmbedBuilder()

            .setColor(0x8b5cf6)

            .setTitle(
              "🗳️ Klan Oylama Yönetimi"
            )

            .setDescription(

              [
                "Buradan yeni bir klan oylaması oluşturabilirsin.",
                "",
                "• İstediğin kadar klan ekleyebilirsin.",
                "• Oylama süresini belirleyebilirsin.",
                "• Her kullanıcı yalnızca **1 oy** verebilir.",
                "• Kullanıcı verdiği oyu değiştiremez.",
                "• Eşitlik olursa yalnızca eşit kalan klanlar arasında otomatik tekrar oylama yapılır."
              ].join("\n")

            );

        const row =
          new ActionRowBuilder()
            .addComponents(

              new ButtonBuilder()

                .setCustomId(
                  "clan_add"
                )

                .setLabel(
                  "Klan Ekle"
                )

                .setEmoji("➕")

                .setStyle(
                  ButtonStyle.Success
                ),

              new ButtonBuilder()

                .setCustomId(
                  "clan_start"
                )

                .setLabel(
                  "Oylamayı Başlat"
                )

                .setEmoji("🗳️")

                .setStyle(
                  ButtonStyle.Primary
                ),

              new ButtonBuilder()

                .setCustomId(
                  "clan_list"
                )

                .setLabel(
                  "Klanları Gör"
                )

                .setEmoji("📋")

                .setStyle(
                  ButtonStyle.Secondary
                )

            );

        await interaction.reply({

          embeds: [embed],

          components: [row],

          ephemeral: true

        });

        return;

      }

      // =================================================
      // KLAN EKLE
      // =================================================

      if (
        interaction.customId ===
        "clan_add"
      ) {

        if (
          !isAdmin(
            interaction.member
          )
        ) {

          await interaction.reply({

            content:
              "❌ Yetkin yok.",

            ephemeral: true

          });

          return;

        }

        if (
          !config.clan.enabled
        ) {

          await interaction.reply({

            content:
              "❌ Önce klan oylama sistemini başlatmalısın.",

            ephemeral: true

          });

          return;

        }

        const modal =
          new ModalBuilder()

            .setCustomId(
              "clan_add_modal"
            )

            .setTitle(
              "➕ Klan Ekle"
            );

        const clanName =
          new TextInputBuilder()

            .setCustomId(
              "clan_name"
            )

            .setLabel(
              "Klan adı"
            )

            .setPlaceholder(
              "Örn: Lynox"
            )

            .setStyle(
              TextInputStyle.Short
            )

            .setRequired(true)

            .setMaxLength(50);

        modal.addComponents(

          new ActionRowBuilder()
            .addComponents(
              clanName
            )

        );

        await interaction.showModal(
          modal
        );

        return;

      }

      // =================================================
      // KLAN LİSTESİ
      // =================================================

      if (
        interaction.customId ===
        "clan_list"
      ) {

        if (
          !isAdmin(
            interaction.member
          )
        ) {

          await interaction.reply({

            content:
              "❌ Yetkin yok.",

            ephemeral: true

          });

          return;

        }

        const clans =
          config.clan.clans;

        if (!clans.length) {

          await interaction.reply({

            content:
              "📋 Henüz klan eklenmemiş.",

            ephemeral: true

          });

          return;

        }

        const text =
          clans
            .map(
              (clan, index) =>
                `**${index + 1}.** ${clan.name}`
            )
            .join("\n");

        const embed =
          new EmbedBuilder()

            .setColor(0x8b5cf6)

            .setTitle(
              "📋 Klan Listesi"
            )

            .setDescription(
              text
            );

        await interaction.reply({

          embeds: [embed],

          ephemeral: true

        });

        return;

      }
            // =================================================
      // KLAN OYLAMASINI BAŞLAT
      // =================================================

      if (
        interaction.customId ===
        "clan_start"
      ) {

        if (
          !isAdmin(
            interaction.member
          )
        ) {

          await interaction.reply({

            content:
              "❌ Bu işlemi yalnızca Yönetici kullanabilir.",

            ephemeral: true

          });

          return;

        }

        if (
          config.clan.clans.length < 2
        ) {

          await interaction.reply({

            content:
              "❌ Oylama için en az **2 klan** eklemelisin.",

            ephemeral: true

          });

          return;

        }

        if (
          config.clan.activePoll
        ) {

          await interaction.reply({

            content:
              "❌ Zaten devam eden bir klan oylaması var.",

            ephemeral: true

          });

          return;

        }

        const modal =
          new ModalBuilder()

            .setCustomId(
              "clan_start_modal"
            )

            .setTitle(
              "🗳️ Klan Oylaması Başlat"
            );

        const durationInput =
          new TextInputBuilder()

            .setCustomId(
              "clan_duration"
            )

            .setLabel(
              "Oylama süresi"
            )

            .setPlaceholder(
              "Örn: 10m / 2h / 1d"
            )

            .setStyle(
              TextInputStyle.Short
            )

            .setRequired(true);

        modal.addComponents(

          new ActionRowBuilder()
            .addComponents(
              durationInput
            )

        );

        await interaction.showModal(
          modal
        );

        return;

      }

      // =================================================
      // ANONS
      // =================================================

      if (
        interaction.customId ===
        "panel_announcement"
      ) {

        if (
          !isAdmin(
            interaction.member
          )
        ) {

          await interaction.reply({

            content:
              "❌ Bu bölümü yalnızca Yönetici kullanabilir.",

            ephemeral: true

          });

          return;

        }

        const modal =
          new ModalBuilder()

            .setCustomId(
              "announcement_modal"
            )

            .setTitle(
              "📢 Anons Gönder"
            );

        const announcementInput =
          new TextInputBuilder()

            .setCustomId(
              "announcement_text"
            )

            .setLabel(
              "Anons metni"
            )

            .setPlaceholder(
              "Göndermek istediğin duyuruyu yaz..."
            )

            .setStyle(
              TextInputStyle.Paragraph
            )

            .setRequired(true)

            .setMaxLength(4000);

        modal.addComponents(

          new ActionRowBuilder()
            .addComponents(
              announcementInput
            )

        );

        await interaction.showModal(
          modal
        );

        return;

      }

      // =================================================
      // TICKET PANELİ
      // =================================================

      if (
        interaction.customId
          .startsWith("ticket_open_")
      ) {

        const ticketType =
          interaction.customId
            .replace(
              "ticket_open_",
              ""
            );

        if (
          !config.ticket.enabled
        ) {

          await interaction.reply({

            content:
              "❌ Ticket sistemi şu anda aktif değil.",

            ephemeral: true

          });

          return;

        }

        // ---------------------------------------------
        // KİŞİNİN AÇIK TICKET'I VAR MI?
        // ---------------------------------------------

        const existingTicket =
          Object.values(
            db.tickets
          ).find(
            ticket =>
              ticket.guildId ===
                interaction.guild.id &&
              ticket.userId ===
                interaction.user.id &&
              !ticket.closed
          );

        if (existingTicket) {

          const channel =
            interaction.guild.channels.cache.get(
              existingTicket.channelId
            );

          await interaction.reply({

            content:
              `❌ Zaten açık bir ticket'ın var: ${channel || "ticket kanalı"}`,

            ephemeral: true

          });

          return;

        }

        const category =
          config.ticket.categories
            .find(
              item =>
                item.id ===
                ticketType
            );

        if (!category) {

          await interaction.reply({

            content:
              "❌ Bu ticket kategorisi artık mevcut değil.",

            ephemeral: true

          });

          return;

        }

        // ---------------------------------------------
        // TICKET KANALI OLUŞTUR
        // ---------------------------------------------

        const channelName =
          `ticket-${cleanName(
            interaction.user.username
          )}`;

        const ticketChannel =
          await interaction.guild.channels.create({

            name:
              channelName,

            type:
              ChannelType.GuildText,

            parent:
              category.categoryId,

            permissionOverwrites: [

              {
                id:
                  interaction.guild.roles.everyone.id,

                deny: [

                  PermissionsBitField.Flags.ViewChannel

                ]

              },

              {
                id:
                  interaction.user.id,

                allow: [

                  PermissionsBitField.Flags.ViewChannel,

                  PermissionsBitField.Flags.SendMessages,

                  PermissionsBitField.Flags.ReadMessageHistory,

                  PermissionsBitField.Flags.AttachFiles

                ]

              },

              {
                id:
                  category.staffRoleId,

                allow: [

                  PermissionsBitField.Flags.ViewChannel,

                  PermissionsBitField.Flags.SendMessages,

                  PermissionsBitField.Flags.ReadMessageHistory,

                  PermissionsBitField.Flags.AttachFiles

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

                  PermissionsBitField.Flags.ManageMessages

                ]

              }

            ],

            reason:
              `Ticket oluşturuldu: ${interaction.user.tag}`

          }).catch(() => null);

        if (!ticketChannel) {

          await interaction.reply({

            content:
              "❌ Ticket kanalı oluşturulamadı. Botun kanal oluşturma ve yönetme izinlerini kontrol et.",

            ephemeral: true

          });

          return;

        }

        const ticketId =
          `${interaction.guild.id}-${Date.now()}`;

        db.tickets[ticketId] = {

          id:
            ticketId,

          guildId:
            interaction.guild.id,

          channelId:
            ticketChannel.id,

          userId:
            interaction.user.id,

          staffRoleId:
            category.staffRoleId,

          categoryName:
            category.name,

          categoryId:
            category.categoryId,

          createdAt:
            Date.now(),

          closed:
            false,

          closedAt:
            null

        };

        saveData();

        const ticketEmbed =
          new EmbedBuilder()

            .setColor(0x8b5cf6)

            .setTitle(
              `🎫 ${category.name} Ticket`
            )

            .setDescription(

              [
                `Hoş geldin ${interaction.user}! 👋`,
                "",
                "Destek ekibimiz en kısa sürede seninle ilgilenecektir.",
                "",
                `👤 **Ticket sahibi:** ${interaction.user}`,
                `👮 **Görevli rolü:** <@&${category.staffRoleId}>`,
                "",
                "🔒 Ticket'ı kapatmak için aşağıdaki **Ticket Kapat** butonuna basabilirsin."
              ].join("\n")

            )

            .setThumbnail(
              interaction.user.displayAvatarURL({
                size: 256
              })
            )

            .setFooter({

              text:
                "LynoxNetwork • Ticket Sistemi"

            })

            .setTimestamp();

        const closeRow =
          new ActionRowBuilder()
            .addComponents(

              new ButtonBuilder()

                .setCustomId(
                  `ticket_close_${ticketId}`
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
            `<@${interaction.user.id}> <@&${category.staffRoleId}>`,

          embeds: [
            ticketEmbed
          ],

          components: [
            closeRow
          ]

        }).catch(() => {});

        await interaction.reply({

          content:
            `🎫 Ticket'ın oluşturuldu: ${ticketChannel}`,

          ephemeral: true

        });

        return;

      }

      // =================================================
      // TICKET KAPAT
      // =================================================

      if (
        interaction.customId
          .startsWith("ticket_close_")
      ) {

        const ticketId =
          interaction.customId
            .replace(
              "ticket_close_",
              ""
            );

        const ticket =
          db.tickets[ticketId];

        if (!ticket) {

          await interaction.reply({

            content:
              "❌ Ticket verisi bulunamadı.",

            ephemeral: true

          });

          return;

        }

        if (ticket.closed) {

          await interaction.reply({

            content:
              "❌ Bu ticket zaten kapatılmış.",

            ephemeral: true

          });

          return;

        }

        const isOwner =
          interaction.user.id ===
          ticket.userId;

        const isStaff =
          interaction.member.roles.cache.has(
            ticket.staffRoleId
          );

        if (
          !isOwner &&
          !isStaff &&
          !isAdmin(
            interaction.member
          )
        ) {

          await interaction.reply({

            content:
              "❌ Bu ticket'ı kapatma yetkin yok.",

            ephemeral: true

          });

          return;

        }

        await interaction.deferReply({
          ephemeral: true
        });

        // ---------------------------------------------
        // TRANSCRIPT
        // ---------------------------------------------

        const channel =
          interaction.guild.channels.cache.get(
            ticket.channelId
          );

        if (!channel) {

          ticket.closed = true;
          ticket.closedAt = Date.now();

          saveData();

          await interaction.editReply(
            "⚠️ Ticket kanalı bulunamadı. Ticket kaydı kapatıldı."
          );

          return;

        }

        let messages = [];

        try {

          let lastId;

          while (true) {

            const options = {
              limit: 100
            };

            if (lastId) {
              options.before =
                lastId;
            }

            const batch =
              await channel.messages.fetch(
                options
              );

            if (!batch.size)
              break;

            messages.push(
              ...batch.values()
            );

            lastId =
              batch.last().id;

            if (
              batch.size < 100
            ) {
              break;
            }

            if (
              messages.length >= 1000
            ) {
              break;
            }

          }

        } catch (error) {

          console.error(
            "Transcript mesajları alınamadı:",
            error
          );

        }

        messages =
          messages.reverse();

        let transcript =
          "";

        transcript +=
          `LynoxNetwork Ticket Transcript\n`;

        transcript +=
          `========================================\n`;

        transcript +=
          `Sunucu: ${interaction.guild.name}\n`;

        transcript +=
          `Ticket sahibi: ${ticket.userId}\n`;

        transcript +=
          `Kategori: ${ticket.categoryName}\n`;

        transcript +=
          `Oluşturulma: ${new Date(
            ticket.createdAt
          ).toLocaleString("tr-TR")}\n`;

        transcript +=
          `Kapatılma: ${new Date(
            Date.now()
          ).toLocaleString("tr-TR")}\n`;

        transcript +=
          `Kapatan: ${interaction.user.tag}\n`;

        transcript +=
          `========================================\n\n`;

        for (
          const msg
          of messages
        ) {

          const date =
            new Date(
              msg.createdTimestamp
            ).toLocaleString(
              "tr-TR"
            );

          let content =
            msg.content || "";

          if (
            msg.attachments &&
            msg.attachments.size
          ) {

            content +=
              ` [Dosya: ${[
                ...msg.attachments.values()
              ]
                .map(
                  attachment =>
                    attachment.url
                )
                .join(", ")}]`;

          }

          transcript +=
            `[${date}] ${msg.author.tag}: ${content}\n`;

        }

        const transcriptPath =
          path.join(
            __dirname,
            `transcript-${ticketId}.txt`
          );

        fs.writeFileSync(
          transcriptPath,
          transcript,
          "utf8"
        );

        const transcriptFile =
          new AttachmentBuilder(
            transcriptPath,
            {
              name:
                `transcript-${ticketId}.txt`
            }
          );

        // ---------------------------------------------
        // SUNUCU SAHİBİNE TRANSCRIPT
        // ---------------------------------------------

        try {

          const owner =
            await interaction.guild.fetchOwner();

          await owner.send({

            content:
              `📄 **Ticket Transcript**\n\n🎫 Kategori: **${ticket.categoryName}**\n👤 Ticket sahibi: <@${ticket.userId}>\n🔒 Kapatan: ${interaction.user}`,

            files: [
              transcriptFile
            ]

          });

        } catch (error) {

          console.error(
            "Sunucu sahibine transcript gönderilemedi:",
            error
          );

        }

        // ---------------------------------------------
        // TICKET SAHİBİNE TRANSCRIPT
        // ---------------------------------------------

        try {

          const ticketOwner =
            await client.users.fetch(
              ticket.userId
            );

          const ownerFile =
            new AttachmentBuilder(
              transcriptPath,
              {
                name:
                  `transcript-${ticketId}.txt`
              }
            );

          await ticketOwner.send({

            content:
              `📄 **Ticket'ın kapatıldı.**\n\n🎫 Kategori: **${ticket.categoryName}**\n🔒 Kapatan: ${interaction.user.tag}`,

            files: [
              ownerFile
            ]

          });

        } catch (error) {

          console.error(
            "Ticket sahibine transcript gönderilemedi:",
            error
          );

        }

        ticket.closed =
          true;

        ticket.closedAt =
          Date.now();

        ticket.closedBy =
          interaction.user.id;

        saveData();

        await interaction.editReply(
          "✅ Ticket kapatıldı ve transcript sunucu sahibine ve ticket sahibine gönderildi."
        );

        // ---------------------------------------------
        // KANALI KAPAT
        // ---------------------------------------------

        setTimeout(
          async () => {

            await channel.delete(
              "Ticket kapatıldı"
            ).catch(() => {});

            if (
              fs.existsSync(
                transcriptPath
              )
            ) {

              fs.unlinkSync(
                transcriptPath
              );

            }

          },
          3000
        );

        return;

      }
            // =================================================
      // KLAN OYLAMA — KLAN EKLE MODAL
      // =================================================

      if (
        interaction.customId ===
        "clan_add_modal"
      ) {

        if (
          !isAdmin(
            interaction.member
          )
        ) {

          await interaction.reply({

            content:
              "❌ Yetkin yok.",

            ephemeral: true

          });

          return;

        }

        if (
          !config.clan.enabled
        ) {

          await interaction.reply({

            content:
              "❌ Klan oylama sistemi aktif değil.",

            ephemeral: true

          });

          return;

        }

        const name =
          interaction.fields
            .getTextInputValue(
              "clan_name"
            )
            .trim();

        if (!name) {

          await interaction.reply({

            content:
              "❌ Klan adı boş olamaz.",

            ephemeral: true

          });

          return;

        }

        const exists =
          config.clan.clans.some(
            clan =>
              clan.name
                .toLocaleLowerCase(
                  "tr-TR"
                ) ===
              name
                .toLocaleLowerCase(
                  "tr-TR"
                )
          );

        if (exists) {

          await interaction.reply({

            content:
              "❌ Bu isimde bir klan zaten eklenmiş.",

            ephemeral: true

          });

          return;

        }

        config.clan.clans.push({

          id:
            `${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 8)}`,

          name,

          votes: 0

        });

        saveData();

        await interaction.reply({

          content:
            `✅ **${name}** klanı oylama listesine eklendi.`,

          ephemeral: true

        });

        return;

      }

      // =================================================
      // KLAN OYLAMA BAŞLAT MODAL
      // =================================================

      if (
        interaction.customId ===
        "clan_start_modal"
      ) {

        if (
          !isAdmin(
            interaction.member
          )
        ) {

          await interaction.reply({

            content:
              "❌ Yetkin yok.",

            ephemeral: true

          });

          return;

        }

        const durationText =
          interaction.fields
            .getTextInputValue(
              "clan_duration"
            )
            .trim();

        const duration =
          parseDuration(
            durationText
          );

        if (!duration) {

          await interaction.reply({

            content:
              "❌ Geçersiz süre. Örnek: `10m`, `2h`, `1d`",

            ephemeral: true

          });

          return;

        }

        if (
          config.clan.clans.length < 2
        ) {

          await interaction.reply({

            content:
              "❌ En az 2 klan gerekli.",

            ephemeral: true

          });

          return;

        }

        const pollId =
          `${interaction.guild.id}-${Date.now()}`;

        const endAt =
          Date.now() + duration;

        const clans =
          config.clan.clans.map(
            clan => ({

              id:
                clan.id,

              name:
                clan.name,

              votes:
                0

            })
          );

        config.clan.activePoll = {

          id:
            pollId,

          guildId:
            interaction.guild.id,

          channelId:
            interaction.channel.id,

          messageId:
            null,

          endAt,

          clans,

          voters: [],

          round: 1,

          finished: false

        };

        saveData();

        const embed =
          new EmbedBuilder()

            .setColor(0x8b5cf6)

            .setTitle(
              "🗳️ KLAN OYLAMASI"
            )

            .setDescription(

              [
                "Aşağıdaki klanlardan **yalnızca birine** oy verebilirsin.",
                "",
                "⚠️ Her kullanıcı yalnızca **1 oy** verebilir.",
                "⚠️ Verilen oy değiştirilemez.",
                "",
                `⏰ Oylama bitişi: ${formatRelative(
                  endAt
                )}`,
                "",
                "🏆 **Klan sıralaması:**"
              ].join("\n")

            )

            .addFields({

              name:
                "📊 Mevcut Sıralama",

              value:
                clans
                  .map(
                    (clan, index) =>
                      `${index + 1}. **${clan.name}** — ${clan.votes} oy`
                  )
                  .join("\n")

            })

            .setFooter({

              text:
                "LynoxNetwork • Klan Oylaması"

            })

            .setTimestamp();

        const rows = [];

        let currentRow =
          new ActionRowBuilder();

        for (
          let i = 0;
          i < clans.length;
          i++
        ) {

          if (
            currentRow.components.length >= 5
          ) {

            rows.push(
              currentRow
            );

            currentRow =
              new ActionRowBuilder();

          }

          currentRow.addComponents(

            new ButtonBuilder()

              .setCustomId(
                `clan_vote_${pollId}_${clans[i].id}`
              )

              .setLabel(
                clans[i].name
              )

              .setEmoji("🗳️")

              .setStyle(
                ButtonStyle.Primary
              )

          );

        }

        if (
          currentRow.components.length
        ) {

          rows.push(
            currentRow
          );

        }

        const pollMessage =
          await interaction.channel.send({

            embeds: [
              embed
            ],

            components:
              rows.slice(0, 5)

          }).catch(() => null);

        if (!pollMessage) {

          config.clan.activePoll =
            null;

          saveData();

          await interaction.reply({

            content:
              "❌ Oylama mesajı gönderilemedi.",

            ephemeral: true

          });

          return;

        }

        config.clan.activePoll.messageId =
          pollMessage.id;

        saveData();

        await interaction.reply({

          content:
            "✅ Klan oylaması başlatıldı!",

          ephemeral: true

        });

        setTimeout(
          () => {

            finishClanPoll(
              interaction.guild.id
            );

          },
          duration
        );

        return;

      }

      // =================================================
      // KLAN OY VER
      // =================================================

      if (
        interaction.customId
          .startsWith(
            "clan_vote_"
          )
      ) {

        const parts =
          interaction.customId
            .split("_");

        const pollId =
          parts[2];

        const clanId =
          parts.slice(3).join("_");

        const poll =
          config.clan.activePoll;

        if (
          !poll ||
          poll.id !== pollId
        ) {

          await interaction.reply({

            content:
              "❌ Bu oylama artık aktif değil.",

            ephemeral: true

          });

          return;

        }

        if (
          poll.finished ||
          Date.now() >= poll.endAt
        ) {

          await interaction.reply({

            content:
              "⏰ Oylama süresi dolmuş.",

            ephemeral: true

          });

          return;

        }

        if (
          poll.voters.includes(
            interaction.user.id
          )
        ) {

          await interaction.reply({

            content:
              "❌ Daha önce oy verdin. Oyun değiştirilemez.",

            ephemeral: true

          });

          return;

        }

        const clan =
          poll.clans.find(
            item =>
              item.id ===
              clanId
          );

        if (!clan) {

          await interaction.reply({

            content:
              "❌ Klan bulunamadı.",

            ephemeral: true

          });

          return;

        }

        poll.voters.push(
          interaction.user.id
        );

        clan.votes++;

        saveData();

        await interaction.reply({

          content:
            `✅ **${clan.name}** klanına oyun kaydedildi. Oyun değiştirilemez.`,

          ephemeral: true

        });

        return;

      }

      // =================================================
      // TICKET KATEGORİ YÖNETİMİ
      // =================================================

      if (
        interaction.customId ===
        "ticket_setup_categories"
      ) {

        if (
          !isAdmin(
            interaction.member
          )
        ) {

          await interaction.reply({

            content:
              "❌ Yetkin yok.",

            ephemeral: true

          });

          return;

        }

        const embed =
          new EmbedBuilder()

            .setColor(0x8b5cf6)

            .setTitle(
              "📁 Ticket Kategorileri"
            )

            .setDescription(

              config.ticket.categories.length
                ? config.ticket.categories
                    .map(
                      (category, index) =>
                        `**${index + 1}.** ${category.name} → <#${category.categoryId}>`
                    )
                    .join("\n")
                : "Henüz ticket kategorisi eklenmemiş."

            );

        const row =
          new ActionRowBuilder()
            .addComponents(

              new ButtonBuilder()

                .setCustomId(
                  "ticket_category_add"
                )

                .setLabel(
                  "Kategori Ekle"
                )

                .setEmoji("➕")

                .setStyle(
                  ButtonStyle.Success
                ),

              new ButtonBuilder()

                .setCustomId(
                  "ticket_panel_send"
                )

                .setLabel(
                  "Paneli Gönder"
                )

                .setEmoji("📨")

                .setStyle(
                  ButtonStyle.Primary
                )

            );

        await interaction.reply({

          embeds: [
            embed
          ],

          components: [
            row
          ],

          ephemeral: true

        });

        return;

      }

      // =================================================
      // TICKET KATEGORİ EKLE
      // =================================================

      if (
        interaction.customId ===
        "ticket_category_add"
      ) {

        if (
          !isAdmin(
            interaction.member
          )
        ) {

          await interaction.reply({

            content:
              "❌ Yetkin yok.",

            ephemeral: true

          });

          return;

        }

        const modal =
          new ModalBuilder()

            .setCustomId(
              "ticket_category_add_modal"
            )

            .setTitle(
              "📁 Ticket Kategorisi Ekle"
            );

        const nameInput =
          new TextInputBuilder()

            .setCustomId(
              "category_name"
            )

            .setLabel(
              "Ticket adı"
            )

            .setPlaceholder(
              "Örn: Genel Destek"
            )

            .setStyle(
              TextInputStyle.Short
            )

            .setRequired(true);

        const categoryInput =
          new TextInputBuilder()

            .setCustomId(
              "category_id"
            )

            .setLabel(
              "Discord kategori ID"
            )

            .setPlaceholder(
              "Ticket kanallarının açılacağı kategori"
            )

            .setStyle(
              TextInputStyle.Short
            )

            .setRequired(true);

        const roleInput =
          new TextInputBuilder()

            .setCustomId(
              "staff_role_id"
            )

            .setLabel(
              "Ticket görevli rol ID"
            )

            .setPlaceholder(
              "Bu kategorinin görevli rolü"
            )

            .setStyle(
              TextInputStyle.Short
            )

            .setRequired(true);

        modal.addComponents(

          new ActionRowBuilder()
            .addComponents(
              nameInput
            ),

          new ActionRowBuilder()
            .addComponents(
              categoryInput
            ),

          new ActionRowBuilder()
            .addComponents(
              roleInput
            )

        );

        await interaction.showModal(
          modal
        );

        return;

      }

      // =================================================
      // TICKET PANELİ GÖNDER
      // =================================================

      if (
        interaction.customId ===
        "ticket_panel_send"
      ) {

        if (
          !isAdmin(
            interaction.member
          )
        ) {

          await interaction.reply({

            content:
              "❌ Yetkin yok.",

            ephemeral: true

          });

          return;

        }

        if (
          !config.ticket.categories.length
        ) {

          await interaction.reply({

            content:
              "❌ Önce en az bir ticket kategorisi eklemelisin.",

            ephemeral: true

          });

          return;

        }

        const modal =
          new ModalBuilder()

            .setCustomId(
              "ticket_panel_send_modal"
            )

            .setTitle(
              "📨 Ticket Paneli Gönder"
            );

        const channelInput =
          new TextInputBuilder()

            .setCustomId(
              "channel_id"
            )

            .setLabel(
              "Panel kanalının ID'si"
            )

            .setPlaceholder(
              "Ticket panelinin gönderileceği kanal"
            )

            .setStyle(
              TextInputStyle.Short
            )

            .setRequired(true);

        modal.addComponents(

          new ActionRowBuilder()
            .addComponents(
              channelInput
            )

        );

        await interaction.showModal(
          modal
        );

        return;

      }
            // =================================================
      // TICKET KATEGORİSİ KAYDET
      // =================================================

      if (
        interaction.customId ===
        "ticket_category_add_modal"
      ) {

        if (
          !isAdmin(
            interaction.member
          )
        ) {

          await interaction.reply({
            content:
              "❌ Yetkin yok.",
            ephemeral: true
          });

          return;
        }

        const name =
          interaction.fields.getTextInputValue(
            "category_name"
          ).trim();

        const categoryId =
          interaction.fields.getTextInputValue(
            "category_id"
          ).trim();

        const staffRoleId =
          interaction.fields.getTextInputValue(
            "staff_role_id"
          ).trim();

        const category =
          interaction.guild.channels.cache.get(
            categoryId
          );

        const role =
          interaction.guild.roles.cache.get(
            staffRoleId
          );

        if (
          !category ||
          category.type !==
            ChannelType.GuildCategory
        ) {

          await interaction.reply({
            content:
              "❌ Geçerli bir Discord kategori ID'si gir.",
            ephemeral: true
          });

          return;
        }

        if (!role) {

          await interaction.reply({
            content:
              "❌ Geçerli bir rol ID'si gir.",
            ephemeral: true
          });

          return;
        }

        config.ticket.categories.push({

          id:
            `${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 8)}`,

          name,

          categoryId,

          staffRoleId

        });

        config.ticket.enabled = true;

        saveData();

        await interaction.reply({

          content:
            `✅ **${name}** ticket kategorisi oluşturuldu.`,

          ephemeral: true

        });

        return;

      }

      // =================================================
      // TICKET PANELİNİ GÖNDER
      // =================================================

      if (
        interaction.customId ===
        "ticket_panel_send_modal"
      ) {

        if (
          !isAdmin(
            interaction.member
          )
        ) {

          await interaction.reply({
            content:
              "❌ Yetkin yok.",
            ephemeral: true
          });

          return;
        }

        const channelId =
          interaction.fields.getTextInputValue(
            "channel_id"
          ).trim();

        const channel =
          interaction.guild.channels.cache.get(
            channelId
          );

        if (
          !channel ||
          channel.type !==
            ChannelType.GuildText
        ) {

          await interaction.reply({
            content:
              "❌ Geçerli bir yazı kanalı ID'si gir.",
            ephemeral: true
          });

          return;
        }

        const embed =
          new EmbedBuilder()

            .setColor(0x8b5cf6)

            .setAuthor({

              name:
                "LynoxNetwork • Destek Merkezi",

              iconURL:
                interaction.guild.iconURL() ||
                client.user.displayAvatarURL()

            })

            .setTitle(
              "🎫 Destek Talebi"
            )

            .setDescription(

              [
                "Aşağıdaki seçeneklerden ihtiyacına uygun olanı seçerek ticket oluşturabilirsin.",
                "",
                "⚠️ Aynı anda yalnızca **1 ticket** açabilirsin.",
                "",
                "🎫 Ticket açmak için aşağıdaki butonlardan birine bas."
              ].join("\n")

            )

            .setThumbnail(
              interaction.guild.iconURL({
                size: 256
              }) ||
              client.user.displayAvatarURL()
            )

            .setFooter({

              text:
                "LynoxNetwork • Ticket Sistemi"

            })

            .setTimestamp();

        const rows = [];

        let row =
          new ActionRowBuilder();

        for (
          let i = 0;
          i <
            config.ticket.categories.length;
          i++
        ) {

          if (
            row.components.length >= 4
          ) {

            rows.push(row);

            row =
              new ActionRowBuilder();

          }

          const category =
            config.ticket.categories[i];

          row.addComponents(

            new ButtonBuilder()

              .setCustomId(
                `ticket_open_${category.id}`
              )

              .setLabel(
                category.name
              )

              .setEmoji("🎫")

              .setStyle(
                ButtonStyle.Primary
              )

          );

        }

        if (
          row.components.length
        ) {

          rows.push(row);

        }

        await channel.send({

          embeds: [
            embed
          ],

          components:
            rows.slice(0, 5)

        });

        config.ticket.panelChannelId =
          channel.id;

        config.ticket.enabled =
          true;

        saveData();

        await interaction.reply({

          content:
            `✅ Ticket paneli ${channel} kanalına gönderildi.`,

          ephemeral: true

        });

        return;

      }

      // =================================================
      // OTOROL MODAL
      // =================================================

      if (
        interaction.customId ===
        "autorole_modal"
      ) {

        if (
          !isAdmin(
            interaction.member
          )
        ) {

          await interaction.reply({
            content:
              "❌ Yetkin yok.",
            ephemeral: true
          });

          return;
        }

        const roleId =
          interaction.fields.getTextInputValue(
            "autorole_role_id"
          ).trim();

        const role =
          interaction.guild.roles.cache.get(
            roleId
          );

        if (!role) {

          await interaction.reply({
            content:
              "❌ Rol bulunamadı.",
            ephemeral: true
          });

          return;
        }

        if (
          role.position >=
          interaction.guild.members.me.roles.highest.position
        ) {

          await interaction.reply({
            content:
              "❌ Bot bu rolü veremiyor. Botun rolünü hedef rolden yukarı taşı.",
            ephemeral: true
          });

          return;
        }

        config.autoRoleId =
          role.id;

        saveData();

        await interaction.reply({

          content:
            `🤖 OtoRol ayarlandı: ${role}`,

          ephemeral: true

        });

        return;

      }

      // =================================================
      // SES SİSTEMİ MODAL
      // =================================================

      if (
        interaction.customId ===
        "voice_setup_modal"
      ) {

        if (
          !isAdmin(
            interaction.member
          )
        ) {

          await interaction.reply({
            content:
              "❌ Yetkin yok.",
            ephemeral: true
          });

          return;
        }

        const joinChannelId =
          interaction.fields.getTextInputValue(
            "voice_join_channel"
          ).trim();

        const categoryId =
          interaction.fields.getTextInputValue(
            "voice_category"
          ).trim();

        const joinChannel =
          interaction.guild.channels.cache.get(
            joinChannelId
          );

        if (
          !joinChannel ||
          joinChannel.type !==
            ChannelType.GuildVoice
        ) {

          await interaction.reply({
            content:
              "❌ Geçerli bir ses kanalı ID'si gir.",
            ephemeral: true
          });

          return;
        }

        let category = null;

        if (categoryId) {

          category =
            interaction.guild.channels.cache.get(
              categoryId
            );

          if (
            !category ||
            category.type !==
              ChannelType.GuildCategory
          ) {

            await interaction.reply({
              content:
                "❌ Geçerli bir kategori ID'si gir.",
              ephemeral: true
            });

            return;
          }

        }

        config.voiceJoinChannelId =
          joinChannelId;

        config.voiceCategoryId =
          category?.id ||
          joinChannel.parentId ||
          null;

        saveData();

        await interaction.reply({

          content:
            `🔊 Ses sistemi aktif edildi.\nOluşturma kanalı: ${joinChannel}`,

          ephemeral: true

        });

        return;

      }

      // =================================================
      // TOPLU ROL VER MODAL
      // =================================================

      if (
        interaction.customId ===
        "roles_give_all_modal"
      ) {

        if (
          !isAdmin(
            interaction.member
          )
        ) {

          await interaction.reply({
            content:
              "❌ Yetkin yok.",
            ephemeral: true
          });

          return;
        }

        const roleId =
          interaction.fields.getTextInputValue(
            "role_id"
          ).trim();

        const role =
          interaction.guild.roles.cache.get(
            roleId
          );

        if (!role) {

          await interaction.reply({
            content:
              "❌ Rol bulunamadı.",
            ephemeral: true
          });

          return;
        }

        await interaction.deferReply({
          ephemeral: true
        });

        let success = 0;
        let failed = 0;

        const members =
          await interaction.guild.members.fetch();

        for (
          const member
          of members.values()
        ) {

          if (
            member.user.bot
          ) continue;

          if (
            member.roles.cache.has(
              role.id
            )
          ) continue;

          try {

            await member.roles.add(
              role
            );

            success++;

          } catch {

            failed++;

          }

        }

        await interaction.editReply({

          content:
            [
              "✅ **Toplu rol verme tamamlandı.**",
              "",
              `➕ Başarılı: **${success}**`,
              `❌ Başarısız: **${failed}**`
            ].join("\n")

        });

        return;

      }

      // =================================================
      // TOPLU ROL AL MODAL
      // =================================================

      if (
        interaction.customId ===
        "roles_remove_all_modal"
      ) {

        if (
          !isAdmin(
            interaction.member
          )
        ) {

          await interaction.reply({
            content:
              "❌ Yetkin yok.",
            ephemeral: true
          });

          return;
        }

        const roleId =
          interaction.fields.getTextInputValue(
            "role_id"
          ).trim();

        const role =
          interaction.guild.roles.cache.get(
            roleId
          );

        if (!role) {

          await interaction.reply({
            content:
              "❌ Rol bulunamadı.",
            ephemeral: true
          });

          return;
        }

        await interaction.deferReply({
          ephemeral: true
        });

        let success = 0;
        let failed = 0;

        const members =
          await interaction.guild.members.fetch();

        for (
          const member
          of members.values()
        ) {

          if (
            member.user.bot
          ) continue;

          if (
            !member.roles.cache.has(
              role.id
            )
          ) continue;

          try {

            await member.roles.remove(
              role
            );

            success++;

          } catch {

            failed++;

          }

        }

        await interaction.editReply({

          content:
            [
              "✅ **Toplu rol alma tamamlandı.**",
              "",
              `➖ Başarılı: **${success}**`,
              `❌ Başarısız: **${failed}**`
            ].join("\n")

        });

        return;

      }

      // =================================================
      // TEK KİŞİ ROLVER MODAL
      // =================================================

      if (
        interaction.customId ===
        "roles_give_user_modal"
      ) {

        if (
          !isAdmin(
            interaction.member
          )
        ) {

          await interaction.reply({
            content:
              "❌ Yetkin yok.",
            ephemeral: true
          });

          return;
        }

        const userId =
          interaction.fields.getTextInputValue(
            "user_id"
          ).trim();

        const roleId =
          interaction.fields.getTextInputValue(
            "role_id"
          ).trim();

        const member =
          await interaction.guild.members
            .fetch(userId)
            .catch(() => null);

        const role =
          interaction.guild.roles.cache.get(
            roleId
          );

        if (!member) {

          await interaction.reply({
            content:
              "❌ Üye bulunamadı.",
            ephemeral: true
          });

          return;

        }

        if (!role) {

          await interaction.reply({
            content:
              "❌ Rol bulunamadı.",
            ephemeral: true
          });

          return;

        }

        try {

          await member.roles.add(
            role
          );

        } catch {

          await interaction.reply({
            content:
              "❌ Rol verilemedi. Botun rol hiyerarşisini kontrol et.",
            ephemeral: true
          });

          return;

        }

        await interaction.reply({

          content:
            `✅ ${member} kişisine ${role} rolü verildi.`,

          ephemeral: true

        });

        return;

      }
            // =================================================
      // ANONS MODAL
      // =================================================

      if (
        interaction.customId ===
        "announcement_modal"
      ) {

        if (
          !isAdmin(interaction.member)
        ) {
          await interaction.reply({
            content:
              "❌ Bu işlemi yalnızca Yönetici kullanabilir.",
            ephemeral: true
          });
          return;
        }

        const text =
          interaction.fields
            .getTextInputValue(
              "announcement_text"
            )
            .trim();

        if (!text) {
          await interaction.reply({
            content:
              "❌ Anons boş olamaz.",
            ephemeral: true
          });
          return;
        }

        const announcementEmbed =
          new EmbedBuilder()
            .setColor(0x8b5cf6)
            .setAuthor({
              name:
                "LynoxNetwork • Duyuru"
            })
            .setTitle("📢 DUYURU")
            .setDescription(text)
            .setFooter({
              text:
                `Yetkili: ${interaction.user.tag}`
            })
            .setTimestamp();

        const announcementChannel =
          config.announcementChannelId
            ? interaction.guild.channels.cache.get(
                config.announcementChannelId
              )
            : null;

        if (
          !announcementChannel ||
          announcementChannel.type !==
            ChannelType.GuildText
        ) {

          await interaction.reply({
            content:
              "❌ Duyuru kanalı ayarlanmamış.",
            ephemeral: true
          });

          return;
        }

        // @everyone + @here yalnızca duyuru kanalında
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

        // Sohbet kanalına everyone/here olmadan gönder
        const chatChannel =
          config.chatChannelId
            ? interaction.guild.channels.cache.get(
                config.chatChannelId
              )
            : interaction.channel;

        if (
          chatChannel &&
          chatChannel.type ===
            ChannelType.GuildText
        ) {

          await chatChannel.send({
            embeds: [
              announcementEmbed
            ]
          }).catch(() => {});

        }

        await interaction.reply({
          content:
            "✅ Anons başarıyla gönderildi.",
          ephemeral: true
        });

        return;
      }

      // =================================================
      // TICKET KAPAT BUTONU DIŞINDAKİ BUTONLARIN SONU
      // =================================================
    }

    // =================================================
    // MODALLAR
    // =================================================

    if (
      interaction.isModalSubmit()
    ) {

      // -----------------------------------------------
      // KLÂN OYLAMA KANALI / SİSTEM AYARI
      // -----------------------------------------------

      if (
        interaction.customId ===
        "clan_setup_modal"
      ) {

        if (
          !isAdmin(interaction.member)
        ) {
          await interaction.reply({
            content:
              "❌ Yetkin yok.",
            ephemeral: true
          });
          return;
        }

        const channelId =
          interaction.fields
            .getTextInputValue(
              "clan_channel"
            )
            .trim();

        const channel =
          interaction.guild.channels.cache.get(
            channelId
          );

        if (
          !channel ||
          channel.type !==
            ChannelType.GuildText
        ) {
          await interaction.reply({
            content:
              "❌ Geçerli bir yazı kanalı ID'si gir.",
            ephemeral: true
          });
          return;
        }

        config.clan.enabled = true;
        config.clan.channelId =
          channel.id;

        saveData();

        await interaction.reply({
          content:
            `🗳️ Klan sistemi aktif edildi: ${channel}`,
          ephemeral: true
        });

        return;
      }

      // -----------------------------------------------
      // KLAN OYLAMA BAŞLAT
      // -----------------------------------------------

      if (
        interaction.customId ===
        "clan_start_modal"
      ) {

        // Bu işlem yukarıdaki handler'da
        // işlendiği için burada tekrar işlemiyoruz.

        return;
      }

    }

    // =================================================
    // SELECT MENU
    // =================================================

    if (
      interaction.isStringSelectMenu()
    ) {

      // Gelecekteki gelişmiş panel menüleri
      // için altyapı hazır tutuluyor.

      return;

    }

  }
);

// =====================================================
// ÜYE GİRİŞİ
// =====================================================

client.on(
  "guildMemberAdd",
  async member => {

    const config =
      getGuildConfig(
        member.guild.id
      );

    // =================================================
    // OTOROL
    // =================================================

    if (
      config.autoRoleId
    ) {

      const role =
        member.guild.roles.cache.get(
          config.autoRoleId
        );

      if (role) {

        await member.roles
          .add(role)
          .catch(error => {

            console.error(
              "OtoRol hatası:",
              error
            );

          });

      }

    }

    // =================================================
    // HOŞ GELDİN
    // =================================================

    if (
      config.welcomeChannelId
    ) {

      const channel =
        member.guild.channels.cache.get(
          config.welcomeChannelId
        );

      if (
        channel &&
        channel.type ===
          ChannelType.GuildText
      ) {

        const accountAge =
          Date.now() -
          member.user.createdTimestamp;

        const days =
          Math.floor(
            accountAge /
              86400000
          );

        let reliability;

        if (
          days < 60
        ) {

          reliability =
            "🔴 Güvenilir değil";

        } else if (
          days < 150
        ) {

          reliability =
            "🟡 Stabil";

        } else if (
          days < 365
        ) {

          reliability =
            "🟢 Güvenilir";

        } else if (
          days >= 730
        ) {

          reliability =
            "💎 %100 Güvenilir";

        } else {

          reliability =
            "🟢 Güvenilir";

        }

        const embed =
          new EmbedBuilder()

            .setColor(0x8b5cf6)

            .setAuthor({

              name:
                `${member.user.username} sunucuya katıldı!`,

              iconURL:
                member.user.displayAvatarURL()

            })

            .setTitle(
              "🤩 HOŞ GELDİN!"
            )

            .setDescription(

              [
                `Sunucumuza hoş geldin ${member}! 🎉`,
                "",
                "Yeni maceranda iyi eğlenceler!",
                "",
                `👤 **Üye:** ${member}`,
                `📅 **Giriş tarihi:** <t:${Math.floor(
                  Date.now() / 1000
                )}:F>`,
                `🗓️ **Hesap tarihi:** <t:${Math.floor(
                  member.user.createdTimestamp /
                    1000
                )}:F>`,
                `🛡️ **Güvenilirlik:** ${reliability}`
              ].join("\n")

            )

            .setThumbnail(
              member.user.displayAvatarURL({
                size: 512
              })
            )

            .setFooter({

              text:
                `Üye #${member.guild.memberCount}`

            })

            .setTimestamp();

        await channel.send({

          content:
            `🤩 Hoş geldin ${member}!`,

          embeds: [
            embed
          ]

        }).catch(() => {});

      }

    }

  }
);

// =====================================================
// ÜYE ÇIKIŞI
// =====================================================

client.on(
  "guildMemberRemove",
  async member => {

    const config =
      getGuildConfig(
        member.guild.id
      );

    if (
      !config.welcomeChannelId
    ) return;

    const channel =
      member.guild.channels.cache.get(
        config.welcomeChannelId
      );

    if (
      !channel ||
      channel.type !==
        ChannelType.GuildText
    ) return;

    const embed =
      new EmbedBuilder()

        .setColor(0xef4444)

        .setAuthor({

          name:
            `${member.user.username} sunucudan ayrıldı`,

          iconURL:
            member.user.displayAvatarURL()

        })

        .setTitle(
          "👋 GÜLE GÜLE"
        )

        .setDescription(

          [
            `**${member.user.tag}** sunucumuzdan ayrıldı.`,
            "",
            `👤 **Üye:** ${member.user.tag}`,
            `👥 **Kalan üye:** ${member.guild.memberCount}`
          ].join("\n")

        )

        .setThumbnail(
          member.user.displayAvatarURL({
            size: 512
          })
        )

        .setFooter({

          text:
            "LynoxNetwork • Giriş / Çıkış"

        })

        .setTimestamp();

    await channel.send({

      embeds: [
        embed
      ]

    }).catch(() => {});

  }
);

// =====================================================
// ÖZEL SES KANALI
// =====================================================

client.on(
  "voiceStateUpdate",
  async (
    oldState,
    newState
  ) => {

    const guild =
      newState.guild;

    const config =
      getGuildConfig(
        guild.id
      );

    // =================================================
    // OLUŞTURMA KANALINA GİRDİ
    // =================================================

    if (
      newState.channelId ===
      config.voiceJoinChannelId
    ) {

      const category =
        config.voiceCategoryId
          ? guild.channels.cache.get(
              config.voiceCategoryId
            )
          : newState.channel?.parent;

      const channel =
        await guild.channels.create({

          name:
            `🔊 ${newState.member.user.username}`,

          type:
            ChannelType.GuildVoice,

          parent:
            category?.id || undefined,

          permissionOverwrites: [

            {
              id:
                guild.roles.everyone.id,

              deny: [
                PermissionsBitField.Flags.Connect
              ]

            },

            {
              id:
                newState.member.id,

              allow: [

                PermissionsBitField.Flags.ViewChannel,

                PermissionsBitField.Flags.Connect,

                PermissionsBitField.Flags.Speak,

                PermissionsBitField.Flags.Stream,

                PermissionsBitField.Flags.UseVAD

              ]

            }

          ],

          reason:
            "Özel ses kanalı oluşturuldu"

        }).catch(() => null);

      if (!channel) return;

      db.tempVoiceChannels[
        channel.id
      ] = {

        guildId:
          guild.id,

        ownerId:
          newState.member.id,

        createdAt:
          Date.now()

      };

      saveData();

      await newState.member.voice
        .setChannel(channel)
        .catch(() => {});

      return;

    }

    // =================================================
    // ÖZEL KANALDAN ÇIKTI
    // =================================================

    if (
      oldState.channelId &&
      db.tempVoiceChannels[
        oldState.channelId
      ]
    ) {

      const temp =
        db.tempVoiceChannels[
          oldState.channelId
        ];

      const channel =
        guild.channels.cache.get(
          oldState.channelId
        );

      if (
        channel &&
        channel.members.size === 0
      ) {

        await channel.delete(
          "Özel ses kanalında kimse kalmadı"
        ).catch(() => {});

        delete db.tempVoiceChannels[
          oldState.channelId
        ];

        saveData();

      }

    }

  }
);

// =====================================================
// SÜREKLİ TEMİZLEME
// =====================================================

setInterval(
  async () => {

    for (
      const guild
      of client.guilds.cache.values()
    ) {

      const config =
        getGuildConfig(
          guild.id
        );

      // -----------------------------------------------
      // BOŞ ÖZEL SES KANALLARI
      // -----------------------------------------------

      for (
        const [
          channelId
        ]
        of Object.entries(
          db.tempVoiceChannels
        )
      ) {

        const temp =
          db.tempVoiceChannels[
            channelId
          ];

        if (
          temp.guildId !==
          guild.id
        ) continue;

        const channel =
          guild.channels.cache.get(
            channelId
          );

        if (
          !channel ||
          channel.members.size === 0
        ) {

          await channel?.delete(
            "Boş özel ses kanalı"
          ).catch(() => {});

          delete db.tempVoiceChannels[
            channelId
          ];

        }

      }

      // -----------------------------------------------
      // SÜRESİ DOLAN KLAN OYLAMASI
      // -----------------------------------------------

      if (
        config.clan.activePoll &&
        !config.clan.activePoll.finished &&
        Date.now() >=
          config.clan.activePoll.endAt
      ) {

        await finishClanPoll(
          guild.id
        );

      }

    }

    saveData();

  },
  30000
);

// =====================================================
// BOT HAZIR
// =====================================================

client.once(
  "ready",
  async () => {

    console.log(
      `✅ ${client.user.tag} aktif!`
    );

    console.log(
      `📡 ${client.guilds.cache.size} sunucuda aktif.`
    );

    client.user.setPresence({

      activities: [

        {

          name:
            "LynoxNetwork • Yönetim",

          type:
            ActivityType.Watching

        }

      ],

      status:
        "online"

    });

  }
);

// =====================================================
// HATALAR
// =====================================================

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

// =====================================================
// LOGIN
// =====================================================

client.login(
  process.env.TOKEN
);
