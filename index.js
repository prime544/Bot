const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  PermissionFlagsBits
} = require("discord.js");

const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildInvites
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User
  ]
});

const DATA_FILE = "./data.json";

const defaultData = {
  ticketConfig: {},
  tickets: {},
  ratings: {},
  giveaways: {},
  drops: {},
  clans: {},
  clanVotes: {},
  clanConfig: {},
  autoRole: {},
  welcome: {},
  suggestion: {},
  ratingChannel: {},
  voiceCreator: {},
  profanity: true
};

let data = defaultData;

if (fs.existsSync(DATA_FILE)) {
  try {
    const saved = JSON.parse(
      fs.readFileSync(DATA_FILE, "utf8")
    );

    data = {
      ...defaultData,
      ...saved
    };
  } catch {
    data = defaultData;
  }
}

function save() {
  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify(data, null, 2)
  );
}

function createEmbed(title, description) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(0x8b5cf6)
    .setTimestamp();
}

function isAdmin(member) {
  return member.permissions.has(
    PermissionFlagsBits.Administrator
  );
}

function isManager(member) {
  return member.permissions.has(
    PermissionFlagsBits.ManageGuild
  );
}

function parseTime(value) {
  if (!value) return 0;

  const number = parseInt(value);
  if (!number) return 0;

  const unit = value
    .slice(-1)
    .toLowerCase();

  if (unit === "s") return number * 1000;
  if (unit === "m") return number * 60 * 1000;
  if (unit === "h") return number * 60 * 60 * 1000;
  if (unit === "d") return number * 24 * 60 * 60 * 1000;

  return 0;
}

function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[\s._\-*\/\\]+/g, "")
    .replace(/4/g, "a")
    .replace(/@/g, "a")
    .replace(/1/g, "i")
    .replace(/!/g, "i")
    .replace(/0/g, "o")
    .replace(/\$/g, "s");
}

const badWords = [
  "amk",
  "aq",
  "sik",
  "siktir",
  "orospu",
  "piç",
  "yarrak",
  "anan",
  "oç",
  "ibne"
];

function getRating(guildId) {
  const ratings = data.ratings[guildId] || {};
  const values = Object.values(ratings);

  if (!values.length) {
    return "0.0";
  }

  const total = values.reduce(
    (sum, value) => sum + value,
    0
  );

  return (total / values.length).toFixed(1);
}

function getTicketByChannel(channelId) {
  return Object.entries(data.tickets)
    .find(([, ticket]) => {
      return ticket.channel === channelId;
    });
}

function getTicketConfig(guildId) {
  return data.ticketConfig[guildId] || null;
}

function getClanConfig(guildId) {
  return data.clanConfig[guildId] || null;
}

function getClanList(guildId) {
  return data.clans[guildId] || [];
}

function safeChannel(guild, channelId) {
  return guild.channels.cache.get(channelId);
}

function safeRole(guild, roleId) {
  return guild.roles.cache.get(roleId);
}

function sleep(ms) {
  return new Promise(resolve =>
    setTimeout(resolve, ms)
  );
}

client.once("ready", () => {
  console.log(
    `✅ ${client.user.tag} aktif!`
  );
});

client.on("error", error => {
  console.error(
    "Discord Client Error:",
    error
  );
});

process.on("unhandledRejection", error => {
  console.error(
    "Unhandled Rejection:",
    error
  );
});

process.on("uncaughtException", error => {
  console.error(
    "Uncaught Exception:",
    error
  );
});

client.on("guildMemberAdd", async member => {
  const guildId = member.guild.id;

  const roleId = data.autoRole[guildId];

  if (roleId) {
    const role = safeRole(
      member.guild,
      roleId
    );

    if (role) {
      await member.roles
        .add(role)
        .catch(() => {});
    }
  }

  const welcomeChannelId =
    data.welcome[guildId];

  if (!welcomeChannelId) return;

  const channel = safeChannel(
    member.guild,
    welcomeChannelId
  );

  if (!channel) return;

  const accountAge =
    Date.now() -
    member.user.createdTimestamp;

  const month =
    accountAge / 2592000000;

  let reliability;

  if (month < 2) {
    reliability = "Güvenilir Değil";
  } else if (month < 5) {
    reliability = "Stabil";
  } else if (month < 12) {
    reliability = "Güvenilir";
  } else {
    reliability = "%100 Güvenilir";
  }

  const accountDate =
    Math.floor(
      member.user.createdTimestamp / 1000
    );

  const joinDate =
    Math.floor(Date.now() / 1000);

  await channel.send({
    embeds: [
      createEmbed(
        "🤩 Hoş Geldin!",
        [
          `**Üye:** ${member}`,
          `**Giriş tarihi:** <t:${joinDate}:F>`,
          `**Hesap tarihi:** <t:${accountDate}:F>`,
          `**Güvenilirlik:** ${reliability}`
        ].join("\n")
      )
    ]
  }).catch(() => {});
});

client.on("guildMemberRemove", async member => {
  const guildId = member.guild.id;

  const welcomeChannelId =
    data.welcome[guildId];

  if (!welcomeChannelId) return;

  const channel = safeChannel(
    member.guild,
    welcomeChannelId
  );

  if (!channel) return;

  await channel.send({
    embeds: [
      createEmbed(
        "👋 Üye Ayrıldı",
        `**Üye:** ${member.user.tag}\n` +
        `Sunucudan ayrıldı.`
      )
    ]
  }).catch(() => {});
});

client.on("messageCreate", async message => {
  if (
    message.author.bot ||
    !message.guild
  ) return;

  const guildId =
    message.guild.id;

  if (data.profanity) {
    const normalized =
      normalizeText(message.content);

    const found = badWords.some(
      word => normalized.includes(word)
    );

    if (found) {
      await message.delete()
        .catch(() => {});

      const warning =
        await message.channel.send({
          embeds: [
            createEmbed(
              "⚠️ Küfür Koruması",
              `${message.author}, küfür kullanmak yasaktır.`
            )
          ]
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
  }

  if (!message.content.startsWith("!")) {
    const ratingChannel =
      data.ratingChannel[guildId];

    if (
      ratingChannel &&
      message.channel.id === ratingChannel
    ) {
      await message.delete()
        .catch(() => {});

      const warning =
        await message.channel.send({
          embeds: [
            createEmbed(
              "⭐ Puan Kanalı",
              "Bu kanal sadece puan vermek içindir.\n" +
              "`!puanver <1-5>` kullanabilirsiniz."
            )
          ]
        })
        .catch(() => null);

      if (warning) {
        setTimeout(() => {
          warning.delete()
            .catch(() => {});
        }, 3000);
      }
    }

    return;
  }

  const args =
    message.content
      .slice(1)
      .trim()
      .split(/\s+/);

  const command =
    args.shift()?.toLowerCase();

  if (!command) return;

  if (command === "avatar") {
    const user =
      message.mentions.users.first() ||
      message.author;

    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(
            `🖼️ ${user.username}`
          )
          .setImage(
            user.displayAvatarURL({
              size: 4096
            })
          )
          .setColor(0x8b5cf6)
      ]
    });
  }

  if (command === "serverinfo") {
    const rating =
      getRating(guildId);

    return message.channel.send({
      embeds: [
        createEmbed(
          "🌐 Sunucu Bilgileri",
          [
            `**Sunucu Sahibi:** <@${message.guild.ownerId}>`,
            `**Üye Sayısı:** ${message.guild.memberCount}`,
            `**Kurulma zamanı:** <t:${Math.floor(message.guild.createdTimestamp / 1000)}:F>`,
            `**Sunucu puanı:** ⭐ ${rating}/5`
          ].join("\n")
        )
      ]
    });
  }

  if (command === "puanver") {
    const rating =
      Number(args[0]);

    if (
      ![1, 2, 3, 4, 5]
        .includes(rating)
    ) {
      return message.reply(
        "❌ Puan 1 ile 5 arasında olmalıdır."
      );
    }

    const ratingChannel =
      data.ratingChannel[guildId];

    if (
      ratingChannel &&
      message.channel.id !== ratingChannel
    ) {
      return message.reply(
        "❌ Puan verme komutunu sadece puan verme kanalında kullanabilirsin."
      );
    }

    data.ratings[guildId] ||= {};

    data.ratings[guildId][
      message.author.id
    ] = rating;

    save();

    const result =
      await message.channel.send({
        embeds: [
          createEmbed(
            "⭐ Puan Kaydedildi",
            `${message.author} sunucuya **${rating}/5** puan verdi.`
          )
        ]
      });

    setTimeout(() => {
      result.delete()
        .catch(() => {});
    }, 3000);

    return;
                                            }
    if (command === "çekiliş") {
    if (!isAdmin(message.member)) {
      return message.reply(
        "❌ Bu komutu kullanmak için Yönetici yetkisine sahip olmalısın."
      );
    }

    const duration = parseTime(args[0]);
    const winnerCount = Number(args[1]);
    const prize = args.slice(2).join(" ");

    if (!duration || !winnerCount || !prize) {
      return message.reply(
        "❌ Kullanım: `!çekiliş <süre> <kazanan sayısı> <ödül>`"
      );
    }

    if (winnerCount < 1) {
      return message.reply(
        "❌ Kazanan sayısı en az 1 olmalıdır."
      );
    }

    const id = `${guildId}-${Date.now()}`;

    data.giveaways[id] = {
      guildId,
      channelId: message.channel.id,
      messageId: null,
      prize,
      winnerCount,
      participants: [],
      end: Date.now() + duration
    };

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`giveaway_join:${id}`)
        .setLabel("🎉 Katıl")
        .setStyle(ButtonStyle.Primary)
    );

    const giveawayMessage =
      await message.channel.send({
        embeds: [
          createEmbed(
            "🎉 ÇEKİLİŞ",
            [
              `🎁 **Ödül:** ${prize}`,
              `🏆 **Kazanan sayısı:** ${winnerCount}`,
              `⏰ **Bitiş:** <t:${Math.floor(
                (Date.now() + duration) / 1000
              )}:R>`,
              "",
              "Çekilişe katılmak için aşağıdaki butona bas!"
            ].join("\n")
          )
        ],
        components: [row]
      });

    data.giveaways[id].messageId =
      giveawayMessage.id;

    save();

    setTimeout(
      () => finishGiveaway(id),
      duration
    );

    return;
  }

  if (command === "drop") {
    if (!isAdmin(message.member)) {
      return message.reply(
        "❌ Bu komutu kullanmak için Yönetici yetkisine sahip olmalısın."
      );
    }

    const prize = args.join(" ");

    if (!prize) {
      return message.reply(
        "❌ Kullanım: `!drop <ödül>`"
      );
    }

    const id = `${guildId}-${Date.now()}`;

    data.drops[id] = {
      guildId,
      channelId: message.channel.id,
      messageId: null,
      prize,
      winner: null
    };

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`drop_claim:${id}`)
        .setLabel("🎁 DROP'U KAP")
        .setStyle(ButtonStyle.Success)
    );

    const dropMessage =
      await message.channel.send({
        embeds: [
          createEmbed(
            "🎁 DROP",
            [
              `🎁 **Ödül:** ${prize}`,
              "",
              "⚡ Butona ilk basan kişi kazanır!"
            ].join("\n")
          )
        ],
        components: [row]
      });

    data.drops[id].messageId =
      dropMessage.id;

    save();

    return;
  }

  if (command === "klan") {
    const sub =
      args.shift()?.toLowerCase();

    if (sub === "add") {
      if (!isAdmin(message.member)) {
        return message.reply(
          "❌ Sadece Yönetici kullanabilir."
        );
      }

      const config =
        getClanConfig(guildId);

      if (!config?.active) {
        return message.reply(
          "❌ Klan oylama sistemi aktif değil."
        );
      }

      const name =
        args.join(" ").trim();

      if (!name) {
        return message.reply(
          "❌ Klan adı yazmalısın."
        );
      }

      data.clans[guildId] ||= [];

      const exists =
        data.clans[guildId]
          .some(
            clan =>
              clan.name.toLowerCase() ===
              name.toLowerCase()
          );

      if (exists) {
        return message.reply(
          "❌ Bu klan zaten eklenmiş."
        );
      }

      data.clans[guildId].push({
        name,
        votes: 0
      });

      save();

      return message.channel.send({
        embeds: [
          createEmbed(
            "🏆 Klan Eklendi",
            `**${name}** klanı oylama sistemine eklendi.`
          )
        ]
      });
    }

    if (sub === "oyla") {
      const duration =
        args[0];

      if (!duration) {
        return message.reply(
          "❌ Kullanım: `!klan oyla 1h`"
        );
      }

      const config =
        getClanConfig(guildId);

      if (!config?.active) {
        return message.reply(
          "❌ Klan oylama sistemi aktif değil."
        );
      }

      if (Date.now() >= config.end) {
        return message.reply(
          "❌ Klan oylaması sona ermiş."
        );
      }

      const clans =
        getClanList(guildId);

      if (!clans.length) {
        return message.reply(
          "❌ Henüz klan eklenmemiş."
        );
      }

      data.clanVotes[guildId] ||= {};

      if (
        data.clanVotes[guildId]
          [message.author.id]
      ) {
        return message.reply(
          "❌ Daha önce oy verdin ve oyun değiştirilemez."
        );
      }

      const options =
        clans.map((clan, index) => ({
          label: clan.name.slice(0, 100),
          value: String(index),
          description:
            `${clan.votes || 0} oy`
        }));

      const menu =
        new StringSelectMenuBuilder()
          .setCustomId(
            `clan_vote:${guildId}`
          )
          .setPlaceholder(
            "🏆 Bir klan seç"
          )
          .addOptions(options);

      return message.channel.send({
        embeds: [
          createEmbed(
            "🏆 KLAN OYLAMASI",
            [
              "Aşağıdaki menüden bir klan seç.",
              "",
              `⏰ Bitiş: <t:${Math.floor(
                config.end / 1000
              )}:R>`,
              "⚠️ Oyunuzu değiştiremezsiniz."
            ].join("\n")
          )
        ],
        components: [
          new ActionRowBuilder()
            .addComponents(menu)
        ]
      });
    }
  }
});

