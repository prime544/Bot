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

function pickWinners(participants, winnerCount) {
  const list = [...participants];
  const winners = [];

  while (
    list.length > 0 &&
    winners.length < winnerCount
  ) {
    const index = Math.floor(
      Math.random() * list.length
    );

    winners.push(list[index]);
    list.splice(index, 1);
  }

  return winners;
}

async function finishGiveaway(giveawayId) {
  const giveaways = getGiveaways();
  const giveaway = giveaways[giveawayId];

  if (!giveaway || giveaway.ended) {
    return;
  }

  giveaway.ended = true;

  const guild = client.guilds.cache.get(
    giveaway.guildId
  );

  if (!guild) {
    saveGiveaways(giveaways);
    return;
  }

  const channel = guild.channels.cache.get(
    giveaway.channelId
  );

  if (!channel) {
    saveGiveaways(giveaways);
    return;
  }

  const participants = Array.isArray(
    giveaway.participants
  )
    ? giveaway.participants
    : [];

  if (participants.length === 0) {
    saveGiveaways(giveaways);

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xef4444)
          .setTitle("🎉 Çekiliş Sona Erdi")
          .setDescription(
            `🎁 **Ödül:** ${giveaway.prize}\n\n` +
            "❌ Çekilişe katılan kimse olmadığı için kazanan belirlenemedi."
          )
          .setTimestamp()
      ]
    }).catch(() => {});

    return;
  }

  const winners = pickWinners(
    participants,
    Math.min(
      giveaway.winnerCount,
      participants.length
    )
  );

  giveaway.winners = winners;

  saveGiveaways(giveaways);

  const winnerMentions = winners
    .map(id => `<@${id}>`)
    .join(", ");

  const winnerText =
    winners.length === 1
      ? "🎉 Kazanan"
      : "🎉 Kazananlar";

  await channel.send({
    content: winnerMentions,
    embeds: [
      new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle("🎉 Çekiliş Sona Erdi!")
        .setDescription(
          `${winnerText}: ${winnerMentions}\n\n` +
          `🎁 **Ödül:** ${giveaway.prize}\n\n` +
          "🏆 Tebrikler!\n" +
          "🎫 Ödülünüzü talep etmek için ticket açabilirsiniz."
        )
        .addFields(
          {
            name: "👥 Katılımcı Sayısı",
            value: `**${participants.length}** kişi`,
            inline: true
          },
          {
            name: "🏆 Kazanan Sayısı",
            value: `**${winners.length}** kişi`,
            inline: true
          }
        )
        .setTimestamp()
        .setFooter({
          text: `${guild.name} • Çekiliş Sistemi`
        })
    ]
  }).catch(() => {});
}

async function finishDrop(dropId) {
  const drops = getDrops();
  const drop = drops[dropId];

  if (!drop || drop.ended || !drop.winnerId) {
    return;
  }

  drop.ended = true;

  saveDrops(drops);
}

client.on("messageCreate", async message => {
  try {
    if (
      message.author.bot ||
      !message.guild ||
      !message.content.startsWith("!")
    ) {
      return;
    }

    const args = message.content
      .slice(1)
      .trim()
      .split(/\s+/);

    const command = args
      .shift()
      ?.toLowerCase();

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

      if (args.length < 3) {
        return message.reply({
          content:
            "❌ Kullanım:\n" +
            "`!çekiliş <süre> <kazanan sayısı> <ödül>`\n\n" +
            "Örnek:\n" +
            "`!çekiliş 1h 2 Nitro`"
        });
      }

      const duration = parseDuration(
        args.shift()
      );

      const winnerCount = Number(
        args.shift()
      );

      const prize = args.join(" ").trim();

      if (!duration) {
        return message.reply({
          content:
            "❌ Geçersiz süre.\n\n" +
            "Örnek: `30m`, `1h`, `2d`"
        });
      }

      if (duration < 5000) {
        return message.reply({
          content:
            "❌ Çekiliş süresi en az **5 saniye** olmalıdır."
        });
      }

      if (
        !Number.isInteger(winnerCount) ||
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
        guildId: message.guild.id,
        channelId: message.channel.id,
        messageId: null,
        prize,
        winnerCount,
        duration,
        endAt,
        participants: [],
        winners: [],
        ended: false,
        hostId: message.author.id,
        createdAt: Date.now()
      };

      const giveawayEmbed =
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
              name: "👥 Katılımcılar",
              value: "```0 kişi```",
              inline: true
            },
            {
              name: "🎁 Ödül",
              value: `**${prize}**`,
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
              .setLabel("Çekilişe Katıl")
              .setEmoji("🎉")
              .setStyle(
                ButtonStyle.Primary
              )
          );

      const giveawayMessage =
        await message.channel.send({
          embeds: [giveawayEmbed],
          components: [row]
        });

      giveaways[giveawayId].messageId =
        giveawayMessage.id;

      saveGiveaways(giveaways);

      setTimeout(
        () =>
          finishGiveaway(
            giveawayId
          ).catch(error =>
            console.error(
              "Çekiliş bitirme hatası:",
              error
            )
          ),
        duration
      );

      return;
    }

    if (command === "drop") {
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

      if (args.length === 0) {
        return message.reply({
          content:
            "❌ Kullanım:\n" +
            "`!drop <ödül>`\n\n" +
            "Örnek:\n" +
            "`!drop 1x VIP`"
        });
      }

      const prize = args.join(" ").trim();
      const dropId = createDropId();
      const drops = getDrops();

      drops[dropId] = {
        id: dropId,
        guildId: message.guild.id,
        channelId: message.channel.id,
        messageId: null,
        prize,
        winnerId: null,
        ended: false,
        hostId: message.author.id,
        createdAt: Date.now()
      };

      const dropEmbed =
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
          embeds: [dropEmbed],
          components: [row]
        });

      drops[dropId].messageId =
        dropMessage.id;

      saveDrops(drops);

      return;
    }

    if (
      command === "öneri" ||
      command === "oneri"
    ) {
      const config =
        getGuildConfig(
          message.guild.id
        );

      const suggestionChannelId =
        config.suggestion?.channelId;

      const isSuggestionChannel =
        !suggestionChannelId ||
        message.channel.id ===
          suggestionChannelId;

      if (!isSuggestionChannel) {
        return;
      }

      if (!suggestionChannelId) {
        return message.reply({
          content:
            "❌ Öneri sistemi henüz kurulmamış."
        });
      }

      const suggestion =
        args.join(" ").trim();

      if (!suggestion) {
        return message.reply({
          content:
            "❌ Önerini yazmalısın.\n\n" +
            "Örnek:\n" +
            "`!öneri Yeni bir sistem eklenebilir.`"
        });
      }

      const suggestionEmbed =
        new EmbedBuilder()
          .setColor(0x8b5cf6)
          .setTitle("💡 Yeni Öneri")
          .setDescription(suggestion)
          .addFields({
            name: "👤 Öneren",
            value: `${message.author}`,
            inline: true
          })
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

      const row =
        new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(
                "suggestion_upvote"
              )
              .setLabel("Destekle")
              .setEmoji("👍")
              .setStyle(
                ButtonStyle.Success
              ),

            new ButtonBuilder()
              .setCustomId(
                "suggestion_downvote"
              )
              .setLabel("Destekleme")
              .setEmoji("👎")
              .setStyle(
                ButtonStyle.Danger
              )
          );

      await message.channel.send({
        embeds: [suggestionEmbed],
        components: [row]
      });

      await message.delete()
        .catch(() => {});

      return;
    }
  } catch (error) {
    console.error(
      "❌ Çekiliş/Drop/Öneri hatası:",
      error
    );
  }
});

