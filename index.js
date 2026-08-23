const {
    Client,
    GatewayIntentBits,
    Partials,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ChannelType,
    PermissionFlagsBits
} = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [
        Partials.Channel,
        Partials.Message
    ]
});

const PREFIX = "!";

const db = {
    guilds: new Map(),
    tickets: new Map(),
    clans: new Map(),
    giveaways: new Map(),
    drops: new Map()
};

function guildData(guildId) {
    if (!db.guilds.has(guildId)) {
        db.guilds.set(guildId, {
            ratings: new Map(),
            ticketCategory: null,
            welcomeChannel: null,
            suggestionChannel: null,
            autoRole: null
        });
    }

    return db.guilds.get(guildId);
}

function embed(title, description) {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(0x5865f2)
        .setTimestamp();
}

function staff(member) {
    return member.permissions.has(PermissionFlagsBits.ManageGuild);
}

function admin(member) {
    return member.permissions.has(PermissionFlagsBits.Administrator);
}

function safeName(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9ğüşöçıİĞÜŞÖÇ_-]/gi, "-")
        .slice(0, 40);
}

function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);

    if (seconds < 60) return `${seconds} saniye`;

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) return `${minutes} dakika`;

    const hours = Math.floor(minutes / 60);

    if (hours < 24) return `${hours} saat`;

    return `${Math.floor(hours / 24)} gün`;
}

async function transcript(channel) {
    const messages = await channel.messages.fetch({ limit: 100 });

    const sorted = [...messages.values()]
        .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    let text = "";

    for (const msg of sorted) {
        const time = new Date(msg.createdTimestamp).toLocaleString("tr-TR");

        text += `[${time}] ${msg.author.tag}: ${msg.content || "[Embed/Dosya]"}\n`;
    }

    if (!text) {
        text = "Bu ticket içerisinde mesaj bulunamadı.";
    }

    return text;
}

/* =========================
   READY
========================= */

client.once("ready", () => {
    console.log("=================================");
    console.log(`✅ ${client.user.tag} aktif!`);
    console.log(`🌐 ${client.guilds.cache.size} sunucuda aktif.`);
    console.log("=================================");

    client.user.setPresence({
        activities: [
            {
                name: "!panel | Yardım",
                type: 0
            }
        ],
        status: "online"
    });
});

/* =========================
   MESAJ KOMUTLARI
========================= */

