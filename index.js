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
  UserSelectMenuBuilder,
  RoleSelectMenuBuilder,
  ChannelSelectMenuBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");

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
    Partials.User,
    Partials.GuildMember
  ]
});

const PREFIX = "!";

const DATA_FILE = path.join(__dirname, "lynox-data.json");

let data = {
  guilds: {}
};

if (fs.existsSync(DATA_FILE)) {
  try {
    data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    data = { guilds: {} };
  }
}

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Veri kaydedilemedi:", err);
  }
}

function getGuildData(guildId) {
  if (!data.guilds[guildId]) {
    data.guilds[guildId] = {
      ticket: {
        categoryId: null,
        staffRoleId: null,
        panelChannelId: null
      },

      suggestion: {
        channelId: null
      },

      welcome: {
        channelId: null
      },

      rating: {
        channelId: null,
        votes: {}
      },

      autoRole: {
        roleId: null
      },

      clans: {
        list: [],
        active: null
      },

      giveaways: {},

      drops: {},

      tempVoice: {
        channelId: null
      },

      tickets: {}
    };

    saveData();
  }

  return data.guilds[guildId];
}

function makeEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp()
    .setFooter({
      text: "LynoxNetwork • Modern Discord System"
    });
}

function isStaff(member) {
  return member.permissions.has(
    PermissionsBitField.Flags.ManageGuild
  );
}

function isAdmin(member) {
  return member.permissions.has(
    PermissionsBitField.Flags.Administrator
  );
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];

  if (days) parts.push(`${days}g`);
  if (hours) parts.push(`${hours}s`);
  if (minutes) parts.push(`${minutes}d`);
  if (seconds || parts.length === 0) parts.push(`${seconds}sn`);

  return parts.join(" ");
}

function parseDuration(text) {
  if (!text) return null;

  const match = String(text)
    .toLowerCase()
    .match(/^(\d+)(s|sn|m|d|h|g|w)$/);

  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2];

  const multipliers = {
    s: 1000,
    sn: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    g: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000
  };

  return amount * multipliers[unit];
}

function getReliability(createdTimestamp) {
  const age = Date.now() - createdTimestamp;

  const twoMonths = 60 * 24 * 60 * 60 * 1000;
  const fiveMonths = 150 * 24 * 60 * 60 * 1000;
  const oneYear = 365 * 24 * 60 * 60 * 1000;

  if (age < twoMonths) {
    return "⚠️ Güvenilir değil";
  }

  if (age < fiveMonths) {
    return "🟡 Stabil";
  }

  if (age < oneYear) {
    return "🟢 Güvenilir";
  }

  return "💯 %100 Güvenilir";
}

function createTicketButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_general")
      .setLabel("Genel Destek")
      .setEmoji("🎫")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("ticket_support")
      .setLabel("Yetkili Destek")
      .setEmoji("🛠️")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("ticket_report")
      .setLabel("Şikayet / Bildirim")
      .setEmoji("🚨")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId("ticket_other")
      .setLabel("Diğer")
      .setEmoji("📩")
      .setStyle(ButtonStyle.Success)
  );
}

function createTicketCloseButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_close")
      .setLabel("Ticket Kapat")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Danger)
  );
}

function sanitizeChannelName(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9-_ğüşöçıİĞÜŞÖÇ]/gi, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

client.once("ready", () => {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`🤖 Bot aktif: ${client.user.tag}`);
  console.log(`🌐 LynoxNetwork sistemleri hazır`);
  console.log(`📡 ${client.guilds.cache.size} sunucuda aktif`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  client.user.setPresence({
    activities: [
      {
        name: "LynoxNetwork • !panel",
        type: 3
      }
    ],
    status: "online"
  });
});

client.on("guildMemberAdd", async member => {
  const guildData = getGuildData(member.guild.id);

  if (guildData.autoRole.roleId) {
    try {
      const role = member.guild.roles.cache.get(
        guildData.autoRole.roleId
      );

      if (
        role &&
        role.position < member.guild.members.me.roles.highest.position
      ) {
        await member.roles.add(role);
      }
    } catch (err) {
      console.error("OtoRol hatası:", err);
    }
  }

  if (guildData.welcome.channelId) {
    try {
      const channel = member.guild.channels.cache.get(
        guildData.welcome.channelId
      );

      if (channel) {
        const embed = new EmbedBuilder()
          .setColor(0x8b5cf6)
          .setAuthor({
            name: "LynoxNetwork • Hoş Geldin!"
          })
          .setThumbnail(member.user.displayAvatarURL({ size: 512 }))
          .setDescription(
            `🎉 **Hoş geldin ${member}!**\n\n` +
            `Sunucumuza katıldığın için teşekkürler.`
          )
          .addFields(
            {
              name: "👤 Üye",
              value: `${member.user.tag}\n<@${member.id}>`,
              inline: true
            },
            {
              name: "📅 Giriş Tarihi",
              value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
              inline: true
            },
            {
              name: "🗓️ Hesap Tarihi",
              value: `<t:${Math.floor(
                member.user.createdTimestamp / 1000
              )}:F>`,
              inline: false
            },
            {
              name: "🛡️ Güvenilirlik",
              value: getReliability(
                member.user.createdTimestamp
              ),
              inline: true
            },
            {
              name: "👥 Sunucu Üyesi",
              value: `${member.guild.memberCount}`,
              inline: true
            }
          )
          .setTimestamp()
          .setFooter({
            text: "LynoxNetwork • Güvenli ve modern topluluk"
          });

        await channel.send({
          content: `${member}`,
          embeds: [embed]
        });
      }
    } catch (err) {
      console.error("Hoş geldin sistemi hatası:", err);
    }
  }
});

client.on("guildMemberRemove", async member => {
  const guildData = getGuildData(member.guild.id);

  if (!guildData.welcome.channelId) return;

  try {
    const channel = member.guild.channels.cache.get(
      guildData.welcome.channelId
    );

    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle("👋 Üye Ayrıldı")
      .setThumbnail(member.user.displayAvatarURL({ size: 512 }))
      .setDescription(
        `**${member.user.tag}** sunucudan ayrıldı.`
      )
      .addFields({
        name: "👥 Güncel Üye Sayısı",
        value: `${member.guild.memberCount}`,
        inline: true
      })
      .setTimestamp()
      .setFooter({
        text: "LynoxNetwork"
      });

    await channel.send({
      embeds: [embed]
    });
  } catch (err) {
    console.error("Çıkış sistemi hatası:", err);
  }
});