client.on(
  "interactionCreate",
  async interaction => {
    try {
      if (!interaction.guild) {
        return;
      }

      if (
        interaction.isButton() &&
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
          Date.now() >= giveaway.endAt
        ) {
          await finishGiveaway(
            giveawayId
          );

          if (!interaction.replied) {
            return interaction.reply({
              content:
                "❌ Bu çekiliş sona ermiş.",
              ephemeral: true
            });
          }

          return;
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

        saveGiveaways(giveaways);

        const channel =
          interaction.guild.channels.cache.get(
            giveaway.channelId
          );

        if (channel) {
          const giveawayMessage =
            await channel.messages.fetch(
              giveaway.messageId
            ).catch(() => null);

          if (giveawayMessage) {
            const oldEmbed =
              giveawayMessage.embeds[0];

            if (oldEmbed) {
              const updatedEmbed =
                EmbedBuilder.from(
                  oldEmbed
                );

              const participantField =
                updatedEmbed.data.fields?.find(
                  field =>
                    field.name ===
                    "👥 Katılımcılar"
                );

              if (participantField) {
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
        interaction.isButton() &&
        interaction.customId.startsWith(
          "drop_claim_"
        )
      ) {
        const dropId =
          interaction.customId.replace(
            "drop_claim_",
            ""
          );

        const drops = getDrops();
        const drop = drops[dropId];

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
            await channel.messages.fetch(
              drop.messageId
            ).catch(() => null);

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

            await dropMessage.edit({
              content:
                `${interaction.user}`,
              embeds: [endedEmbed],
              components: []
            }).catch(() => {});
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

      if (/^\d{17,20}$/.test(userId)) {
        user =
          await client.users.fetch(
            userId
          ).catch(() => null);
      }
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

client.on("messageCreate", async message => {
  try {
    if (
      message.author.bot ||
      !message.guild ||
      message.content
        .toLowerCase()
        .trim() !== "!serverinfo"
    ) {
      return;
    }

    const guild =
      message.guild;

    const config =
      getGuildConfig(guild.id);

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
      await guild.fetchOwner()
        .catch(() => null);

    const createdTimestamp =
      Math.floor(
        guild.createdTimestamp / 1000
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
              `**${guild.memberCount.toLocaleString("tr-TR")}**`,
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
              "🌍 Dil",
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

      setTimeout(() => {
        warning.delete()
          .catch(() => {});
      }, 5000);

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

    if (!config.rating.users) {
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
      ]
    });
  } catch (error) {
    console.error(
      "Puan sistemi hatası:",
      error
    );
  }
});

client.on(
  "interactionCreate",
  async interaction => {
    try {
      if (
        !interaction.guild ||
        !interaction.isChannelSelectMenu() ||
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
              category.id
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
        channelId: channel.id,
        categoryId: category.id
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
        role.managed ||
        role.id ===
          interaction.guild.roles.everyone.id
      ) {
        return interaction.reply({
          content:
            "❌ Bu rol otomatik rol olarak kullanılamaz.",
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
        roleId: role.id
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
            "❌ Bu işlemi yalnızca yöneticiler kullanabilir.",
          ephemeral: true
        });
      }

      const value =
        interaction.values[0];

      if (
        value === "panel_autorole"
      ) {
        const menu =
          new RoleSelectMenuBuilder()
            .setCustomId(
              "autorole_select"
            )
            .setPlaceholder(
              "🤖 OtoRol için bir rol seç..."
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
                "Yeni üyeler sunucuya katıldığında otomatik verilecek rolü seç."
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
        value === "panel_welcome"
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
              ChannelType.GuildText,
              ChannelType.GuildAnnouncement
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
        value === "panel_rating"
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
              ChannelType.GuildText,
              ChannelType.GuildAnnouncement
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
        value === "panel_voice"
      ) {
        const menu =
          new ChannelSelectMenuBuilder()
            .setCustomId(
              "voice_setup_category"
            )
            .setPlaceholder(
              "🔊 Ses sistemi kategorisini seç..."
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
        value === "panel_suggestion"
      ) {
        const menu =
          new ChannelSelectMenuBuilder()
            .setCustomId(
              "suggestion_setup_category"
            )
            .setPlaceholder(
              "💡 Öneri kategorisini seç..."
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
        value === "panel_announcement"
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

    } catch (error) {
      console.error(
        "Panel seçim hatası:",
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

      if (!channel) {
        return interaction.reply({
          content:
            "❌ Kanal bulunamadı.",
          ephemeral: true
        });
      }

      const config =
        getGuildConfig(
          interaction.guild.id
        );

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
            .setTitle(
              "✅ Giriş-Çıkış Sistemi Kuruldu"
            )
            .setDescription(
              `🤩 Giriş ve çıkış mesajları artık ${channel} kanalında gönderilecek.`
            )
            .setTimestamp()
        ],
        components: []
      });

    } catch (error) {
      console.error(
        "Giriş-çıkış kanal seçimi hatası:",
        error
      );

      if (
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

      if (!channel) {
        return interaction.reply({
          content:
            "❌ Kanal bulunamadı.",
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
              "✅ Puan Sistemi Kuruldu"
            )
            .setDescription(
              `⭐ Puan verme kanalı olarak ${channel} seçildi.\n\n` +
              "Üyeler bu kanalda `!puanver 1-5` komutuyla sunucuya puan verebilir."
            )
            .addFields({
              name:
                "📊 Mevcut Puan",
              value:
                `**${config.rating.count > 0 ? (config.rating.total / config.rating.count).toFixed(1) : "0.0"}/5**`,
              inline: true
            })
            .addFields({
              name:
                "👥 Değerlendirme",
              value:
                `**${config.rating.count}** kişi`,
              inline: true
            })
            .setTimestamp()
        ],
        components: []
      });

    } catch (error) {
      console.error(
        "Puan kanal seçimi hatası:",
        error
      );

      if (
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
            "❌ Bu işlemi yalnızca yöneticiler kullanabilir.",
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
            "❌ Bot bu rolü yönetemez. Botun en yüksek rolünün altında bulunan bir rol seçmelisin.",
          ephemeral: true
        });
      }

      const config =
        getGuildConfig(
          interaction.guild.id
        );

      config.autorole = {
        enabled: true,
        roleId: role.id
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
              `Yeni katılan üyelere otomatik olarak ${role} rolü verilecek.`
            )
            .setTimestamp()
        ],
        components: []
      });

    } catch (error) {
      console.error(
        "OtoRol seçim hatası:",
        error
      );

      if (
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
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.Connect
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
        categoryId: category.id,
        channelId: voiceChannel.id
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
              `Ses oluşturma kanalı başarıyla oluşturuldu:\n\n` +
              `${voiceChannel}\n\n` +
              "Bir kullanıcı bu kanala girdiğinde kendisine özel ses odası oluşturulacaktır."
            )
            .setTimestamp()
        ],
        components: []
      });

    } catch (error) {
      console.error(
        "Ses sistemi kurulum hatası:",
        error
      );

      if (
        !interaction.replied &&
        !interaction.deferred
      ) {
        await interaction.reply({
          content:
            "❌ Ses sistemi kurulurken bir hata oluştu.",
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
            channel.name ===
              "🆘│öneri" &&
            channel.parentId ===
              category.id
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
        channelId: channel.id,
        categoryId: category.id
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
              `💡 Kanal: ${channel}\n` +
              `📁 Kategori: ${category}`
            )
            .setTimestamp()
        ],
        components: []
      });

    } catch (error) {
      console.error(
        "Öneri sistemi kurulum hatası:",
        error
      );

      if (
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

      if (!channel) {
        return interaction.reply({
          content:
            "❌ Kanal bulunamadı.",
          ephemeral: true
        });
      }

      const menu =
        new ChannelSelectMenuBuilder()
          .setCustomId(
            `announcement_chat_select_${channel.id}`
          )
          .setPlaceholder(
            "💬 Sohbet kanalını seç..."
          )
          .setChannelTypes(
            ChannelType.GuildText,
            ChannelType.GuildAnnouncement
          )
          .setMinValues(1)
          .setMaxValues(1);

      return interaction.update({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf97316)
            .setTitle(
              "📢 Anons Sistemi"
            )
            .setDescription(
              `📢 Duyuru kanalı: ${channel}\n\n` +
              "Şimdi duyuruların ayrıca gönderileceği sohbet kanalını seç."
            )
            .setTimestamp()
        ],
        components: [
          new ActionRowBuilder()
            .addComponents(menu)
        ]
      });

    } catch (error) {
      console.error(
        "Anons sistemi kanal seçim hatası:",
        error
      );

      if (
        !interaction.replied &&
        !interaction.deferred
      ) {
        await interaction.reply({
          content:
            "❌ Anons sistemi kurulurken bir hata oluştu.",
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
            "❌ Bu işlemi yalnızca yöneticiler kullanabilir.",
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
          announcementChannel.id,
        chatChannelId:
          chatChannel.id
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
              "Artık `!duyuru <mesaj>` komutuyla duyuru gönderebilirsin."
            )
            .setTimestamp()
        ],
        components: []
      });

    } catch (error) {
      console.error(
        "Anons sistemi kurulum hatası:",
        error
      );

      if (
        !interaction.replied &&
        !interaction.deferred
      ) {
        await interaction.reply({
          content:
            "❌ Anons sistemi kurulurken bir hata oluştu.",
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
            "❌ Yönetici yetkisi gerekli.",
          ephemeral: true
        });
      }

      const value =
        interaction.values[0];

      if (
        value === "panel_mass_role_add"
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
                "Tüm uygun üyelere verilecek rolü seç."
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
        value === "panel_mass_role_remove"
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
              .setColor(0xef4444)
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
              .addComponents(menu)
          ]
        });
      }

      if (
        value === "panel_role_give"
      ) {
        const userMenu =
          new UserSelectMenuBuilder()
            .setCustomId(
              "panel_role_user_select"
            )
            .setPlaceholder(
              "👤 Rol verilecek kullanıcıyı seç..."
            )
            .setMinValues(1)
            .setMaxValues(1);

        return interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0x8b5cf6)
              .setTitle(
                "👤 Rol Ver"
              )
              .setDescription(
                "Önce rol verilecek kullanıcıyı seç."
              )
              .setTimestamp()
          ],
          components: [
            new ActionRowBuilder()
              .addComponents(userMenu)
          ]
        });
      }

      if (
        value === "panel_commands"
      ) {
        return interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0x8b5cf6)
              .setTitle(
                "📖 Komut Bilgi"
              )
              .setDescription(
                "Kullanıcıların kullanabileceği temel komutlar:\n\n" +
                "🖼️ `!avatar` — Avatar görüntüle\n" +
                "🏰 `!serverinfo` — Sunucu bilgilerini görüntüle\n" +
                "⭐ `!puanver 1-5` — Sunucuya puan ver\n" +
                "💡 `!öneri <mesaj>` — Öneri gönder\n" +
                "🎫 `!ticket` — Ticket paneli\n" +
                "ℹ️ Daha fazla komut için sunucu yetkililerine danışabilirsin."
              )
              .setTimestamp()
          ],
          components: []
        });
      }

    } catch (error) {
      console.error(
        "Yönetim paneli seçim hatası:",
        error
      );

      if (
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
        !interaction.isUserSelectMenu()
      ) {
        return;
      }

      if (
        interaction.customId !==
        "panel_role_user_select"
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

      const userId =
        interaction.values[0];

      const user =
        await interaction.client.users
          .fetch(userId)
          .catch(() => null);

      if (!user) {
        return interaction.reply({
          content:
            "❌ Kullanıcı bulunamadı.",
          ephemeral: true
        });
      }

      const menu =
        new RoleSelectMenuBuilder()
          .setCustomId(
            `panel_role_select_${userId}`
          )
          .setPlaceholder(
            "👤 Verilecek rolü seç..."
          )
          .setMinValues(1)
          .setMaxValues(1);

      return interaction.update({
        embeds: [
          new EmbedBuilder()
            .setColor(0x8b5cf6)
            .setTitle(
              "👤 Rol Seç"
            )
            .setDescription(
              `${user} kullanıcısına verilecek rolü seç.`
            )
            .setTimestamp()
        ],
        components: [
          new ActionRowBuilder()
            .addComponents(menu)
        ]
      });

    } catch (error) {
      console.error(
        "Kullanıcı seçim hatası:",
        error
      );

      if (
        !interaction.replied &&
        !interaction.deferred
      ) {
        await interaction.reply({
          content:
            "❌ Kullanıcı seçilirken bir hata oluştu.",
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
        !interaction.customId.startsWith(
          "panel_role_select_"
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
            "❌ Yönetici yetkisi gerekli.",
          ephemeral: true
        });
      }

      const userId =
        interaction.customId.replace(
          "panel_role_select_",
          ""
        );

      const roleId =
        interaction.values[0];

      const member =
        await interaction.guild.members
          .fetch(userId)
          .catch(() => null);

      const role =
        interaction.guild.roles.cache.get(
          roleId
        );

      if (!member) {
        return interaction.reply({
          content:
            "❌ Kullanıcı bulunamadı.",
          ephemeral: true
        });
      }

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

      if (
        member.roles.cache.has(
          role.id
        )
      ) {
        return interaction.reply({
          content:
            `⚠️ ${member} kullanıcısında bu rol zaten var.`,
          ephemeral: true
        });
      }

      await member.roles.add(
        role
      );

      return interaction.update({
        embeds: [
          new EmbedBuilder()
            .setColor(0x22c55e)
            .setTitle(
              "✅ Rol Verildi"
            )
            .setDescription(
              `${member} kullanıcısına ${role} rolü başarıyla verildi.`
            )
            .setTimestamp()
        ],
        components: []
      });

    } catch (error) {
      console.error(
        "Rol verme hatası:",
        error
      );

      if (
        !interaction.replied &&
        !interaction.deferred
      ) {
        await interaction.reply({
          content:
            "❌ Rol verilirken bir hata oluştu.",
          ephemeral: true
        }).catch(() => {});
      }
    }
  }
);
// ======================================================
// AVATAR + SERVERINFO + PUAN + OTOROL + GİRİŞ/ÇIKIŞ
// ======================================================