client.on("messageCreate", async message => {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content
        .slice(PREFIX.length)
        .trim()
        .split(/\s+/);

    const command = args.shift()?.toLowerCase();

    if (!command) return;

    /* =========================
       AVATAR
    ========================= */

    if (command === "avatar") {
        const member =
            message.mentions.members.first() ||
            message.member;

        const user = member.user;

        const e = new EmbedBuilder()
            .setTitle(`🖼️ ${user.username} Avatar`)
            .setImage(
                user.displayAvatarURL({
                    extension: "png",
                    size: 4096
                })
            )
            .setColor(0x5865f2)
            .setTimestamp();

        return message.reply({ embeds: [e] });
    }

    /* =========================
       SERVER INFO
    ========================= */

    if (command === "serverinfo") {
        const guild = message.guild;
        const owner = await guild.fetchOwner();

        const data = guildData(guild.id);
        const ratings = [...data.ratings.values()];

        let rating = "Henüz puan verilmedi";

        if (ratings.length) {
            const average =
                ratings.reduce((a, b) => a + b, 0) /
                ratings.length;

            rating = `⭐ ${average.toFixed(1)}/5\n${ratings.length} oy`;
        }

        const e = new EmbedBuilder()
            .setTitle(`🖥️ ${guild.name}`)
            .setThumbnail(
                guild.iconURL({
                    extension: "png",
                    size: 1024
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
                    value: `${guild.memberCount}`,
                    inline: true
                },
                {
                    name: "📅 Kurulma Zamanı",
                    value: `<t:${Math.floor(
                        guild.createdTimestamp / 1000
                    )}:F>`,
                    inline: false
                },
                {
                    name: "⭐ Sunucu Puanı",
                    value: rating,
                    inline: false
                }
            )
            .setColor(0x5865f2)
            .setTimestamp();

        return message.reply({ embeds: [e] });
    }

    /* =========================
       PUAN VER
    ========================= */

    if (command === "puanver") {
        const puan = Number(args[0]);

        if (![1, 2, 3, 4, 5].includes(puan)) {
            return message.reply(
                "❌ Kullanım: `!puanver <1-5>`"
            );
        }

        const data = guildData(message.guild.id);

        data.ratings.set(
            message.author.id,
            puan
        );

        return message.reply({
            embeds: [
                embed(
                    "⭐ Puan Verildi",
                    `${message.author} sunucuya **${puan}/5** puan verdi.`
                )
            ]
        });
    }

    /* =========================
       TICKET PANELİ
    ========================= */

    if (command === "ticket") {
        if (!staff(message.member)) {
            return message.reply(
                "❌ Bu komutu kullanmak için **Sunucuyu Yönet** yetkisine sahip olmalısın."
            );
        }

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("ticket_genel")
                    .setLabel("Genel Destek")
                    .setEmoji("🎫")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId("ticket_teknik")
                    .setLabel("Teknik Destek")
                    .setEmoji("🛠️")
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId("ticket_sikayet")
                    .setLabel("Şikayet")
                    .setEmoji("🚨")
                    .setStyle(ButtonStyle.Danger),

                new ButtonBuilder()
                    .setCustomId("ticket_diger")
                    .setLabel("Diğer")
                    .setEmoji("📩")
                    .setStyle(ButtonStyle.Success)
            );

        const e = embed(
            "🎫 Destek Merkezi",
            "Aşağıdaki kategorilerden birini seçerek ticket oluşturabilirsin.\n\n" +
            "⚠️ Her kullanıcı aynı anda yalnızca **1 ticket** açabilir."
        );

        return message.channel.send({
            embeds: [e],
            components: [row]
        });
    }

    /* =========================
       PANEL
    ========================= */

    if (command === "panel") {
        if (!admin(message.member)) {
            return message.reply(
                "❌ Bu paneli yalnızca **Yönetici** yetkisine sahip kişiler kullanabilir."
            );
        }

        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("panel_ticket")
                    .setLabel("Ticket Kur")
                    .setEmoji("🎫")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId("panel_toplurolver")
                    .setLabel("Toplu Rol Ver")
                    .setEmoji("➕")
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId("panel_toplurolal")
                    .setLabel("Toplu Rol Al")
                    .setEmoji("➖")
                    .setStyle(ButtonStyle.Danger),

                new ButtonBuilder()
                    .setCustomId("panel_oneri")
                    .setLabel("Öneri Kanalı")
                    .setEmoji("💡")
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId("panel_rolver")
                    .setLabel("Rol Ver")
                    .setEmoji("👤")
                    .setStyle(ButtonStyle.Primary)
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("panel_komut")
                    .setLabel("Komut Bilgi")
                    .setEmoji("📚")
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId("panel_otorol")
                    .setLabel("OtoRol")
                    .setEmoji("🤖")
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId("panel_hosgeldin")
                    .setLabel("Hoşgeldin Kanalı")
                    .setEmoji("👋")
                    .setStyle(ButtonStyle.Primary)
            );

        const e = new EmbedBuilder()
            .setTitle("🛠️ Yönetici Paneli")
            .setDescription(
                "Sunucu sistemlerini aşağıdaki butonlardan yönetebilirsin.\n\n" +
                "🎫 Ticket sistemi\n" +
                "👥 Rol yönetimi\n" +
                "💡 Öneri sistemi\n" +
                "📚 Komut bilgileri\n" +
                "🤖 OtoRol\n" +
                "👋 Hoşgeldin sistemi"
            )
            .setColor(0x5865f2)
            .setFooter({
                text: `Paneli açan: ${message.author.tag}`
            })
            .setTimestamp();

        return message.channel.send({
            embeds: [e],
            components: [row1, row2]
        });
    }

    /* =========================
       ÖNERİ
    ========================= */

    if (command === "öneri") {
        const data = guildData(message.guild.id);

        if (!data.suggestionChannel) {
            return message.reply(
                "❌ Bu sunucuda öneri kanalı oluşturulmamış."
            );
        }

        if (message.channel.id !== data.suggestionChannel) {
            return message.reply(
                `❌ Önerilerini yalnızca <#${data.suggestionChannel}> kanalında gönderebilirsin.`
            );
        }

        const suggestion = args.join(" ");

        if (!suggestion) {
            return message.reply(
                "❌ Kullanım: `!öneri <önerin>`"
            );
        }

        const e = new EmbedBuilder()
            .setTitle("💡 Yeni Öneri")
            .setDescription(suggestion)
            .addFields({
                name: "👤 Gönderen",
                value: `${message.author}`
            })
            .setColor(0x57f287)
            .setTimestamp();

        const sent = await message.channel.send({
            embeds: [e]
        });

        await sent.react("👍");
        await sent.react("👎");

        if (message.deletable) {
            await message.delete().catch(() => {});
        }

        return;
    }

    /* =========================
       KLAN ADD
    ========================= */

    if (command === "klan" && args[0]?.toLowerCase() === "add") {
        if (!staff(message.member)) {
            return message.reply(
                "❌ Bu komut için yetkin yok."
            );
        }

        const name = args.slice(1).join(" ");

        if (!name) {
            return message.reply(
                "❌ Kullanım: `!klan add <klan ismi>`"
            );
        }

        if (!db.clans.has(message.guild.id)) {
            db.clans.set(message.guild.id, new Set());
        }

        db.clans.get(message.guild.id).add(name);

        return message.reply({
            embeds: [
                embed(
                    "⚔️ Klan Eklendi",
                    `**${name}** klanı oylama listesine eklendi.`
                )
            ]
        });
    }

    /* =========================
       KLAN OYLAMA
    ========================= */

    if (
        command === "klan" &&
        args[0]?.toLowerCase() === "oylama"
    ) {
        if (!staff(message.member)) {
            return message.reply(
                "❌ Bu komut için yetkin yok."
            );
        }

        const clans = db.clans.get(message.guild.id);

        if (!clans || clans.size === 0) {
            return message.reply(
                "❌ Önce `!klan add <klan ismi>` ile klan eklemelisin."
            );
        }

        const options = [...clans]
            .slice(0, 25)
            .map((clan, index) => ({
                label: clan.slice(0, 100),
                value: `clan_${index}`
            }));

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("klan_vote")
                    .setPlaceholder("⚔️ Bir klan seç...")
                    .addOptions(options)
            );

        db.guilds.get(message.guild.id).clanVote = {
            clans: [...clans],
            votes: new Map()
        };

        return message.channel.send({
            embeds: [
                embed(
                    "⚔️ Klan Oylaması",
                    "Aşağıdaki menüden desteklediğin klanı seç.\n\n" +
                    "⚠️ Her kullanıcı yalnızca **1 oy** verebilir ve verdiği oy değiştirilemez."
                )
            ],
            components: [row]
        });
    }

    /* =========================
       ÇEKİLİŞ
    ========================= */

    if (command === "çekiliş") {
        if (!staff(message.member)) {
            return message.reply(
                "❌ Bu komut için yetkin yok."
            );
        }

        if (args.length < 3) {
            return message.reply(
                "❌ Kullanım: `!çekiliş <süre> <kazanan sayısı> <ödül>`\nÖrnek: `!çekiliş 10m 2 Nitro`"
            );
        }

        const durationText = args.shift();
        const winnerCount = Number(args.shift());
        const prize = args.join(" ");

        const match = durationText.match(
            /^(\d+)(s|m|h|d)$/i
        );

        if (!match) {
            return message.reply(
                "❌ Süre formatı: `10s`, `10m`, `2h`, `1d`"
            );
        }

        if (
            !Number.isInteger(winnerCount) ||
            winnerCount < 1
        ) {
            return message.reply(
                "❌ Kazanan sayısı geçersiz."
            );
        }

        const value = Number(match[1]);
        const unit = match[2].toLowerCase();

        const multipliers = {
            s: 1000,
            m: 60000,
            h: 3600000,
            d: 86400000
        };

        const duration = value * multipliers[unit];

        if (duration > 7 * 86400000) {
            return message.reply(
                "❌ Çekiliş süresi en fazla 7 gün olabilir."
            );
        }

        const giveaway = {
            messageId: null,
            channelId: message.channel.id,
            guildId: message.guild.id,
            prize,
            winnerCount,
            end: Date.now() + duration,
            participants: new Set(),
            ended: false
        };

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("giveaway_join")
                    .setLabel("Çekilişe Katıl")
                    .setEmoji("🎉")
                    .setStyle(ButtonStyle.Success)
            );

        const sent = await message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle("🎉 ÇEKİLİŞ")
                    .setDescription(
                        `🎁 **Ödül:** ${prize}\n` +
                        `🏆 **Kazanan:** ${winnerCount}\n` +
                        `⏰ **Bitiş:** <t:${Math.floor(
                            giveaway.end / 1000
                        )}:R>\n\n` +
                        `Katılmak için aşağıdaki butona bas!`
                    )
                    .setColor(0xfee75c)
                    .setTimestamp()
            ],
            components: [row]
        });

        giveaway.messageId = sent.id;

        if (!db.giveaways.has(message.guild.id)) {
            db.giveaways.set(message.guild.id, new Map());
        }

        db.giveaways
            .get(message.guild.id)
            .set(sent.id, giveaway);

        setTimeout(
            () => finishGiveaway(giveaway),
            duration
        );

        return;
    }

    /* =========================
       DROP
    ========================= */

    if (command === "drop") {
        if (!staff(message.member)) {
            return message.reply(
                "❌ Bu komut için yetkin yok."
            );
        }

        const prize = args.join(" ");

        if (!prize) {
            return message.reply(
                "❌ Kullanım: `!drop <ödül>`"
            );
        }

        const drop = {
            messageId: null,
            channelId: message.channel.id,
            guildId: message.guild.id,
            prize,
            claimed: false
        };

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("drop_claim")
                    .setLabel("Ödülü Al")
                    .setEmoji("🎁")
                    .setStyle(ButtonStyle.Success)
            );

        const sent = await message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle("🎁 DROP")
                    .setDescription(
                        `**Ödül:** ${prize}\n\n` +
                        "⚡ Butona ilk basan kişi kazanır!\n" +
                        "🏆 Kazanan kişi ticket açarak ödülünü talep edebilir."
                    )
                    .setColor(0xed4245)
                    .setTimestamp()
            ],
            components: [row]
        });

        drop.messageId = sent.id;

        if (!db.drops.has(message.guild.id)) {
            db.drops.set(message.guild.id, new Map());
        }

        db.drops
            .get(message.guild.id)
            .set(sent.id, drop);

        return;
    }
});