client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const content = message.content.trim();

  if (!content.startsWith(PREFIX)) return;

  const args = content.slice(PREFIX.length).trim().split(/\s+/);
  const command = (args.shift() || "").toLowerCase();

  const guildData = getGuildData(message.guild.id);

  if (command === "avatar") {
    const target =
      message.mentions.users.first() || message.author;

    const avatar = target.displayAvatarURL({
      extension: "png",
      size: 1024
    });

    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle("🖼️ Avatar")
      .setDescription(`**${target.tag}** kullanıcısının avatarı`)
      .setImage(avatar)
      .setTimestamp()
      .setFooter({
        text: "LynoxNetwork"
      });

    return message.reply({
      embeds: [embed]
    });
  }

  if (command === "ip") {
    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle("🌐 LynoxNetwork Sunucu Bilgileri")
      .setDescription(
        "LynoxNetwork'e bağlanmak için aşağıdaki bilgileri kullanabilirsin."
      )
      .addFields(
        {
          name: "☕ Java",
          value:
            "**Sürüm:** `1.21.x`\n" +
            "**IP:** `play.lynoxnetwork.com.tr`"
        },
        {
          name: "📱 Bedrock",
          value:
            "**Sürüm:** Yakında\n" +
            "**IP:** `play.lynoxnetwork.com.tr`"
        }
      )
      .setTimestamp()
      .setFooter({
        text: "LynoxNetwork • Java & Bedrock"
      });

    return message.reply({
      embeds: [embed]
    });
  }

  if (command === "serverinfo") {
    const owner = await message.guild.fetchOwner();

    const guildData = getGuildData(message.guild.id);

    const votes = Object.values(
      guildData.rating.votes || {}
    );

    const totalVotes = votes.length;

    const average =
      totalVotes > 0
        ? (
            votes.reduce((sum, value) => sum + Number(value), 0) /
            totalVotes
          ).toFixed(1)
        : "Henüz puan verilmedi";

    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle(`🌐 ${message.guild.name}`)
      .setThumbnail(
        message.guild.iconURL({
          size: 512
        })
      )
      .addFields(
        {
          name: "👑 Sunucu Sahibi",
          value: `${owner.user}`,
          inline: true
        },
        {
          name: "👥 Üye Sayısı",
          value: `${message.guild.memberCount}`,
          inline: true
        },
        {
          name: "📅 Kurulma Zamanı",
          value: `<t:${Math.floor(
            message.guild.createdTimestamp / 1000
          )}:F>`,
          inline: false
        },
        {
          name: "⭐ Sunucu Puanı",
          value:
            totalVotes > 0
              ? `**${average}/5** (${totalVotes} oy)`
              : "⭐ Henüz puan verilmedi",
          inline: true
        }
      )
      .setTimestamp()
      .setFooter({
        text: "LynoxNetwork • Sunucu Bilgileri"
      });

    return message.reply({
      embeds: [embed]
    });
  }

  if (command === "puanver") {
    const ratingChannelId = guildData.rating.channelId;

    if (
      ratingChannelId &&
      message.channel.id !== ratingChannelId
    ) {
      try {
        await message.delete();
      } catch {}

      const warning = await message.channel.send({
        content: `${message.author} ⚠️ Puan vermek için <#${ratingChannelId}> kanalını kullanmalısın.`
      });

      setTimeout(() => {
        warning.delete().catch(() => {});
      }, 5000);

      return;
    }

    const score = Number(args[0]);

    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return message.reply({
        embeds: [
          makeEmbed(
            "⭐ Geçersiz Puan",
            "Lütfen **1 ile 5 arasında** bir puan ver.\n\nÖrnek: `!puanver 5`"
          )
        ]
      });
    }

    if (guildData.rating.votes[message.author.id]) {
      return message.reply({
        embeds: [
          makeEmbed(
            "⚠️ Zaten Oy Verdiniz",
            "Sunucuya daha önce puan verdin. Bir kullanıcı yalnızca bir kez oy verebilir."
          )
        ]
      });
    }

    guildData.rating.votes[message.author.id] = score;
    saveData();

    const stars = "⭐".repeat(score);

    const embed = new EmbedBuilder()
      .setColor(0xf59e0b)
      .setTitle("⭐ Sunucu Puanı Alındı")
      .setDescription(
        `${message.author} sunucuya **${score}/5** puan verdi.\n\n${stars}`
      )
      .setTimestamp()
      .setFooter({
        text: "LynoxNetwork • Puan Sistemi"
      });

    return message.reply({
      embeds: [embed]
    });
  }

  if (command === "öneri" || command === "oneri") {
    if (!guildData.suggestion.channelId) {
      return message.reply({
        embeds: [
          makeEmbed(
            "⚠️ Öneri Sistemi Kurulu Değil",
            "Yönetici panelinden önce öneri kanalını oluşturmalısın."
          )
        ]
      });
    }

    if (
      message.channel.id !== guildData.suggestion.channelId
    ) {
      return;
    }

    const suggestion = args.join(" ");

    if (!suggestion) {
      return message.reply({
        embeds: [
          makeEmbed(
            "💡 Öneri Eksik",
            "Örnek kullanım:\n`!öneri Sunucuya yeni bir sistem eklensin.`"
          )
        ]
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setAuthor({
        name: `${message.author.tag} tarafından önerildi`,
        iconURL: message.author.displayAvatarURL()
      })
      .setTitle("💡 Yeni Öneri")
      .setDescription(`> ${suggestion}`)
      .addFields(
        {
          name: "📊 Oylama",
          value: "👍 0  👎 0"
        }
      )
      .setTimestamp()
      .setFooter({
        text: "LynoxNetwork • Öneri Sistemi"
      });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("suggestion_up")
        .setEmoji("👍")
        .setLabel("0")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("suggestion_down")
        .setEmoji("👎")
        .setLabel("0")
        .setStyle(ButtonStyle.Danger)
    );

    try {
      await message.delete();
    } catch {}

    return message.channel.send({
      embeds: [embed],
      components: [row]
    });
  }

  if (command === "ticket") {
    if (!isStaff(message.member)) {
      return message.reply({
        embeds: [
          makeEmbed(
            "⛔ Yetkin Yok",
            "Bu komutu kullanmak için **Sunucuyu Yönet** yetkisine sahip olmalısın."
          )
        ]
      });
    }

    if (!guildData.ticket.categoryId) {
      return message.reply({
        embeds: [
          makeEmbed(
            "⚠️ Ticket Sistemi Kurulu Değil",
            "Önce `!panel` üzerinden ticket sistemini kur."
          )
        ]
      });
    }

    const category =
      message.guild.channels.cache.get(
        guildData.ticket.categoryId
      );

    if (
      !category ||
      category.type !== ChannelType.GuildCategory
    ) {
      return message.reply({
        embeds: [
          makeEmbed(
            "❌ Kategori Bulunamadı",
            "Ticket kategorisi artık mevcut değil. Panelden tekrar kur."
          )
        ]
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle("🎫 LynoxNetwork Destek Merkezi")
      .setDescription(
        "Aşağıdaki seçeneklerden ihtiyacına uygun olanı seçerek ticket oluşturabilirsin.\n\n" +
        "🎫 **Genel Destek**\n" +
        "🛠️ **Yetkili Destek**\n" +
        "🚨 **Şikayet / Bildirim**\n" +
        "📩 **Diğer**\n\n" +
        "⚠️ Her kullanıcı aynı anda yalnızca **1 ticket** açabilir."
      )
      .setTimestamp()
      .setFooter({
        text: "LynoxNetwork • Ticket Sistemi"
      });

    return message.channel.send({
      embeds: [embed],
      components: [createTicketButtons()]
    });
  }

  if (command === "çekiliş" || command === "cekilis") {
    if (!isStaff(message.member)) {
      return message.reply({
        embeds: [
          makeEmbed(
            "⛔ Yetkin Yok",
            "Çekiliş başlatmak için **Sunucuyu Yönet** yetkisine sahip olmalısın."
          )
        ]
      });
    }

    const duration = parseDuration(args[0]);
    const winnerCount = Number(args[1]);
    const prize = args.slice(2).join(" ");

    if (
      !duration ||
      !Number.isInteger(winnerCount) ||
      winnerCount < 1 ||
      !prize
    ) {
      return message.reply({
        embeds: [
          makeEmbed(
            "🎉 Kullanım Hatalı",
            "Doğru kullanım:\n`!çekiliş <süre> <kazanan sayısı> <ödül>`\n\nÖrnek:\n`!çekiliş 1h 2 1000 TL`"
          )
        ]
      });
    }

    if (duration > 7 * 24 * 60 * 60 * 1000) {
      return message.reply({
        embeds: [
          makeEmbed(
            "⚠️ Süre Çok Uzun",
            "Çekiliş süresi en fazla **7 gün** olabilir."
          )
        ]
      });
    }

    const giveawayId =
      `${message.guild.id}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

    const endAt = Date.now() + duration;

    guildData.giveaways[giveawayId] = {
      channelId: message.channel.id,
      messageId: null,
      hostId: message.author.id,
      prize,
      winnerCount,
      endAt,
      participants: []
    };

    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle("🎉 YENİ ÇEKİLİŞ")
      .setDescription(
        `## 🎁 Ödül\n**${prize}**\n\n` +
        `👑 **Düzenleyen:** ${message.author}\n` +
        `🏆 **Kazanan:** ${winnerCount} kişi\n` +
        `⏰ **Bitiş:** <t:${Math.floor(endAt / 1000)}:R>\n\n` +
        `Katılmak için aşağıdaki **🎉 Katıl** butonuna bas!`
      )
      .setTimestamp()
      .setFooter({
        text: "LynoxNetwork • Çekiliş Sistemi"
      });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`giveaway_join:${giveawayId}`)
        .setLabel("Katıl")
        .setEmoji("🎉")
        .setStyle(ButtonStyle.Success)
    );

    const giveawayMessage = await message.channel.send({
      embeds: [embed],
      components: [row]
    });

    guildData.giveaways[giveawayId].messageId =
      giveawayMessage.id;

    saveData();

    setTimeout(
      () => finishGiveaway(message.guild.id, giveawayId),
      duration
    );

    return;

  if (command === "drop") {
    if (!isStaff(message.member)) {
      return message.reply({
        embeds: [
          makeEmbed(
            "⛔ Yetkin Yok",
            "Drop başlatmak için **Sunucuyu Yönet** yetkisine sahip olmalısın."
          )
        ]
      });
    }

    const prize = args.join(" ");

    if (!prize) {
      return message.reply({
        embeds: [
          makeEmbed(
            "⚡ Kullanım Hatalı",
            "Doğru kullanım:\n`!drop <ödül>`\n\nÖrnek:\n`!drop Nitro`"
          )
        ]
      });
    }

    const dropId =
      `${message.guild.id}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

    guildData.drops[dropId] = {
      channelId: message.channel.id,
      messageId: null,
      prize,
      hostId: message.author.id,
      claimed: false,
      winnerId: null
    };

    const embed = new EmbedBuilder()
      .setColor(0xf59e0b)
      .setTitle("⚡ DROP BAŞLADI!")
      .setDescription(
        `## 🎁 Ödül\n**${prize}**\n\n` +
        `Bu ödülü kazanmak için aşağıdaki butona **ilk basan kişi** kazanır!\n\n` +
        `🥇 İlk basan kazanır.\n` +
        `⚡ Hızlı ol!`
      )
      .setTimestamp()
      .setFooter({
        text: "LynoxNetwork • Drop Sistemi"
      });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`drop_claim:${dropId}`)
        .setLabel("ÖDÜLÜ KAP!")
        .setEmoji("⚡")
        .setStyle(ButtonStyle.Success)
    );

    const dropMessage = await message.channel.send({
      embeds: [embed],
      components: [row]
    });

    guildData.drops[dropId].messageId = dropMessage.id;

    saveData();

    return;
  }

  if (command === "panel") {
    if (!isAdmin(message.member)) {
      return message.reply({
        embeds: [
          makeEmbed(
            "⛔ Yönetici Yetkisi Gerekli",
            "Bu paneli yalnızca **Yönetici** yetkisine sahip kişiler kullanabilir."
          )
        ]
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle("🛠️ LynoxNetwork Yönetim Paneli")
      .setDescription(
        "Sunucunun sistemlerini aşağıdaki menüden yönetebilirsin.\n\n" +
        "🎫 **Ticket Kur** — Ticket kategorisi ve sorumlu rolünü ayarla.\n" +
        "👥 **Toplu Rol Ver** — Seçilen rolü tüm uygun üyelere verir.\n" +
        "🗑️ **Toplu Rol Al** — Seçilen rolü üyelerden alır.\n" +
        "💡 **Öneri Kanalı** — `🆘|öneri` kanalını oluşturur.\n" +
        "👤 **Rol Ver** — Belirli üyeye rol verir.\n" +
        "📚 **Komut Bilgi** — Kullanıcının yetkisine göre komutları gösterir.\n" +
        "🤖 **OtoRol** — Yeni üyelere otomatik rol verir.\n" +
        "👋 **Hoşgeldin Kanalı** — `🤩|giriş-çıkış` kanalını oluşturur.\n" +
        "⭐ **Puan Kanalı** — Yalnızca `!puanver` komutuna izin verir.\n" +
        "🔊 **Ses Oluştur** — Buton ile geçici ses kanalları oluşturur."
      )
      .setTimestamp()
      .setFooter({
        text: "LynoxNetwork • Yönetim Merkezi"
      });

    const menu = new StringSelectMenuBuilder()
      .setCustomId("admin_panel")
      .setPlaceholder("⚙️ Bir işlem seç...")
      .addOptions(
        {
          label: "Ticket Kur",
          description: "Ticket sistemi ve sorumlu rolünü ayarla.",
          value: "panel_ticket",
          emoji: "🎫"
        },
        {
          label: "Toplu Rol Ver",
          description: "Seçilen rolü üyelere verir.",
          value: "panel_mass_role_add",
          emoji: "👥"
        },
        {
          label: "Toplu Rol Al",
          description: "Seçilen rolü üyelerden alır.",
          value: "panel_mass_role_remove",
          emoji: "🗑️"
        },
        {
          label: "Öneri Kanalı Oluştur",
          description: "🆘|öneri kanalını oluşturur.",
          value: "panel_suggestion",
          emoji: "💡"
        },
        {
          label: "Rol Ver",
          description: "Belirli üyeye belirli rolü verir.",
          value: "panel_role_give",
          emoji: "👤"
        },
        {
          label: "Komut Bilgi",
          description: "Kullanabileceğin komutları gösterir.",
          value: "panel_commands",
          emoji: "📚"
        },
        {
          label: "OtoRol",
          description: "Yeni üyelere otomatik rol ayarla.",
          value: "panel_autorole",
          emoji: "🤖"
        },
        {
          label: "Hoşgeldin Kanalı",
          description: "Giriş/çıkış kanalını oluşturur.",
          value: "panel_welcome",
          emoji: "👋"
        },
        {
          label: "Puan Kanalı",
          description: "Puan verme kanalını oluşturur.",
          value: "panel_rating",
          emoji: "⭐"
        },
        {
          label: "Ses Oluştur",
          description: "Geçici ses kanalı sistemini kurar.",
          value: "panel_voice",
          emoji: "🔊"
        }
      );

    const row = new ActionRowBuilder().addComponents(menu);

    return message.reply({
      embeds: [embed],
      components: [row]
    });
  }

  if (command === "klan") {
    const sub = (args.shift() || "").toLowerCase();

    if (sub === "add") {
      if (!isStaff(message.member)) {
        return message.reply({
          embeds: [
            makeEmbed(
              "⛔ Yetkin Yok",
              "Klan eklemek için **Sunucuyu Yönet** yetkisine sahip olmalısın."
            )
          ]
        });
      }

      const clanName = args.join(" ").trim();

      if (!clanName) {
        return message.reply({
          embeds: [
            makeEmbed(
              "⚔️ Klan İsmi Eksik",
              "Örnek:\n`!klan add Lynox`"
            )
          ]
        });
      }

      if (clanName.length > 50) {
        return message.reply({
          embeds: [
            makeEmbed(
              "⚠️ İsim Çok Uzun",
              "Klan ismi en fazla **50 karakter** olabilir."
            )
          ]
        });
      }

      const exists = guildData.clans.list.some(
        clan =>
          clan.name.toLowerCase() ===
          clanName.toLowerCase()
      );

      if (exists) {
        return message.reply({
          embeds: [
            makeEmbed(
              "⚠️ Klan Zaten Var",
              `**${clanName}** zaten oylama listesinde.`
            )
          ]
        });
      }

      guildData.clans.list.push({
        name: clanName,
        addedBy: message.author.id
      });

      saveData();

      return message.reply({
        embeds: [
          makeEmbed(
            "✅ Klan Eklendi",
            `⚔️ **${clanName}** klanı oylama listesine eklendi.`
          )
        ]
      });
    }

    if (sub === "oylama") {
      if (!isStaff(message.member)) {
        return message.reply({
          embeds: [
            makeEmbed(
              "⛔ Yetkin Yok",
              "Klan oylaması başlatmak için **Sunucuyu Yönet** yetkisine sahip olmalısın."
            )
          ]
        });
      }

      const duration = parseDuration(args[0]);
      const reward = args.slice(1).join(" ");

      if (!duration || !reward) {
        return message.reply({
          embeds: [
            makeEmbed(
              "⚔️ Kullanım Hatalı",
              "Doğru kullanım:\n`!klan oylama <süre> <ödül>`\n\nÖrnek:\n`!klan oylama 24h 1000 TL`"
            )
          ]
        });
      }

      if (guildData.clans.list.length === 0) {
        return message.reply({
          embeds: [
            makeEmbed(
              "⚠️ Klan Yok",
              "Önce en az bir klan eklemelisin:\n`!klan add <klan ismi>`"
            )
          ]
        });
      }

      if (guildData.clans.active) {
        return message.reply({
          embeds: [
            makeEmbed(
              "⚠️ Aktif Oylama Var",
              "Önce mevcut klan oylamasının bitmesini bekle."
            )
          ]
        });
      }

      const clans = guildData.clans.list.map(clan => ({
        name: clan.name,
        votes: 0
      }));

      guildData.clans.active = {
        id: `${Date.now()}`,
        endAt: Date.now() + duration,
        reward,
        hostId: message.author.id,
        votes: {},
        clans
      };

      saveData();

      const embed = createClanVotingEmbed(
        guildData.clans.active
      );

      const row = createClanVotingRow(
        guildData.clans.active
      );

      await message.channel.send({
        embeds: [embed],
        components: [row]
      });

      setTimeout(
        () => finishClanVote(message.guild.id),
        duration
      );

      return;
    }

    return message.reply({
      embeds: [
        makeEmbed(
          "⚔️ Klan Komutları",
          "`!klan add <klan ismi>` — Klan ekler.\n" +
          "`!klan oylama <süre> <ödül>` — Klan oylaması başlatır."
        )
      ]
    });
  }

  if (command === "cash") {
    return message.reply({
      embeds: [
        makeEmbed(
          "💰 Ekonomi",
          "Ekonomi sistemi bu sürümde aktif değil."
        )
      ]
    });
  }

  if (command === "daily") {
    return message.reply({
      embeds: [
        makeEmbed(
          "💰 Ekonomi",
          "Ekonomi sistemi bu sürümde aktif değil."
        )
      ]
    });

function createClanVotingEmbed(voteData) {
  const sorted = [...voteData.clans].sort(
    (a, b) => b.votes - a.votes
  );

  const medals = ["🥇", "🥈", "🥉"];

  let ranking = "";

  sorted.forEach((clan, index) => {
    const medal = medals[index] || `**${index + 1}.**`;

    ranking += `${medal} **${clan.name}** — \`${clan.votes} oy\`\n`;
  });

  if (!ranking) {
    ranking = "Henüz oy kullanılmadı.";
  }

  const totalVotes = voteData.clans.reduce(
    (sum, clan) => sum + clan.votes,
    0
  );

  return new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle("⚔️ LynoxNetwork • Klan Oylaması")
    .setDescription(
      `Aşağıdaki listeden desteklediğin klanı seç!\n\n` +
      `🎁 **Kazanan Ödülü:** ${voteData.reward}\n` +
      `⏰ **Bitiş:** <t:${Math.floor(
        voteData.endAt / 1000
      )}:R>\n` +
      `🗳️ **Toplam Oy:** ${totalVotes}\n\n` +
      `### 🏆 Güncel Sıralama\n${ranking}\n\n` +
      `⚠️ Her kullanıcı yalnızca **1 kez** oy verebilir ve verdiği oyu değiştiremez.`
    )
    .setTimestamp()
    .setFooter({
      text: "LynoxNetwork • Klan Oylama Sistemi"
    });
}

function createClanVotingRow(voteData) {
  const options = voteData.clans
    .slice(0, 25)
    .map((clan, index) => ({
      label: clan.name.slice(0, 100),
      description: `${clan.votes} oy • ${index + 1}. sırada`,
      value: clan.name
    }));

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`clan_vote:${voteData.id}`)
      .setPlaceholder("⚔️ Desteklediğin klanı seç...")
      .addOptions(options)
  );
}

async function finishClanVote(guildId) {
  const guildData = getGuildData(guildId);

  if (!guildData.clans.active) return;

  const voteData = guildData.clans.active;

  if (Date.now() < voteData.endAt) return;

  const guild = client.guilds.cache.get(guildId);

  if (!guild) {
    guildData.clans.active = null;
    saveData();
    return;
  }

  const sorted = [...voteData.clans].sort(
    (a, b) => b.votes - a.votes
  );

  const winner = sorted[0];

  const channel = guild.channels.cache.find(
    channel =>
      channel.type === ChannelType.GuildText &&
      channel.permissionsFor(guild.members.me)?.has(
        PermissionsBitField.Flags.SendMessages
      )
  );

  if (channel && winner) {
    const ranking = sorted
      .map((clan, index) => {
        const medal =
          index === 0
            ? "🥇"
            : index === 1
              ? "🥈"
              : index === 2
                ? "🥉"
                : `**${index + 1}.**`;

        return `${medal} **${clan.name}** — \`${clan.votes} oy\``;
      })
      .join("\n");

    const embed = new EmbedBuilder()
      .setColor(0xf59e0b)
      .setTitle("🏆 KLAN OYLAMASI SONA ERDİ!")
      .setDescription(
        `## 🥇 Kazanan Klan\n` +
        `# ${winner.name}\n\n` +
        `🎁 **Ödül:** ${voteData.reward}\n` +
        `🗳️ **Oy:** ${winner.votes}\n\n` +
        `### 📊 Final Sıralaması\n${ranking}\n\n` +
        `Tüm katılımcılara teşekkürler!`
      )
      .setTimestamp()
      .setFooter({
        text: "LynoxNetwork • Klan Oylama Sistemi"
      });

    await channel.send({
      embeds: [embed]
    });
  }

  guildData.clans.active = null;
  saveData();
}

async function finishGiveaway(guildId, giveawayId) {
  const guildData = getGuildData(guildId);
  const giveaway = guildData.giveaways[giveawayId];

  if (!giveaway) return;

  if (Date.now() < giveaway.endAt) return;

  const guild = client.guilds.cache.get(guildId);

  if (!guild) {
    delete guildData.giveaways[giveawayId];
    saveData();
    return;
  }

  const participants = [
    ...new Set(giveaway.participants)
  ];

  if (participants.length === 0) {
    const channel = guild.channels.cache.get(
      giveaway.channelId
    );

    if (channel) {
      await channel.send({
        embeds: [
          makeEmbed(
            "🎉 Çekiliş Sona Erdi",
            `**${giveaway.prize}** çekilişine kimse katılmadı.`
          )
        ]
      });
    }

    delete guildData.giveaways[giveawayId];
    saveData();
    return;
  }

  const shuffled = [...participants].sort(
    () => Math.random() - 0.5
  );

  const winners = shuffled.slice(
    0,
    Math.min(giveaway.winnerCount, shuffled.length)
  );

  const channel = guild.channels.cache.get(
    giveaway.channelId
  );

  if (channel) {
    const mentions = winners
      .map(id => `<@${id}>`)
      .join(", ");

    const embed = new EmbedBuilder()
      .setColor(0xf59e0b)
      .setTitle("🏆 ÇEKİLİŞ SONUÇLANDI!")
      .setDescription(
        `🎁 **Ödül:** ${giveaway.prize}\n\n` +
        `🏆 **Kazananlar:**\n${mentions}\n\n` +
        `🎫 Ödülünüzü almak için **ticket açarak ödülünüzü talep edebilirsiniz.**`
      )
      .setTimestamp()
      .setFooter({
        text: "LynoxNetwork • Çekiliş Sistemi"
      });

    await channel.send({
      content: mentions,
      embeds: [embed]
    });
  }

  delete guildData.giveaways[giveawayId];
  saveData();
}

async function createTranscript(channel) {
  try {
    const messages = [];

    let lastId;

    while (true) {
      const fetched = await channel.messages.fetch({
        limit: 100,
        ...(lastId ? { before: lastId } : {})
      });

      if (fetched.size === 0) break;

      messages.push(...fetched.values());

      lastId = fetched.last().id;

      if (fetched.size < 100) break;

      if (messages.length >= 5000) break;
    }

    messages.reverse();

    let transcript =
      `LYNOXNETWORK TICKET TRANSCRIPT\n` +
      `Kanal: ${channel.name}\n` +
      `Oluşturulma: ${new Date(
        channel.createdTimestamp
      ).toLocaleString("tr-TR")}\n` +
      `${"=".repeat(70)}\n\n`;

    for (const msg of messages) {
      const time = new Date(
        msg.createdTimestamp
      ).toLocaleString("tr-TR");

      let content = msg.content || "";

      if (msg.attachments.size) {
        content +=
          " " +
          [...msg.attachments.values()]
            .map(a => `[Dosya: ${a.url}]`)
            .join(" ");
      }

      if (!content) {
        content = "[Embed / Buton / İçerik]";
      }

      transcript +=
        `[${time}] ${msg.author.tag}: ${content}\n`;
    }

    transcript += `\n${"=".repeat(70)}\n`;
    transcript += `Toplam mesaj: ${messages.length}\n`;

    return Buffer.from(transcript, "utf8");
  } catch (err) {
    console.error("Transcript oluşturma hatası:", err);

    return Buffer.from(
      "Transcript oluşturulurken hata meydana geldi.",
      "utf8"
    );
  }
}

async function sendTicketTranscript(
  guild,
  ticketData,
  channel
) {
  try {
    const transcript = await createTranscript(channel);

    const owner = await guild.fetchOwner();

    const ticketUser = await client.users
      .fetch(ticketData.userId)
      .catch(() => null);

    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle("🎫 Ticket Kapatıldı")
      .setDescription(
        `**LynoxNetwork ticket sistemi tarafından oluşturulan transcript.**`
      )
      .addFields(
        {
          name: "👤 Ticket Sahibi",
          value: ticketUser
            ? `${ticketUser} (${ticketUser.tag})`
            : ticketData.userId,
          inline: false
        },
        {
          name: "🛠️ Sorumlu Rol",
          value: ticketData.staffRoleId
            ? `<@&${ticketData.staffRoleId}>`
            : "Belirtilmedi",
          inline: true
        },
        {
          name: "📂 Ticket Türü",
          value: ticketData.type || "Genel",
          inline: true
        },
        {
          name: "🔒 Kapatılan Kanal",
          value: `#${channel.name}`,
          inline: true
        }
      )
      .setTimestamp()
      .setFooter({
        text: "LynoxNetwork • Ticket Transcript"
      });

    const payload = {
      embeds: [embed],
      files: [
        {
          attachment: transcript,
          name: `${channel.name}-transcript.txt`
        }
      ]
    };

    if (owner) {
      await owner.send(payload).catch(() => {});
    }

    if (ticketUser) {
      await ticketUser.send(payload).catch(() => {});
    }
  } catch (err) {
    console.error(
      "Ticket transcript gönderme hatası:",
      err
    );
  }
      }

client.on("interactionCreate", async interaction => {
  try {
    if (interaction.isButton()) {
      const id = interaction.customId;

      // =========================
      // ÖNERİ OYLAMA
      // =========================

      if (
        id === "suggestion_up" ||
        id === "suggestion_down"
      ) {
        const message = interaction.message;

        if (!message.embeds[0]) {
          return interaction.reply({
            content: "❌ Öneri mesajı bulunamadı.",
            ephemeral: true
          });
        }

        const embed = EmbedBuilder.from(
          message.embeds[0]
        );

        const existing =
          embed.data.fields?.find(
            field => field.name === "📊 Oylama"
          );

        let up = 0;
        let down = 0;

        if (existing) {
          const match = existing.value.match(
            /👍\s*(\d+).*👎\s*(\d+)/
          );

          if (match) {
            up = Number(match[1]);
            down = Number(match[2]);
          }
        }

        if (id === "suggestion_up") {
          up++;
        } else {
          down++;
        }

        embed.spliceFields(
          0,
          embed.data.fields?.length || 0
        );

        const originalDescription =
          embed.data.description || "";

        embed.setDescription(originalDescription);

        embed.addFields({
          name: "📊 Oylama",
          value: `👍 ${up}  👎 ${down}`
        });

        const row =
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("suggestion_up")
              .setEmoji("👍")
              .setLabel(String(up))
              .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
              .setCustomId("suggestion_down")
              .setEmoji("👎")
              .setLabel(String(down))
              .setStyle(ButtonStyle.Danger)
          );

        await interaction.update({
          embeds: [embed],
          components: [row]
        });

        return;
      }

      // =========================
      // ÇEKİLİŞ KATIL
      // =========================

      if (id.startsWith("giveaway_join:")) {
        const giveawayId = id.split(":")[1];

        const guildData = getGuildData(
          interaction.guild.id
        );

        const giveaway =
          guildData.giveaways[giveawayId];

        if (!giveaway) {
          return interaction.reply({
            content:
              "❌ Bu çekiliş artık aktif değil.",
            ephemeral: true
          });
        }

        if (Date.now() >= giveaway.endAt) {
          return interaction.reply({
            content:
              "⏰ Bu çekiliş sona ermiş.",
            ephemeral: true
          });
        }

        if (
          giveaway.participants.includes(
            interaction.user.id
          )
        ) {
          return interaction.reply({
            content:
              "⚠️ Bu çekilişe zaten katıldın.",
            ephemeral: true
          });
        }

        giveaway.participants.push(
          interaction.user.id
        );

        saveData();

        return interaction.reply({
          content:
            "🎉 Çekilişe başarıyla katıldın! Bol şans!",
          ephemeral: true
        });
      }

      // =========================
      // DROP
      // =========================

      if (id.startsWith("drop_claim:")) {
        const dropId = id.split(":")[1];

        const guildData = getGuildData(
          interaction.guild.id
        );

        const drop = guildData.drops[dropId];

        if (!drop) {
          return interaction.reply({
            content:
              "❌ Bu drop artık aktif değil.",
            ephemeral: true
          });
        }

        if (drop.claimed) {
          return interaction.reply({
            content:
              `❌ Bu ödülü zaten <@${drop.winnerId}> kazandı.`,
            ephemeral: true
          });
        }

        drop.claimed = true;
        drop.winnerId = interaction.user.id;

        saveData();

        const channel =
          interaction.channel;

        const embed = new EmbedBuilder()
          .setColor(0x22c55e)
          .setTitle("⚡ DROP KAZANILDI!")
          .setDescription(
            `🎁 **Ödül:** ${drop.prize}\n\n` +
            `🏆 **Kazanan:** ${interaction.user}\n\n` +
            `🎫 Ödülünü almak için **ticket açarak ödülünü talep edebilirsin.**`
          )
          .setTimestamp()
          .setFooter({
            text: "LynoxNetwork • Drop Sistemi"
          });

        const disabledRow =
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(
                `drop_claimed:${dropId}`
              )
              .setLabel("ÖDÜL KAZANILDI")
              .setEmoji("🏆")
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true)
          );

        await interaction.update({
          content: `${interaction.user}`,
          embeds: [embed],
          components: [disabledRow]
        });

        return;
      }

      // =========================
      // TICKET KATEGORİLERİ
      // =========================

      if (id.startsWith("ticket_")) {
        const typeMap = {
          ticket_general: "Genel Destek",
          ticket_support: "Yetkili Destek",
          ticket_report: "Şikayet / Bildirim",
          ticket_other: "Diğer"
        };

        if (!typeMap[id]) return;

        const guildData = getGuildData(
          interaction.guild.id
        );

        if (!guildData.ticket.categoryId) {
          return interaction.reply({
            content:
              "❌ Ticket sistemi henüz kurulmamış.",
            ephemeral: true
          });
        }

        const existingTicket =
          Object.values(
            guildData.tickets
          ).find(
            ticket =>
              ticket.userId ===
                interaction.user.id &&
              ticket.open === true
          );

        if (existingTicket) {
          const existingChannel =
            interaction.guild.channels.cache.get(
              existingTicket.channelId
            );

          return interaction.reply({
            content: existingChannel
              ? `⚠️ Zaten açık bir ticketın var: ${existingChannel}`
              : "⚠️ Zaten açık bir ticketın var.",
            ephemeral: true
          });
        }

        const category =
          interaction.guild.channels.cache.get(
            guildData.ticket.categoryId
          );

        if (
          !category ||
          category.type !== ChannelType.GuildCategory
        ) {
          return interaction.reply({
            content:
              "❌ Ticket kategorisi bulunamadı. Panelden tekrar kur.",
            ephemeral: true
          });
        }

        await interaction.deferReply({
          ephemeral: true
        });

        const staffRole =
          guildData.ticket.staffRoleId
            ? interaction.guild.roles.cache.get(
                guildData.ticket.staffRoleId
              )
            : null;

        const channelName =
          `ticket-${sanitizeChannelName(
            interaction.user.username
          )}-${Date.now()
            .toString()
            .slice(-4)}`;

        const permissionOverwrites = [
          {
            id: interaction.guild.id,
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
            id: interaction.client.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.ManageChannels,
              PermissionsBitField.Flags.ManageMessages
            ]
          }
        ];

        if (staffRole) {
          permissionOverwrites.push({
            id: staffRole.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.AttachFiles,
              PermissionsBitField.Flags.EmbedLinks
            ]
          });
        }

        const ticketChannel =
          await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites
          });

        const ticketId =
          `${interaction.guild.id}-${ticketChannel.id}`;

        guildData.tickets[ticketId] = {
          channelId: ticketChannel.id,
          userId: interaction.user.id,
          staffRoleId:
            guildData.ticket.staffRoleId,
          type: typeMap[id],
          open: true,
          createdAt: Date.now()
        };

        saveData();

        const staffMention = staffRole
          ? `<@&${staffRole.id}>`
          : "Ticket Yetkilisi";

        const ticketEmbed =
          new EmbedBuilder()
            .setColor(0x8b5cf6)
            .setTitle("🎫 LynoxNetwork Ticket")
            .setDescription(
              `Hoş geldin ${interaction.user}!\n\n` +
              `Talebin başarıyla oluşturuldu. Yetkili ekibimiz en kısa sürede seninle ilgilenecek.\n\n` +
              `📌 **Ticket Türü:** ${typeMap[id]}\n` +
              `👤 **Ticket Sahibi:** ${interaction.user}\n` +
              `🛠️ **Ticket Sorumlusu:** ${staffMention}`
            )
            .setTimestamp()
            .setFooter({
              text: "LynoxNetwork • Ticket Sistemi"
            });

        await ticketChannel.send({
          content:
            `${interaction.user} ${staffMention}`,
          embeds: [ticketEmbed],
          components: [
            createTicketCloseButton()
          ]
        });

        await interaction.editReply({
          content:
            `✅ Ticketın oluşturuldu: ${ticketChannel}`
        });

        return;
      }

      // =========================
      // TICKET KAPAT
      // =========================

      if (id === "ticket_close") {
        const guildData = getGuildData(
          interaction.guild.id
        );

        const ticketEntry =
          Object.entries(guildData.tickets)
            .find(
              ([, ticket]) =>
                ticket.channelId ===
                  interaction.channel.id &&
                ticket.open === true
            );

        if (!ticketEntry) {
          return interaction.reply({
            content:
              "❌ Bu kanal aktif bir ticket değil.",
            ephemeral: true
          });
        }

        const [ticketId, ticketData] =
          ticketEntry;

        const canClose =
          interaction.user.id ===
            ticketData.userId ||
          isAdmin(interaction.member) ||
          (
            ticketData.staffRoleId &&
            interaction.member.roles.cache.has(
              ticketData.staffRoleId
            )
          );

        if (!canClose) {
          return interaction.reply({
            content:
              "⛔ Bu ticketı kapatma yetkin yok.",
            ephemeral: true
          });
        }

        await interaction.reply({
          content:
            "🔒 Ticket kapatılıyor ve transcript hazırlanıyor..."
        });

        await sendTicketTranscript(
          interaction.guild,
          ticketData,
          interaction.channel
        );

        ticketData.open = false;
        ticketData.closedAt = Date.now();

        saveData();

        await sleep(1500);

        await interaction.channel.delete(
          "Ticket kapatıldı"
        );

        return;
      }

      // =========================
      // KLAN OYLAMA BUTONLARI
      // =========================

      if (id.startsWith("clan_vote:")) {
        const voteId = id.split(":")[1];

        const guildData = getGuildData(
          interaction.guild.id
        );

        const voteData =
          guildData.clans.active;

        if (!voteData || voteData.id !== voteId) {
          return interaction.reply({
            content:
              "❌ Bu klan oylaması artık aktif değil.",
            ephemeral: true
          });
        }

        if (Date.now() >= voteData.endAt) {
          return interaction.reply({
            content:
              "⏰ Bu oylamanın süresi doldu.",
            ephemeral: true
          });
        }

        if (
          voteData.votes[
            interaction.user.id
          ]
        ) {
          return interaction.reply({
            content:
              "⚠️ Daha önce oy kullandın. Oyun değiştirilemez.",
            ephemeral: true
          });
        }

        const clanName =
          interaction.values[0];

        const clan =
          voteData.clans.find(
            item => item.name === clanName
          );

        if (!clan) {
          return interaction.reply({
            content:
              "❌ Seçilen klan bulunamadı.",
            ephemeral: true
          });
        }

        clan.votes++;

        voteData.votes[
          interaction.user.id
        ] = clanName;

        saveData();

        const embed =
          createClanVotingEmbed(
            voteData
          );

        const row =
          createClanVotingRow(
            voteData
          );

        await interaction.update({
          embeds: [embed],
          components: [row]
        });

        return interaction.followUp({
          content:
            `✅ **${clanName}** klanına oyun kaydedildi!`,
          ephemeral: true
        });
      }
    }
  } catch (err) {
    console.error(
      "Interaction hatası:",
      err
    );

    if (!interaction.replied &&
        !interaction.deferred) {
      await interaction.reply({
        content:
          "❌ İşlem sırasında beklenmeyen bir hata oluştu.",
        ephemeral: true
      }).catch(() => {});
    }
  }
});