async function finishGiveaway(id) {
  const giveaway =
    data.giveaways[id];

  if (!giveaway) return;

  const guild =
    client.guilds.cache.get(
      giveaway.guildId
    );

  if (!guild) {
    delete data.giveaways[id];
    save();
    return;
  }

  const channel =
    guild.channels.cache.get(
      giveaway.channelId
    );

  if (!channel) {
    delete data.giveaways[id];
    save();
    return;
  }

  const participants =
    [...new Set(
      giveaway.participants
    )];

  for (
    let i = participants.length - 1;
    i > 0;
    i--
  ) {
    const random =
      Math.floor(
        Math.random() * (i + 1)
      );

    [
      participants[i],
      participants[random]
    ] = [
      participants[random],
      participants[i]
    ];
  }

  const winners =
    participants.slice(
      0,
      Math.min(
        giveaway.winnerCount,
        participants.length
      )
    );

  if (!winners.length) {
    await channel.send({
      embeds: [
        createEmbed(
          "🎉 Çekiliş Bitti",
          `**${giveaway.prize}** çekilişine yeterli katılım olmadı.`
        )
      ]
    }).catch(() => {});
  } else {
    await channel.send({
      content: winners
        .map(id => `<@${id}>`)
        .join(", "),
      embeds: [
        createEmbed(
          "🏆 ÇEKİLİŞ SONUCU",
          [
            `🎁 **Ödül:** ${giveaway.prize}`,
            "",
            "Kazananlar yukarıda etiketlenmiştir.",
            "🎫 Ödülünüzü talep etmek için ticket açabilirsiniz."
          ].join("\n")
        )
      ]
    }).catch(() => {});
  }

  const message =
    await channel.messages
      .fetch(giveaway.messageId)
      .catch(() => null);

  if (message) {
    await message.edit({
      components: []
    }).catch(() => {});
  }

  delete data.giveaways[id];
  save();
}