client.on("messageCreate", async message => {
  try {
    if (
      message.author.bot ||
      !message.guild ||
      !message.content.toLowerCase().startsWith("!avatar")
    ) {
      return;
    }

    const args = message.content.trim().split(/\s+/).slice(1);

    let user = message.mentions.users.first();

    if (!user && args[0]) {
      const userId = args[0].replace(/[<@!>]/g, "");
      user = await client.users.fetch(userId).catch(() => null);
    }

    if (!user) user = message.author;

    const avatar = user.displayAvatarURL({
      dynamic: true,
      size: 4096
    });

    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle(`🖼️ ${user.username} • Avatar`)
      .setImage(avatar)
      .setDescription(`[🔗 Avatarı yeni sekmede aç](${avatar})`)
      .setTimestamp()
      .setFooter({
        text: `${message.guild.name} • Avatar Sistemi`
      });

    await message.reply({
      embeds: [embed]
    });
  } catch (error) {
    console.error("Avatar hatası:", error);
  }
});

client.on("messageCreate", async message => {
  try {
    if (
      message.author.bot ||
      !message.guild ||
      message.content.toLowerCase().trim() !== "!serverinfo"
    ) {
      return;
    }

    const guild = message.guild;
    const config = getGuildConfig(guild.id);

    const rating = config.rating || {
      total: 0,
      count: 0,
      users: {}
    };

    const average =
      rating.count > 0
        ? (rating.total / rating.count).toFixed(1)
        : "0.0";

    const owner = await guild.fetchOwner().catch(() => null);

    const createdTimestamp = Math.floor(
      guild.createdTimestamp / 1000
    );

    const stars = createStars(Number(average));

    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle(`🏰 ${guild.name}`)
      .setDescription(
        `## 🌐 Sunucu Bilgileri\n\n` +
        `${stars} **${average}/5**\n\n` +
        "Sunucu hakkında tüm temel bilgiler aşağıda."
      )
      .addFields(
        {
          name: "👑 Sunucu Sahibi",
          value: owner ? `${owner}` : "Bilinmiyor",
          inline: true
        },
        {
          name: "👥 Üye Sayısı",
          value: `**${guild.memberCount.toLocaleString("tr-TR")}**`,
          inline: true
        },
        {
          name: "📅 Kurulma Zamanı",
          value:
            `<t:${createdTimestamp}:F>\n` +
            `<t:${createdTimestamp}:R>`,
          inline: true
        },
        {
          name: "⭐ Sunucu Puanı",
          value: `**${average}/5**\n${stars}`,
          inline: true
        },
        {
          name: "🆔 Sunucu ID",
          value: `\`${guild.id}\``,
          inline: true
        },
        {
          name: "🌍 Bölge",
          value: guild.preferredLocale || "Bilinmiyor",
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
        text: `${guild.name} • Server Info`
      });

    await message.reply({
      embeds: [embed]
    });
  } catch (error) {
    console.error("ServerInfo hatası:", error);
  }
});