/* =========================
   ÇEKİLİŞ BİTİR
========================= */

async function finishGiveaway(giveaway) {
    if (giveaway.ended) return;

    giveaway.ended = true;

    const guild = client.guilds.cache.get(
        giveaway.guildId
    );

    if (!guild) return;

    const channel = guild.channels.cache.get(
        giveaway.channelId
    );

    if (!channel) return;

    const participants = [
        ...giveaway.participants
    ];

    if (participants.length === 0) {
        return channel.send({
            embeds: [
                embed(
                    "🎉 Çekiliş Bitti",
                    `**${giveaway.prize}** çekilişine kimse katılmadı.`
                )
            ]
        });
    }

    const shuffled = participants.sort(
        () => Math.random() - 0.5
    );

    const winners = shuffled.slice(
        0,
        Math.min(
            giveaway.winnerCount,
            shuffled.length
        )
    );

    const mentions = winners
        .map(id => `<@${id}>`)
        .join(", ");

    const message = await channel.messages.fetch(
        giveaway.messageId
    ).catch(() => null);

    if (message) {
        await message.edit({
            components: []
        }).catch(() => {});
    }

    return channel.send({
        embeds: [
            new EmbedBuilder()
                .setTitle("🏆 ÇEKİLİŞ SONUÇLANDI")
                .setDescription(
                    `🎁 **Ödül:** ${giveaway.prize}\n\n` +
                    `🏆 **Kazananlar:** ${mentions}\n\n` +
                    "🎫 Ödülünüzü almak için ticket açarak yetkililerden talep edebilirsiniz."
                )
                .setColor(0x57f287)
                .setTimestamp()
        ]
    });
}

