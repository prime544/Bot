const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  RoleSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  PermissionsBitField
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.MessageContent
  ],
  partials: [
    Partials.Channel,
    Partials.GuildMember,
    Partials.User
  ]
});

const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "data");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, {
    recursive: true
  });
}

const files = {
  giveaways: path.join(
    dataDir,
    "giveaways.json"
  ),
  drops: path.join(
    dataDir,
    "drops.json"
  ),
  voiceRooms: path.join(
    dataDir,
    "voiceRooms.json"
  ),
  guildConfig: path.join(
    dataDir,
    "guildConfig.json"
  )
};

function ensureJSON(file, fallback = {}) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(
      file,
      JSON.stringify(
        fallback,
        null,
        2
      )
    );
  }
}

ensureJSON(files.giveaways, {});
ensureJSON(files.drops, {});
ensureJSON(files.voiceRooms, {});
ensureJSON(files.guildConfig, {});

function loadJSON(file) {
  try {
    if (!fs.existsSync(file)) {
      return {};
    }

    const data =
      fs.readFileSync(
        file,
        "utf8"
      );

    return data
      ? JSON.parse(data)
      : {};
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
      JSON.stringify(
        data,
        null,
        2
      )
    );
  } catch (error) {
    console.error(
      `JSON kaydetme hatası: ${file}`,
      error
    );
  }
}

function getGuildConfig(guildId) {
  const all =
    loadJSON(
      files.guildConfig
    );

  if (!all[guildId]) {
    all[guildId] = {};
    saveJSON(
      files.guildConfig,
      all
    );
  }

  return all[guildId];
}

function saveGuildConfig(
  guildId,
  config
) {
  const all =
    loadJSON(
      files.guildConfig
    );

  all[guildId] =
    config;

  saveJSON(
    files.guildConfig,
    all
  );
}

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

function cleanChannelName(
  name
) {
  return String(name)
    .toLowerCase()
    .replace(
      /[^a-z0-9ğüşıöçĞÜŞİÖÇ\s-_]/gi,
      ""
    )
    .trim()
    .replace(
      /\s+/g,
      "-"
    )
    .slice(0, 80) ||
    "kullanici";
}

function createStars(score) {
  const rounded =
    Math.round(
      Number(score) || 0
    );

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

function parseDuration(value) {
  if (!value) {
    return null;
  }

  const match =
    String(value)
      .toLowerCase()
      .match(
        /^(\d+)(s|m|h|d|w)$/
      );

  if (!match) {
    return null;
  }

  const amount =
    Number(match[1]);

  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000
  };

  return (
    amount *
    multipliers[match[2]]
  );
}

client.once(
  "ready",
  async () => {
    console.log(
      `✅ ${client.user.tag} aktif!`
    );

    for (
      const guild
      of client.guilds.cache.values()
    ) {
      try {
        await guild.members.fetch();
      } catch {}

      try {
        await guild.invites.fetch();
      } catch {}
    }
  }
);

process.on(
  "unhandledRejection",
  error => {
    console.error(
      "❌ Yakalanmamış Promise hatası:",
      error
    );
  }
);

process.on(
  "uncaughtException",
  error => {
    console.error(
      "❌ Yakalanmamış Exception:",
      error
    );
  }
);
function getGiveaways() {
  return loadJSON(files.giveaways);
}

function saveGiveaways(data) {
  saveJSON(files.giveaways, data);
}

function getDrops() {
  return loadJSON(files.drops);
}

function saveDrops(data) {
  saveJSON(files.drops, data);
}

function createGiveawayId() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function createDropId() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function pickWinners(
  participants,
  winnerCount
) {
  const list = [...participants];
  const winners = [];

  while (
    list.length > 0 &&
    winners.length < winnerCount
  ) {
    const index =
      Math.floor(
        Math.random() * list.length
      );

    winners.push(list[index]);
    list.splice(index, 1);
  }

  return winners;
}

async function finishGiveaway(
  giveawayId
) {
  const giveaways =
    getGiveaways();

  const giveaway =
    giveaways[giveawayId];

  if (
    !giveaway ||
    giveaway.ended
  ) {
    return;
  }

  giveaway.ended = true;

  const guild =
    client.guilds.cache.get(
      giveaway.guildId
    );

  if (!guild) {
    saveGiveaways(giveaways);
    return;
  }

  const channel =
    guild.channels.cache.get(
      giveaway.channelId
    );

  if (!channel) {
    saveGiveaways(giveaways);
    return;
  }

  const participants =
    Array.isArray(
      giveaway.participants
    )
      ? giveaway.participants
      : [];

  if (
    participants.length === 0
  ) {
    saveGiveaways(giveaways);

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xef4444)
          .setTitle(
            "🎉 Çekiliş Sona Erdi"
          )
          .setDescription(
            `🎁 **Ödül:** ${giveaway.prize}\n\n` +
            "❌ Çekilişe katılan kimse olmadığı için kazanan belirlenemedi."
          )
          .setTimestamp()
      ]
    });

    return;
  }

  const winners =
    pickWinners(
      participants,
      Math.min(
        giveaway.winnerCount,
        participants.length
      )
    );

  giveaway.winners =
    winners;

  saveGiveaways(giveaways);

  const winnerMentions =
    winners
      .map(
        id => `<@${id}>`
      )
      .join(", ");

  await channel.send({
    content:
      winnerMentions,
    embeds: [
      new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle(
          "🎉 Çekiliş Sona Erdi!"
        )
        .setDescription(
          `🎉 **Kazanan${winners.length > 1 ? "lar" : ""}:** ${winnerMentions}\n\n` +
          `🎁 **Ödül:** ${giveaway.prize}\n\n` +
          "🏆 Tebrikler!\n" +
          "🎫 Ödülünüzü talep etmek için ticket açabilirsiniz."
        )
        .addFields(
          {
            name:
              "👥 Katılımcı Sayısı",
            value:
              `**${participants.length}** kişi`,
            inline: true
          },
          {
            name:
              "🏆 Kazanan Sayısı",
            value:
              `**${winners.length}** kişi`,
            inline: true
          }
        )
        .setTimestamp()
        .setFooter({
          text:
            `${guild.name} • Çekiliş Sistemi`
        })
    ]
  });

  try {
    const giveawayMessage =
      await channel.messages.fetch(
        giveaway.messageId
      );

    const endedEmbed =
      EmbedBuilder.from(
        giveawayMessage.embeds[0]
      )
        .setColor(0x22c55e)
        .setTitle(
          "🎉 ÇEKİLİŞ SONA ERDİ!"
        )
        .setDescription(
          `🎁 **Ödül:** ${giveaway.prize}\n\n` +
          `🏆 **Kazananlar:** ${winnerMentions}\n\n` +
          "🎫 Ödülünüzü almak için ticket açabilirsiniz."
        );

    await giveawayMessage.edit({
      embeds: [endedEmbed],
      components: []
    });
  } catch {}
}