client.on("messageCreate", async message => {
  try {
    if (
      message.author.bot ||
      !message.guild
    ) {
      return;
    }

    const config = getGuildConfig(message.guild.id);

    const ratingChannelId =
      config.rating?.channelId;

    const isRatingCommand =
      message.content
        .toLowerCase()
        .startsWith("!puanver");

    if (
      ratingChannelId &&
      message.channel.id === ratingChannelId &&
      !isRatingCommand
    ) {
      await message.delete().catch(() => {});

      const warning =
        await message.channel.send({
          content:
            `❌ ${message.author}, bu kanal sadece **sunucuya puan vermek** için kullanılabilir.\n` +
            "`!puanver <1-5>` şeklinde kullanabilirsin."
        });

      setTimeout(() => {
        warning.delete().catch(() => {});
      }, 5000);

      return;
    }

    if (!isRatingCommand) {
      return;
    }

    if (
      ratingChannelId &&
      message.channel.id !== ratingChannelId
    ) {
      return message.reply({
        content:
          `❌ Puan vermek için <#${ratingChannelId}> kanalını kullanmalısın.`
      });
    }

    const args =
      message.content.trim().split(/\s+/);

    const score = Number(args[1]);

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

    const previous =
      config.rating.users[message.author.id];

    if (typeof previous === "number") {
      return message.reply({
        content:
          `⚠️ Daha önce **${previous}/5** puan verdin.`
      });
    }

    config.rating.total += score;
    config.rating.count += 1;
    config.rating.users[message.author.id] = score;

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
      createStars(Number(average));

    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xfacc15)
          .setTitle("⭐ Puanın Kaydedildi!")
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
    console.error("Puan sistemi hatası:", error);
  }
});