setInterval(() => {
  const now = Date.now();

  for (
    const [id, giveaway]
    of Object.entries(data.giveaways)
  ) {
    if (now >= giveaway.end) {
      finishGiveaway(id);
    }
  }
}, 5000);
client.on("interactionCreate", async interaction => {
  if (interaction.isButton()) {
    const id = interaction.customId;

    if (id.startsWith("giveaway_join:")) {
      const giveawayId =
        id.split(":")[1];

      const giveaway =
        data.giveaways[giveawayId];

      if (!giveaway) {
        return interaction.reply({
          content:
            "❌ Bu çekiliş artık aktif değil.",
          ephemeral: true
        });
      }

      if (
        Date.now() >=
        giveaway.end
      ) {
        return interaction.reply({
          content:
            "❌ Bu çekiliş sona ermiş.",
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
            "❌ Çekilişe zaten katıldın.",
          ephemeral: true
        });
      }

      giveaway.participants.push(
        interaction.user.id
      );

      save();

      return interaction.reply({
        content:
          "🎉 Çekilişe başarıyla katıldın!",
        ephemeral: true
      });
    }

    if (id.startsWith("drop_claim:")) {
      const dropId =
        id.split(":")[1];

      const drop =
        data.drops[dropId];

      if (!drop) {
        return interaction.reply({
          content:
            "❌ Bu drop artık aktif değil.",
          ephemeral: true
        });
      }

      if (drop.winner) {
        return interaction.reply({
          content:
            "❌ Bu drop zaten kazanıldı.",
          ephemeral: true
        });
      }

      drop.winner =
        interaction.user.id;

      save();

      await interaction.update({
        embeds: [
          createEmbed(
            "🎁 DROP KAZANILDI!",
            [
              `🏆 **Kazanan:** ${interaction.user}`,
              `🎁 **Ödül:** ${drop.prize}`,
              "",
              "🎫 Ödülünüzü talep etmek için ticket açabilirsiniz."
            ].join("\n")
          )
        ],
        components: []
      });

      return;
    }

    if (id.startsWith("ticket_create:")) {
      const config =
        getTicketConfig(
          interaction.guild.id
        );

      if (!config) {
        return interaction.reply({
          content:
            "❌ Ticket sistemi henüz kurulmamış.",
          ephemeral: true
        });
      }

      const existing =
        Object.values(data.tickets)
          .find(ticket =>
            ticket.guildId ===
              interaction.guild.id &&
            ticket.userId ===
              interaction.user.id &&
            ticket.closed !== true
          );

      if (existing) {
        return interaction.reply({
          content:
            `❌ Zaten açık bir ticketın var: <#${existing.channel}>`,
          ephemeral: true
        });
      }

      const category =
        interaction.guild.channels.cache.get(
          config.category
        );

      if (
        !category ||
        category.type !==
          ChannelType.GuildCategory
      ) {
        return interaction.reply({
          content:
            "❌ Ticket kategorisi bulunamadı.",
          ephemeral: true
        });
      }

      const channel =
        await interaction.guild.channels.create({
          name:
            `ticket-${interaction.user.username}`
              .toLowerCase()
              .replace(/[^a-z0-9-]/g, "")
              .slice(0, 90),
          type: ChannelType.GuildText,
          parent: category.id,
          permissionOverwrites: [
            {
              id:
                interaction.guild.roles.everyone.id,
              deny: [
                PermissionFlagsBits.ViewChannel
              ]
            },
            {
              id: interaction.user.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory
              ]
            },
            {
              id: config.role,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.ManageMessages
              ]
            }
          ]
        });

      const ticketId =
        `${interaction.guild.id}-${Date.now()}`;

      data.tickets[ticketId] = {
        guildId:
          interaction.guild.id,
        channel: channel.id,
        userId:
          interaction.user.id,
        created:
          Date.now(),
        closed: false
      };

      save();

      const row =
        new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(
                "ticket_close"
              )
              .setLabel("🔒 Ticketi Kapat")
              .setStyle(
                ButtonStyle.Danger
              )
          );

      await channel.send({
        content:
          `${interaction.user} <@&${config.role}>`,
        embeds: [
          createEmbed(
            "🎫 Ticket Açıldı",
            [
              `Hoş geldin ${interaction.user}!`,
              "",
              "Yetkili ekip en kısa sürede seninle ilgilenecektir.",
              "",
              "Ticketi kapatmak için aşağıdaki butonu kullanabilirsin."
            ].join("\n")
          )
        ],
        components: [row]
      });

      return interaction.reply({
        content:
          `✅ Ticketın oluşturuldu: ${channel}`,
        ephemeral: true
      });
    }

    if (id === "ticket_close") {
      const result =
        getTicketByChannel(
          interaction.channel.id
        );

      if (!result) {
        return interaction.reply({
          content:
            "❌ Bu kanal bir ticket değil.",
          ephemeral: true
        });
      }

      const [
        ticketId,
        ticket
      ] = result;

      const config =
        getTicketConfig(
          interaction.guild.id
        );

      const isOwner =
        ticket.userId ===
        interaction.user.id;

      const isStaff =
        config &&
        interaction.member.roles.cache.has(
          config.role
        );

      if (!isOwner && !isStaff) {
        return interaction.reply({
          content:
            "❌ Bu ticketi kapatmaya yetkin yok.",
          ephemeral: true
        });
      }

      await interaction.reply(
        "🔒 Ticket kapatılıyor ve transcript hazırlanıyor..."
      );

      await createTranscript(
        interaction.guild,
        interaction.channel,
        ticket
      );

      delete data.tickets[
        ticketId
      ];

      save();

      setTimeout(() => {
        interaction.channel
          .delete()
          .catch(() => {});
      }, 2000);
    }
  }

  if (
    interaction.isStringSelectMenu()
  ) {
    if (
      interaction.customId ===
      "ticket_category_select"
    ) {
      const config =
        getTicketConfig(
          interaction.guild.id
        );

      if (!config) {
        return interaction.reply({
          content:
            "❌ Ticket sistemi bulunamadı.",
          ephemeral: true
        });
      }

      const existing =
        Object.values(data.tickets)
          .find(ticket =>
            ticket.guildId ===
              interaction.guild.id &&
            ticket.userId ===
              interaction.user.id &&
            ticket.closed !== true
          );

      if (existing) {
        return interaction.reply({
          content:
            `❌ Zaten açık bir ticketın var: <#${existing.channel}>`,
          ephemeral: true
        });
      }

      const selected =
        interaction.values[0];

      const category =
        config.categories?.[selected];

      if (!category) {
        return interaction.reply({
          content:
            "❌ Bu ticket kategorisi bulunamadı.",
          ephemeral: true
        });
      }

      const parent =
        interaction.guild.channels.cache.get(
          category.id
        );

      if (
        !parent ||
        parent.type !==
          ChannelType.GuildCategory
      ) {
        return interaction.reply({
          content:
            "❌ Kategori bulunamadı.",
          ephemeral: true
        });
      }

      const channel =
        await interaction.guild.channels.create({
          name:
            `ticket-${interaction.user.username}`
              .toLowerCase()
              .replace(/[^a-z0-9-]/g, "")
              .slice(0, 90),
          type: ChannelType.GuildText,
          parent: parent.id,
          permissionOverwrites: [
            {
              id:
                interaction.guild.roles.everyone.id,
              deny: [
                PermissionFlagsBits.ViewChannel
              ]
            },
            {
              id: interaction.user.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory
              ]
            },
            {
              id: config.role,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.ManageMessages
              ]
            }
          ]
        });

      const ticketId =
        `${interaction.guild.id}-${Date.now()}`;

      data.tickets[ticketId] = {
        guildId:
          interaction.guild.id,
        channel:
          channel.id,
        userId:
          interaction.user.id,
        category:
          selected,
        created:
          Date.now(),
        closed: false
      };

      save();

      const row =
        new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(
                "ticket_close"
              )
              .setLabel("🔒 Ticketi Kapat")
              .setStyle(
                ButtonStyle.Danger
              )
          );

      await channel.send({
        content:
          `${interaction.user} <@&${config.role}>`,
        embeds: [
          createEmbed(
            `🎫 ${category.name}`,
            [
              `Hoş geldin ${interaction.user}!`,
              "",
              `📂 **Kategori:** ${category.name}`,
              "Yetkili ekip seninle en kısa sürede ilgilenecektir.",
              "",
              "Ticketi kapatmak için aşağıdaki butonu kullan."
            ].join("\n")
          )
        ],
        components: [row]
      });

      return interaction.reply({
        content:
          `✅ Ticket oluşturuldu: ${channel}`,
        ephemeral: true
      });
    }

    if (
      interaction.customId.startsWith(
        "clan_vote:"
      )
    ) {
      const guildId =
        interaction.customId.split(":")[1];

      const config =
        getClanConfig(guildId);

      if (!config?.active) {
        return interaction.reply({
          content:
            "❌ Klan oylaması aktif değil.",
          ephemeral: true
        });
      }

      if (
        Date.now() >=
        config.end
      ) {
        return interaction.reply({
          content:
            "❌ Klan oylaması sona erdi.",
          ephemeral: true
        });
      }

      data.clanVotes[guildId] ||= {};

      if (
        data.clanVotes[guildId]
          [interaction.user.id]
      ) {
        return interaction.reply({
          content:
            "❌ Daha önce oy verdin ve oyun değiştirilemez.",
          ephemeral: true
        });
      }

      const index =
        Number(interaction.values[0]);

      const clans =
        getClanList(guildId);

      const clan =
        clans[index];

      if (!clan) {
        return interaction.reply({
          content:
            "❌ Klan bulunamadı.",
          ephemeral: true
        });
      }

      clan.votes =
        (clan.votes || 0) + 1;

      data.clanVotes[guildId]
        [interaction.user.id] =
        clan.name;

      save();

      return interaction.reply({
        content:
          `✅ **${clan.name}** klanına oyun kaydedildi. Oyunu değiştiremezsin.`,
        ephemeral: true
      });
    }
  }
});