/* =========================
   BUTONLAR
========================= */

client.on("interactionCreate", async interaction => {
    if (!interaction.isButton() && !interaction.isStringSelectMenu()) {
        return;
    }

    const guild = interaction.guild;

    if (!guild) return;

    /* =========================
       TICKET OLUŞTUR
    ========================= */

    if (
        interaction.isButton() &&
        interaction.customId.startsWith("ticket_")
    ) {
        const existing = [...guild.channels.cache.values()]
            .find(channel =>
                channel.topic === `ticket:${interaction.user.id}`
            );

        if (existing) {
            return interaction.reply({
                content: `❌ Zaten açık bir ticketın var: ${existing}`,
                ephemeral: true
            });
        }

        const type = interaction.customId
            .replace("ticket_", "");

        const names = {
            genel: "Genel Destek",
            teknik: "Teknik Destek",
            sikayet: "Şikayet",
            diger: "Diğer"
        };

        const channel = await guild.channels.create({
            name: `ticket-${safeName(interaction.user.username)}`,
            type: ChannelType.GuildText,
            topic: `ticket:${interaction.user.id}`,
            permissionOverwrites: [
                {
                    id: guild.roles.everyone.id,
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
                    id: guild.members.me.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.ManageChannels
                    ]
                }
            ]
        });

        const rolePermissions = guild.roles.cache.filter(
            role =>
                role.permissions.has(
                    PermissionFlagsBits.ManageChannels
                )
        );

        for (const role of rolePermissions.values()) {
            await channel.permissionOverwrites.create(
                role.id,
                {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true
                }
            ).catch(() => {});
        }

        db.tickets.set(channel.id, {
            owner: interaction.user.id,
            type: names[type] || "Destek",
            created: Date.now()
        });

        const closeRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("ticket_close")
                    .setLabel("Ticket Kapat")
                    .setEmoji("🔒")
                    .setStyle(ButtonStyle.Danger)
            );

        await channel.send({
            content: `${interaction.user}`,
            embeds: [
                embed(
                    `🎫 ${names[type] || "Destek"}`,
                    `Hoş geldin ${interaction.user}!\n\n` +
                    "Yetkililer en kısa sürede seninle ilgilenecektir.\n" +
                    "Ticketı kapatmak için aşağıdaki butonu kullanabilirsin."
                )
            ],
            components: [closeRow]
        });

        return interaction.reply({
            content: `✅ Ticket oluşturuldu: ${channel}`,
            ephemeral: true
        });
    }

    /* =========================
       TICKET KAPAT
    ========================= */

    if (
        interaction.isButton() &&
        interaction.customId === "ticket_close"
    ) {
        const data = db.tickets.get(
            interaction.channel.id
        );

        if (!data) {
            return interaction.reply({
                content: "❌ Ticket verisi bulunamadı.",
                ephemeral: true
            });
        }

        const member = interaction.member;

        const canClose =
            member.id === data.owner ||
            staff(member);

        if (!canClose) {
            return interaction.reply({
                content: "❌ Bu ticketı kapatma yetkin yok.",
                ephemeral: true
            });
        }

        await interaction.deferReply({
            ephemeral: true
        });

        const channel = interaction.channel;

        const text = await transcript(channel);

        const owner = await client.users.fetch(
            data.owner
        ).catch(() => null);

        const serverOwner = await client.users.fetch(
            guild.ownerId
        ).catch(() => null);

        const transcriptEmbed = new EmbedBuilder()
            .setTitle("📄 Ticket Transcript")
            .setDescription(
                `**Sunucu:** ${guild.name}\n` +
                `**Ticket Sahibi:** <@${data.owner}>\n` +
                `**Kategori:** ${data.type}\n` +
                `**Kapatılan:** ${interaction.user}\n\n` +
                "Konuşmalar dosya olarak eklenmiştir."
            )
            .setColor(0x5865f2)
            .setTimestamp();

        const buffer = Buffer.from(
            text,
            "utf8"
        );

        const file = {
            attachment: buffer,
            name: `transcript-${channel.name}.txt`
        };

        if (owner) {
            await owner.send({
                embeds: [transcriptEmbed],
                files: [file]
            }).catch(() => {});
        }

        if (
            serverOwner &&
            serverOwner.id !== owner?.id
        ) {
            await serverOwner.send({
                embeds: [transcriptEmbed],
                files: [file]
            }).catch(() => {});
        }

        db.tickets.delete(channel.id);

        await interaction.editReply(
            "🔒 Ticket kapatılıyor..."
        );

        setTimeout(() => {
            channel.delete().catch(() => {});
        }, 1500);

        return;
    }

    /* =========================
       ÇEKİLİŞ KATIL
    ========================= */

    if (
        interaction.isButton() &&
        interaction.customId === "giveaway_join"
    ) {
        const giveaway =
            db.giveaways
                .get(guild.id)
                ?.get(interaction.message.id);

        if (!giveaway || giveaway.ended) {
            return interaction.reply({
                content: "❌ Bu çekiliş artık aktif değil.",
                ephemeral: true
            });
        }

        if (
            giveaway.participants.has(
                interaction.user.id
            )
        ) {
            return interaction.reply({
                content: "⚠️ Zaten çekilişe katıldın.",
                ephemeral: true
            });
        }

        giveaway.participants.add(
            interaction.user.id
        );

        return interaction.reply({
            content: "🎉 Çekilişe başarıyla katıldın!",
            ephemeral: true
        });
    }

    /* =========================
       DROP KAZAN
    ========================= */
          if (
        interaction.isButton() &&
        interaction.customId === "drop_claim"
    ) {
        const drop =
            db.drops
                .get(guild.id)
                ?.get(interaction.message.id);

        if (!drop || drop.claimed) {
            return interaction.reply({
                content: "❌ Bu drop zaten alındı.",
                ephemeral: true
            });
        }

        drop.claimed = true;

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("drop_claimed")
                    .setLabel("Ödül Alındı")
                    .setEmoji("✅")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            );

        await interaction.message.edit({
            components: [row]
        });

        return interaction.reply({
            content:
                `🎉 Tebrikler ${interaction.user}! **${drop.prize}** ödülünü kazandın!\n\n` +
                "🎫 Ödülünü almak için ticket açarak yetkililere ulaş.",
            ephemeral: false
        });
    }

    /* =========================
       KLAN OYLAMA
    ========================= */

    if (
        interaction.isStringSelectMenu() &&
        interaction.customId === "klan_vote"
    ) {
        const data = guildData(guild.id);

        if (!data.clanVote) {
            return interaction.reply({
                content: "❌ Aktif klan oylaması yok.",
                ephemeral: true
            });
        }

        if (
            data.clanVote.votes.has(
                interaction.user.id
            )
        ) {
            return interaction.reply({
                content:
                    "❌ Daha önce oy verdin. Oyunu değiştiremezsin.",
                ephemeral: true
            });
        }

        const selectedIndex =
            Number(
                interaction.values[0]
                    .replace("clan_", "")
            );

        const clan =
            data.clanVote.clans[selectedIndex];

        data.clanVote.votes.set(
            interaction.user.id,
            clan
        );

        return interaction.reply({
            content:
                `✅ Oyun kaydedildi!\nSeçtiğin klan: **${clan}**`,
            ephemeral: true
        });
    }

    /* =========================
       ADMIN PANEL
    ========================= */

    if (
        interaction.isButton() &&
        interaction.customId.startsWith("panel_")
    ) {
        if (!admin(interaction.member)) {
            return interaction.reply({
                content:
                    "❌ Bu panel yalnızca Yönetici yetkisine sahip kişilere açıktır.",
                ephemeral: true
            });
        }

        const action =
            interaction.customId.replace(
                "panel_",
                ""
            );

        /* TICKET KUR */

        if (action === "ticket") {
            const data = guildData(guild.id);

            data.ticketCategory =
                interaction.channel.id;

            const row =
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(
                                "ticket_genel"
                            )
                            .setLabel(
                                "Genel Destek"
                            )
                            .setEmoji("🎫")
                            .setStyle(
                                ButtonStyle.Primary
                            ),

                        new ButtonBuilder()
                            .setCustomId(
                                "ticket_teknik"
                            )
                            .setLabel(
                                "Teknik Destek"
                            )
                            .setEmoji("🛠️")
                            .setStyle(
                                ButtonStyle.Secondary
                            ),

                        new ButtonBuilder()
                            .setCustomId(
                                "ticket_sikayet"
                            )
                            .setLabel(
                                "Şikayet"
                            )
                            .setEmoji("🚨")
                            .setStyle(
                                ButtonStyle.Danger
                            ),

                        new ButtonBuilder()
                            .setCustomId(
                                "ticket_diger"
                            )
                            .setLabel(
                                "Diğer"
                            )
                            .setEmoji("📩")
                            .setStyle(
                                ButtonStyle.Success
                            )
                    );

            await interaction.channel.send({
                embeds: [
                    embed(
                        "🎫 Ticket Sistemi",
                        "Destek almak için aşağıdaki kategorilerden birini seç."
                    )
                ],
                components: [row]
            });

            return interaction.reply({
                content:
                    "✅ Bu kanala ticket paneli kuruldu.",
                ephemeral: true
            });
        }

        /* ÖNERİ KANALI */

        if (action === "oneri") {
            const existing =
                guild.channels.cache.find(
                    c =>
                        c.name ===
                        "🆘│öneri"
                );

            if (existing) {
                return interaction.reply({
                    content:
                        `❌ Öneri kanalı zaten mevcut: ${existing}`,
                    ephemeral: true
                });
            }

            const channel =
                await guild.channels.create({
                    name: "🆘│öneri",
                    type: ChannelType.GuildText
                });

            guildData(
                guild.id
            ).suggestionChannel =
                channel.id;

            await channel.send({
                embeds: [
                    embed(
                        "💡 Öneri Sistemi",
                        "Bu kanalda `!öneri <önerin>` komutuyla öneri gönderebilirsin."
                    )
                ]
            });

            return interaction.reply({
                content:
                    `✅ Öneri kanalı oluşturuldu: ${channel}`,
                ephemeral: true
            });
        }

        /* KOMUT BİLGİ */

        if (action === "komut") {
            const member = interaction.member;

            let commands = [
                "`!avatar [@kişi]` — Avatar gösterir",
                "`!serverinfo` — Sunucu bilgileri",
                "`!puanver <1-5>` — Sunucuya puan verir",
                "`!öneri <metin>` — Öneri gönderir",
                "`!klan oylama` — Klan oylaması",
                "`!klan add <isim>` — Klan ekler"
            ];

            if (staff(member)) {
                commands.push(
                    "`!ticket` — Ticket paneli",
                    "`!çekiliş <süre> <kazanan> <ödül>` — Çekiliş",
                    "`!drop <ödül>` — Drop"
                );
            }

            if (admin(member)) {
                commands.push(
                    "`!panel` — Yönetici paneli"
                );
            }

            return interaction.reply({
                embeds: [
                    embed(
                        "📚 Kullanabileceğin Komutlar",
                        commands.join("\n\n")
                    )
                ],
                ephemeral: true
            });
        }

        /* OTO ROL */

        if (action === "otorol") {
            const roles = guild.roles.cache
                .filter(
                    r =>
                        r.id !== guild.id &&
                        !r.managed
                )
                .sort(
                    (a, b) =>
                        b.position -
                        a.position
                )
                .first(25);

            if (!roles.length) {
                return interaction.reply({
                    content:
                        "❌ Kullanılabilir rol bulunamadı.",
                    ephemeral: true
                });
            }

            const options =
                roles.map(role => ({
                    label: role.name.slice(
                        0,
                        100
                    ),
                    value: role.id
                }));

            const row =
                new ActionRowBuilder()
                    .addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId(
                                "otorol_select"
                            )
                            .setPlaceholder(
                                "🤖 Otomatik rolü seç..."
                            )
                            .addOptions(options)
                    );

            return interaction.reply({
                embeds: [
                    embed(
                        "🤖 OtoRol",
                        "Sunucuya yeni üye katıldığında otomatik verilecek rolü seç."
                    )
                ],
                components: [row],
                ephemeral: true
            });
        }

        /* HOŞGELDİN */

        if (action === "hosgeldin") {
            const data = guildData(guild.id);

            data.welcomeChannel =
                interaction.channel.id;

            return interaction.reply({
                content:
                    `✅ Hoşgeldin kanalı olarak ${interaction.channel} ayarlandı.`,
                ephemeral: true
            });
        }

        /* TOPLU ROL VER */

        if (action === "toplurolver") {
            const roles =
                guild.roles.cache
                    .filter(
                        r =>
                            r.id !== guild.id &&
                            !r.managed
                    )
                    .sort(
                        (a, b) =>
                            b.position -
                            a.position
                    )
                    .first(25);

            if (!roles.length) {
                return interaction.reply({
                    content:
                        "❌ Rol bulunamadı.",
                    ephemeral: true
                });
            }

            const row =
                new ActionRowBuilder()
                    .addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId(
                                "mass_role_add"
                            )
                            .setPlaceholder(
                                "➕ Verilecek rolü seç..."
                            )
                            .addOptions(
                                roles.map(r => ({
                                    label:
                                        r.name.slice(
                                            0,
                                            100
                                        ),
                                    value: r.id
                                }))
                            )
                    );

            return interaction.reply({
                content:
                    "Verilecek rolü seç:",
                components: [row],
                ephemeral: true
            });
        }

        /* TOPLU ROL AL */

        if (action === "toplurolal") {
            const roles =
                guild.roles.cache
                    .filter(
                        r =>
                            r.id !== guild.id &&
                            !r.managed
                    )
                    .sort(
                        (a, b) =>
                            b.position -
                            a.position
                    )
                    .first(25);

            if (!roles.length) {
                return interaction.reply({
                    content:
                        "❌ Rol bulunamadı.",
                    ephemeral: true
                });
            }

            const row =
                new ActionRowBuilder()
                    .addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId(
                                "mass_role_remove"
                            )
                            .setPlaceholder(
                                "➖ Alınacak rolü seç..."
                            )
                            .addOptions(
                                roles.map(r => ({
                                    label:
                                        r.name.slice(
                                            0,
                                            100
                                        ),
                                    value: r.id
                                }))
                            )
                    );

            return interaction.reply({
                content:
                    "Alınacak rolü seç:",
                components: [row],
                ephemeral: true
            });
        }

        /* ROL VER */

        if (action === "rolver") {
          return interaction.reply({
                content:
                    "❌ Rol verme işlemi için kullanıcı ve rol bilgisi gerekir.\n\nKullanım: `!rolver @kişi @rol`",
                ephemeral: true
            });
        }
    }

    /* =========================
       OTO ROL SELECT
    ========================= */

    if (
        interaction.isStringSelectMenu() &&
        interaction.customId === "otorol_select"
    ) {
        const roleId =
            interaction.values[0];

        const role =
            guild.roles.cache.get(roleId);

        if (!role) {
            return interaction.update({
                content:
                    "❌ Rol bulunamadı.",
                embeds: [],
                components: []
            });
        }

        guildData(guild.id).autoRole =
            role.id;

        return interaction.update({
            content:
                `✅ OtoRol ayarlandı: ${role}`,
            embeds: [],
            components: []
        });
    }

    /* =========================
       TOPLU ROL VER
    ========================= */

    if (
        interaction.isStringSelectMenu() &&
        interaction.customId === "mass_role_add"
    ) {
        const role =
            guild.roles.cache.get(
                interaction.values[0]
            );

        if (!role) {
            return interaction.update({
                content:
                    "❌ Rol bulunamadı.",
                components: []
            });
        }

        await interaction.deferUpdate();

        const members =
            await guild.members.fetch();

        let success = 0;

        for (const member of members.values()) {
            if (member.user.bot) continue;

            if (
                role.position >=
                guild.members.me.roles.highest.position
            ) {
                break;
            }

            await member.roles.add(
                role
            ).then(() => {
                success++;
            }).catch(() => {});
        }

        return interaction.editReply({
            content:
                `✅ **${role.name}** rolü ${success} üyeye verildi.`,
            components: []
        });
    }

    /* =========================
       TOPLU ROL AL
    ========================= */

    if (
        interaction.isStringSelectMenu() &&
        interaction.customId === "mass_role_remove"
    ) {
        const role =
            guild.roles.cache.get(
                interaction.values[0]
            );

        if (!role) {
            return interaction.update({
                content:
                    "❌ Rol bulunamadı.",
                components: []
            });
        }

        await interaction.deferUpdate();

        const members =
            await guild.members.fetch();

        let success = 0;

        for (const member of members.values()) {
            if (member.user.bot) continue;

            await member.roles.remove(
                role
            ).then(() => {
                success++;
            }).catch(() => {});
        }

        return interaction.editReply({
            content:
                `✅ **${role.name}** rolü ${success} üyeden alındı.`,
            components: []
        });
    }
});