// ======================================================
// ÖNERİ KANALI KURULUMU
// ======================================================

client.on("interactionCreate", async interaction => {
  try {
    if (
      !interaction.guild ||
      !interaction.isChannelSelectMenu() ||
      interaction.customId !== "suggestion_setup_category"
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

    const categoryId = interaction.values[0];

    const category =
      interaction.guild.channels.cache.get(categoryId);

    if (
      !category ||
      category.type !== ChannelType.GuildCategory
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
          channel.name === "🆘│öneri" &&
          channel.parentId === categoryId
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
            id: interaction.guild.roles.everyone.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.ReadMessageHistory
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
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.ManageMessages
            ]
          }
        ]
      });

    const config =
      getGuildConfig(interaction.guild.id);

    config.suggestion = {
      channelId: channel.id,
      categoryId: category.id
    };

    saveGuildConfig(
      interaction.guild.id,
      config
    );

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x8b5cf6)
          .setTitle("💡 Öneri Merkezi")
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
          .setTitle("✅ Öneri Kanalı Oluşturuldu")
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

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content:
          "❌ Öneri sistemi kurulurken bir hata oluştu.",
        ephemeral: true
      }).catch(() => {});
    }
  }
});

// ======================================================
// OTOROL SEÇİMİ
// ======================================================