async function createTranscript(
  guild,
  channel,
  ticket
) {
  const messages = [];

  let lastId;

  while (true) {
    const fetched =
      await channel.messages.fetch({
        limit: 100,
        ...(lastId
          ? { before: lastId }
          : {})
      }).catch(() => null);

    if (!fetched || !fetched.size)
      break;

    messages.push(
      ...fetched.values()
    );

    lastId =
      fetched.last().id;

    if (fetched.size < 100)
      break;
  }

  messages.reverse();

  let transcript =
    `TICKET TRANSCRIPT\n\n`;

  transcript +=
    `Sunucu: ${guild.name}\n`;

  transcript +=
    `Ticket Sahibi: ${ticket.userId}\n`;

  transcript +=
    `Kanal: ${channel.name}\n`;

  transcript +=
    `Oluşturulma: ${new Date(
      ticket.created
    ).toLocaleString()}\n\n`;

  for (const message of messages) {
    transcript +=
      `[${message.createdAt.toLocaleString()}] `;

    transcript +=
      `${message.author.tag}: `;

    transcript +=
      message.content || "[Dosya/Embed]";

    transcript += "\n";
  }

  const file =
    `./transcript-${Date.now()}.txt`;

  fs.writeFileSync(
    file,
    transcript
  );

  const owner =
    await guild.members
      .fetch(ticket.userId)
      .catch(() => null);

  const config =
    getTicketConfig(guild.id);

  const staffRole =
    config
      ? guild.roles.cache.get(
          config.role
        )
      : null;

  const users = new Map();

  if (owner) {
    users.set(
      owner.id,
      owner.user
    );
  }

  if (staffRole) {
    staffRole.members.forEach(
      member => {
        users.set(
          member.id,
          member.user
        );
      }
    );
  }

  const serverOwner =
    await guild.fetchOwner()
      .catch(() => null);

  if (serverOwner) {
    users.set(
      serverOwner.id,
      serverOwner.user
    );
  }

  for (const user of users.values()) {
    await user.send({
      content:
        `🎫 **${guild.name}** ticket transcripti.`,
      files: [file]
    }).catch(() => {});
  }

  fs.unlinkSync(file);
}
client.on("messageCreate", async message => {
  if (message.author.bot || !message.guild) return;
  if (!message.content.startsWith("!")) return;

  const args = message.content.slice(1).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();

  if (command !== "panel") return;

  if (!isAdmin(message.member)) {
    return message.reply(
      "❌ Bu paneli sadece Yönetici yetkisine sahip kişiler kullanabilir."
    );
  }

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("panel_ticket")
      .setLabel("🎫 Ticket Kur")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("panel_roleall")
      .setLabel("👥 Toplurolver")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("panel_rolal")
      .setLabel("👥 Toplurolal")
      .setStyle(ButtonStyle.Danger)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("panel_suggestion")
      .setLabel("💡 Öneri Kanalı Oluştur")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("panel_role")
      .setLabel("🎭 Rolver")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("panel_autorole")
      .setLabel("🤖 OtoRol")
      .setStyle(ButtonStyle.Secondary)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("panel_welcome")
      .setLabel("🤩 Hoşgeldin Kanalı Oluştur")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("panel_rating")
      .setLabel("⭐ Puan Verme Kanalı Aç")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("panel_voice")
      .setLabel("🔊 Ses Oluştur")
      .setStyle(ButtonStyle.Secondary)
  );

  const row4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("panel_clan")
      .setLabel("🏆 Klan Oylaması")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("panel_announcement")
      .setLabel("📢 Anons")
      .setStyle(ButtonStyle.Primary)
  );

  return message.channel.send({
    embeds: [
      createEmbed(
        "⚙️ Yönetici Paneli",
        [
          "Sunucunun sistemlerini aşağıdaki butonlardan yönetebilirsin.",
          "",
          "🎫 **Ticket Kur**",
          "Ticket kategorilerini, panel kanalını ve ticket yetkilisi rolünü ayarlar.",
          "",
          "👥 **Toplurolver / Toplurolal**",
          "Seçilen rolü sunucudaki üyelere topluca verir veya alır.",
          "",
          "💡 **Öneri Kanalı Oluştur**",
          "🆘|öneri kanalını oluşturur.",
          "",
          "🎭 **Rolver**",
          "Belirlenen kullanıcıya belirlenen rolü verir.",
          "",
          "🤖 **OtoRol**",
          "Yeni katılan üyelere otomatik rol verir.",
          "",
          "🤩 **Hoşgeldin Kanalı Oluştur**",
          "🤩|giriş-çıkış kanalını oluşturur.",
          "",
          "⭐ **Puan Verme Kanalı Aç**",
          "Sadece `!puanver 1-5` kullanılabilen kanal oluşturur.",
          "",
          "🔊 **Ses Oluştur**",
          "Belirlenen ses kanalına katılan kişiye özel ses kanalı oluşturur.",
          "",
          "🏆 **Klan Oylaması**",
          "Klan oylama sistemini açar ve süresini belirler.",
          "",
          "📢 **Anons**",
          "Duyuruyu hem duyuru kanalına hem sohbet kanalına gönderir."
        ].join("\n")
      )
    ],
    components: [
      row1,
      row2,
      row3,
      row4
    ]
  });
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;

  const id = interaction.customId;

  if (id === "panel_ticket") {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        content: "❌ Sadece Yönetici kullanabilir.",
        ephemeral: true
      });
    }

    const modal = new ModalBuilder()
      .setCustomId("ticket_setup_modal")
      .setTitle("🎫 Ticket Kur");

    const categoryInput =
      new TextInputBuilder()
        .setCustomId("ticket_categories")
        .setLabel("Ticket kategorileri")
        .setPlaceholder("Destek, Şikayet, Satın Alım")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

    const channelInput =
      new TextInputBuilder()
        .setCustomId("ticket_channel")
        .setLabel("Panel kanal ID")
        .setPlaceholder("123456789012345678")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const categoryIdInput =
      new TextInputBuilder()
        .setCustomId("ticket_category_id")
        .setLabel("Ticket kategori ID")
        .setPlaceholder("123456789012345678")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const roleInput =
      new TextInputBuilder()
        .setCustomId("ticket_role")
        .setLabel("Ticket yetkilisi rol ID")
        .setPlaceholder("123456789012345678")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        categoryInput
      ),
      new ActionRowBuilder().addComponents(
        channelInput
      ),
      new ActionRowBuilder().addComponents(
        categoryIdInput
      ),
      new ActionRowBuilder().addComponents(
        roleInput
      )
    );

    return interaction.showModal(modal);
  }

  if (id === "panel_suggestion") {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        content: "❌ Sadece Yönetici kullanabilir.",
        ephemeral: true
      });
    }

    const channel =
      await interaction.guild.channels.create({
        name: "🆘|öneri",
        type: ChannelType.GuildText
      });

    data.suggestion[
      interaction.guild.id
    ] = channel.id;

    save();

    await channel.send({
      embeds: [
        createEmbed(
          "💡 Öneri Kanalı",
          "Sunucu için önerilerinizi `!öneri <öneriniz>` şeklinde gönderebilirsiniz."
        )
      ]
    });

    return interaction.reply({
      content:
        `✅ Öneri kanalı oluşturuldu: ${channel}`,
      ephemeral: true
    });
  }

  if (id === "panel_rating") {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        content: "❌ Sadece Yönetici kullanabilir.",
        ephemeral: true
      });
    }

    const existing =
      data.ratingChannel[
        interaction.guild.id
      ];

    if (existing) {
      const channel =
        interaction.guild.channels.cache.get(
          existing
        );

      if (channel) {
        return interaction.reply({
          content:
            `❌ Zaten bir puan verme kanalı var: ${channel}`,
          ephemeral: true
        });
      }
    }

    const channel =
      await interaction.guild.channels.create({
        name: "⭐|puan-ver",
        type: ChannelType.GuildText
      });

    data.ratingChannel[
      interaction.guild.id
    ] = channel.id;

    save();

    await channel.send({
      embeds: [
        createEmbed(
          "⭐ Sunucu Puanlama",
          [
            "Bu kanal sadece sunucuya puan vermek içindir.",
            "",
            "`!puanver <1-5>`",
            "",
            "Örnek:",
            "`!puanver 5`"
          ].join("\n")
        )
      ]
    });

    return interaction.reply({
      content:
        `✅ Puan verme kanalı oluşturuldu: ${channel}`,
      ephemeral: true
    });
  }

  if (id === "panel_welcome") {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        content: "❌ Sadece Yönetici kullanabilir.",
        ephemeral: true
      });
    }

    const category =
      await interaction.guild.channels.create({
        name: "🤩 Giriş-Çıkış",
        type: ChannelType.GuildCategory
      });

    const channel =
      await interaction.guild.channels.create({
        name: "🤩|giriş-çıkış",
        type: ChannelType.GuildText,
        parent: category.id
      });

    data.welcome[
      interaction.guild.id
    ] = channel.id;

    save();

    await channel.send({
      embeds: [
        createEmbed(
          "🤩 Hoşgeldin Sistemi",
          "Yeni üyelerin giriş ve çıkış bilgileri bu kanalda gösterilecektir."
        )
      ]
    });

    return interaction.reply({
      content:
        `✅ Hoşgeldin kanalı oluşturuldu: ${channel}`,
      ephemeral: true
    });
  }

  if (id === "panel_voice") {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        content: "❌ Sadece Yönetici kullanabilir.",
        ephemeral: true
      });
    }

    const modal = new ModalBuilder()
      .setCustomId("voice_setup_modal")
      .setTitle("🔊 Ses Oluştur");

    const input =
      new TextInputBuilder()
        .setCustomId("voice_channel")
        .setLabel("Ses oluşturma kanalı ID")
        .setPlaceholder("123456789012345678")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        input
      )
    );

    return interaction.showModal(modal);
  }

  if (id === "panel_clan") {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        content: "❌ Sadece Yönetici kullanabilir.",
        ephemeral: true
      });
    }

    const modal = new ModalBuilder()
      .setCustomId("clan_setup_modal")
      .setTitle("🏆 Klan Oylaması");

    const timeInput =
      new TextInputBuilder()
        .setCustomId("clan_time")
        .setLabel("Oylama süresi")
        .setPlaceholder("1h")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        timeInput
      )
    );

    return interaction.showModal(modal);
  }

  if (id === "panel_announcement") {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        content: "❌ Sadece Yönetici kullanabilir.",
        ephemeral: true
      });
    }

    const modal = new ModalBuilder()
      .setCustomId("announcement_modal")
      .setTitle("📢 Anons Gönder");

    const text =
      new TextInputBuilder()
        .setCustomId("announcement_text")
        .setLabel("Anons metni")
        .setPlaceholder("Duyurunu buraya yaz...")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(4000);

    const channel =
      new TextInputBuilder()
        .setCustomId("announcement_channel")
        .setLabel("Duyuru kanalı ID")
        .setPlaceholder("123456789012345678")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const chat =
      new TextInputBuilder()
        .setCustomId("announcement_chat")
        .setLabel("Sohbet kanalı ID")
        .setPlaceholder("123456789012345678")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(text),
      new ActionRowBuilder().addComponents(channel),
      new ActionRowBuilder().addComponents(chat)
    );

    return interaction.showModal(modal);
  }
});
client.on("interactionCreate", async interaction => {
  if (!interaction.isModalSubmit()) return;

  if (!isAdmin(interaction.member)) {
    return interaction.reply({
      content: "❌ Sadece Yönetici kullanabilir.",
      ephemeral: true
    });
  }

  if (interaction.customId === "ticket_setup_modal") {
    const categoriesText =
      interaction.fields.getTextInputValue(
        "ticket_categories"
      );

    const panelChannelId =
      interaction.fields.getTextInputValue(
        "ticket_channel"
      ).trim();

    const defaultCategoryId =
      interaction.fields.getTextInputValue(
        "ticket_category_id"
      ).trim();

    const roleId =
      interaction.fields.getTextInputValue(
        "ticket_role"
      ).trim();

    const panelChannel =
      interaction.guild.channels.cache.get(
        panelChannelId
      );

    const category =
      interaction.guild.channels.cache.get(
        defaultCategoryId
      );

    const role =
      interaction.guild.roles.cache.get(
        roleId
      );

    if (
      !panelChannel ||
      panelChannel.type !== ChannelType.GuildText
    ) {
      return interaction.reply({
        content: "❌ Panel kanalı bulunamadı.",
        ephemeral: true
      });
    }

    if (
      !category ||
      category.type !== ChannelType.GuildCategory
    ) {
      return interaction.reply({
        content: "❌ Ticket kategorisi bulunamadı.",
        ephemeral: true
      });
    }

    if (!role) {
      return interaction.reply({
        content: "❌ Ticket yetkilisi rolü bulunamadı.",
        ephemeral: true
      });
    }

    const names =
      categoriesText
        .split(",")
        .map(name => name.trim())
        .filter(Boolean);

    if (!names.length) {
      return interaction.reply({
        content: "❌ En az bir ticket kategorisi yazmalısın.",
        ephemeral: true
      });
    }

    const categories = {};

    names.forEach((name, index) => {
      categories[String(index)] = {
        name,
        id: defaultCategoryId
      };
    });

    data.ticketConfig[
      interaction.guild.id
    ] = {
      panelChannel: panelChannelId,
      category: defaultCategoryId,
      role: roleId,
      categories
    };

    save();

    const options =
      names.map((name, index) => ({
        label: name.slice(0, 100),
        value: String(index),
        description:
          `${name} ticketı oluştur`
      }));

    const menu =
      new StringSelectMenuBuilder()
        .setCustomId(
          "ticket_category_select"
        )
        .setPlaceholder(
          "🎫 Ticket kategorisini seç"
        )
        .addOptions(options);

    await panelChannel.send({
      embeds: [
        createEmbed(
          "🎫 Ticket Sistemi",
          [
            "Destek almak için aşağıdaki menüden uygun ticket kategorisini seç.",
            "",
            "📌 Her kullanıcı aynı anda yalnızca **1 ticket** açabilir.",
            "🔒 Ticket kapatıldığında transcript gönderilir."
          ].join("\n")
        )
      ],
      components: [
        new ActionRowBuilder()
          .addComponents(menu)
      ]
    });

    return interaction.reply({
      content:
        `✅ Ticket sistemi kuruldu ve ${panelChannel} kanalına panel gönderildi.`,
      ephemeral: true
    });
  }

  if (interaction.customId === "voice_setup_modal") {
    const voiceChannelId =
      interaction.fields.getTextInputValue(
        "voice_channel"
      ).trim();

    const channel =
      interaction.guild.channels.cache.get(
        voiceChannelId
      );

    if (
      !channel ||
      channel.type !== ChannelType.GuildVoice
    ) {
      return interaction.reply({
        content:
          "❌ Belirtilen ses kanalı bulunamadı.",
        ephemeral: true
      });
    }

    data.voiceCreator[
      interaction.guild.id
    ] = {
      channelId: voiceChannelId,
      created: {}
    };

    save();

    return interaction.reply({
      content:
        `✅ Ses oluşturma sistemi aktif edildi.\nKatılma kanalı: ${channel}`,
      ephemeral: true
    });
  }

  if (interaction.customId === "clan_setup_modal") {
    const time =
      interaction.fields.getTextInputValue(
        "clan_time"
      ).trim();

    const duration =
      parseTime(time);

    if (!duration) {
      return interaction.reply({
        content:
          "❌ Geçerli bir süre gir. Örnek: `1h`, `30m`, `2d`",
        ephemeral: true
      });
    }

    data.clanConfig[
      interaction.guild.id
    ] = {
      active: true,
      start: Date.now(),
      end: Date.now() + duration
    };

    data.clans[
      interaction.guild.id
    ] ||= [];

    data.clanVotes[
      interaction.guild.id
    ] = {};

    save();

    setTimeout(
      () => finishClanVote(
        interaction.guild.id
      ),
      duration
    );

    return interaction.reply({
      content:
        `✅ Klan oylaması açıldı.\n⏰ Süre: **${time}**`,
      ephemeral: true
    });
  }

  if (interaction.customId === "announcement_modal") {
    const text =
      interaction.fields.getTextInputValue(
        "announcement_text"
      );

    const announcementChannelId =
      interaction.fields.getTextInputValue(
        "announcement_channel"
      ).trim();

    const chatChannelId =
      interaction.fields.getTextInputValue(
        "announcement_chat"
      ).trim();

    const announcementChannel =
      interaction.guild.channels.cache.get(
        announcementChannelId
      );

    const chatChannel =
      interaction.guild.channels.cache.get(
        chatChannelId
      );

    if (!announcementChannel) {
      return interaction.reply({
        content:
          "❌ Duyuru kanalı bulunamadı.",
        ephemeral: true
      });
    }

    if (!chatChannel) {
      return interaction.reply({
        content:
          "❌ Sohbet kanalı bulunamadı.",
        ephemeral: true
      });
    }

    await announcementChannel.send({
      content: "@everyone @here",
      embeds: [
        createEmbed(
          "📢 ANONS",
          text
        )
      ]
    }).catch(() => {});

    await chatChannel.send({
      embeds: [
        createEmbed(
          "📢 ANONS",
          text
        )
      ]
    }).catch(() => {});

    return interaction.reply({
      content:
        "✅ Anons duyuru ve sohbet kanallarına gönderildi.",
      ephemeral: true
    });
  }
});