client.on("interactionCreate", async interaction => {
  try {

    // =========================
    // PANEL MENÜSÜ
    // =========================

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId === "admin_panel"
    ) {
      if (!isAdmin(interaction.member)) {
        return interaction.reply({
          content:
            "⛔ Bu panel yalnızca yöneticiler içindir.",
          ephemeral: true
        });
      }

      const selected =
        interaction.values[0];

      // =========================
      // TICKET KUR
      // =========================

      if (selected === "panel_ticket") {
        const categoryMenu =
          new ChannelSelectMenuBuilder()
            .setCustomId(
              "setup_ticket_category"
            )
            .setPlaceholder(
              "📂 Ticket kategorisini seç"
            )
            .setChannelTypes(
              ChannelType.GuildCategory
            );

        const row =
          new ActionRowBuilder().addComponents(
            categoryMenu
          );

        return interaction.reply({
          embeds: [
            makeEmbed(
              "🎫 Ticket Kurulumu",
              "Öncelikle ticketların açılacağı kategoriyi seç."
            )
          ],
          components: [row],
          ephemeral: true
        });
      }

      // =========================
      // TOPLU ROL VER
      // =========================

      if (
        selected === "panel_mass_role_add"
      ) {
        const roleMenu =
          new RoleSelectMenuBuilder()
            .setCustomId(
              "mass_role_add"
            )
            .setPlaceholder(
              "👥 Verilecek rolü seç"
            );

        return interaction.reply({
          embeds: [
            makeEmbed(
              "👥 Toplu Rol Ver",
              "Tüm uygun üyelere verilecek rolü seç."
            )
          ],
          components: [
            new ActionRowBuilder().addComponents(
              roleMenu
            )
          ],
          ephemeral: true
        });
      }

      // =========================
      // TOPLU ROL AL
      // =========================

      if (
        selected === "panel_mass_role_remove"
      ) {
        const roleMenu =
          new RoleSelectMenuBuilder()
            .setCustomId(
              "mass_role_remove"
            )
            .setPlaceholder(
              "🗑️ Alınacak rolü seç"
            );

        return interaction.reply({
          embeds: [
            makeEmbed(
              "🗑️ Toplu Rol Al",
              "Tüm üyelerden kaldırılacak rolü seç."
            )
          ],
          components: [
            new ActionRowBuilder().addComponents(
              roleMenu
            )
          ],
          ephemeral: true
        });
      }

      // =========================
      // ÖNERİ KANALI
      // =========================

      if (
        selected === "panel_suggestion"
      ) {
        const categoryMenu =
          new ChannelSelectMenuBuilder()
            .setCustomId(
              "setup_suggestion_channel"
            )
            .setPlaceholder(
              "📂 Kategori seç"
            )
            .setChannelTypes(
              ChannelType.GuildCategory
            );

        return interaction.reply({
          embeds: [
            makeEmbed(
              "💡 Öneri Sistemi",
              "🆘|öneri kanalının oluşturulacağı kategoriyi seç."
            )
          ],
          components: [
            new ActionRowBuilder().addComponents(
              categoryMenu
            )
          ],
          ephemeral: true
        });
      }

      // =========================
      // ROL VER
      // =========================

      if (
        selected === "panel_role_give"
      ) {
        const userMenu =
          new UserSelectMenuBuilder()
            .setCustomId(
              "role_give_user"
            )
            .setPlaceholder(
              "👤 Kullanıcı seç"
            );

        return interaction.reply({
          embeds: [
            makeEmbed(
              "👤 Rol Ver",
              "Rol verilecek kullanıcıyı seç."
            )
          ],
          components: [
            new ActionRowBuilder().addComponents(
              userMenu
            )
          ],
          ephemeral: true
        });
      }

      // =========================
      // KOMUT BİLGİ
      // =========================

      if (
        selected === "panel_commands"
      ) {
        const adminCommands =
          "`!panel`\n" +
          "`!ticket`\n" +
          "`!çekiliş`\n" +
          "`!drop`\n" +
          "`!klan add`\n" +
          "`!klan oylama`\n" +
          "`!puanver`\n" +
          "`!serverinfo`\n" +
          "`!avatar`\n" +
          "`!ip`";

        const userCommands =
          "`!avatar`\n" +
          "`!ip`\n" +
          "`!puanver`\n" +
          "`!öneri`\n" +
          "`!serverinfo`";

        return interaction.reply({
          embeds: [
            makeEmbed(
              "📚 Kullanılabilir Komutlar",
              isAdmin(
                interaction.member
              )
                ? adminCommands
                : userCommands
            )
          ],
          ephemeral: true
        });
      }

      // =========================
      // OTOROL
      // =========================

      if (
        selected === "panel_autorole"
      ) {
        const roleMenu =
          new RoleSelectMenuBuilder()
            .setCustomId(
              "setup_autorole"
            )
            .setPlaceholder(
              "🤖 OtoRol seç"
            );

        return interaction.reply({
          embeds: [
            makeEmbed(
              "🤖 OtoRol Sistemi",
              "Sunucuya katılanlara verilecek rolü seç."
            )
          ],
          components: [
            new ActionRowBuilder().addComponents(
              roleMenu
            )
          ],
          ephemeral: true
        });
      }

      // =========================
      // HOŞGELDİN KANALI
      // =========================

      if (
        selected === "panel_welcome"
      ) {
        const categoryMenu =
          new ChannelSelectMenuBuilder()
            .setCustomId(
              "setup_welcome_channel"
            )
            .setPlaceholder(
              "📂 Kategori seç"
            )
            .setChannelTypes(
              ChannelType.GuildCategory
            );

        return interaction.reply({
          embeds: [
            makeEmbed(
              "👋 Hoşgeldin Sistemi",
              "🤩|giriş-çıkış kanalının oluşturulacağı kategoriyi seç."
            )
          ],
          components: [
            new ActionRowBuilder().addComponents(
              categoryMenu
            )
          ],
          ephemeral: true
        });
      }

      // =========================
      // PUAN KANALI
      // =========================

      if (
        selected === "panel_rating"
      ) {
        const categoryMenu =
          new ChannelSelectMenuBuilder()
            .setCustomId(
              "setup_rating_channel"
            )
            .setPlaceholder(
              "📂 Kategori seç"
            )
            .setChannelTypes(
              ChannelType.GuildCategory
            );

        return interaction.reply({
          embeds: [
            makeEmbed(
              "⭐ Puan Sistemi",
              "Puan kanalının oluşturulacağı kategoriyi seç."
            )
          ],
          components: [
            new ActionRowBuilder().addComponents(
              categoryMenu
            )
          ],
          ephemeral: true
        });
      }

      // =========================
      // SES OLUŞTUR
      // =========================

      if (
        selected === "panel_voice"
      ) {
        const channelMenu =
          new ChannelSelectMenuBuilder()
            .setCustomId(
              "setup_voice_creator"
            )
            .setPlaceholder(
              "🔊 Kanal seç"
            )
            .setChannelTypes(
              ChannelType.GuildText
            );

        return interaction.reply({
          embeds: [
            makeEmbed(
              "🔊 Ses Kanalı Sistemi",
              "Butonun gönderileceği metin kanalını seç."
            )
          ],
          components: [
            new ActionRowBuilder().addComponents(
              channelMenu
            )
          ],
          ephemeral: true
        });
      }
    }

  } catch (err) {
    console.error(
      "Panel menüsü hatası:",
      err
    );
  }
});

    // =========================
    // KANAL SEÇİMLERİ
    // =========================

    if (
      interaction.isChannelSelectMenu()
    ) {
      if (!isAdmin(interaction.member)) {
        return interaction.reply({
          content: "⛔ Bu işlem için Yönetici yetkisi gerekli.",
          ephemeral: true
        });
      }

      const selectedChannel =
        interaction.channels.first();

      if (!selectedChannel) {
        return interaction.reply({
          content: "❌ Kanal seçilemedi.",
          ephemeral: true
        });
      }

      // =========================
      // TICKET KATEGORİSİ
      // =========================

      if (
        interaction.customId ===
        "setup_ticket_category"
      ) {
        const roleMenu =
          new RoleSelectMenuBuilder()
            .setCustomId(
              "setup_ticket_staff_role"
            )
            .setPlaceholder(
              "🛠️ Ticket sorumlusu rolünü seç"
            );

        return interaction.update({
          embeds: [
            makeEmbed(
              "🎫 Ticket • 2/2",
              `📂 **Kategori:** ${selectedChannel}\n\nŞimdi ticketlardan sorumlu olacak rolü seç.`
            )
          ],
          components: [
            new ActionRowBuilder().addComponents(
              roleMenu
            )
          ]
        });
      }

      // =========================
      // ÖNERİ KATEGORİSİ
      // =========================

      if (
        interaction.customId ===
        "setup_suggestion_channel"
      ) {
        let channel;

        try {
          channel =
            await interaction.guild.channels.create({
              name: "🆘|öneri",
              type: ChannelType.GuildText,
              parent: selectedChannel.id,
              topic:
                "LynoxNetwork öneri kanalı • !öneri <öneriniz>"
            });
        } catch (err) {
          console.error(
            "Öneri kanalı oluşturma hatası:",
            err
          );

          return interaction.update({
            embeds: [
              makeEmbed(
                "❌ Hata",
                "Öneri kanalı oluşturulamadı. Botun **Kanal Yönet** yetkisini kontrol et."
              )
            ],
            components: []
          });
        }

        const guildData =
          getGuildData(
            interaction.guild.id
          );

        guildData.suggestion.channelId =
          channel.id;

        saveData();

        return interaction.update({
          embeds: [
            makeEmbed(
              "💡 Öneri Sistemi Aktif",
              `Öneri kanalı başarıyla oluşturuldu: ${channel}\n\nKullanıcılar burada:\n\`!öneri <öneriniz>\`\nşeklinde öneri gönderebilir.`
            )
          ],
          components: []
        });
      }

      // =========================
      // HOŞGELDİN KATEGORİSİ
      // =========================

      if (
        interaction.customId ===
        "setup_welcome_channel"
      ) {
        let channel;

        try {
          channel =
            await interaction.guild.channels.create({
              name: "🤩|giriş-çıkış",
              type: ChannelType.GuildText,
              parent: selectedChannel.id,
              topic:
                "LynoxNetwork giriş-çıkış sistemi"
            });
        } catch (err) {
          console.error(
            "Hoşgeldin kanalı oluşturma hatası:",
            err
          );

          return interaction.update({
            embeds: [
              makeEmbed(
                "❌ Hata",
                "Giriş-çıkış kanalı oluşturulamadı."
              )
            ],
            components: []
          });
        }

        const guildData =
          getGuildData(
            interaction.guild.id
          );

        guildData.welcome.channelId =
          channel.id;

        saveData();

        return interaction.update({
          embeds: [
            makeEmbed(
              "👋 Hoşgeldin Sistemi Aktif",
              `Giriş-çıkış kanalı oluşturuldu: ${channel}\n\nYeni üyeler burada modern bir karşılama mesajıyla karşılanacak.`
            )
          ],
          components: []
        });
      }

      // =========================
      // PUAN KATEGORİSİ
      // =========================

      if (
        interaction.customId ===
        "setup_rating_channel"
      ) {
        let channel;

        try {
          channel =
            await interaction.guild.channels.create({
              name: "⭐|sunucu-puanı",
              type: ChannelType.GuildText,
              parent: selectedChannel.id,
              topic:
                "LynoxNetwork • Sunucu puanlama kanalı • !puanver <1-5>"
            });
        } catch (err) {
          console.error(
            "Puan kanalı oluşturma hatası:",
            err
          );

          return interaction.update({
            embeds: [
              makeEmbed(
                "❌ Hata",
                "Puan kanalı oluşturulamadı."
              )
            ],
            components: []
          });
        }

        const guildData =
          getGuildData(
            interaction.guild.id
          );

        guildData.rating.channelId =
          channel.id;

        saveData();

        const embed =
          new EmbedBuilder()
            .setColor(0xf59e0b)
            .setTitle(
              "⭐ LynoxNetwork • Sunucu Puanı"
            )
            .setDescription(
              "Sunucumuzu değerlendirmek için aşağıdaki komutu kullanabilirsin.\n\n" +
              "⭐ **1 — Çok kötü**\n" +
              "⭐⭐ **2 — Kötü**\n" +
              "⭐⭐⭐ **3 — Orta**\n" +
              "⭐⭐⭐⭐ **4 — İyi**\n" +
              "⭐⭐⭐⭐⭐ **5 — Mükemmel**\n\n" +
              "### 📝 Kullanım\n" +
              "`!puanver <1-5>`\n\n" +
              "⚠️ Her kullanıcı yalnızca **1 kez** puan verebilir."
            )
            .setTimestamp()
            .setFooter({
              text:
                "LynoxNetwork • Puan Sistemi"
            });

        await channel.send({
          embeds: [embed]
        });

        return interaction.update({
          embeds: [
            makeEmbed(
              "⭐ Puan Sistemi Aktif",
              `Puan kanalı başarıyla oluşturuldu: ${channel}`
            )
          ],
          components: []
        });
      }

      // =========================
      // SES OLUŞTUR KANALI
      // =========================

      if (
        interaction.customId ===
        "setup_voice_creator"
      ) {
        const guildData =
          getGuildData(
            interaction.guild.id
          );

        guildData.voice.creatorChannelId =
          selectedChannel.id;

        saveData();

        const embed =
          new EmbedBuilder()
            .setColor(0x8b5cf6)
            .setTitle(
              "🔊 LynoxNetwork • Ses Kanalları"
            )
            .setDescription(
              "Aşağıdaki butona basarak kendine özel geçici bir ses kanalı oluşturabilirsin.\n\n" +
              "🎙️ Kanal sana ait olur.\n" +
              "🔒 Başka kullanıcıların erişimini yönetebilirsin.\n" +
              "🗑️ Kanal boş kaldığında otomatik silinir."
            )
            .setTimestamp()
            .setFooter({
              text:
                "LynoxNetwork • Ses Sistemi"
            });

        const row =
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(
                "create_temp_voice"
              )
              .setLabel(
                "Ses Kanalı Oluştur"
              )
              .setEmoji("🔊")
              .setStyle(
                ButtonStyle.Primary
              )
          );

        await selectedChannel.send({
          embeds: [embed],
          components: [row]
        });

        return interaction.update({
          embeds: [
            makeEmbed(
              "🔊 Ses Sistemi Aktif",
              `Ses oluşturma paneli ${selectedChannel} kanalına gönderildi.`
            )
          ],
          components: []
        });
      }
    }

    // =========================
    // ROL SEÇİMLERİ
    // =========================

    if (
      interaction.isRoleSelectMenu()
    ) {
      if (!isAdmin(interaction.member)) {
        return interaction.reply({
          content:
            "⛔ Bu işlem için Yönetici yetkisi gerekli.",
          ephemeral: true
        });
      }

      const role =
        interaction.roles.first();

      if (!role) {
        return interaction.reply({
          content:
            "❌ Rol seçilemedi.",
          ephemeral: true
        });
      }

      const guildData =
        getGuildData(
          interaction.guild.id
        );

      // =========================
      // TICKET SORUMLUSU
      // =========================

      if (
        interaction.customId ===
        "setup_ticket_staff_role"
      ) {
        if (
          role.managed ||
          role.id ===
            interaction.guild.id
        ) {
          return interaction.update({
            embeds: [
              makeEmbed(
                "❌ Geçersiz Rol",
                "Bot tarafından yönetilen veya @everyone rolünü ticket sorumlusu yapamazsın."
              )
            ],
            components: []
          });
        }

        guildData.ticket.staffRoleId =
          role.id;

        saveData();

        return interaction.update({
          embeds: [
            makeEmbed(
              "🎫 Ticket Sistemi Hazır",
              `📂 **Kategori:** <#${guildData.ticket.categoryId}>\n` +
              `🛠️ **Sorumlu Rol:** ${role}\n\n` +
              "Artık `!ticket` komutuyla ticket panelini gönderebilirsin."
            )
          ],
          components: []
        });
      }

      // =========================
      // TOPLU ROL VER
      // =========================

      if (
        interaction.customId ===
        "mass_role_add"
      ) {
        if (
          role.position >=
          interaction.guild.members.me.roles.highest.position
        ) {
          return interaction.reply({
            content:
              "❌ Bot bu rolden daha düşük seviyede. Bu rolü veremez.",
            ephemeral: true
          });
        }

        await interaction.deferReply({
          ephemeral: true
        });

        let success = 0;
        let failed = 0;

        const members =
          await interaction.guild.members.fetch();

        for (const member of members.values()) {
          if (member.user.bot) continue;

          try {
            if (!member.roles.cache.has(role.id)) {
              await member.roles.add(role);
              success++;
            }
          } catch {
            failed++;
          }
        }

        return interaction.editReply({
          embeds: [
            makeEmbed(
              "👥 Toplu Rol Verildi",
              `**Rol:** ${role}\n\n` +
              `✅ Başarılı: **${success}**\n` +
              `❌ Başarısız: **${failed}**`
            )
          ]
        });
      }

      // =========================
      // TOPLU ROL AL
      // =========================

      if (
        interaction.customId ===
        "mass_role_remove"
      ) {
        if (
          role.position >=
          interaction.guild.members.me.roles.highest.position
        ) {
          return interaction.reply({
            content:
              "❌ Bot bu rolü yönetemiyor.",
            ephemeral: true
          });
        }

        await interaction.deferReply({
          ephemeral: true
        });

        let success = 0;
        let failed = 0;

        const members =
          await interaction.guild.members.fetch();

        for (const member of members.values()) {
          if (member.user.bot) continue;

          try {
            if (member.roles.cache.has(role.id)) {
              await member.roles.remove(role);
              success++;
            }
          } catch {
            failed++;
          }
        }

        return interaction.editReply({
          embeds: [
            makeEmbed(
              "🗑️ Toplu Rol Alındı",
              `**Rol:** ${role}\n\n` +
              `✅ Başarılı: **${success}**\n` +
              `❌ Başarısız: **${failed}**`
            )
          ]
        });
      }

      // =========================
      // OTOROL
      // =========================

      if (
        interaction.customId ===
        "setup_autorole"
      ) {
        if (
          role.position >=
          interaction.guild.members.me.roles.highest.position
        ) {
          return interaction.update({
            embeds: [
              makeEmbed(
                "❌ Geçersiz Rol",
                "Botun rolü seçilen rolden yukarıda olmalı."
              )
            ],
            components: []
          });
        }

        guildData.autorole.roleId =
          role.id;

        saveData();

        return interaction.update({
          embeds: [
            makeEmbed(
              "🤖 OtoRol Aktif",
              `Sunucuya yeni üye katıldığında ${role} otomatik olarak verilecek.`
            )
          ],
          components: []
        });
      }
  } catch (err) {
    console.error(
      "Panel seçim hatası:",
      err
    );

    if (
      interaction.isRepliable() &&
      !interaction.replied &&
      !interaction.deferred
    ) {
      await interaction.reply({
        content:
          "❌ İşlem sırasında bir hata oluştu.",
        ephemeral: true
      }).catch(() => {});
    }
  }

    // =========================
    // KULLANICI SEÇİMİ
    // =========================

    if (interaction.isUserSelectMenu()) {
      if (!isAdmin(interaction.member)) {
        return interaction.reply({
          content:
            "⛔ Bu işlem için Yönetici yetkisi gerekli.",
          ephemeral: true
        });
      }

      const user = interaction.users.first();

      if (!user) {
        return interaction.reply({
          content: "❌ Kullanıcı seçilemedi.",
          ephemeral: true
        });
      }

      // ROL VER → KULLANICI SEÇİLDİ
      if (
        interaction.customId ===
        "role_give_user"
      ) {
        const roleMenu =
          new RoleSelectMenuBuilder()
            .setCustomId(
              `role_give_role:${user.id}`
            )
            .setPlaceholder(
              "🎭 Verilecek rolü seç"
            );

        return interaction.update({
          embeds: [
            makeEmbed(
              "👤 Rol Ver • 2/2",
              `👤 **Kullanıcı:** ${user}\n\nŞimdi bu kullanıcıya verilecek rolü seç.`
            )
          ],
          components: [
            new ActionRowBuilder().addComponents(
              roleMenu
            )
          ]
        });
      }
    }

    // =========================
    // ROL VER → ROL SEÇİLDİ
    // =========================

    if (
      interaction.isRoleSelectMenu() &&
      interaction.customId.startsWith(
        "role_give_role:"
      )
    ) {
      if (!isAdmin(interaction.member)) {
        return interaction.reply({
          content:
            "⛔ Bu işlem için Yönetici yetkisi gerekli.",
          ephemeral: true
        });
      }

      const userId =
        interaction.customId.split(":")[1];

      const role =
        interaction.roles.first();

      const member =
        await interaction.guild.members
          .fetch(userId)
          .catch(() => null);

      if (!member) {
        return interaction.update({
          embeds: [
            makeEmbed(
              "❌ Kullanıcı Bulunamadı",
              "Seçilen kullanıcı sunucuda bulunamadı."
            )
          ],
          components: []
        });
      }

      if (!role) {
        return interaction.update({
          embeds: [
            makeEmbed(
              "❌ Rol Bulunamadı",
              "Seçilen rol bulunamadı."
            )
          ],
          components: []
        });
      }

      if (role.managed) {
        return interaction.update({
          embeds: [
            makeEmbed(
              "❌ Bu Rol Kullanılamaz",
              "Discord tarafından yönetilen roller verilemez."
            )
          ],
          components: []
        });
      }

      const botMember =
        interaction.guild.members.me;

      if (
        !botMember ||
        role.position >=
          botMember.roles.highest.position
      ) {
        return interaction.update({
          embeds: [
            makeEmbed(
              "❌ Rol Yetkisi Yetersiz",
              "Botun rolü, vermeye çalıştığın rolden daha yukarıda olmalı."
            )
          ],
          components: []
        });
      }

      if (
        member.roles.cache.has(role.id)
      ) {
        return interaction.update({
          embeds: [
            makeEmbed(
              "⚠️ Rol Zaten Var",
              `${member} kullanıcısında ${role} rolü zaten bulunuyor.`
            )
          ],
          components: []
        });
      }

      try {
        await member.roles.add(
          role,
          `LynoxNetwork panel • ${interaction.user.tag}`
        );
      } catch (err) {
        console.error(
          "Rol verme hatası:",
          err
        );

        return interaction.update({
          embeds: [
            makeEmbed(
              "❌ Rol Verilemedi",
              "Discord rolü vermeyi reddetti. Botun yetkilerini ve rol sırasını kontrol et."
            )
          ],
          components: []
        });
      }

      return interaction.update({
        embeds: [
          makeEmbed(
            "✅ Rol Başarıyla Verildi",
            `👤 **Kullanıcı:** ${member}\n🎭 **Rol:** ${role}\n\nİşlem başarıyla tamamlandı.`
          )
        ],
        components: []
      });
    }

    // =========================
    // TICKET KATEGORİSİ + ROL
    // =========================

    if (
      interaction.isRoleSelectMenu() &&
      interaction.customId ===
        "setup_ticket_staff_role"
    ) {
      if (!isAdmin(interaction.member)) {
        return interaction.reply({
          content:
            "⛔ Bu işlem için Yönetici yetkisi gerekli.",
          ephemeral: true
        });
      }

      const role =
        interaction.roles.first();

      if (!role) {
        return interaction.reply({
          content:
            "❌ Rol seçilemedi.",
          ephemeral: true
        });
      }

      if (role.managed) {
        return interaction.update({
          embeds: [
            makeEmbed(
              "❌ Geçersiz Rol",
              "Bot/entegrasyon tarafından yönetilen bir rol ticket sorumlusu olamaz."
            )
          ],
          components: []
        });
      }

      const guildData =
        getGuildData(
          interaction.guild.id
        );

      if (!guildData.ticket.categoryId) {
        return interaction.update({
          embeds: [
            makeEmbed(
              "❌ Kategori Eksik",
              "Ticket kategorisi bulunamadı. Panelden ticket sistemini yeniden kur."
            )
          ],
          components: []
        });
      }

      guildData.ticket.staffRoleId =
        role.id;

      saveData();

      return interaction.update({
        embeds: [
          makeEmbed(
            "🎫 Ticket Sistemi Hazır",
            `📂 **Ticket Kategorisi:** <#${guildData.ticket.categoryId}>\n` +
            `🛠️ **Ticket Sorumlusu:** ${role}\n\n` +
            "`!ticket` komutunu kullanarak ticket panelini gönderebilirsin.\n\n" +
            "Ticket açıldığında ticket sahibi ve sorumlu rol otomatik olarak etiketlenecek."
          )
        ],
        components: []
      });
    }

    // =========================
    // SES KANALI OLUŞTUR
    // =========================

    if (
      interaction.isButton() &&
      interaction.customId ===
        "create_temp_voice"
    ) {
      const guild =
        interaction.guild;

      const guildData =
        getGuildData(guild.id);

      const creatorId =
        guildData.voice.creatorChannelId;

      if (!creatorId) {
        return interaction.reply({
          content:
            "❌ Ses oluşturma sistemi kurulu değil.",
          ephemeral: true
        });
      }

      const creatorChannel =
        guild.channels.cache.get(
          creatorId
        );

      if (!creatorChannel) {
        return interaction.reply({
          content:
            "❌ Ses oluşturma kanalı bulunamadı. Panelden sistemi yeniden kur.",
          ephemeral: true
        });
      }

      const existingVoice =
        guild.channels.cache.find(
          channel =>
            channel.type ===
              ChannelType.GuildVoice &&
            channel.parentId ===
              creatorChannel.parentId &&
            channel.topic ===
              `temp-owner:${interaction.user.id}`
        );

      if (existingVoice) {
        return interaction.reply({
          content:
            `🔊 Zaten oluşturduğun bir ses kanalın var: ${existingVoice}`,
          ephemeral: true
        });
      }

      await interaction.deferReply({
        ephemeral: true
      });

      let voiceChannel;

      try {
        voiceChannel =
          await guild.channels.create({
            name:
              `🔊 ${interaction.user.username}`,
            type: ChannelType.GuildVoice,
            parent:
              creatorChannel.parentId || null,
            topic:
              `temp-owner:${interaction.user.id}`,
            permissionOverwrites: [
              {
                id: guild.id,
                allow: [
                  PermissionsBitField.Flags.Connect,
                  PermissionsBitField.Flags.ViewChannel
                ]
              },
              {
                id: interaction.user.id,
                allow: [
                  PermissionsBitField.Flags.Connect,
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.Speak,
                  PermissionsBitField.Flags.Stream,
                  PermissionsBitField.Flags.MoveMembers,
                  PermissionsBitField.Flags.MuteMembers,
                  PermissionsBitField.Flags.DeafenMembers
                ]
              }
            ]
          });
      } catch (err) {
        console.error(
          "Geçici ses kanalı oluşturma hatası:",
          err
        );

        return interaction.editReply({
          content:
            "❌ Ses kanalı oluşturulamadı. Botun **Kanalları Yönet** yetkisini kontrol et."
        });
      }

      guildData.voice.tempChannels[
        voiceChannel.id
      ] = {
        ownerId:
          interaction.user.id,
        createdAt: Date.now()
      };

      saveData();

      await interaction.editReply({
        content:
          `✅ Ses kanalın oluşturuldu: ${voiceChannel}`
      });

      try {
        await interaction.member.voice.setChannel(
          voiceChannel
        );
      } catch {}

      return;
    }

    // =========================
    // PANELDEN SES KANALI
    // BOŞ KALINCA OTOMATİK SİL
    // =========================

    if (
      interaction.isButton() &&
      interaction.customId ===
        "voice_refresh"
    ) {
      const guildData =
        getGuildData(
          interaction.guild.id
        );

      const tempChannels =
        guildData.voice.tempChannels;

      let removed = 0;

      for (
        const channelId of Object.keys(
          tempChannels
        )
      ) {
        const channel =
          interaction.guild.channels.cache.get(
            channelId
          );

        if (!channel) {
          delete tempChannels[
            channelId
          ];
          continue;
        }

        if (
          channel.type ===
            ChannelType.GuildVoice &&
          channel.members.size === 0
        ) {
          await channel.delete().catch(
            () => {}
          );

          delete tempChannels[
            channelId
          ];

          removed++;
        }
      }

      saveData();

      return interaction.reply({
        content:
          `🧹 ${removed} boş geçici ses kanalı temizlendi.`,
        ephemeral: true
      });
    }