/* =========================
   ÜYE GİRİŞİ
========================= */

client.on("guildMemberAdd", async member => {
    const data = guildData(
        member.guild.id
    );

    if (data.autoRole) {
        const role =
            member.guild.roles.cache.get(
                data.autoRole
            );

        if (role) {
            await member.roles.add(
                role
            ).catch(() => {});
        }
    }

    if (data.welcomeChannel) {
        const channel =
            member.guild.channels.cache.get(
                data.welcomeChannel
            );

        if (channel) {
            const accountAge =
                Date.now() -
                member.user.createdTimestamp;

            const month =
                30 * 24 * 60 * 60 * 1000;

            let reliability;

            if (accountAge < 2 * month) {
                reliability =
                    "🔴 Güvenilir değil";
            } else if (
                accountAge < 5 * month
            ) {
                reliability =
                    "🟡 Stabil";
            } else if (
                accountAge < 12 * month
            ) {
                reliability =
                    "🟢 Güvenilir";
            } else if (
                accountAge >=
                24 * month
            ) {
                reliability =
                    "💚 %100 Güvenilir";
            } else {
                reliability =
                    "🟢 Güvenilir";
            }

            const e = new EmbedBuilder()
                .setTitle(
                    `👋 Hoş Geldin ${member.user.username}!`
                )
                .setThumbnail(
                    member.user.displayAvatarURL({
                        extension: "png",
                        size: 1024
                    })
                )
                .addFields(
                    {
                        name: "👤 Üye",
                        value: `${member}`,
                        inline: true
                    },
                    {
                        name: "📥 Giriş Tarihi",
                        value: `<t:${Math.floor(
                            Date.now() / 1000
                        )}:F>`,
                        inline: true
                    },
                    {
                        name: "📅 Hesap Tarihi",
                        value: `<t:${Math.floor(
                            member.user.createdTimestamp / 1000
                        )}:F>`,
                        inline: false
                    },
                    {
                        name: "🛡️ Güvenilirlik",
                        value: reliability,
                        inline: false
                    }
                )
                .setColor(0x57f287)
                .setTimestamp();

            await channel.send({
                embeds: [e]
            });
        }
    }
});

/* =========================
   HATALAR
========================= */

client.on("error", error => {
    console.error("Discord Client Error:", error);
});

process.on("unhandledRejection", error => {
    console.error(
        "Unhandled Promise Rejection:",
        error
    );
});

process.on("uncaughtException", error => {
    console.error(
        "Uncaught Exception:",
        error
    );
});

/* =========================
   TOKEN
========================= */

if (!process.env.DISCORD_TOKEN) {
    console.error(
        "❌ DISCORD_TOKEN Railway Variables kısmında bulunamadı!"
    );
} else {
    client.login(
        process.env.DISCORD_TOKEN
    );
    }