async function finishClanVote(guildId) {
  const config =
    data.clanConfig[guildId];

  if (!config || !config.active)
    return;

  if (Date.now() < config.end)
    return;

  const guild =
    client.guilds.cache.get(
      guildId
    );

  if (!guild) return;

  const clans =
    data.clans[guildId] || [];

  clans.sort(
    (a, b) =>
      (b.votes || 0) -
      (a.votes || 0)
  );

  const result =
    clans.length
      ? clans.map(
          (clan, index) =>
            `**${index + 1}. ${clan.name}** — ${clan.votes || 0} oy`
        ).join("\n")
      : "Henüz klan eklenmemiş.";

  const channels =
    guild.channels.cache.filter(
      channel =>
        channel.type ===
        ChannelType.GuildText
    );

  const channel =
    channels.find(
      channel =>
        channel.name.includes("klan")
    );

  if (channel) {
    await channel.send({
      embeds: [
        createEmbed(
          "🏆 KLAN OYLAMASI BİTTİ",
          [
            "Oylama sona erdi!",
            "",
            result
          ].join("\n")
        )
      ]
    }).catch(() => {});
  }

  data.clanConfig[guildId].active =
    false;

  save();
}

setInterval(() => {
  for (
    const guildId of Object.keys(
      data.clanConfig
    )
  ) {
    const config =
      data.clanConfig[guildId];

    if (
      config?.active &&
      Date.now() >= config.end
    ) {
      finishClanVote(guildId);
    }
  }
}, 5000);
client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;

  if (!isAdmin(interaction.member)) {
    return;
  }

  if (interaction.customId === "panel_roleall") {
    const modal = new ModalBuilder()
      .setCustomId("roleall_modal")
      .setTitle("👥 Toplurolver");

    const roleInput = new TextInputBuilder()
      .setCustomId("role_id")
      .setLabel("Verilecek rol ID")
      .setPlaceholder("123456789012345678")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(roleInput)
    );

    return interaction.showModal(modal);
  }

  if (interaction.customId === "panel_rolal") {
    const modal = new ModalBuilder()
      .setCustomId("rolal_modal")
      .setTitle("👥 Toplurolal");

    const roleInput = new TextInputBuilder()
      .setCustomId("role_id")
      .setLabel("Alınacak rol ID")
      .setPlaceholder("123456789012345678")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(roleInput)
    );

    return interaction.showModal(modal);
  }

  if (interaction.customId === "panel_role") {
    const modal = new ModalBuilder()
      .setCustomId("role_modal")
      .setTitle("🎭 Rolver");

    const userInput = new TextInputBuilder()
      .setCustomId("user_id")
      .setLabel("Kullanıcı ID")
      .setPlaceholder("123456789012345678")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const roleInput = new TextInputBuilder()
      .setCustomId("role_id")
      .setLabel("Verilecek rol ID")
      .setPlaceholder("123456789012345678")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(userInput),
      new ActionRowBuilder().addComponents(roleInput)
    );

    return interaction.showModal(modal);
  }

  if (interaction.customId === "panel_autorole") {
    const modal = new ModalBuilder()
      .setCustomId("autorole_modal")
      .setTitle("🤖 OtoRol");

    const roleInput = new TextInputBuilder()
      .setCustomId("role_id")
      .setLabel("Otomatik verilecek rol ID")
      .setPlaceholder("123456789012345678")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(roleInput)
    );

    return interaction.showModal(modal);
  }
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isModalSubmit()) return;

  if (!isAdmin(interaction.member)) {
    return interaction.reply({
      content: "❌ Sadece Yönetici kullanabilir.",
      ephemeral: true
    });
  }

  if (interaction.customId === "roleall_modal") {
    const roleId =
      interaction.fields.getTextInputValue("role_id").trim();

    const role =
      interaction.guild.roles.cache.get(roleId);

    if (!role) {
      return interaction.reply({
        content: "❌ Rol bulunamadı.",
        ephemeral: true
      });
    }

    if (role.managed) {
      return interaction.reply({
        content:
          "❌ Discord tarafından yönetilen bir rolü veremem.",
        ephemeral: true
      });
    }

    if (
      role.position >=
      interaction.guild.members.me.roles.highest.position
    ) {
      return interaction.reply({
        content:
          "❌ Bu rol botun en yüksek rolünden yüksek veya eşit.",
        ephemeral: true
      });
    }

    await interaction.deferReply({
      ephemeral: true
    });

    const members =
      await interaction.guild.members.fetch();

    let success = 0;
    let failed = 0;

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
      content:
        `✅ **Toplurolver tamamlandı.**\n\n` +
        `🎭 Rol: ${role}\n` +
        `✅ Verilen: **${success}**\n` +
        `❌ Verilemeyen: **${failed}**`
    });
  }

  if (interaction.customId === "rolal_modal") {
    const roleId =
      interaction.fields.getTextInputValue("role_id").trim();

    const role =
      interaction.guild.roles.cache.get(roleId);

    if (!role) {
      return interaction.reply({
        content: "❌ Rol bulunamadı.",
        ephemeral: true
      });
    }

    if (role.managed) {
      return interaction.reply({
        content:
          "❌ Discord tarafından yönetilen bir rolü alamam.",
        ephemeral: true
      });
    }

    if (
      role.position >=
      interaction.guild.members.me.roles.highest.position
    ) {
      return interaction.reply({
        content:
          "❌ Bu rol botun en yüksek rolünden yüksek veya eşit.",
        ephemeral: true
      });
    }

    await interaction.deferReply({
      ephemeral: true
    });

    const members =
      await interaction.guild.members.fetch();

    let success = 0;
    let failed = 0;

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
      content:
        `✅ **Toplurolal tamamlandı.**\n\n` +
        `🎭 Rol: ${role}\n` +
        `✅ Alınan: **${success}**\n` +
        `❌ Alınamayan: **${failed}**`
    });
  }

  if (interaction.customId === "role_modal") {
    const userId =
      interaction.fields.getTextInputValue("user_id").trim();

    const roleId =
      interaction.fields.getTextInputValue("role_id").trim();

    const member =
      await interaction.guild.members
        .fetch(userId)
        .catch(() => null);

    if (!member) {
      return interaction.reply({
        content: "❌ Kullanıcı bulunamadı.",
        ephemeral: true
      });
    }

    const role =
      interaction.guild.roles.cache.get(roleId);

    if (!role) {
      return interaction.reply({
        content: "❌ Rol bulunamadı.",
        ephemeral: true
      });
    }

    if (role.managed) {
      return interaction.reply({
        content:
          "❌ Discord tarafından yönetilen bir rolü veremem.",
        ephemeral: true
      });
    }

    if (
      role.position >=
      interaction.guild.members.me.roles.highest.position
    ) {
      return interaction.reply({
        content:
          "❌ Bu rol botun en yüksek rolünden yüksek veya eşit.",
        ephemeral: true
      });
    }

    try {
      await member.roles.add(role);
    } catch {
      return interaction.reply({
        content:
          "❌ Rol kullanıcıya verilemedi.",
        ephemeral: true
      });
    }

    return interaction.reply({
      content:
        `✅ ${member} kullanıcısına ${role} rolü verildi.`,
      ephemeral: true
    });
  }

  if (interaction.customId === "autorole_modal") {
    const roleId =
      interaction.fields.getTextInputValue("role_id").trim();

    const role =
      interaction.guild.roles.cache.get(roleId);

    if (!role) {
      return interaction.reply({
        content: "❌ Rol bulunamadı.",
        ephemeral: true
      });
    }

    if (role.managed) {
      return interaction.reply({
        content:
          "❌ Discord tarafından yönetilen bir rol seçemezsin.",
        ephemeral: true
      });
    }

    if (
      role.position >=
      interaction.guild.members.me.roles.highest.position
    ) {
      return interaction.reply({
        content:
          "❌ Bu rol botun en yüksek rolünden yüksek veya eşit.",
        ephemeral: true
      });
    }

    data.autoRole[
      interaction.guild.id
    ] = role.id;

    save();

    return interaction.reply({
      content:
        `✅ OtoRol aktif edildi.\nYeni üyeler artık ${role} rolünü otomatik alacak.`,
      ephemeral: true
    });
  }
});
client.on("guildMemberAdd", async member => {
  const roleId =
    data.autoRole[member.guild.id];

  if (roleId) {
    const role =
      member.guild.roles.cache.get(roleId);

    if (role) {
      await member.roles.add(role).catch(() => {});
    }
  }

  const welcomeId =
    data.welcome[member.guild.id];

  if (!welcomeId) return;

  const channel =
    member.guild.channels.cache.get(welcomeId);

  if (!channel) return;

  const accountAge =
    Date.now() -
    member.user.createdTimestamp;

  const months =
    accountAge /
    (1000 * 60 * 60 * 24 * 30);

  let reliability;

  if (months < 2) {
    reliability = "🔴 Güvenilir Değil";
  } else if (months < 5) {
    reliability = "🟡 Stabil";
  } else if (months > 24) {
    reliability = "🟢 %100 Güvenilir";
  } else {
    reliability = "🟢 Güvenilir";
  }

  await channel.send({
    embeds: [
      createEmbed(
        "🤩 HOŞ GELDİN!",
        [
          `👤 **Üye:** ${member}`,
          `📅 **Giriş tarihi:** <t:${Math.floor(
            Date.now() / 1000
          )}:F>`,
          `🎂 **Hesap tarihi:** <t:${Math.floor(
            member.user.createdTimestamp / 1000
          )}:F>`,
          `🛡️ **Güvenilirlik:** ${reliability}`,
          "",
          `🎉 **${member.guild.name}** sunucusuna hoş geldin!`
        ].join("\n")
      )
    ]
  }).catch(() => {});
});