// =========================
// ÜYE GİRİŞİ
// =========================

client.on("guildMemberAdd", async member => {
  try {
    const guildData =
      getGuildData(member.guild.id);

    // =========================
    // OTOROL
    // =========================

    if (guildData.autorole?.roleId) {
      const role =
        member.guild.roles.cache.get(
          guildData.autorole.roleId
        );

      if (
        role &&
        !role.managed &&
        role.position <
          member.guild.members.me.roles.highest.position
      ) {
        await member.roles.add(
          role,
          "LynoxNetwork • OtoRol"
        ).catch(err =>
          console.error(
            "OtoRol hatası:",
            err
          )
        );
      }
    }

    // =========================
    // HOŞGELDİN MESAJI
    // =========================

    if (!guildData.welcome?.channelId) {
      return;
    }

    const channel =
      member.guild.channels.cache.get(
        guildData.welcome.channelId
      );

    if (
      !channel ||
      channel.type !== ChannelType.GuildText
    ) {
      return;
    }

    const accountAge =
      Date.now() -
      member.user.createdTimestamp;

    const day =
      24 * 60 * 60 * 1000;

    const accountDays =
      Math.floor(accountAge / day);

    let reliability;
    let reliabilityEmoji;

    // 0 - 2 ay
    if (accountDays < 60) {
      reliability =
        "⚠️ Güvenilir değil";
      reliabilityEmoji = "⚠️";
    }

    // 2 - 5 ay
    else if (accountDays < 150) {
      reliability =
        "🟡 Stabil";
      reliabilityEmoji = "🟡";
    }

    // 5 ay - 1 yıl
    else if (accountDays < 365) {
      reliability =
        "🟢 Güvenilir";
      reliabilityEmoji = "🟢";
    }

    // 1 yıldan eski
    else if (accountDays < 730) {
      reliability =
        "💚 Çok güvenilir";
      reliabilityEmoji = "💚";
    }

    // 2 yıldan eski
    else {
      reliability =
        "💯 %100 Güvenilir";
      reliabilityEmoji = "💯";
    }

    const embed =
      new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle(
          `🤩 LynoxNetwork'e Hoş Geldin!`
        )
        .setDescription(
          `Sunucumuza hoş geldin ${member}! 🎉\n\n` +
          `LynoxNetwork ailesine **${member.guild.memberCount}. üye** olarak katıldın.`
        )
        .setThumbnail(
          member.user.displayAvatarURL({
            size: 512
          })
        )
        .addFields(
          {
            name: "👤 Üye",
            value:
              `${member}\n\`${member.user.tag}\``,
            inline: true
          },
          {
            name: "📥 Giriş Tarihi",
            value:
              `<t:${Math.floor(
                Date.now() / 1000
              )}:F>`,
            inline: true
          },
          {
            name: "📅 Hesap Tarihi",
            value:
              `<t:${Math.floor(
                member.user.createdTimestamp /
                  1000
              )}:F>\n` +
              `<t:${Math.floor(
                member.user.createdTimestamp /
                  1000
              )}:R>`,
            inline: false
          },
          {
            name:
              `${reliabilityEmoji} Güvenilirlik`,
            value: reliability,
            inline: true
          },
          {
            name: "🆔 Kullanıcı ID",
            value:
              `\`${member.id}\``,
            inline: true
          }
        )
        .setTimestamp()
        .setFooter({
          text:
            "LynoxNetwork • Giriş Sistemi"
        });

    await channel.send({
      content:
        `🎉 ${member} sunucuya katıldı!`,
      embeds: [embed]
    });

  } catch (err) {
    console.error(
      "guildMemberAdd hatası:",
      err
    );
  }
});