async function finishDrop(dropId) {
  const drops =
    getDrops();

  const drop =
    drops[dropId];

  if (
    !drop ||
    drop.ended
  ) {
    return;
  }

  if (!drop.winnerId) {
    return;
  }

  drop.ended = true;

  saveDrops(drops);
}

client.on(
  "messageCreate",
  async message => {
    try {
      if (
        message.author.bot ||
        !message.guild ||
        !message.content.startsWith("!")
      ) {
        return;
      }

      const args =
        message.content
          .slice(1)
          .trim()
          .split(/\s+/);

      const command =
        args.shift()?.toLowerCase();

      if (!command) {
        return;
      }

      if (
        command === "çekiliş" ||
        command === "cekilis"
      ) {
        if (
          !message.member.permissions.has(
            PermissionsBitField.Flags.ManageGuild
          )
        ) {
          return message.reply({
            content:
              "❌ Çekiliş başlatmak için **Sunucuyu Yönet** yetkisine sahip olmalısın."
          });
        }

        if (
          args.length < 3
        ) {
          return message.reply({
            content:
              "❌ Kullanım:\n`!çekiliş <süre> <kazanan sayısı> <ödül>`\n\n" +
              "Örnek:\n`!çekiliş 1h 2 Nitro`"
          });
        }

        const duration =
          parseDuration(
            args.shift()
          );

        const winnerCount =
          Number(
            args.shift()
          );

        const prize =
          args.join(" ").trim();

        if (!duration) {
          return message.reply({
            content:
              "❌ Geçersiz süre.\nÖrnek: `30m`, `1h`, `2d`"
          });
        }

        if (
          duration < 5000
        ) {
          return message.reply({
            content:
              "❌ Çekiliş süresi en az **5 saniye** olmalıdır."
          });
        }

        if (
          !Number.isInteger(
            winnerCount
          ) ||
          winnerCount < 1
        ) {
          return message.reply({
            content:
              "❌ Kazanan sayısı en az 1 olmalıdır."
          });
        }

        if (!prize) {
          return message.reply({
            content:
              "❌ Bir ödül belirtmelisin."
          });
        }

        const endAt =
          Date.now() + duration;

        const giveawayId =
          createGiveawayId();

        const giveaways =
          getGiveaways();

        giveaways[giveawayId] = {
          id: giveawayId,
          guildId:
            message.guild.id,
          channelId:
            message.channel.id,
          messageId: null,
          prize,
          winnerCount,
          duration,
          endAt,
          participants: [],
          winners: [],
          ended: false,
          hostId:
            message.author.id,
          createdAt:
            Date.now()
        };

        const embed =
          new EmbedBuilder()
            .setColor(0xfacc15)
            .setTitle("🎉 ÇEKİLİŞ")
            .setDescription(
              `## 🎁 ${prize}\n\n` +
              `🏆 **Kazanan:** ${winnerCount} kişi\n` +
              `⏰ **Bitiş:** <t:${Math.floor(
                endAt / 1000
              )}:R>\n\n` +
              "🎉 Katılmak için aşağıdaki butona bas!\n\n" +
              "⚠️ Kazananlar tamamen rastgele seçilecektir."
            )
            .addFields(
              {
                name:
                  "👥 Katılımcılar",
                value:
                  "```0 kişi```",
                inline: true
              },
              {
                name:
                  "🎁 Ödül",
                value:
                  `**${prize}**`,
                inline: true
              }
            )
            .setTimestamp()
            .setFooter({
              text:
                `${message.guild.name} • Çekiliş`
            });

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
                  ButtonStyle.Primary
                )
            );

        const giveawayMessage =
          await message.channel.send({
            embeds: [embed],
            components: [row]
          });

        giveaways[giveawayId]
          .messageId =
          giveawayMessage.id;

        saveGiveaways(
          giveaways
        );

        setTimeout(
          () =>
            finishGiveaway(
              giveawayId
            ),
          duration
        );

        return;
      }

      if (
        command === "drop"
      ) {
        if (
          !message.member.permissions.has(
            PermissionsBitField.Flags.ManageGuild
          )
        ) {
          return message.reply({
            content:
              "❌ Drop başlatmak için **Sunucuyu Yönet** yetkisine sahip olmalısın."
          });
        }

        if (
          args.length === 0
        ) {
          return message.reply({
            content:
              "❌ Kullanım:\n`!drop <ödül>`\n\nÖrnek:\n`!drop 1x VIP`"
          });
        }

        const prize =
          args.join(" ").trim();

        const dropId =
          createDropId();

        const drops =
          getDrops();

        drops[dropId] = {
          id: dropId,
          guildId:
            message.guild.id,
          channelId:
            message.channel.id,
          messageId: null,
          prize,
          winnerId: null,
          ended: false,
          hostId:
            message.author.id,
          createdAt:
            Date.now()
        };

        const embed =
          new EmbedBuilder()
            .setColor(0x8b5cf6)
            .setTitle("🎁 DROP!")
            .setDescription(
              `## 🎁 ${prize}\n\n` +
              "⚡ **İlk basan kazanır!**\n\n" +
              "Aşağıdaki butona ilk basan kişi ödülü kazanacaktır.\n\n" +
              "🏆 Kazanan kişi ödülünü ticket açarak talep edebilir."
            )
            .setTimestamp()
            .setFooter({
              text:
                `${message.guild.name} • Drop Sistemi`
            });

        const row =
          new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(
                  `drop_claim_${dropId}`
                )
                .setLabel("Ödülü Al")
                .setEmoji("🎁")
                .setStyle(
                  ButtonStyle.Success
                )
            );

        const dropMessage =
          await message.channel.send({
            embeds: [embed],
            components: [row]
          });

        drops[dropId]
          .messageId =
          dropMessage.id;

        saveDrops(drops);

        return;
      }
    } catch (error) {
      console.error(
        "❌ Çekiliş/Drop komut hatası:",
        error
      );
    }
  }
);
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
        interaction.customId.startsWith(
          "giveaway_join_"
        )
      ) {
        const giveawayId =
          interaction.customId.replace(
            "giveaway_join_",
            ""
          );

        const giveaways =
          getGiveaways();

        const giveaway =
          giveaways[giveawayId];

        if (
          !giveaway ||
          giveaway.ended
        ) {
          return interaction.reply({
            content:
              "❌ Bu çekiliş sona ermiş.",
            ephemeral: true
          });
        }

        if (
          Date.now() >=
          giveaway.endAt
        ) {
          await finishGiveaway(
            giveawayId
          );

          return interaction.reply({
            content:
              "❌ Bu çekiliş sona ermiş.",
            ephemeral: true
          });
        }

        if (
          !Array.isArray(
            giveaway.participants
          )
        ) {
          giveaway.participants = [];
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

        saveGiveaways(
          giveaways
        );

        const channel =
          interaction.guild.channels.cache.get(
            giveaway.channelId
          );

        if (channel) {
          const giveawayMessage =
            await channel.messages
              .fetch(
                giveaway.messageId
              )
              .catch(() => null);

          if (giveawayMessage) {
            const oldEmbed =
              giveawayMessage.embeds[0];

            if (oldEmbed) {
              const updatedEmbed =
                EmbedBuilder.from(
                  oldEmbed
                );

              const fields =
                updatedEmbed.data
                  .fields || [];

              const participantField =
                fields.find(
                  field =>
                    field.name ===
                    "👥 Katılımcılar"
                );

              if (
                participantField
              ) {
                participantField.value =
                  `\`\`\`${giveaway.participants.length} kişi\`\`\``;
              }

              await giveawayMessage
                .edit({
                  embeds: [
                    updatedEmbed
                  ]
                })
                .catch(() => {});
            }
          }
        }

        return interaction.reply({
          content:
            "🎉 Çekilişe başarıyla katıldın!",
          ephemeral: true
        });
      }

      if (
        interaction.customId.startsWith(
          "drop_claim_"
        )
      ) {
        const dropId =
          interaction.customId.replace(
            "drop_claim_",
            ""
          );

        const drops =
          getDrops();

        const drop =
          drops[dropId];

        if (
          !drop ||
          drop.ended ||
          drop.winnerId
        ) {
          return interaction.reply({
            content:
              "❌ Bu drop zaten kazanılmış.",
            ephemeral: true
          });
        }

        drop.winnerId =
          interaction.user.id;

        drop.ended = true;

        saveDrops(drops);

        const channel =
          interaction.guild.channels.cache.get(
            drop.channelId
          );

        if (channel) {
          const dropMessage =
            await channel.messages
              .fetch(
                drop.messageId
              )
              .catch(() => null);

          if (dropMessage) {
            const endedEmbed =
              new EmbedBuilder()
                .setColor(0x22c55e)
                .setTitle(
                  "🎁 DROP KAZANILDI!"
                )
                .setDescription(
                  `🏆 **Kazanan:** ${interaction.user}\n\n` +
                  `🎁 **Ödül:** ${drop.prize}\n\n` +
                  "🎫 Ödülünü talep etmek için ticket açabilirsin."
                )
                .setTimestamp()
                .setFooter({
                  text:
                    `${interaction.guild.name} • Drop Sistemi`
                });

            await dropMessage
              .edit({
                content:
                  `${interaction.user}`,
                embeds: [
                  endedEmbed
                ],
                components: []
              })
              .catch(() => {});
          }
        }

        return interaction.reply({
          content:
            `🎉 Tebrikler ${interaction.user}! **${drop.prize}** ödülünü kazandın.\n🎫 Ödülünü almak için ticket açabilirsin.`,
          ephemeral: false
        });
      }
    } catch (error) {
      console.error(
        "❌ Çekiliş/Drop interaction hatası:",
        error
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
  }
);

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
        message.content
          .trim()
          .toLowerCase();

      if (
        !content.startsWith("!avatar")
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

      if (
        !user &&
        args[0]
      ) {
        const userId =
          args[0].replace(
            /[<@!>]/g,
            ""
          );

        if (
          /^\d{17,20}$/.test(
            userId
          )
        ) {
          user =
            await client.users
              .fetch(userId)
              .catch(() => null);
        }
      }

      if (!user) {
        user =
          message.author;
      }

      const avatar =
        user.displayAvatarURL({
          extension: "png",
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
  }
);

client.on(
  "messageCreate",
  async message => {
    try {
      if (
        message.author.bot ||
        !message.guild ||
        message.content
          .trim()
          .toLowerCase() !==
          "!serverinfo"
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

      const owner =
        await guild
          .fetchOwner()
          .catch(() => null);

      const createdTimestamp =
        Math.floor(
          guild.createdTimestamp /
            1000
        );

      const embed =
        new EmbedBuilder()
          .setColor(0x8b5cf6)
          .setTitle(
            `🏰 ${guild.name}`
          )
          .setDescription(
            `## 🌐 Sunucu Bilgileri\n\n` +
            `${createStars(
              Number(average)
            )} **${average}/5**\n\n` +
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
                `**${guild.memberCount.toLocaleString(
                  "tr-TR"
                )}**`,
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
                `**${average}/5**\n${createStars(
                  Number(average)
                )}`,
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
              extension: "png",
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
  }
);
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

      const config =
        getGuildConfig(
          message.guild.id
        );

      const ratingChannelId =
        config.rating?.channelId;

      const content =
        message.content
          .trim()
          .toLowerCase();

      const isRatingCommand =
        content.startsWith(
          "!puanver"
        );

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
        !ratingChannelId
      ) {
        return message.reply({
          content:
            "❌ Puan sistemi henüz kurulmamış."
        });
      }

      if (
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

      if (
        !config.rating.users ||
        typeof config.rating.users !==
          "object"
      ) {
        config.rating.users = {};
      }

      const previous =
        config.rating.users[
          message.author.id
        ];

      if (
        typeof previous ===
        "number"
      ) {
        return message.reply({
          content:
            `⚠️ Daha önce **${previous}/5** puan verdin.`
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

      await message.delete()
        .catch(() => {});

      await message.channel.send({
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
            .setFooter({
              text:
                `${message.guild.name} • Puan Sistemi`
            })
        ]
      });

    } catch (error) {
      console.error(
        "Puan sistemi hatası:",
        error
      );
    }
  }
);

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

      if (
        !category ||
        category.type !==
          ChannelType.GuildCategory
      ) {
        return interaction.reply({
          content:
            "❌ Geçerli bir kategori seçmelisin.",
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
                interaction.guild.roles.everyone.id,
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
                extension: "png",
                size: 1024
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

      if (
        interaction.isRepliable() &&
        !interaction.replied &&
        !interaction.deferred
      ) {
        await interaction.reply({
          content:
            "❌ Öneri sistemi kurulurken bir hata oluştu.",
          ephemeral: true
        }).catch(() => {});
      }
    }
  }
);

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
            "❌ Bot bu rolü yönetemez. Bot rolünün altında bir rol seç.",
          ephemeral: true
        });
      }

      const config =
        getGuildConfig(
          interaction.guild.id
        );

      config.autorole = {
        enabled: true,
        roleId:
          role.id
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

      if (
        interaction.isRepliable() &&
        !interaction.replied &&
        !interaction.deferred
      ) {
        await interaction.reply({
          content:
            "❌ OtoRol ayarlanırken bir hata oluştu.",
          ephemeral: true
        }).catch(() => {});
      }
    }
  }
);
client.on(
  "guildMemberAdd",
  async member => {
    try {
      const config =
        getGuildConfig(
          member.guild.id
        );

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
              extension: "png",
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
        embeds: [
          embed
        ]
      });

    } catch (error) {
      console.error(
        "Üye giriş sistemi hatası:",
        error
      );
    }
  }
);

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
          .addFields(
            {
              name:
                "👤 Üye",
              value:
                `${member.user}`,
              inline: true
            },
            {
              name:
                "📅 Ayrılma Tarihi",
              value:
                `<t:${Math.floor(
                  Date.now() / 1000
                )}:F>`,
              inline: true
            }
          )
          .setThumbnail(
            member.user.displayAvatarURL({
              extension: "png",
              size: 512
            })
          )
          .setTimestamp()
          .setFooter({
            text:
              `${member.guild.name} • Giriş-Çıkış`
          });

      await channel.send({
        embeds: [
          embed
        ]
      });

    } catch (error) {
      console.error(
        "Üye çıkış sistemi hatası:",
        error
      );
    }
  }
);