client.on("guildMemberRemove", async member => {
  const welcomeId =
    data.welcome[member.guild.id];

  if (!welcomeId) return;

  const channel =
    member.guild.channels.cache.get(welcomeId);

  if (!channel) return;

  await channel.send({
    embeds: [
      createEmbed(
        "👋 ÜYE AYRILDI",
        [
          `👤 **Üye:** ${member.user.tag}`,
          `📅 **Ayrılma:** <t:${Math.floor(
            Date.now() / 1000
          )}:F>`,
          "",
          "Üye sunucudan ayrıldı."
        ].join("\n")
      )
    ]
  }).catch(() => {});
});

client.on("messageCreate", async message => {
  if (message.author.bot || !message.guild)
    return;

  const guildId =
    message.guild.id;

  const ratingChannel =
    data.ratingChannel[guildId];

  if (
    ratingChannel &&
    message.channel.id === ratingChannel
  ) {
    if (
      !/^!puanver\s+[1-5]$/i.test(
        message.content.trim()
      )
    ) {
      await message.delete().catch(() => {});

      const warning =
        await message.channel.send(
          "⚠️ Bu kanal sadece puan vermek içindir."
        ).catch(() => null);

      if (warning) {
        setTimeout(
          () => warning.delete().catch(() => {}),
          3000
        );
      }

      return;
    }
  }

  if (
    message.content
      .toLowerCase()
      .startsWith("!puanver")
  ) {
    const args =
      message.content
        .trim()
        .split(/\s+/);

    const score =
      Number(args[1]);

    if (
      !ratingChannel ||
      message.channel.id !== ratingChannel
    ) {
      return;
    }

    if (
      !Number.isInteger(score) ||
      score < 1 ||
      score > 5
    ) {
      return;
    }

    data.ratings[guildId] ||= {};

    data.ratings[guildId][
      message.author.id
    ] = score;

    save();

    const scores =
      Object.values(
        data.ratings[guildId]
      ).map(Number);

    const total =
      scores.reduce(
        (a, b) => a + b,
        0
      );

    const average =
      scores.length
        ? total / scores.length
        : 0;

    const stars =
      "⭐".repeat(score);

    await message.reply({
      embeds: [
        createEmbed(
          "⭐ PUANIN KAYDEDİLDİ",
          [
            `👤 **Üye:** ${message.author}`,
            `⭐ **Verilen puan:** ${stars}`,
            `📊 **Sunucu ortalaması:** ${average.toFixed(2)}/5`,
            `👥 **Toplam değerlendirme:** ${scores.length}`
          ].join("\n")
        )
      ]
    }).then(msg => {
      setTimeout(
        () => msg.delete().catch(() => {}),
        5000
      );
    }).catch(() => {});

    return;
  }

  if (
    message.content
      .toLowerCase()
      .startsWith("!öneri")
  ) {
    const suggestionChannel =
      data.suggestion[guildId];

    if (
      !suggestionChannel ||
      message.channel.id !==
        suggestionChannel
    ) {
      return;
    }

    const suggestion =
      message.content
        .slice(6)
        .trim();

    if (!suggestion) {
      await message.delete().catch(() => {});

      const warning =
        await message.channel.send(
          "⚠️ Önerini `!öneri <önerin>` şeklinde yazmalısın."
        ).catch(() => null);

      if (warning) {
        setTimeout(
          () => warning.delete().catch(() => {}),
          3000
        );
      }

      return;
    }

    await message.delete().catch(() => {});

    const suggestionMessage =
      await message.channel.send({
        embeds: [
          createEmbed(
            "💡 YENİ ÖNERİ",
            [
              `👤 **Gönderen:** ${message.author}`,
              "",
              `💬 **Öneri:**`,
              suggestion
            ].join("\n")
          )
        ]
      });

    await suggestionMessage.react("👍")
      .catch(() => {});

    await suggestionMessage.react("👎")
      .catch(() => {});

    return;
  }
});

client.on("voiceStateUpdate", async (
  oldState,
  newState
) => {
  const guildId =
    newState.guild.id;

  const config =
    data.voiceCreator[guildId];

  if (!config) return;

  if (
    newState.channelId !==
    config.channelId
  ) {
    return;
  }

  const member =
    newState.member;

  if (!member) return;

  const channel =
    await newState.guild.channels.create({
      name:
        `🔊・${member.user.username}`,
      type:
        ChannelType.GuildVoice,
      parent:
        newState.channel.parentId || null,
      permissionOverwrites: [
        {
          id:
            newState.guild.roles.everyone.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.Connect
          ]
        },
        {
          id: member.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.Speak,
            PermissionFlagsBits.Stream,
            PermissionFlagsBits.UseVAD
          ]
        }
      ]
    }).catch(() => null);

  if (!channel) return;

  config.created[member.id] =
    channel.id;

  save();

  await member.voice
    .setChannel(channel)
    .catch(async () => {
      await channel.delete()
        .catch(() => {});

      delete config.created[member.id];

      save();
    });
});

client.on("voiceStateUpdate", async (
  oldState,
  newState
) => {
  const guildId =
    oldState.guild.id;

  const config =
    data.voiceCreator[guildId];

  if (!config) return;

  for (
    const [userId, channelId]
    of Object.entries(config.created)
  ) {
    const channel =
      oldState.guild.channels.cache.get(
        channelId
      );

    if (!channel) {
      delete config.created[userId];
      continue;
    }

    if (channel.members.size === 0) {
      await channel.delete()
        .catch(() => {});

      delete config.created[userId];
    }
  }

  save();
});