// =========================
// ÜYE ÇIKIŞI
// =========================

client.on("guildMemberRemove", async member => {
  try {
    const guildData =
      getGuildData(member.guild.id);

    if (!guildData.welcome?.channelId) {
      return;
    }

    const channel =
      member.guild.channels.cache.get(
        guildData.welcome.channelId
      );

    if (
      !channel ||
      channel.type !== ChannelType.GuildText
    ) {
      return;
    }

    const embed =
      new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle(
          "👋 LynoxNetwork • Üye Ayrıldı"
        )
        .setDescription(
          `${member.user.tag} sunucudan ayrıldı.`
        )
        .setThumbnail(
          member.user.displayAvatarURL({
            size: 512
          })
        )
        .addFields(
          {
            name: "👤 Üye",
            value:
              `${member.user.tag}\n\`${member.id}\``,
            inline: true
          },
          {
            name: "📤 Ayrılma Tarihi",
            value:
              `<t:${Math.floor(
                Date.now() / 1000
              )}:F>`,
            inline: true
          }
        )
        .setTimestamp()
        .setFooter({
          text:
            "LynoxNetwork • Giriş-Çıkış Sistemi"
        });

    await channel.send({
      embeds: [embed]
    });

  } catch (err) {
    console.error(
      "guildMemberRemove hatası:",
      err
    );
  }
});