client.on("interactionCreate", async interaction => {
  try {
    if (
      !interaction.guild ||
      !interaction.isRoleSelectMenu() ||
      interaction.customId !== "autorole_select"
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

    const roleId = interaction.values[0];

    const role =
      interaction.guild.roles.cache.get(roleId);

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
          .setTitle("🤖 OtoRol Aktif")
          .setDescription(
            `Sunucuya yeni giren üyelere otomatik olarak ${role} rolü verilecek.`
          )
          .setTimestamp()
      ],
      components: []
    });
  } catch (error) {
    console.error("OtoRol hatası:", error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content:
          "❌ OtoRol ayarlanırken bir hata oluştu.",
        ephemeral: true
      }).catch(() => {});
    }
  }
});

// ======================================================
// ÜYE GİRİŞİ
// ======================================================

client.on("guildMemberAdd", async member => {
  try {
    const config =
      getGuildConfig(member.guild.id);

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
        await member.roles.add(role).catch(error => {
          console.error(
            "OtoRol verilemedi:",
            error
          );
        });
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

    const months = days / 30.44;

    let reliability;
    let reliabilityEmoji;

    if (months < 2) {
      reliability = "Güvenilir değil";
      reliabilityEmoji = "⚠️";
    } else if (months < 5) {
      reliability = "Stabil";
      reliabilityEmoji = "🟡";
    } else if (months < 24) {
      reliability = "Güvenilir";
      reliabilityEmoji = "🟢";
    } else {
      reliability = "%100 Güvenilir";
      reliabilityEmoji = "💎";
    }

    const embed =
      new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle("🤩 Yeni Bir Üye Geldi!")
        .setDescription(
          `## Hoş geldin ${member}!\n\n` +
          "Aramıza katıldığın için mutluyuz. 🎉"
        )
        .addFields(
          {
            name: "👤 Üye",
            value:
              `${member}\n\`${member.user.tag}\``,
            inline: true
          },
          {
            name: "📅 Giriş Tarihi",
            value:
              `<t:${Math.floor(Date.now() / 1000)}:F>`,
            inline: true
          },
          {
            name: "🗓️ Hesap Tarihi",
            value:
              `<t:${Math.floor(
                member.user.createdTimestamp / 1000
              )}:F>\n` +
              `<t:${Math.floor(
                member.user.createdTimestamp / 1000
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
            name: "⌛ Hesap Yaşı",
            value:
              `**${days.toLocaleString("tr-TR")} gün**`,
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
      content: `${member} 🎉`,
      embeds: [embed]
    });
  } catch (error) {
    console.error(
      "Üye giriş sistemi hatası:",
      error
    );
  }
});

// ======================================================
// ÜYE ÇIKIŞI
// ======================================================

client.on("guildMemberRemove", async member => {
  try {
    const config =
      getGuildConfig(member.guild.id);

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
        .setTitle("👋 Bir Üye Ayrıldı")
        .setDescription(
          `**${member.user.tag}** sunucudan ayrıldı.`
        )
        .addFields(
          {
            name: "👤 Üye",
            value: `${member.user}`,
            inline: true
          },
          {
            name: "📅 Ayrılma Tarihi",
            value:
              `<t:${Math.floor(Date.now() / 1000)}:F>`,
            inline: true
          }
        )
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
});

// ======================================================
// YARDIMCI FONKSİYONLAR
// ======================================================

function createStars(score) {
  const rounded = Math.round(score);

  return (
    "⭐".repeat(
      Math.max(
        0,
        Math.min(5, rounded)
      )
    ) +
    "☆".repeat(
      Math.max(
        0,
        5 - Math.min(5, rounded)
      )
    )
  );
}
// ======================================================
// SES OLUŞTURMA KANALI KURULUMU
// ======================================================

client.on("interactionCreate", async interaction => {
  try {
    if (
      !interaction.guild ||
      !interaction.isChannelSelectMenu() ||
      interaction.customId !== "voice_setup_category"
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

    const categoryId = interaction.values[0];

    const category =
      interaction.guild.channels.cache.get(categoryId);

    if (
      !category ||
      category.type !== ChannelType.GuildCategory
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
          channel.name === "🔊│ses-oluştur" &&
          channel.parentId === category.id
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
            id: interaction.guild.roles.everyone.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.Connect
            ]
          },
          {
            id: interaction.client.user.id,
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
      getGuildConfig(interaction.guild.id);

    config.voiceCreator = {
      enabled: true,
      categoryId: category.id,
      channelId: voiceChannel.id
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
            "Bir kullanıcı bu kanala girdiğinde kendisine özel ses odası otomatik oluşturulacak."
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

    if (
      !interaction.replied &&
      !interaction.deferred
    ) {
      await interaction.reply({
        content:
          "❌ Ses sistemi kurulurken bir hata oluştu.",
        ephemeral: true
      }).catch(() => {});
    }
  }
});

// ======================================================
// ÖZEL SES ODASI OLUŞTUR
// ======================================================

client.on(
  "voiceStateUpdate",
  async (oldState, newState) => {
    try {
      const guild = newState.guild;

      if (!guild) {
        return;
      }

      const config =
        getGuildConfig(guild.id);

      if (
        !config.voiceCreator?.enabled ||
        !config.voiceCreator.channelId
      ) {
        return;
      }

      const creatorId =
        config.voiceCreator.channelId;

      if (
        newState.channelId === creatorId &&
        oldState.channelId !== creatorId
      ) {
        const member = newState.member;

        if (!member) {
          return;
        }

        const category =
          guild.channels.cache.get(
            config.voiceCreator.categoryId
          );

        if (
          !category ||
          category.type !== ChannelType.GuildCategory
        ) {
          return;
        }

        const safeName =
          cleanChannelName(
            member.displayName
          );

        const roomName =
          `🔊 ${safeName}'ın Odası`;

        const room =
          await guild.channels.create({
            name: roomName,
            type: ChannelType.GuildVoice,
            parent: category.id,
            permissionOverwrites: [
              {
                id: guild.roles.everyone.id,
                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.Connect
                ]
              },
              {
                id: member.id,
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
                id: client.user.id,
                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.Connect,
                  PermissionsBitField.Flags.MoveMembers,
                  PermissionsBitField.Flags.ManageChannels
                ]
              }
            ]
          });

        const rooms =
          loadJSON(files.voiceRooms);

        if (!rooms[guild.id]) {
          rooms[guild.id] = {};
        }

        rooms[guild.id][room.id] = {
          channelId: room.id,
          ownerId: member.id,
          limit: 0,
          locked: false,
          createdAt: Date.now()
        };

        saveJSON(
          files.voiceRooms,
          rooms
        );

        await member.voice
          .setChannel(room)
          .catch(error => {
            console.error(
              "Kullanıcı özel odaya taşınamadı:",
              error
            );
          });

        const controlEmbed =
          new EmbedBuilder()
            .setColor(0x6366f1)
            .setTitle("🔊 Özel Ses Odan")
            .setDescription(
              `Merhaba ${member}!\n\n` +
              "Bu oda sana özel oluşturuldu.\n\n" +
              "Aşağıdaki butonlardan odanı yönetebilirsin."
            )
            .addFields(
              {
                name: "👥 Kullanıcı Limiti",
                value: "Sınırsız",
                inline: true
              },
              {
                name: "🔓 Oda Durumu",
                value: "Açık",
                inline: true
              }
            )
            .setTimestamp()
            .setFooter({
              text: "Ses Odası Yönetimi"
            });

        const controls =
          new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(
                  `voice_limit_${room.id}`
                )
                .setLabel("Limit")
                .setEmoji("👥")
                .setStyle(
                  ButtonStyle.Primary
                ),

              new ButtonBuilder()
                .setCustomId(
                  `voice_lock_${room.id}`
                )
                .setLabel("Kilitle")
                .setEmoji("🔒")
                .setStyle(
                  ButtonStyle.Danger
                ),

              new ButtonBuilder()
                .setCustomId(
                  `voice_unlock_${room.id}`
                )
                .setLabel("Kilidi Aç")
                .setEmoji("🔓")
                .setStyle(
                  ButtonStyle.Success
                ),

              new ButtonBuilder()
                .setCustomId(
                  `voice_delete_${room.id}`
                )
                .setLabel("Odayı Sil")
                .setEmoji("🗑️")
                .setStyle(
                  ButtonStyle.Secondary
                )
            );

        await room.send({
          embeds: [controlEmbed],
          components: [controls]
        }).catch(error => {
          console.error(
            "Ses kontrol mesajı gönderilemedi:",
            error
          );
        });
      }

      if (
        oldState.channelId &&
        oldState.channelId !== creatorId
      ) {
        const rooms =
          loadJSON(files.voiceRooms);

        const roomData =
          rooms[guild.id]?.[
            oldState.channelId
          ];

        if (
          roomData &&
          oldState.channel &&
          oldState.channel.members.size === 0
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
        !interaction.isButton() ||
        !interaction.customId.startsWith("voice_")
      ) {
        return;
      }

      const parts =
        interaction.customId.split("_");

      const action = parts[1];
      const roomId =
        parts.slice(2).join("_");

      const rooms =
        loadJSON(files.voiceRooms);

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

      if (
        !room ||
        room.type !== ChannelType.GuildVoice
      ) {
        return interaction.reply({
          content:
            "❌ Ses odası bulunamadı.",
          ephemeral: true
        });
      }

      if (action === "limit") {
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

        return interaction.showModal(modal);
      }

      if (action === "lock") {
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
            "🔒 Ses odası kilitlendi.",
          ephemeral: true
        });
      }

      if (action === "unlock") {
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

      if (action === "delete") {
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

      if (
        !interaction.replied &&
        !interaction.deferred
      ) {
        await interaction.reply({
          content:
            "❌ Ses odası işlemi sırasında hata oluştu.",
          ephemeral: true
        }).catch(() => {});
      }
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
        !interaction.isModalSubmit() ||
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
        loadJSON(files.voiceRooms);

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
          interaction.fields.getTextInputValue(
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
            "❌ Limit 0 ile 99 arasında olmalıdır.",
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

      await room.setUserLimit(value);

      roomData.limit = value;

      saveJSON(
        files.voiceRooms,
        rooms
      );

      return interaction.reply({
        content:
          value === 0
            ? "👥 Ses odası limiti **sınırsız** olarak ayarlandı."
            : `👥 Ses odası limiti **${value} kişi** olarak ayarlandı.`,
        ephemeral: true
      });
    } catch (error) {
      console.error(
        "Ses limit hatası:",
        error
      );

      if (
        !interaction.replied &&
        !interaction.deferred
      ) {
        await interaction.reply({
          content:
            "❌ Ses limiti ayarlanırken hata oluştu.",
          ephemeral: true
        }).catch(() => {});
      }
    }
  }
);
// ======================================================
// ANONS SİSTEMİ
// ======================================================