client.on("messageCreate", async message => {
  if (
    message.author.bot ||
    !message.guild
  ) return;

  if (
    !message.content
      .toLowerCase()
      .startsWith("!serverinfo")
  ) return;

  const guild =
    message.guild;

  const ratings =
    data.ratings[guild.id] || {};

  const scores =
    Object.values(ratings)
      .map(Number);

  const average =
    scores.length
      ? (
          scores.reduce(
            (a, b) => a + b,
            0
          ) /
          scores.length
        ).toFixed(2)
      : "0.00";

  const owner =
    await guild.fetchOwner()
      .catch(() => null);

  await message.reply({
    embeds: [
      createEmbed(
        `🌐 ${guild.name}`,
        [
          `👑 **Sunucu Sahibi:** ${owner || "Bilinmiyor"}`,
          `👥 **Üye Sayısı:** ${guild.memberCount}`,
          `📅 **Kurulma zamanı:** <t:${Math.floor(
            guild.createdTimestamp / 1000
          )}:F>`,
          `⭐ **Sunucu puanı:** ${average}/5`,
          `🗳️ **Toplam puan:** ${scores.length}`
        ].join("\n")
      )
    ]
  });
});
client.on("messageCreate", async message => {
  if (message.author.bot || !message.guild) return;

  const content = message.content.toLowerCase();

  if (
    badWords.some(word =>
      normalizeText(content).includes(
        normalizeText(word)
      )
    )
  ) {
    await message.delete().catch(() => {});

    const warning =
      await message.channel.send({
        content:
          `⚠️ ${message.author}, küfür kullanmak yasaktır.`
      }).catch(() => null);

    if (warning) {
      setTimeout(
        () => warning.delete().catch(() => {}),
        3000
      );
    }

    return;
  }

  if (content.startsWith("!avatar")) {
    const target =
      message.mentions.users.first() ||
      message.author;

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`🖼️ ${target.username} Avatar`)
          .setImage(
            target.displayAvatarURL({
              size: 4096,
              extension: "png"
            })
          )
          .setFooter({
            text: `${target.tag}`
          })
      ]
    });
  }

  if (content.startsWith("!klan add")) {
    if (!isAdmin(message.member)) {
      return message.reply(
        "❌ Bu komutu sadece Yönetici kullanabilir."
      );
    }

    const config =
      data.clanConfig[message.guild.id];

    if (!config?.active) {
      return message.reply(
        "❌ Önce `!klan oyla <süre>` ile klan oylamasını açmalısın."
      );
    }

    const clanName =
      message.content
        .slice("!klan add".length)
        .trim();

    if (!clanName) {
      return message.reply(
        "❌ Klan adı belirtmelisin."
      );
    }

    data.clans[
      message.guild.id
    ] ||= [];

    const exists =
      data.clans[
        message.guild.id
      ].some(
        clan =>
          clan.name.toLowerCase() ===
          clanName.toLowerCase()
      );

    if (exists) {
      return message.reply(
        "❌ Bu klan zaten eklenmiş."
      );
    }

    data.clans[
      message.guild.id
    ].push({
      name: clanName,
      votes: 0
    });

    save();

    return message.reply({
      embeds: [
        createEmbed(
          "🏆 KLAN EKLENDİ",
          `✅ **${clanName}** klanı oylamaya eklendi.`
        )
      ]
    });
  }

  if (content.startsWith("!klan oyla")) {
    const args =
      message.content
        .trim()
        .split(/\s+/);

    const time =
      args[2];

    const duration =
      parseTime(time);

    if (!duration) {
      return message.reply(
        "❌ Kullanım: `!klan oyla 1h`"
      );
    }

    data.clanConfig[
      message.guild.id
    ] = {
      active: true,
      start: Date.now(),
      end: Date.now() + duration
    };

    data.clans[
      message.guild.id
    ] ||= [];

    data.clanVotes[
      message.guild.id
    ] = {};

    save();

    const clans =
      data.clans[
        message.guild.id
      ];

    if (!clans.length) {
      return message.reply(
        "❌ Önce `!klan add <klan adı>` ile klan eklemelisin."
      );
    }

    const menu =
      new StringSelectMenuBuilder()
        .setCustomId(
          `clan_vote:${message.guild.id}`
        )
        .setPlaceholder(
          "🏆 Oy vereceğin klanı seç"
        )
        .addOptions(
          clans
            .slice(0, 25)
            .map((clan, index) => ({
              label:
                clan.name.slice(0, 100),
              value:
                String(index)
            }))
        );

    await message.channel.send({
      embeds: [
        createEmbed(
          "🏆 KLAN OYLAMASI",
          [
            `⏰ **Süre:** ${time}`,
            "",
            "Aşağıdaki menüden bir klan seç.",
            "",
            "⚠️ Her kullanıcı yalnızca **1 oy** verebilir.",
            "⚠️ Verilen oy daha sonra değiştirilemez."
          ].join("\n")
        )
      ],
      components: [
        new ActionRowBuilder()
          .addComponents(menu)
      ]
    });

    setTimeout(
      () =>
        finishClanVote(
          message.guild.id
        ),
      duration
    );

    return;
  }

  if (content.startsWith("!çekiliş")) {
    if (!isAdmin(message.member)) {
      return message.reply(
        "❌ Bu komutu sadece Yönetici kullanabilir."
      );
    }

    const args =
      message.content
        .trim()
        .split(/\s+/);

    const time = args[1];
    const winnerCount =
      Number(args[2]);

    const prize =
      args.slice(3).join(" ");

    const duration =
      parseTime(time);

    if (
      !duration ||
      !Number.isInteger(winnerCount) ||
      winnerCount < 1 ||
      !prize
    ) {
      return message.reply(
        "❌ Kullanım: `!çekiliş <süre> <kazanan sayısı> <ödül>`"
      );
    }

    const id =
      `${message.guild.id}-${Date.now()}`;

    data.giveaways[id] = {
      guildId:
        message.guild.id,
      channelId:
        message.channel.id,
      messageId: null,
      prize,
      winnerCount,
      end:
        Date.now() + duration,
      participants: []
    };

    save();

    const row =
      new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(
              `giveaway_join:${id}`
            )
            .setLabel("🎉 Katıl")
            .setStyle(
              ButtonStyle.Success
            )
        );

    const giveawayMessage =
      await message.channel.send({
        embeds: [
          createEmbed(
            "🎉 ÇEKİLİŞ",
            [
              `🎁 **Ödül:** ${prize}`,
              `🏆 **Kazanan:** ${winnerCount} kişi`,
              `⏰ **Süre:** ${time}`,
              "",
              "Katılmak için aşağıdaki butona bas!",
              "",
              `📅 **Bitiş:** <t:${Math.floor(
                (Date.now() + duration) / 1000
              )}:R>`
            ].join("\n")
          )
        ],
        components: [row]
      });

    data.giveaways[id].messageId =
      giveawayMessage.id;

    save();

    setTimeout(
      () =>
        finishGiveaway(id),
      duration
    );

    return;
  }

  if (content.startsWith("!drop")) {
    if (!isAdmin(message.member)) {
      return message.reply(
        "❌ Bu komutu sadece Yönetici kullanabilir."
      );
    }

    const prize =
      message.content
        .slice("!drop".length)
        .trim();

    if (!prize) {
      return message.reply(
        "❌ Kullanım: `!drop <ödül>`"
      );
    }

    const id =
      `${message.guild.id}-${Date.now()}`;

    data.drops[id] = {
      guildId:
        message.guild.id,
      channelId:
        message.channel.id,
      prize,
      winner: null
    };

    save();

    const row =
      new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(
              `drop_claim:${id}`
            )
            .setLabel("🎁 AL!")
            .setStyle(
              ButtonStyle.Success
            )
        );

    return message.channel.send({
      embeds: [
        createEmbed(
          "🎁 DROP",
          [
            `🎁 **Ödül:** ${prize}`,
            "",
            "⚡ İlk basan kazanır!",
            "",
            "Kazanan kişi ödülünü almak için ticket açabilir."
          ].join("\n")
        )
      ],
      components: [row]
    });
  }
});

async function finishGiveaway(id) {
  const giveaway =
    data.giveaways[id];

  if (!giveaway) return;

  const guild =
    client.guilds.cache.get(
      giveaway.guildId
    );

  if (!guild) return;

  const channel =
    guild.channels.cache.get(
      giveaway.channelId
    );

  if (!channel) return;

  const participants =
    [...new Set(
      giveaway.participants
    )];

  if (!participants.length) {
    await channel.send({
      embeds: [
        createEmbed(
          "🎉 ÇEKİLİŞ BİTTİ",
          [
            `🎁 **Ödül:** ${giveaway.prize}`,
            "",
            "❌ Yeterli katılım olmadığı için kazanan çıkmadı."
          ].join("\n")
        )
      .catch(() => {});

    delete data.giveaways[id];
    save();
    return;
  }

  const shuffled =
    participants.sort(
      () => Math.random() - 0.5
    );

  const winners =
    shuffled.slice(
      0,
      Math.min(
        giveaway.winnerCount,
        shuffled.length
      )
    );

  const mentions =
    winners
      .map(userId => `<@${userId}>`)
      .join(", ");

  await channel.send({
    content: mentions,
    embeds: [
      createEmbed(
        "🎉 ÇEKİLİŞ SONUÇLANDI!",
        [
          `🎁 **Ödül:** ${giveaway.prize}`,
          "",
          `🏆 **Kazananlar:** ${mentions}`,
          "",
          "🎫 Ödülünüzü talep etmek için ticket açabilirsiniz."
        ].join("\n")
      )
    ]
  }).catch(() => {});

  delete data.giveaways[id];

  save();
}

function parseTime(value) {
  if (!value) return null;

  const match =
    value
      .toLowerCase()
      .match(
        /^(\d+)\s*(s|m|h|d|w)$/
      );

  if (!match) return null;

  const amount =
    Number(match[1]);

  const unit =
    match[2];

  const units = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000
  };

  return amount * units[unit];
}

function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/[^a-zğüşıöç]/g, "");
}

const badWords = [
  "amk",
  "aq",
  "orospu",
  "orospucocu",
  "siktir",
  "sik",
  "yarrak",
  "yarrag",
  "piç",
  "pic",
  "pezevenk",
  "göt",
  "got",
  "ananı sikeyim",
  "ananisikim"
];

function isAdmin(member) {
  return member?.permissions?.has(
    PermissionFlagsBits.Administrator
  );
}

function createEmbed(
  title,
  description
) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setTimestamp()
    .setFooter({
      text: "LynoxNetwork"
    });
}

function getTicketConfig(guildId) {
  return data.ticketConfig?.[guildId] || null;
}

function getTicketByChannel(channelId) {
  for (
    const [id, ticket]
    of Object.entries(
      data.tickets || {}
    )
  ) {
    if (
      ticket.channel === channelId
    ) {
      return [id, ticket];
    }
  }

  return null;
}

function getClanConfig(guildId) {
  return data.clanConfig?.[guildId] || null;
}