// =========================
// GEÇİCİ SES KANALLARINI
// OTOMATİK TEMİZLEME
// =========================

setInterval(async () => {
  try {
    for (const guild of client.guilds.cache.values()) {
      const guildData =
        getGuildData(guild.id);

      if (
        !guildData.voice ||
        !guildData.voice.tempChannels
      ) {
        continue;
      }

      let changed = false;

      for (
        const channelId of Object.keys(
          guildData.voice.tempChannels
        )
      ) {
        const channel =
          guild.channels.cache.get(
            channelId
          );

        // Kanal Discord'dan silinmiş
        if (!channel) {
          delete guildData.voice
            .tempChannels[channelId];

          changed = true;
          continue;
        }

        // Kanal boşsa sil
        if (
          channel.type ===
            ChannelType.GuildVoice &&
          channel.members.size === 0
        ) {
          await channel.delete(
            "LynoxNetwork • Geçici ses kanalı boş kaldı"
          ).catch(() => {});

          delete guildData.voice
            .tempChannels[channelId];

          changed = true;
        }
      }

      if (changed) {
        saveData();
      }
    }
  } catch (err) {
    console.error(
      "Geçici ses temizleme hatası:",
      err
    );
  }
}, 30 * 1000);


// =========================
// BOT HAZIR
// =========================