function createStars(
  score
) {
  const rounded =
    Math.round(score);

  const safeScore =
    Math.max(
      0,
      Math.min(
        5,
        rounded
      )
    );

  return (
    "⭐".repeat(
      safeScore
    ) +
    "☆".repeat(
      5 - safeScore
    )
  );
}

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
        "welcome_channel_select"
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

      const channelId =
        interaction.values[0];

      const channel =
        interaction.guild.channels.cache.get(
          channelId
        );

      if (
        !channel ||
        channel.type !==
          ChannelType.GuildText
      ) {
        return interaction.reply({
          content:
            "❌ Geçerli bir yazı kanalı seçmelisin.",
          ephemeral: true
        });
      }

      const config =
        getGuildConfig(
          interaction.guild.id
        );

      config.welcome = {
        enabled: true,
        channelId:
          channel.id
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
              "🤩 Giriş-Çıkış Sistemi Aktif"
            )
            .setDescription(
              `Giriş ve çıkış mesajları artık ${channel} kanalında gönderilecek.`
            )
            .addFields({
              name:
                "📥 Giriş",
              value:
                "Yeni üyeler için hoş geldin mesajı gönderilir.",
              inline: true
            }, {
              name:
                "📤 Çıkış",
              value:
                "Sunucudan ayrılan üyeler bildirilir.",
              inline: true
            })
            .setTimestamp()
            .setFooter({
              text:
                `${interaction.guild.name} • Giriş-Çıkış Sistemi`
            })
        ],
        components: []
      });

    } catch (error) {
      console.error(
        "Giriş-çıkış kanal kurulum hatası:",
        error
      );

      if (
        interaction.isRepliable() &&
        !interaction.replied &&
        !interaction.deferred
      ) {
        await interaction.reply({
          content:
            "❌ Giriş-çıkış sistemi kurulurken bir hata oluştu.",
          ephemeral: true
        }).catch(() => {});
      }
    }
  }
);

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
        "rating_channel_select"
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

      const channelId =
        interaction.values[0];

      const channel =
        interaction.guild.channels.cache.get(
          channelId
        );

      if (
        !channel ||
        channel.type !==
          ChannelType.GuildText
      ) {
        return interaction.reply({
          content:
            "❌ Geçerli bir yazı kanalı seçmelisin.",
          ephemeral: true
        });
      }

      const config =
        getGuildConfig(
          interaction.guild.id
        );

      if (!config.rating) {
        config.rating = {
          total: 0,
          count: 0,
          users: {}
        };
      }

      config.rating.channelId =
        channel.id;

      saveGuildConfig(
        interaction.guild.id,
        config
      );

      return interaction.update({
        embeds: [
          new EmbedBuilder()
            .setColor(0x22c55e)
            .setTitle(
              "⭐ Puan Sistemi Aktif"
            )
            .setDescription(
              `Sunucu puan kanalı olarak ${channel} seçildi.\n\n` +
              "Üyeler bu kanalda `!puanver 1-5` komutuyla sunucuya puan verebilir."
            )
            .addFields({
              name:
                "📊 Mevcut Puan",
              value:
                `**${(
                  config.rating.total /
                  Math.max(
                    1,
                    config.rating.count
                  )
                ).toFixed(1)}/5**`,
              inline: true
            }, {
              name:
                "👥 Değerlendirme",
              value:
                `**${config.rating.count}** kişi`,
              inline: true
            })
            .setTimestamp()
            .setFooter({
              text:
                `${interaction.guild.name} • Puan Sistemi`
            })
        ],
        components: []
      });

    } catch (error) {
      console.error(
        "Puan kanal kurulum hatası:",
        error
      );

      if (
        interaction.isRepliable() &&
        !interaction.replied &&
        !interaction.deferred
      ) {
        await interaction.reply({
          content:
            "❌ Puan sistemi kurulurken bir hata oluştu.",
          ephemeral: true
        }).catch(() => {});
      }
    }
  }
);
client.on(
  "interactionCreate",
  async interaction => {
    try {
      if (
        !interaction.guild ||
        !interaction.isStringSelectMenu()
      ) {
        return;
      }

      if (
        interaction.customId !==
        "admin_panel_main"
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
            "❌ Bu paneli kullanmak için **Yönetici** yetkisine sahip olmalısın.",
          ephemeral: true
        });
      }

      const selected =
        interaction.values[0];

      if (
        selected ===
        "panel_autorole"
      ) {
        const roles =
          interaction.guild.roles.cache
            .filter(
              role =>
                role.id !==
                  interaction.guild.roles.everyone.id &&
                !role.managed
            )
            .sort(
              (a, b) =>
                b.position -
                a.position
            );

        if (!roles.size) {
          return interaction.reply({
            content:
              "❌ Seçilebilir bir rol bulunamadı.",
            ephemeral: true
          });
        }

        const roleOptions =
          roles
            .first(25)
            .map(role => ({
              label:
                role.name.slice(0, 100),
              description:
                `ID: ${role.id}`,
              value:
                role.id,
              emoji:
                "🤖"
            }));

        const menu =
          new RoleSelectMenuBuilder()
            .setCustomId(
              "autorole_select"
            )
            .setPlaceholder(
              "🤖 OtoRol olarak kullanılacak rolü seç..."
            )
            .setMinValues(1)
            .setMaxValues(1);

        return interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0x8b5cf6)
              .setTitle(
                "🤖 OtoRol Kurulumu"
              )
              .setDescription(
                "Yeni üyeler sunucuya katıldığında otomatik verilecek rolü seç.\n\n" +
                `📋 Sunucuda **${roles.size}** yönetilebilir rol bulunuyor.\n` +
                "⚠️ Discord tek seçim menüsünde en fazla 25 seçenek gösterir."
              )
              .setTimestamp()
          ],
          components: [
            new ActionRowBuilder()
              .addComponents(menu)
          ]
        });
      }

      if (
        selected ===
        "panel_welcome"
      ) {
        const menu =
          new ChannelSelectMenuBuilder()
            .setCustomId(
              "welcome_channel_select"
            )
            .setPlaceholder(
              "🤩 Giriş-çıkış kanalını seç..."
            )
            .setChannelTypes(
              ChannelType.GuildText
            )
            .setMinValues(1)
            .setMaxValues(1);

        return interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0x8b5cf6)
              .setTitle(
                "🤩 Giriş-Çıkış Kurulumu"
              )
              .setDescription(
                "Üye giriş ve çıkış mesajlarının gönderileceği kanalı seç."
              )
              .setTimestamp()
          ],
          components: [
            new ActionRowBuilder()
              .addComponents(menu)
          ]
        });
      }

      if (
        selected ===
        "panel_rating"
      ) {
        const menu =
          new ChannelSelectMenuBuilder()
            .setCustomId(
              "rating_channel_select"
            )
            .setPlaceholder(
              "⭐ Puan kanalını seç..."
            )
            .setChannelTypes(
              ChannelType.GuildText
            )
            .setMinValues(1)
            .setMaxValues(1);

        return interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0x8b5cf6)
              .setTitle(
                "⭐ Puan Sistemi Kurulumu"
              )
              .setDescription(
                "Üyelerin sunucuya puan vereceği kanalı seç."
              )
              .setTimestamp()
          ],
          components: [
            new ActionRowBuilder()
              .addComponents(menu)
          ]
        });
      }

      if (
        selected ===
        "panel_suggestion"
      ) {
        const menu =
          new ChannelSelectMenuBuilder()
            .setCustomId(
              "suggestion_setup_category"
            )
            .setPlaceholder(
              "💡 Öneri kanalının kategorisini seç..."
            )
            .setChannelTypes(
              ChannelType.GuildCategory
            )
            .setMinValues(1)
            .setMaxValues(1);

        return interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0x8b5cf6)
              .setTitle(
                "💡 Öneri Sistemi Kurulumu"
              )
              .setDescription(
                "Öneri kanalının oluşturulacağı kategoriyi seç."
              )
              .setTimestamp()
          ],
          components: [
            new ActionRowBuilder()
              .addComponents(menu)
          ]
        });
      }

      if (
        selected ===
        "panel_voice"
      ) {
        const menu =
          new ChannelSelectMenuBuilder()
            .setCustomId(
              "voice_setup_category"
            )
            .setPlaceholder(
              "🔊 Ses odalarının kategorisini seç..."
            )
            .setChannelTypes(
              ChannelType.GuildCategory
            )
            .setMinValues(1)
            .setMaxValues(1);

        return interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0x8b5cf6)
              .setTitle(
                "🔊 Ses Sistemi Kurulumu"
              )
              .setDescription(
                "Özel ses odalarının oluşturulacağı kategoriyi seç."
              )
              .setTimestamp()
          ],
          components: [
            new ActionRowBuilder()
              .addComponents(menu)
          ]
        });
      }

      if (
        selected ===
        "panel_announcement"
      ) {
        const menu =
          new ChannelSelectMenuBuilder()
            .setCustomId(
              "announcement_channel_select"
            )
            .setPlaceholder(
              "📢 Duyuru kanalını seç..."
            )
            .setChannelTypes(
              ChannelType.GuildText
            )
            .setMinValues(1)
            .setMaxValues(1);

        return interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0x8b5cf6)
              .setTitle(
                "📢 Anons Sistemi Kurulumu"
              )
              .setDescription(
                "Duyuruların gönderileceği kanalı seç."
              )
              .setTimestamp()
          ],
          components: [
            new ActionRowBuilder()
              .addComponents(menu)
          ]
        });
      }

      if (
        selected ===
        "panel_mass_role_add"
      ) {
        const menu =
          new RoleSelectMenuBuilder()
            .setCustomId(
              "mass_role_add_select"
            )
            .setPlaceholder(
              "👥 Verilecek rolü seç..."
            )
            .setMinValues(1)
            .setMaxValues(1);

        return interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0x8b5cf6)
              .setTitle(
                "👥 Toplu Rol Ver"
              )
              .setDescription(
                "Sunucudaki üyelere verilecek rolü seç."
              )
              .setTimestamp()
          ],
          components: [
            new ActionRowBuilder()
              .addComponents(menu)
          ]
        });
      }

      if (
        selected ===
        "panel_mass_role_remove"
      ) {
        const menu =
          new RoleSelectMenuBuilder()
            .setCustomId(
              "mass_role_remove_select"
            )
            .setPlaceholder(
              "🗑️ Alınacak rolü seç..."
            )
            .setMinValues(1)
            .setMaxValues(1);

        return interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0x8b5cf6)
              .setTitle(
                "🗑️ Toplu Rol Al"
              )
              .setDescription(
                "Sunucudaki üyelerden alınacak rolü seç."
              )
              .setTimestamp()
          ],
          components: [
            new ActionRowBuilder()
              .addComponents(menu)
          ]
        });
      }

    } catch (error) {
      console.error(
        "Panel seçim hatası:",
        error
      );

      if (
        interaction.isRepliable() &&
        !interaction.replied &&
        !interaction.deferred
      ) {
        await interaction.reply({
          content:
            "❌ Panel işlemi sırasında bir hata oluştu.",
          ephemeral: true
        }).catch(() => {});
      }
    }
  }
);

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
        interaction.customId ===
        "welcome_channel_select" ||
        interaction.customId ===
        "rating_channel_select"
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

    } catch (error) {
      console.error(
        "Panel kanal kontrol hatası:",
        error
      );
    }
  }
);
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

      const config =
        getGuildConfig(
          message.guild.id
        );

      const ratingChannelId =
        config.rating?.channelId;

      const isRatingCommand =
        message.content
          .trim()
          .toLowerCase()
          .startsWith("!puanver");

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
          () => {
            warning.delete()
              .catch(() => {});
          },
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

      if (
        !config.rating.users ||
        typeof config.rating.users !==
          "object"
      ) {
        config.rating.users = {};
      }

      const previous =
        config.rating.users[
          message.author.id
        ];

      if (
        typeof previous === "number"
      ) {
        return message.reply({
          content:
            `⚠️ Daha önce **${previous}/5** puan verdin.`
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
            .setFooter({
              text:
                `${message.guild.name} • Puan Sistemi`
            })
        ]
      });

    } catch (error) {
      console.error(
        "Puan sistemi hatası:",
        error
      );
    }
  }
);

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
        "rating_setup_category"
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

      if (
        !category ||
        category.type !==
          ChannelType.GuildCategory
      ) {
        return interaction.reply({
          content:
            "❌ Geçerli bir kategori seçmelisin.",
          ephemeral: true
        });
      }

      const existing =
        interaction.guild.channels.cache.find(
          channel =>
            channel.type ===
              ChannelType.GuildText &&
            channel.name ===
              "⭐│puan" &&
            channel.parentId ===
              categoryId
        );

      if (existing) {
        const config =
          getGuildConfig(
            interaction.guild.id
          );

        config.rating = {
          ...(config.rating || {
            total: 0,
            count: 0,
            users: {}
          }),
          channelId:
            existing.id
        };

        saveGuildConfig(
          interaction.guild.id,
          config
        );

        return interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0xfacc15)
              .setTitle(
                "⭐ Puan Kanalı Zaten Mevcut"
              )
              .setDescription(
                `Puan kanalı: ${existing}`
              )
              .setTimestamp()
          ],
          components: []
        });
      }

      const channel =
        await interaction.guild.channels.create({
          name: "⭐│puan",
          type: ChannelType.GuildText,
          parent: categoryId,
          topic:
            "Sunucu puan sistemi • !puanver <1-5>",
          permissionOverwrites: [
            {
              id:
                interaction.guild.roles.everyone.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.ReadMessageHistory,
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

      const oldRating =
        config.rating || {};

      config.rating = {
        total:
          Number(oldRating.total) || 0,
        count:
          Number(oldRating.count) || 0,
        users:
          oldRating.users || {},
        channelId:
          channel.id
      };

      saveGuildConfig(
        interaction.guild.id,
        config
      );

      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xfacc15)
            .setTitle(
              "⭐ Sunucu Puan Merkezi"
            )
            .setDescription(
              "Sunucumuzu değerlendirmek için aşağıdaki komutu kullanabilirsin.\n\n" +
              "`!puanver 1` ⭐\n" +
              "`!puanver 2` ⭐⭐\n" +
              "`!puanver 3` ⭐⭐⭐\n" +
              "`!puanver 4` ⭐⭐⭐⭐\n" +
              "`!puanver 5` ⭐⭐⭐⭐⭐\n\n" +
              "Her kullanıcı yalnızca **1 kez** puan verebilir."
            )
            .setThumbnail(
              interaction.guild.iconURL({
                extension: "png",
                size: 1024
              }) || null
            )
            .setTimestamp()
            .setFooter({
              text:
                `${interaction.guild.name} • Puan Sistemi`
            })
        ]
      });

      return interaction.update({
        embeds: [
          new EmbedBuilder()
            .setColor(0x22c55e)
            .setTitle(
              "✅ Puan Sistemi Kuruldu"
            )
            .setDescription(
              `⭐ **Puan Kanalı:** ${channel}\n` +
              `📁 **Kategori:** ${category}`
            )
            .setTimestamp()
        ],
        components: []
      });

    } catch (error) {
      console.error(
        "Puan kanal kurulum hatası:",
        error
      );

      if (
        interaction.isRepliable() &&
        !interaction.replied &&
        !interaction.deferred
      ) {
        await interaction.reply({
          content:
            "❌ Puan sistemi kurulurken bir hata oluştu.",
          ephemeral: true
        }).catch(() => {});
      }
    }
  }
);

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
        "welcome_setup_category"
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

      if (
        !category ||
        category.type !==
          ChannelType.GuildCategory
      ) {
        return interaction.reply({
          content:
            "❌ Geçerli bir kategori seçmelisin.",
          ephemeral: true
        });
      }

      const existing =
        interaction.guild.channels.cache.find(
          channel =>
            channel.type ===
              ChannelType.GuildText &&
            channel.name ===
              "🤩│giriş-çıkış" &&
            channel.parentId ===
              categoryId
        );

      if (existing) {
        const config =
          getGuildConfig(
            interaction.guild.id
          );

        config.welcome = {
          ...(config.welcome || {}),
          enabled: true,
          channelId:
            existing.id,
          categoryId:
            categoryId
        };

        saveGuildConfig(
          interaction.guild.id,
          config
        );

        return interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0xfacc15)
              .setTitle(
                "🤩 Giriş-Çıkış Kanalı Zaten Mevcut"
              )
              .setDescription(
                `Kanal: ${existing}`
              )
              .setTimestamp()
          ],
          components: []
        });
      }

      const channel =
        await interaction.guild.channels.create({
          name: "🤩│giriş-çıkış",
          type: ChannelType.GuildText,
          parent: categoryId,
          topic:
            "Üye giriş ve çıkış sistemi",
          permissionOverwrites: [
            {
              id:
                interaction.guild.roles.everyone.id,
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
                PermissionsBitField.Flags.ReadMessageHistory,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ManageMessages
              ]
            }
          ]
        });

      const config =
        getGuildConfig(
          interaction.guild.id
        );

      config.welcome = {
        enabled: true,
        channelId:
          channel.id,
        categoryId:
          categoryId
      };

      saveGuildConfig(
        interaction.guild.id,
        config
      );

      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x22c55e)
            .setTitle(
              "🤩 Giriş-Çıkış Sistemi Aktif"
            )
            .setDescription(
              "Bu kanal sunucuya giren ve çıkan üyeleri otomatik olarak gösterecektir."
            )
            .setTimestamp()
            .setFooter({
              text:
                `${interaction.guild.name} • Giriş-Çıkış Sistemi`
            })
        ]
      });

      return interaction.update({
        embeds: [
          new EmbedBuilder()
            .setColor(0x22c55e)
            .setTitle(
              "✅ Giriş-Çıkış Sistemi Kuruldu"
            )
            .setDescription(
              `🤩 **Kanal:** ${channel}\n` +
              `📁 **Kategori:** ${category}`
            )
            .setTimestamp()
        ],
        components: []
      });

    } catch (error) {
      console.error(
        "Giriş-çıkış kurulum hatası:",
        error
      );

      if (
        interaction.isRepliable() &&
        !interaction.replied &&
        !interaction.deferred
      ) {
        await interaction.reply({
          content:
            "❌ Giriş-çıkış sistemi kurulurken bir hata oluştu.",
          ephemeral: true
        }).catch(() => {});
      }
    }
  }
);
client.on(
  "interactionCreate",
  async interaction => {
    try {
      if (
        !interaction.guild ||
        !interaction.isStringSelectMenu()
      ) {
        return;
      }

      if (
        interaction.customId !==
        "admin_panel_main"
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
            "❌ Bu paneli yalnızca yöneticiler kullanabilir.",
          ephemeral: true
        });
      }

      const selected =
        interaction.values[0];

      if (
        selected ===
        "panel_autorole"
      ) {
        const roles =
          interaction.guild.roles.cache
            .filter(
              role =>
                role.id !==
                  interaction.guild.roles.everyone.id &&
                !role.managed &&
                role.position <
                  interaction.guild.members.me.roles.highest.position
            )
            .sort(
              (a, b) =>
                b.position -
                a.position
            );

        if (!roles.size) {
          return interaction.reply({
            content:
              "❌ Botun verebileceği uygun bir rol bulunamadı.",
            ephemeral: true
          });
        }

        const roleMenu =
          new RoleSelectMenuBuilder()
            .setCustomId(
              "autorole_select"
            )
            .setPlaceholder(
              "🤖 OtoRol için rol seç..."
            )
            .setMinValues(1)
            .setMaxValues(1);

        return interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0x8b5cf6)
              .setTitle(
                "🤖 OtoRol Kurulumu"
              )
              .setDescription(
                "Yeni üyeler sunucuya girdiğinde otomatik verilecek rolü seç."
              )
              .setTimestamp()
          ],
          components: [
            new ActionRowBuilder()
              .addComponents(
                roleMenu
              )
          ]
        });
      }

      if (
        selected ===
        "panel_suggestion"
      ) {
        const menu =
          new ChannelSelectMenuBuilder()
            .setCustomId(
              "suggestion_setup_category"
            )
            .setPlaceholder(
              "📁 Öneri kategorisini seç..."
            )
            .setChannelTypes(
              ChannelType.GuildCategory
            );

        return interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0x8b5cf6)
              .setTitle(
                "💡 Öneri Sistemi"
              )
              .setDescription(
                "Öneri kanalının oluşturulacağı kategoriyi seç."
              )
              .setTimestamp()
          ],
          components: [
            new ActionRowBuilder()
              .addComponents(
                menu
              )
          ]
        });
      }

      if (
        selected ===
        "panel_welcome"
      ) {
        const menu =
          new ChannelSelectMenuBuilder()
            .setCustomId(
              "welcome_setup_category"
            )
            .setPlaceholder(
              "📁 Giriş-çıkış kategorisini seç..."
            )
            .setChannelTypes(
              ChannelType.GuildCategory
            );

        return interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0x8b5cf6)
              .setTitle(
                "🤩 Giriş-Çıkış Sistemi"
              )
              .setDescription(
                "Giriş-çıkış kanalının oluşturulacağı kategoriyi seç."
              )
              .setTimestamp()
          ],
          components: [
            new ActionRowBuilder()
              .addComponents(
                menu
              )
          ]
        });
      }

      if (
        selected ===
        "panel_rating"
      ) {
        const menu =
          new ChannelSelectMenuBuilder()
            .setCustomId(
              "rating_setup_category"
            )
            .setPlaceholder(
              "📁 Puan kategorisini seç..."
            )
            .setChannelTypes(
              ChannelType.GuildCategory
            );

        return interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0x8b5cf6)
              .setTitle(
                "⭐ Puan Sistemi"
              )
              .setDescription(
                "Puan kanalının oluşturulacağı kategoriyi seç."
              )
              .setTimestamp()
          ],
          components: [
            new ActionRowBuilder()
              .addComponents(
                menu
              )
          ]
        });
      }

      if (
        selected ===
        "panel_voice"
      ) {
        const menu =
          new ChannelSelectMenuBuilder()
            .setCustomId(
              "voice_setup_category"
            )
            .setPlaceholder(
              "📁 Ses kategorisini seç..."
            )
            .setChannelTypes(
              ChannelType.GuildCategory
            );

        return interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0x8b5cf6)
              .setTitle(
                "🔊 Ses Sistemi"
              )
              .setDescription(
                "Özel ses odalarının oluşturulacağı kategoriyi seç."
              )
              .setTimestamp()
          ],
          components: [
            new ActionRowBuilder()
              .addComponents(
                menu
              )
          ]
        });
      }

      if (
        selected ===
        "panel_announcement"
      ) {
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
          embeds: [
            new EmbedBuilder()
              .setColor(0xf97316)
              .setTitle(
                "📢 Anons Sistemi • 1/2"
              )
              .setDescription(
                "Duyuruların gönderileceği kanalı seç."
              )
              .setTimestamp()
          ],
          components: [
            new ActionRowBuilder()
              .addComponents(
                menu
              )
          ]
        });
      }

      if (
        selected ===
        "panel_ticket"
      ) {
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
          embeds: [
            new EmbedBuilder()
              .setColor(0x8b5cf6)
              .setTitle(
                "🎫 Ticket Sistemi"
              )
              .setDescription(
                "Ticket kanallarının oluşturulacağı kategoriyi seç."
              )
              .setTimestamp()
          ],
          components: [
            new ActionRowBuilder()
              .addComponents(
                menu
              )
          ]
        });
      }

      if (
        selected ===
        "panel_mass_role_add"
      ) {
        const menu =
          new RoleSelectMenuBuilder()
            .setCustomId(
              "mass_role_add_select"
            )
            .setPlaceholder(
              "👥 Verilecek rolü seç..."
            )
            .setMinValues(1)
            .setMaxValues(1);

        return interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0x8b5cf6)
              .setTitle(
                "👥 Toplu Rol Ver"
              )
              .setDescription(
                "Üyelere verilecek rolü seç."
              )
              .setTimestamp()
          ],
          components: [
            new ActionRowBuilder()
              .addComponents(
                menu
              )
          ]
        });
      }

      if (
        selected ===
        "panel_mass_role_remove"
      ) {
        const menu =
          new RoleSelectMenuBuilder()
            .setCustomId(
              "mass_role_remove_select"
            )
            .setPlaceholder(
              "🗑️ Alınacak rolü seç..."
            )
            .setMinValues(1)
            .setMaxValues(1);

        return interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0x8b5cf6)
              .setTitle(
                "🗑️ Toplu Rol Al"
              )
              .setDescription(
                "Üyelerden alınacak rolü seç."
              )
              .setTimestamp()
          ],
          components: [
            new ActionRowBuilder()
              .addComponents(
                menu
              )
          ]
        });
      }

      if (
        selected ===
        "panel_role_give"
      ) {
        return interaction.reply({
          content:
            "👤 Rol verme sistemi için kullanıcı ve rol seçim paneli mevcut sistemindeki ilgili menü üzerinden açılmalıdır.",
          ephemeral: true
        });
      }

      if (
        selected ===
        "panel_commands"
      ) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x8b5cf6)
              .setTitle(
                "📖 Komut Bilgi"
              )
              .setDescription(
                "Sunucudaki kullanılabilir komutları görmek için komut yardım sistemini kullanabilirsin."
              )
              .setTimestamp()
          ],
          ephemeral: true
        });
      }

    } catch (error) {
      console.error(
        "Admin panel interaction hatası:",
        error
      );

      if (
        interaction.isRepliable() &&
        !interaction.replied &&
        !interaction.deferred
      ) {
        await interaction.reply({
          content:
            "❌ Panel işlemi sırasında bir hata oluştu.",
          ephemeral: true
        }).catch(() => {});
      }
    }
  }
);

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
        "ticket_setup_category"
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

      if (
        !category ||
        category.type !==
          ChannelType.GuildCategory
      ) {
        return interaction.reply({
          content:
            "❌ Geçerli bir ticket kategorisi seçmelisin.",
          ephemeral: true
        });
      }

      const config =
        getGuildConfig(
          interaction.guild.id
        );

      config.ticket = {
        ...(config.ticket || {}),
        enabled: true,
        categoryId:
          category.id
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
              "✅ Ticket Sistemi Hazır"
            )
            .setDescription(
              `📁 **Kategori:** ${category}\n\n` +
              "Ticket paneli mevcut sistemindeki ticket panel mesajından kullanılabilir."
            )
            .setTimestamp()
        ],
        components: []
      });

    } catch (error) {
      console.error(
        "Ticket kurulum hatası:",
        error
      );

      if (
        interaction.isRepliable() &&
        !interaction.replied &&
        !interaction.deferred
      ) {
        await interaction.reply({
          content:
            "❌ Ticket sistemi kurulurken bir hata oluştu.",
          ephemeral: true
        }).catch(() => {});
      }
    }
  }
);