function getClanList(guildId) {
  return data.clans?.[guildId] || [];
}
client.on("interactionCreate", async interaction => {
  if (!interaction.isStringSelectMenu()) return;

  if (interaction.customId === "ticket_category_select") {
    const config =
      data.ticketConfig?.[interaction.guild.id];

    if (!config) {
      return interaction.reply({
        content: "❌ Ticket sistemi kurulmamış.",
        ephemeral: true
      });
    }

    const existing =
      Object.values(data.tickets || {})
        .find(
          ticket =>
            ticket.guildId === interaction.guild.id &&
            ticket.userId === interaction.user.id &&
            ticket.closed !== true
        );

    if (existing) {
      const oldChannel =
        interaction.guild.channels.cache.get(
          existing.channel
        );

      return interaction.reply({
        content:
          oldChannel
            ? `❌ Zaten açık bir ticketın var: ${oldChannel}`
            : "❌ Zaten açık bir ticketın var.",
        ephemeral: true
      });
    }

    const selected =
      interaction.values[0];

    const ticketCategory =
      config.categories?.[selected];

    if (!ticketCategory) {
      return interaction.reply({
        content:
          "❌ Ticket kategorisi bulunamadı.",
        ephemeral: true
      });
    }

    const category =
      interaction.guild.channels.cache.get(
        ticketCategory.id || config.category
      );

    if (
      !category ||
      category.type !== ChannelType.GuildCategory
    ) {
      return interaction.reply({
        content:
          "❌ Ticket kategorisi bulunamadı.",
        ephemeral: true
      });
    }

    await interaction.deferReply({
      ephemeral: true
    });

    const ticketId =
      `${interaction.guild.id}-${interaction.user.id}-${Date.now()}`;

    const channel =
      await interaction.guild.channels.create({
        name:
          `ticket-${interaction.user.username}`
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, "")
            .slice(0, 80),
        type:
          ChannelType.GuildText,
        parent:
          category.id,
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
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AttachFiles
            ]
          },
          {
            id:
              config.role,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AttachFiles
            ]
          }
        ]
      })
      .catch(() => null);

    if (!channel) {
      return interaction.editReply({
        content:
          "❌ Ticket kanalı oluşturulamadı."
      });
    }

    data.tickets[ticketId] = {
      id: ticketId,
      guildId:
        interaction.guild.id,
      channel:
        channel.id,
      userId:
        interaction.user.id,
      roleId:
        config.role,
      category:
        ticketCategory.name,
      createdAt:
        Date.now(),
      closed: false
    };

    save();

    const closeButton =
      new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(
              `ticket_close:${ticketId}`
            )
            .setLabel("🔒 Ticket Kapat")
            .setStyle(
              ButtonStyle.Danger
            )
        );

    await channel.send({
      content:
        `<@${interaction.user.id}> <@&${config.role}>`,
      embeds: [
        createEmbed(
          `🎫 ${ticketCategory.name}`,
          [
            `👤 **Ticket sahibi:** ${interaction.user}`,
            `🛡️ **Yetkili rolü:** <@&${config.role}>`,
            "",
            "Destek ekibimiz kısa süre içerisinde ilgilenecektir.",
            "",
            "Ticketı kapatmak için aşağıdaki butonu kullanabilirsin."
          ].join("\n")
        )
      ],
      components: [
        closeButton
      ]
    });

    return interaction.editReply({
      content:
        `✅ Ticket oluşturuldu: ${channel}`
    });
  }

  if (
    interaction.customId.startsWith(
      "clan_vote:"
    )
  ) {
    const guildId =
      interaction.customId.split(":")[1];

    if (
      guildId !== interaction.guild.id
    ) {
      return interaction.reply({
        content:
          "❌ Geçersiz oylama.",
        ephemeral: true
      });
    }

    const config =
      data.clanConfig[guildId];

    if (
      !config ||
      !config.active ||
      Date.now() >= config.end
    ) {
      return interaction.reply({
        content:
          "❌ Klan oylaması sona ermiş.",
        ephemeral: true
      });
    }

    data.clanVotes[guildId] ||= {};

    if (
      data.clanVotes[guildId][
        interaction.user.id
      ]
    ) {
      return interaction.reply({
        content:
          "❌ Daha önce oy verdin. Oyunu değiştiremezsin.",
        ephemeral: true
      });
    }

    const index =
      Number(interaction.values[0]);

    const clans =
      data.clans[guildId] || [];

    const clan =
      clans[index];

    if (!clan) {
      return interaction.reply({
        content:
          "❌ Klan bulunamadı.",
        ephemeral: true
      });
    }

    clan.votes =
      Number(clan.votes || 0) + 1;

    data.clanVotes[guildId][
      interaction.user.id
    ] = clan.name;

    save();

    return interaction.reply({
      content:
        `✅ **${clan.name}** klanına oyun kaydedildi. Oyunu değiştiremezsin.`,
      ephemeral: true
    });
  }
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;

  if (
    interaction.customId.startsWith(
      "giveaway_join:"
    )
  ) {
    const id =
      interaction.customId.split(":")[1];

    const giveaway =
      data.giveaways[id];

    if (!giveaway) {
      return interaction.reply({
        content:
          "❌ Bu çekiliş artık aktif değil.",
        ephemeral: true
      });
    }

    if (
      Date.now() >= giveaway.end
    ) {
      return interaction.reply({
        content:
          "❌ Bu çekiliş sona ermiş.",
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
          "❌ Zaten çekilişe katıldın.",
        ephemeral: true
      });
    }

    giveaway.participants.push(
      interaction.user.id
    );

    save();

    return interaction.reply({
      content:
        "🎉 Çekilişe başarıyla katıldın!",
      ephemeral: true
    });
  }

  if (
    interaction.customId.startsWith(
      "drop_claim:"
    )
  ) {
    const id =
      interaction.customId.split(":")[1];

    const drop =
      data.drops[id];

    if (!drop) {
      return interaction.reply({
        content:
          "❌ Bu drop artık aktif değil.",
        ephemeral: true
      });
    }

    if (drop.winner) {
      return interaction.reply({
        content:
          `❌ Dropu zaten <@${drop.winner}> kazandı.`,
        ephemeral: true
      });
    }

    drop.winner =
      interaction.user.id;

    save();

    const channel =
      interaction.channel;

    await interaction.reply({
      content:
        `🎉 Tebrikler ${interaction.user}! İlk bastığın için **${drop.prize}** ödülünü kazandın. Ödülünü almak için ticket açabilirsin.`
    });

    await channel.send({
      embeds: [
        createEmbed(
          "🎁 DROP KAZANANI",
          [
            `🏆 **Kazanan:** ${interaction.user}`,
            `🎁 **Ödül:** ${drop.prize}`,
            "",
            "🎫 Ödülünü almak için ticket açabilirsin."
          ].join("\n")
        )
      ]
    }).catch(() => {});

    return;
  }

  if (
    interaction.customId.startsWith(
      "ticket_close:"
    )
  ) {
    const ticketId =
      interaction.customId.split(":")[1];

    const ticket =
      data.tickets[ticketId];

    if (!ticket) {
      return interaction.reply({
        content:
          "❌ Ticket kaydı bulunamadı.",
        ephemeral: true
      });
    }

    const config =
      data.ticketConfig[
        interaction.guild.id
      ];

    const isOwner =
      interaction.user.id ===
      ticket.userId;

    const isStaff =
      config &&
      interaction.member.roles.cache.has(
        config.role
      );

    if (!isOwner && !isStaff) {
      return interaction.reply({
        content:
          "❌ Bu ticketı kapatma yetkin yok.",
        ephemeral: true
      });
    }

    await interaction.deferReply({
      ephemeral: true
    });

    const channel =
      interaction.guild.channels.cache.get(
        ticket.channel
      );

    if (!channel) {
      delete data.tickets[ticketId];
      save();

      return interaction.editReply({
        content:
          "❌ Ticket kanalı zaten silinmiş."
      });
    }

    const messages = [];

    let lastId;

    while (true) {
      const options = {
        limit: 100
      };

      if (lastId) {
        options.before = lastId;
      }

      const fetched =
        await channel.messages
          .fetch(options)
          .catch(() => null);

      if (!fetched || !fetched.size)
        break;

      messages.push(
        ...fetched.values()
      );

      lastId =
        fetched.last().id;

      if (fetched.size < 100)
        break;
    }

    messages.reverse();

    const transcript =
      messages.map(msg => {
        const date =
          new Date(
            msg.createdTimestamp
          ).toLocaleString(
            "tr-TR"
          );

        const attachments =
          [...msg.attachments.values()]
            .map(a => a.url)
            .join(" ");

        return [
          `[${date}]`,
          `${msg.author.tag}:`,
          msg.content || "",
          attachments
        ].join(" ");
      }).join("\n");

    const buffer =
      Buffer.from(
        transcript ||
          "Bu ticketta mesaj bulunamadı.",
        "utf8"
      );

    const file = {
      attachment:
        buffer,
      name:
        `transcript-${ticketId}.txt`
    };

    const owner =
      await interaction.guild.members
        .fetch(ticket.userId)
        .catch(() => null);

    const staffRole =
      config
        ? interaction.guild.roles.cache.get(
            config.role
          )
        : null;

    const recipients = [];

    if (owner) {
      recipients.push(owner);
    }

    if (staffRole) {
      for (
        const member
        of staffRole.members.values()
      ) {
        if (
          !recipients.some(
            x => x.id === member.id
          )
        ) {
          recipients.push(member);
        }
      }
    }

    const closeEmbed =
      createEmbed(
        "🔒 TICKET KAPATILDI",
        [
          `🎫 **Ticket:** ${ticket.category}`,
          `👤 **Sahip:** <@${ticket.userId}>`,
          `🔒 **Kapatan:** ${interaction.user}`,
          "",
          "Transcript ektedir."
        ].join("\n")
      );

    for (
      const recipient
      of recipients
    ) {
      await recipient.send({
        embeds: [closeEmbed],
        files: [file]
      }).catch(() => {});
    }

    ticket.closed = true;
    ticket.closedAt =
      Date.now();
    ticket.closedBy =
      interaction.user.id;

    save();

    await interaction.editReply({
      content:
        "✅ Ticket kapatılıyor ve transcript gönderiliyor."
    });

    setTimeout(
      () => {
        channel.delete()
          .catch(() => {});

        delete data.tickets[
          ticketId
        ];

        save();
      },
      2000
    );

    return;
  }
});