client.once("ready", async () => {
  console.log(
    `✅ ${client.user.tag} aktif!`
  );

  console.log(
    `🌐 ${client.guilds.cache.size} sunucu`
  );

  client.user.setPresence({
    activities: [
      {
        name:
          "LynoxNetwork • !panel",
        type:
          ActivityType.Watching
      }
    ],
    status: "online"
  });

  // =========================
  // KAYITLI ÇEKİLİŞLERİ KONTROL ET
  // =========================

  for (
    const guild of client.guilds.cache.values()
  ) {
    const guildData =
      getGuildData(guild.id);

    if (guildData.giveaways) {
      for (
        const [giveawayId, giveaway]
        of Object.entries(
          guildData.giveaways
        )
      ) {
        const remaining =
          giveaway.endAt -
          Date.now();

        if (remaining <= 0) {
          finishGiveaway(
            guild.id,
            giveawayId
          ).catch(err =>
            console.error(
              "Çekiliş bitirme hatası:",
              err
            )
          );
        } else {
          setTimeout(
            () =>
              finishGiveaway(
                guild.id,
                giveawayId
              ),
            remaining
          );
        }
      }
    }

    // =========================
    // AKTİF KLAN OYLAMASI
    // =========================

    if (
      guildData.clans?.active
    ) {
      const remaining =
        guildData.clans.active.endAt -
        Date.now();

      if (remaining <= 0) {
        finishClanVote(
          guild.id
        ).catch(err =>
          console.error(
            "Klan oylaması bitirme hatası:",
            err
          )
        );
      } else {
        setTimeout(
          () =>
            finishClanVote(
              guild.id
            ),
          remaining
        );
      }
    }
  }
});