client.on("interactionCreate", async interaction => {
  try {
    if (
      !interaction.guild ||
      !interaction.isChannelSelectMenu() ||
      interaction.customId !== "announcement_channel_select"
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

    const channelId = interaction.values[0];

    const channel =
      interaction.guild.channels.cache.get(channelId);

    if (
      !channel ||
      channel.type !== ChannelType.GuildText
    ) {
      return interaction.reply({
        content:
          "❌ Geçerli bir yazı kanalı seçmelisin.",
        ephemeral: true
      });
    }

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
        new EmbedBuilder()
          .setColor(0xf97316)
          .setTitle(
            "💬 Anons Sohbet Kanalı"
          )
          .setDescription(
            `📢 **Duyuru Kanalı:** ${channel}\n\n` +
            "Şimdi duyuruların ayrıca gönderileceği **sohbet kanalını** seç."
          )
          .setTimestamp()
          .setFooter({
            text:
              "Anons Kurulumu • 2/2"
          })
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

    if (
      !interaction.replied &&
      !interaction.deferred
    ) {
      await interaction.reply({
        content:
          "❌ Anons sistemi kurulurken hata oluştu.",
        ephemeral: true
      }).catch(() => {});
    }
  }
});

client.on("interactionCreate", async interaction => {
  try {
    if (
      !interaction.guild ||
      !interaction.isChannelSelectMenu() ||
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
      !chatChannel ||
      announcementChannel.type !== ChannelType.GuildText ||
      chatChannel.type !== ChannelType.GuildText
    ) {
      return interaction.reply({
        content:
          "❌ Kanallardan biri bulunamadı veya yazı kanalı değil.",
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
            "Artık `!duyuru <mesaj>` komutu kullanıldığında mesaj iki kanala da gönderilecek."
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

    if (
      !interaction.replied &&
      !interaction.deferred
    ) {
      await interaction.reply({
        content:
          "❌ Anons sistemi kurulurken hata oluştu.",
        ephemeral: true
      }).catch(() => {});
    }
  }
});

// ======================================================
// DUYURU KOMUTU
// ======================================================

client.on("messageCreate", async message => {
  try {
    if (
      message.author.bot ||
      !message.guild ||
      !message.content.toLowerCase().startsWith("!duyuru")
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
        config.announcement.announcementChannelId
      );

    const chatChannel =
      message.guild.channels.cache.get(
        config.announcement.chatChannelId
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

    await announcementChannel.send({
      content:
        "@everyone @here",
      embeds: [
        announcementEmbed
      ],
      allowedMentions: {
        parse: ["everyone"]
      }
    });

    const chatEmbed =
      EmbedBuilder.from(
        announcementEmbed
      )
        .setTitle(
          "📢 Yeni Duyuru"
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

    setTimeout(() => {
      confirmation.delete()
        .catch(() => {});
    }, 5000);
  } catch (error) {
    console.error(
      "Duyuru sistemi hatası:",
      error
    );
  }
});

// ======================================================
// PANEL
// ======================================================

client.on("messageCreate", async message => {
  try {
    if (
      message.author.bot ||
      !message.guild ||
      message.content.toLowerCase().trim() !== "!panel"
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
            label: "Ticket Kur",
            description:
              "4 seçenekli ticket sistemi kur",
            value: "panel_ticket",
            emoji: "🎫"
          },
          {
            label: "Toplu Rol Ver",
            description:
              "Üyelere seçilen rolü ver",
            value: "panel_mass_role_add",
            emoji: "👥"
          },
          {
            label: "Toplu Rol Al",
            description:
              "Üyelerden seçilen rolü al",
            value: "panel_mass_role_remove",
            emoji: "🗑️"
          },
          {
            label: "Öneri Kanalı",
            description:
              "Öneri kanalı oluştur",
            value: "panel_suggestion",
            emoji: "💡"
          },
          {
            label: "Rol Ver",
            description:
              "Belirlenen kullanıcıya rol ver",
            value: "panel_role_give",
            emoji: "👤"
          },
          {
            label: "Komut Bilgi",
            description:
              "Kullanıcının kullanabileceği komutları göster",
            value: "panel_commands",
            emoji: "📖"
          },
          {
            label: "OtoRol",
            description:
              "Yeni üyelere otomatik rol ver",
            value: "panel_autorole",
            emoji: "🤖"
          },
          {
            label: "Giriş-Çıkış",
            description:
              "Giriş-çıkış kanalı oluştur",
            value: "panel_welcome",
            emoji: "🤩"
          },
          {
            label: "Puan Kanalı",
            description:
              "Puan kanalı oluştur",
            value: "panel_rating",
            emoji: "⭐"
          },
          {
            label: "Ses Oluştur",
            description:
              "Özel ses odası sistemi kur",
            value: "panel_voice",
            emoji: "🔊"
          },
          {
            label: "Anons Sistemi",
            description:
              "Duyuru ve sohbet kanallarını ayarla",
            value: "panel_announcement",
            emoji: "📢"
          }
        );

    await message.channel.send({
      embeds: [embed],
      components: [
        new ActionRowBuilder()
          .addComponents(menu)
      ]
    });
  } catch (error) {
    console.error(
      "Panel komutu hatası:",
      error
    );
  }
});