// =========================
// GÜVENLİ KAPANIŞ
// =========================

process.on("unhandledRejection", error => {
  console.error(
    "❌ Unhandled Promise Rejection:",
    error
  );
});

process.on("uncaughtException", error => {
  console.error(
    "❌ Uncaught Exception:",
    error
  );
});

process.on("SIGTERM", () => {
  console.log(
    "🛑 Railway SIGTERM aldı, bot kapatılıyor..."
  );

  try {
    saveData();
  } catch (err) {
    console.error(
      "Veri kaydetme hatası:",
      err
    );
  }

  client.destroy();

  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

process.on("SIGINT", () => {
  console.log(
    "🛑 Bot kapatılıyor..."
  );

  try {
    saveData();
  } catch (err) {
    console.error(
      "Veri kaydetme hatası:",
      err
    );
  }

  client.destroy();

  setTimeout(() => {
    process.exit(0);
  }, 1000);
});


// =========================
// BOTU BAŞLAT
// =========================

if (!process.env.DISCORD_TOKEN) {
  console.error(
    "❌ DISCORD_TOKEN bulunamadı!"
  );

  console.error(
    "Railway → Variables bölümünden DISCORD_TOKEN ekle."
  );

  process.exit(1);
}

client.login(
  process.env.DISCORD_TOKEN
).catch(error => {
  console.error(
    "❌ Discord giriş hatası:",
    error
  );

  process.exit(1);
});
