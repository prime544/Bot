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
    tickets: new Map()
};

function getGuildData(guildId) {
    if (!db.guilds.has(guildId)) {
        db.guilds.set(guildId, {
            ratings: new Map(),
            ticketPanelChannel: null,
            ticketCategory: null,
            suggestionChannel: null,
            welcomeChannel: null,
            autoRole: null,
            clans: new Set(),
            clanVote: null
        });
    }

    return db.guilds.get(guildId);
}

function makeEmbed(title, description) {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(0x5865F2)
        .setTimestamp();
}

function isStaff(member) {
    return member.permissions.has(
        PermissionFlagsBits.ManageGuild
    );
}

function isAdmin(member) {
    return member.permissions.has(
        PermissionFlagsBits.Administrator
    );
}

function cleanName(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9ğüşöçıİĞÜŞÖÇ_-]/gi, "-")
        .replace(/-+/g, "-")
        .slice(0, 40);
}

async function createTranscript(channel) {
    const messages = await channel.messages.fetch({
        limit: 100
    });

    const sorted = [...messages.values()]
        .sort(
            (a, b) =>
                a.createdTimestamp -
                b.createdTimestamp
        );

    let text = "";

    for (const message of sorted) {
        const time = new Date(
            message.createdTimestamp
        ).toLocaleString("tr-TR");

        const content =
            message.content ||
            "[Embed / Dosya / Buton]";

        text += `[${time}] ${message.author.tag}: ${content}\n`;
    }

    return text || "Ticket içerisinde mesaj yok.";
}

/* =========================================================
   READY
========================================================= */

client.once("ready", () => {
    console.log("================================");
    console.log(`✅ ${client.user.tag} aktif!`);
    console.log(
        `🌐 ${client.guilds.cache.size} sunucuda aktif.`
    );
    console.log("================================");

    client.user.setPresence({
        activities: [
            {
                name: "!panel | Yönetim",
                type: 0
            }
        ],
        status: "online"
    });
});

/* =========================================================
   KOMUTLAR
========================================================= */

client.on("messageCreate", async message => {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content
        .slice(PREFIX.length)
        .trim()
        .split(/\s+/);

    const command = args
        .shift()
        ?.toLowerCase();

    if (!command) return;

    const data = getGuildData(
        message.guild.id
    );

    /* =====================================================
       AVATAR
    ===================================================== */

    if (command === "avatar") {
        const member =
            message.mentions.members.first() ||
            message.member;

        const user = member.user;

        const avatar = new EmbedBuilder()
            .setTitle(`🖼️ ${user.username}`)
            .setDescription(
                `[Avatarı açmak için tıkla](${user.displayAvatarURL({
                    extension: "png",
                    size: 4096
                })})`
            )
            .setImage(
                user.displayAvatarURL({
                    extension: "png",
                    size: 4096
                })
            )
            .setColor(0x5865F2)
            .setTimestamp();

        return message.reply({
            embeds: [avatar]
        });
    }

    /* =====================================================
       SERVERINFO
    ===================================================== */

    if (command === "serverinfo") {
        const guild = message.guild;
        const owner =
            await guild.fetchOwner();

        const ratings = [
            ...data.ratings.values()
        ];

        let ratingText =
            "Henüz puan verilmemiş.";

        if (ratings.length > 0) {
            const average =
                ratings.reduce(
                    (a, b) => a + b,
                    0
                ) / ratings.length;

            ratingText =
                `⭐ ${average.toFixed(1)}/5\n` +
                `Toplam oy: ${ratings.length}`;
        }

        const info = new EmbedBuilder()
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
                    value:
                        `<t:${Math.floor(
                            guild.createdTimestamp / 1000
                        )}:F>`,
                    inline: false
                },
                {
                    name: "⭐ Sunucu Puanı",
                    value: ratingText,
                    inline: false
                }
            )
            .setColor(0x5865F2)
            .setTimestamp();

        return message.reply({
            embeds: [info]
        });
    }

    /* =====================================================
       PUANVER
    ===================================================== */

    if (command === "puanver") {
        const point = Number(args[0]);

        if (
            !Number.isInteger(point) ||
            point < 1 ||
            point > 5
        ) {
            return message.reply(
                "❌ Kullanım: `!puanver <1-5>`"
            );
        }

        data.ratings.set(
            message.author.id,
            point
        );

        return message.reply({
            embeds: [
                makeEmbed(
                    "⭐ Puan Kaydedildi",
                    `${message.author} sunucuya **${point}/5** puan verdi.`
                )
            ]
        });
    }

    /* =====================================================
       TICKET PANELİ
    ===================================================== */

    if (command === "ticket") {
        if (!isStaff(message.member)) {
            return message.reply(
                "❌ Bu komutu kullanmak için **Sunucuyu Yönet** yetkisi gerekiyor."
            );
        }

        const row =
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(
                            "ticket_general"
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
                            "ticket_technical"
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
                            "ticket_complaint"
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
                            "ticket_other"
                        )
                        .setLabel(
                            "Diğer"
                        )
                        .setEmoji("📩")
                        .setStyle(
                            ButtonStyle.Success
                        )
                );

        const ticketEmbed =
            new EmbedBuilder()
                .setTitle("🎫 Destek Merkezi")
                .setDescription(
                    "Destek almak için aşağıdaki kategorilerden birini seç.\n\n" +
                    "🎫 Genel Destek\n" +
                    "🛠️ Teknik Destek\n" +
                    "🚨 Şikayet\n" +
                    "📩 Diğer\n\n" +
                    "⚠️ Bir kullanıcının aynı anda yalnızca **1 açık ticketı** olabilir."
                )
                .setColor(0x5865F2)
                .setTimestamp();

        return message.channel.send({
            embeds: [ticketEmbed],
            components: [row]
        });
    }

    /* =====================================================
       PANEL
    ===================================================== */

    if (command === "panel") {
        if (!isAdmin(message.member)) {
            return message.reply(
                "❌ Bu paneli yalnızca **Yönetici** yetkisine sahip kişiler kullanabilir."
            );
        }

        const row1 =
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(
                            "panel_ticket"
                        )
                        .setLabel("Ticket Kur")
                        .setEmoji("🎫")
                        .setStyle(
                            ButtonStyle.Primary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "panel_mass_add"
                        )
                        .setLabel("Toplu Rol Ver")
                        .setEmoji("➕")
                        .setStyle(
                            ButtonStyle.Success
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "panel_mass_remove"
                        )
                        .setLabel("Toplu Rol Al")
                        .setEmoji("➖")
                        .setStyle(
                            ButtonStyle.Danger
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
                            ButtonStyle.Secondary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "panel_role"
                        )
                        .setLabel("Rol Ver")
                        .setEmoji("👤")
                        .setStyle(
                            ButtonStyle.Primary
                        )
                );

        const row2 =
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(
                            "panel_commands"
                        )
                        .setLabel(
                            "Komut Bilgi"
                        )
                        .setEmoji("📚")
                        .setStyle(
                            ButtonStyle.Secondary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "panel_autorole"
                        )
                        .setLabel("OtoRol")
                        .setEmoji("🤖")
                        .setStyle(
                            ButtonStyle.Success
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "panel_welcome"
                        )
                        .setLabel(
                            "Hoşgeldin Kanalı"
                        )
                        .setEmoji("👋")
                        .setStyle(
                            ButtonStyle.Primary
                        )
                );

        const panel =
            new EmbedBuilder()
                .setTitle("🛠️ Yönetici Paneli")
                .setDescription(
                    "Sunucu sistemlerini aşağıdaki butonlardan yönetebilirsin.\n\n" +
                    "🎫 Ticket kurulumu\n" +
                    "👥 Rol yönetimi\n" +
                    "💡 Öneri kanalı\n" +
                    "📚 Komut bilgileri\n" +
                    "🤖 OtoRol\n" +
                    "👋 Giriş-çıkış sistemi"
                )
                .setColor(0x5865F2)
                .setFooter({
                    text:
                        `Paneli açan: ${message.author.tag}`
                })
                .setTimestamp();

        return message.channel.send({
            embeds: [panel],
            components: [
                row1,
                row2
            ]
        });
    }

    /* =====================================================
       ÖNERİ
    ===================================================== */

    if (command === "öneri") {
        if (
            !data.suggestionChannel
        ) {
            return message.reply(
                "❌ Öneri kanalı henüz kurulmamış."
            );
        }

        if (
            message.channel.id !==
            data.suggestionChannel
        ) {
            return message.reply(
                `❌ Öneriler yalnızca <#${data.suggestionChannel}> kanalında gönderilebilir.`
            );
        }

        const suggestion =
            args.join(" ");

        if (!suggestion) {
            return message.reply(
                "❌ Kullanım: `!öneri <önerin>`"
            );
        }

        const suggestionEmbed =
            new EmbedBuilder()
                .setTitle("💡 Yeni Öneri")
                .setDescription(
                    suggestion
                )
                .addFields({
                    name: "👤 Gönderen",
                    value:
                        `${message.author}`
                })
                .setColor(0x57F287)
                .setTimestamp();

        const sent =
            await message.channel.send({
                embeds: [
                    suggestionEmbed
                ]
            });

        await sent.react("👍");
        await sent.react("👎");

        await message.delete()
            .catch(() => {});

        return;
    }

    /* =====================================================
       KLAN ADD
    ===================================================== */

    if (
        command === "klan" &&
        args[0]?.toLowerCase() === "add"
    ) {
        if (!isStaff(message.member)) {
            return message.reply(
                "❌ Bu komut için yetkin yok."
            );
        }

        const clanName =
            args.slice(1).join(" ");

        if (!clanName) {
            return message.reply(
                "❌ Kullanım: `!klan add <klan ismi>`"
            );
        }

        data.clans.add(
            clanName
        );

        return message.reply({
            embeds: [
                makeEmbed(
                    "⚔️ Klan Eklendi",
                    `**${clanName}** oylama listesine eklendi.`
                )
            ]
        });
    }

    /* =====================================================
       KLAN OYLAMA
    ===================================================== */

    if (
        command === "klan" &&
        args[0]?.toLowerCase() ===
            "oylama"
    ) {
        if (!isStaff(message.member)) {
            return message.reply(
                "❌ Bu komut için yetkin yok."
            );
        }

        if (data.clans.size === 0) {
            return message.reply(
                "❌ Önce `!klan add <klan ismi>` ile klan eklemelisin."
            );
        }

        const clans =
            [...data.clans].slice(
                0,
                25
            );

        data.clanVote = {
            clans,
            votes: new Map()
        };

        const options =
            clans.map(
                (clan, index) => ({
                    label:
                        clan.slice(
                            0,
                            100
                        ),
                    value:
                        `clan_${index}`
                })
            );

        const select =
            new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId(
                            "clan_vote"
                        )
                        .setPlaceholder(
                            "⚔️ Klanını seç..."
                        )
                        .addOptions(
                            options
                        )
                );

        return message.channel.send({
            embeds: [
                makeEmbed(
                    "⚔️ Klan Oylaması",
                    "Aşağıdaki menüden bir klan seç.\n\n" +
                    "⚠️ Herkesin **1 oy hakkı** vardır.\n" +
                    "⚠️ Oy verdikten sonra değiştirilemez."
                )
            ],
            components: [select]
        });
    }
});

/* =====================================================
   KLAN SONUÇ
===================================================== */

if (
    command === "klan" &&
    args[0]?.toLowerCase() === "sonuç"
) {
    if (!isStaff(message.member)) {
        return message.reply(
            "❌ Bu komut için yetkin yok."
        );
    }

    if (!data.clanVote) {
        return message.reply(
            "❌ Şu anda aktif bir klan oylaması yok."
        );
    }

    const votes = data.clanVote.votes;

    const results = {};

    for (const clan of data.clanVote.clans) {
        results[clan] = 0;
    }

    for (const clan of votes.values()) {
        if (results[clan] !== undefined) {
            results[clan]++;
        }
    }

    const totalVotes = votes.size;

    const sorted = Object.entries(results)
        .sort((a, b) => b[1] - a[1]);

    let description = "";

    for (const [clan, count] of sorted) {
        const percentage =
            totalVotes === 0
                ? 0
                : ((count / totalVotes) * 100).toFixed(1);

        const barLength = 10;

        const filled =
            totalVotes === 0
                ? 0
                : Math.round(
                    (count / totalVotes) * barLength
                );

        const bar =
            "█".repeat(filled) +
            "░".repeat(barLength - filled);

        description +=
            `### ⚔️ ${clan}\n` +
            `${bar} **${count} oy** — %${percentage}\n\n`;
    }

    const resultEmbed =
        new EmbedBuilder()
            .setTitle("⚔️ Klan Oylama Sonuçları")
            .setDescription(
                description ||
                "Henüz hiç oy kullanılmadı."
            )
            .addFields({
                name: "👥 Toplam Oy",
                value: `${totalVotes}`,
                inline: true
            })
            .setColor(0x5865F2)
            .setFooter({
                text:
                    `Sonucu görüntüleyen: ${message.author.tag}`
            })
            .setTimestamp();

    return message.reply({
        embeds: [resultEmbed]
    });
}

/* =========================================================
   BUTONLAR + SELECT MENÜLER
========================================================= */

client.on(
    "interactionCreate",
    async interaction => {

        if (
            !interaction.isButton() &&
            !interaction.isStringSelectMenu()
        ) {
            return;
        }

        if (!interaction.guild) {
            return;
        }

        const guild =
            interaction.guild;

        const data =
            getGuildData(
                guild.id
            );

        /* =================================================
           TICKET AÇ
        ================================================= */

        if (
            interaction.isButton() &&
            [
                "ticket_general",
                "ticket_technical",
                "ticket_complaint",
                "ticket_other"
            ].includes(
                interaction.customId
            )
        ) {

            const oldTicket =
                [...guild.channels.cache.values()]
                    .find(
                        channel =>
                            channel.topic ===
                            `ticket-owner:${interaction.user.id}`
                    );

            if (oldTicket) {
                return interaction.reply({
                    content:
                        `❌ Zaten açık bir ticketın var: ${oldTicket}`,
                    ephemeral: true
                });
            }

            if (
                !data.ticketCategory
            ) {
                return interaction.reply({
                    content:
                        "❌ Ticket kategorisi henüz ayarlanmamış. Yönetici `!panel` üzerinden Ticket Kurulumunu yapmalı.",
                    ephemeral: true
                });
            }

            const category =
                guild.channels.cache.get(
                    data.ticketCategory
                );

            if (
                !category ||
                category.type !==
                    ChannelType.GuildCategory
            ) {
                return interaction.reply({
                    content:
                        "❌ Ticket kategorisi bulunamadı. Panelden yeniden ayarla.",
                    ephemeral: true
                });
            }

            const types = {
                ticket_general:
                    "🎫 Genel Destek",
                ticket_technical:
                    "🛠️ Teknik Destek",
                ticket_complaint:
                    "🚨 Şikayet",
                ticket_other:
                    "📩 Diğer"
            };

            await interaction.deferReply({
                ephemeral: true
            });

            const channel =
                await guild.channels.create({
                    name:
                        `ticket-${cleanName(
                            interaction.user.username
                        )}`,
                    type:
                        ChannelType.GuildText,
                    parent:
                        category.id,
                    topic:
                        `ticket-owner:${interaction.user.id}`,
                    permissionOverwrites: [
                        {
                            id:
                                guild.roles
                                    .everyone.id,
                            deny: [
                                PermissionFlagsBits
                                    .ViewChannel
                            ]
                        },
                        {
                            id:
                                interaction.user.id,
                            allow: [
                                PermissionFlagsBits
                                    .ViewChannel,
                                PermissionFlagsBits
                                    .SendMessages,
                                PermissionFlagsBits
                                    .ReadMessageHistory,
                                PermissionFlagsBits
                                    .AttachFiles
                            ]
                        },
                        {
                            id:
                                client.user.id,
                            allow: [
                                PermissionFlagsBits
                                    .ViewChannel,
                                PermissionFlagsBits
                                    .SendMessages,
                                PermissionFlagsBits
                                    .ReadMessageHistory,
                                PermissionFlagsBits
                                    .ManageChannels
                            ]
                        }
                    ]
                });

            const staffRoles =
                guild.roles.cache.filter(
                    role =>
                        !role.managed &&
                        role.permissions.has(
                            PermissionFlagsBits
                                .ManageChannels
                        )
                );

            for (
                const role of
                    staffRoles.values()
            ) {
                await channel.permissionOverwrites
                    .create(
                        role.id,
                        {
                            ViewChannel: true,
                            SendMessages: true,
                            ReadMessageHistory: true
                        }
                    )
                    .catch(() => {});
            }

            db.tickets.set(
                channel.id,
                {
                    owner:
                        interaction.user.id,
                    type:
                        types[
                            interaction.customId
                        ],
                    created:
                        Date.now()
                }
            );

            const close =
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

            await channel.send({
                content:
                    `${interaction.user}`,
                embeds: [
                    new EmbedBuilder()
                        .setTitle(
                            types[
                                interaction
                                    .customId
                            ]
                        )
                        .setDescription(
                            "🎫 Ticketın başarıyla oluşturuldu.\n\n" +
                            "Yetkililer en kısa sürede seninle ilgilenecektir.\n\n" +
                            "🔒 Ticketı kapatmak için aşağıdaki butona bas."
                        )
                        .setColor(
                            0x5865F2
                        )
                        .setFooter({
                            text:
                                "Destek Sistemi"
                        })
                        .setTimestamp()
                ],
                components: [
                    close
                ]
            });

            return interaction.editReply({
                content:
                    `✅ Ticket oluşturuldu: ${channel}`
            });
        }

        /* =================================================
           TICKET KAPAT
        ================================================= */

        if (
            interaction.isButton() &&
            interaction.customId ===
                "ticket_close"
        ) {

            const ticket =
                db.tickets.get(
                    interaction.channel.id
                );

            if (!ticket) {
                return interaction.reply({
                    content:
                        "❌ Bu kanal kayıtlı bir ticket değil.",
                    ephemeral: true
                });
            }

            const canClose =
                interaction.user.id ===
                    ticket.owner ||
                isStaff(
                    interaction.member
                );

            if (!canClose) {
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
                interaction.channel;

            const transcript =
                await createTranscript(
                    channel
                );

            const buffer =
                Buffer.from(
                    transcript,
                    "utf8"
                );

            const file = {
                attachment:
                    buffer,
                name:
                    `transcript-${channel.name}.txt`
            };

            const owner =
                await client.users.fetch(
                    ticket.owner
                ).catch(() => null);

            const serverOwner =
                await client.users.fetch(
                    guild.ownerId
                ).catch(() => null);

            const transcriptEmbed =
                new EmbedBuilder()
                    .setTitle(
                        "📄 Ticket Transcript"
                    )
                    .setDescription(
                        `**Sunucu:** ${guild.name}\n` +
                        `**Ticket:** ${channel.name}\n` +
                        `**Kategori:** ${ticket.type}\n` +
                        `**Ticket Sahibi:** <@${ticket.owner}>\n` +
                        `**Kapatan:** ${interaction.user}`
                    )
                    .setColor(
                        0x5865F2
                    )
                    .setTimestamp();

            if (owner) {
                await owner.send({
                    embeds: [
                        transcriptEmbed
                    ],
                    files: [
                        file
                    ]
                }).catch(
                    () => {}
                );
            }

            if (
                serverOwner &&
                serverOwner.id !==
                    ticket.owner
            ) {
                await serverOwner.send({
                    embeds: [
                        transcriptEmbed
                    ],
                    files: [
                        file
                    ]
                }).catch(
                    () => {}
                );
            }

            db.tickets.delete(
                channel.id
            );

            await interaction.editReply(
                "🔒 Ticket kapatılıyor ve transcript gönderiliyor..."
            );

            setTimeout(
                () => {
                    channel.delete()
                        .catch(
                            () => {}
                        );
                },
                1200
            );

            return;
        }

        /* =================================================
           PANEL - TICKET KUR
        ================================================= */

        if (
            interaction.isButton() &&
            interaction.customId ===
                "panel_ticket"
        ) {

            if (!isAdmin(
                interaction.member
            )) {
                return interaction.reply({
                    content:
                        "❌ Yönetici yetkisi gerekiyor.",
                    ephemeral: true
                });
            }

            const categories =
                guild.channels.cache
                    .filter(
                        channel =>
                            channel.type ===
                            ChannelType.GuildCategory
                    )
                    .first(25);

            if (
                categories.length === 0
            ) {
                return interaction.reply({
                    content:
                        "❌ Sunucuda kategori bulunamadı.",
                    ephemeral: true
                });
            }

            const select =
                new StringSelectMenuBuilder()
                    .setCustomId(
                        "setup_ticket_category"
                    )
                    .setPlaceholder(
                        "📁 Ticket kategorisini seç..."
                    )
                    .addOptions(
                        categories.map(
                            category => ({
                                label:
                                    category.name.slice(
                                        0,
                                        100
                                    ),
                                value:
                                    category.id,
                                emoji:
                                    "📁"
                            })
                        )
                    );

            return interaction.reply({
                embeds: [
                    makeEmbed(
                        "🎫 Ticket Kurulumu",
                        "Ticketların açılacağı **kategoriyi** seç."
                    )
                ],
                components: [
                    new ActionRowBuilder()
                        .addComponents(
                            select
                        )
                ],
                ephemeral: true
            });
        }

        /* =================================================
           TICKET KATEGORİ SEÇ
        ================================================= */
    if (
            interaction.isStringSelectMenu() &&
            interaction.customId ===
                "setup_ticket_category"
        ) {

            const categoryId =
                interaction.values[0];

            const category =
                guild.channels.cache.get(
                    categoryId
                );

            if (
                !category ||
                category.type !==
                    ChannelType.GuildCategory
            ) {
                return interaction.update({
                    content:
                        "❌ Kategori bulunamadı.",
                    embeds: [],
                    components: []
                });
            }

            data.ticketCategory =
                category.id;

            const textChannels =
                guild.channels.cache
                    .filter(
                        channel =>
                            channel.type ===
                            ChannelType.GuildText
                    )
                    .first(25);

            if (
                textChannels.length ===
                0
            ) {
                return interaction.update({
                    content:
                        "❌ Sunucuda yazı kanalı bulunamadı.",
                    embeds: [],
                    components: []
                });
            }

            const channelSelect =
                new StringSelectMenuBuilder()
                    .setCustomId(
                        "setup_ticket_channel"
                    )
                    .setPlaceholder(
                        "📢 Ticket panelinin kurulacağı kanalı seç..."
                    )
                    .addOptions(
                        textChannels.map(
                            channel => ({
                                label:
                                    channel.name.slice(
                                        0,
                                        100
                                    ),
                                value:
                                    channel.id,
                                emoji:
                                    "📢"
                            })
                        )
                    );

            return interaction.update({
                embeds: [
                    makeEmbed(
                        "🎫 Ticket Kurulumu",
                        `📁 Ticket kategorisi: **${category.name}**\n\nŞimdi ticket panelinin gönderileceği kanalı seç.`
                    )
                ],
                components: [
                    new ActionRowBuilder()
                        .addComponents(
                            channelSelect
                        )
                ]
            });
        }

        /* =================================================
           TICKET PANEL KANALI SEÇ
        ================================================= */

        if (
            interaction.isStringSelectMenu() &&
            interaction.customId ===
                "setup_ticket_channel"
        ) {

            const channelId =
                interaction.values[0];

            const channel =
                guild.channels.cache.get(
                    channelId
                );

            if (
                !channel ||
                channel.type !==
                    ChannelType.GuildText
            ) {
                return interaction.update({
                    content:
                        "❌ Kanal bulunamadı.",
                    embeds: [],
                    components: []
                });
            }

            data.ticketPanelChannel =
                channel.id;

            const row =
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(
                                "ticket_general"
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
                                "ticket_technical"
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
                                "ticket_complaint"
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
                                "ticket_other"
                            )
                            .setLabel(
                                "Diğer"
                            )
                            .setEmoji("📩")
                            .setStyle(
                                ButtonStyle.Success
                            )
                    );

            await channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(
                            "🎫 Destek Merkezi"
                        )
                        .setDescription(
                            "Destek almak için aşağıdaki seçeneklerden birini seç."
                        )
                        .setColor(
                            0x5865F2
                        )
                        .setTimestamp()
                ],
                components: [
                    row
                ]
            });

            return interaction.update({
                content:
                    `✅ Ticket sistemi kuruldu!\n\n📢 Panel: ${channel}\n📁 Ticket kategorisi: <#${data.ticketCategory}>`,
                embeds: [],
                components: []
            });
        }

        /* =================================================
           PANEL - ÖNERİ KANALI
        ================================================= */

        if (
            interaction.isButton() &&
            interaction.customId ===
                "panel_suggestion"
        ) {

            const categories =
                guild.channels.cache
                    .filter(
                        channel =>
                            channel.type ===
                            ChannelType.GuildCategory
                    )
                    .first(25);

            const select =
                new StringSelectMenuBuilder()
                    .setCustomId(
                        "setup_suggestion_category"
                    )
                    .setPlaceholder(
                        "📁 Öneri kanalının kategorisini seç..."
                    )
                    .addOptions(
                        categories.map(
                            category => ({
                                label:
                                    category.name.slice(
                                        0,
                                        100
                                    ),
                                value:
                                    category.id,
                                emoji:
                                    "📁"
                            })
                        )
                    );

            return interaction.reply({
                embeds: [
                    makeEmbed(
                        "💡 Öneri Kanalı",
                        "🆘│öneri kanalının oluşturulacağı kategoriyi seç."
                    )
                ],
                components: [
                    new ActionRowBuilder()
                        .addComponents(
                            select
                        )
                ],
                ephemeral: true
            });
        }

        /* =================================================
           ÖNERİ KATEGORİSİ
        ================================================= */

        if (
            interaction.isStringSelectMenu() &&
            interaction.customId ===
                "setup_suggestion_category"
        ) {

            const category =
                guild.channels.cache.get(
                    interaction.values[0]
                );

            if (!category) {
                return interaction.update({
                    content:
                        "❌ Kategori bulunamadı.",
                    embeds: [],
                    components: []
                });
            }

            const existing =
                guild.channels.cache.find(
                    channel =>
                        channel.name ===
                            "🆘│öneri" &&
                        channel.type ===
                            ChannelType.GuildText
                );

            if (existing) {
                data.suggestionChannel =
                    existing.id;

                return interaction.update({
                    content:
                        `✅ Öneri kanalı zaten mevcut: ${existing}`,
                    embeds: [],
                    components: []
                });
            }

            const channel =
                await guild.channels.create({
                    name: "🆘│öneri",
                    type:
                        ChannelType.GuildText,
                    parent:
                        category.id
                });

            data.suggestionChannel =
                channel.id;

            await channel.send({
                embeds: [
                    makeEmbed(
                        "💡 Öneri Sistemi",
                        "Bu kanalda `!öneri <önerin>` komutunu kullanarak öneri gönderebilirsin."
                    )
                ]
            });

            return interaction.update({
                content:
                    `✅ Öneri kanalı oluşturuldu: ${channel}`,
                embeds: [],
                components: []
            });
        }

        /* =================================================
           PANEL - HOŞGELDİN
        ================================================= */

        if (
            interaction.isButton() &&
            interaction.customId ===
                "panel_welcome"
        ) {

            const categories =
                guild.channels.cache
                    .filter(
                        channel =>
                            channel.type ===
                            ChannelType.GuildCategory
                    )
                    .first(25);

            const select =
                new StringSelectMenuBuilder()
                    .setCustomId(
                        "setup_welcome_category"
                    )
                    .setPlaceholder(
                        "📁 Giriş-çıkış kategorisini seç..."
                    )
                    .addOptions(
                        categories.map(
                            category => ({
                                label:
                                    category.name.slice(
                                        0,
                                        100
                                    ),
                                value:
                                    category.id,
                                emoji:
                                    "📁"
                            })
                        )
                    );

            return interaction.reply({
                embeds: [
                    makeEmbed(
                        "👋 Giriş-Çıkış Sistemi",
                        "🤩│giriş-çıkış kanalının oluşturulacağı kategoriyi seç."
                    )
                ],
                components: [
                    new ActionRowBuilder()
                        .addComponents(
                            select
                        )
                ],
                ephemeral: true
            });
        }

        /* =================================================
           HOŞGELDİN KATEGORİ
        ================================================= */

        if (
            interaction.isStringSelectMenu() &&
            interaction.customId ===
                "setup_welcome_category"
        ) {

            const category =
                guild.channels.cache.get(
                    interaction.values[0]
                );

            if (!category) {
                return interaction.update({
                    content:
                        "❌ Kategori bulunamadı.",
                    embeds: [],
                    components: []
                });
            }

            const existing =
                guild.channels.cache.find(
                    channel =>
                        channel.name ===
                            "🤩│giriş-çıkış" &&
                        channel.type ===
                            ChannelType.GuildText
                );

            if (existing) {
                data.welcomeChannel =
                    existing.id;

                return interaction.update({
                    content:
                        `✅ Giriş-çıkış kanalı zaten mevcut: ${existing}`,
                    embeds: [],
                    components: []
                });
            }

            const channel =
                await guild.channels.create({
                    name:
                        "🤩│giriş-çıkış",
                    type:
                        ChannelType.GuildText,
                    parent:
                        category.id
                });

            data.welcomeChannel =
                channel.id;

            await channel.send({
                embeds: [
                    makeEmbed(
                        "👋 Giriş-Çıkış Sistemi",
                        "Bu kanal yeni üyelerin giriş ve çıkış mesajları için kullanılacaktır."
                    )
                ]
            });

            return interaction.update({
                content:
                    `✅ Giriş-çıkış kanalı oluşturuldu: ${channel}`,
                embeds: [],
                components: []
            });
        }

        /* =================================================
           KOMUT BİLGİ
        ================================================= */

        if (
            interaction.isButton() &&
            interaction.customId ===
                "panel_commands"
        ) {

            let commands = [
                "`!avatar [@kişi]` — Avatar görüntüler",
                "`!serverinfo` — Sunucu bilgilerini gösterir",
                "`!puanver <1-5>` — Sunucuya puan verir",
                "`!öneri <metin>` — Öneri gönderir",
                "`!klan oylama` — Klan oylaması"
            ];

            if (
                isStaff(
                    interaction.member
                )
            ) {
                commands.push(
                    "`!ticket` — Ticket paneli",
                    "`!klan add <isim>` — Klan ekler"
                );
            }

            if (
                isAdmin(
                    interaction.member
                )
            ) {
                commands.push(
                    "`!panel` — Yönetici paneli"
                );
            }

            return interaction.reply({
                embeds: [
                    makeEmbed(
                        "📚 Komut Bilgi",
                        commands.join("\n\n")
                    )
                ],
                ephemeral: true
            });
        }

        /* =================================================
           PANEL - OTOROL
        ================================================= */

        if (
            interaction.isButton() &&
            interaction.customId ===
                "panel_autorole"
        ) {

            const roles =
                guild.roles.cache
                    .filter(
                        role =>
                            role.id !==
                                guild.id &&
                            !role.managed
                    )
                    .sort(
                        (a, b) =>
                            b.position -
                            a.position
                    )
                    .first(25);

            if (
                roles.length === 0
            ) {
                return interaction.reply({
                    content:
                        "❌ Kullanılabilir rol yok.",
                    ephemeral: true
                });
            }

            const select =
                new StringSelectMenuBuilder()
                    .setCustomId(
                        "setup_autorole"
                    )
                    .setPlaceholder(
                        "🤖 Otomatik verilecek rolü seç..."
                    )
                    .addOptions(
                        roles.map(
                            role => ({
                                label:
                                    role.name.slice(
                                        0,
                                        100
                                    ),
                                value:
                                    role.id,
                                emoji:
                                    "👤"
                            })
                        )
                    );

            return interaction.reply({
                embeds: [
                    makeEmbed(
                        "🤖 OtoRol",
                        "Yeni üye geldiğinde otomatik verilecek rolü seç."
                    )
                ],
                components: [
                    new ActionRowBuilder()
                        .addComponents(
                            select
                        )
                ],
                ephemeral: true
            });
        }

        /* =================================================
           OTOROL SEÇ
        ================================================= */
    if (
            interaction.isStringSelectMenu() &&
            interaction.customId ===
                "setup_autorole"
        ) {

            const role =
                guild.roles.cache.get(
                    interaction.values[0]
                );

            if (!role) {
                return interaction.update({
                    content:
                        "❌ Rol bulunamadı.",
                    embeds: [],
                    components: []
                });
            }

            if (
                role.position >=
                guild.members.me.roles.highest
                    .position
            ) {
                return interaction.update({
                    content:
                        "❌ Bot bu rolü veremez. Botun rolünü bu rolün üzerine taşı.",
                    embeds: [],
                    components: []
                });
            }

            data.autoRole =
                role.id;

            return interaction.update({
                content:
                    `✅ OtoRol ayarlandı: ${role}`,
                embeds: [],
                components: []
            });
        }

        /* =================================================
           TOPLU ROL VER
        ================================================= */

        if (
            interaction.isButton() &&
            interaction.customId ===
                "panel_mass_add"
        ) {

            const roles =
                guild.roles.cache
                    .filter(
                        role =>
                            role.id !==
                                guild.id &&
                            !role.managed
                    )
                    .sort(
                        (a, b) =>
                            b.position -
                            a.position
                    )
                    .first(25);

            const select =
                new StringSelectMenuBuilder()
                    .setCustomId(
                        "mass_role_add"
                    )
                    .setPlaceholder(
                        "➕ Verilecek rolü seç..."
                    )
                    .addOptions(
                        roles.map(
                            role => ({
                                label:
                                    role.name.slice(
                                        0,
                                        100
                                    ),
                                value:
                                    role.id
                            })
                        )
                    );

            return interaction.reply({
                content:
                    "Verilecek rolü seç:",
                components: [
                    new ActionRowBuilder()
                        .addComponents(
                            select
                        )
                ],
                ephemeral: true
            });
        }

        /* =================================================
           TOPLU ROL AL
        ================================================= */

        if (
            interaction.isButton() &&
            interaction.customId ===
                "panel_mass_remove"
        ) {

            const roles =
                guild.roles.cache
                    .filter(
                        role =>
                            role.id !==
                                guild.id &&
                            !role.managed
                    )
                    .sort(
                        (a, b) =>
                            b.position -
                            a.position
                    )
                    .first(25);

            const select =
                new StringSelectMenuBuilder()
                    .setCustomId(
                        "mass_role_remove"
                    )
                    .setPlaceholder(
                        "➖ Alınacak rolü seç..."
                    )
                    .addOptions(
                        roles.map(
                            role => ({
                                label:
                                    role.name.slice(
                                        0,
                                        100
                                    ),
                                value:
                                    role.id
                            })
                        )
                    );

            return interaction.reply({
                content:
                    "Alınacak rolü seç:",
                components: [
                    new ActionRowBuilder()
                        .addComponents(
                            select
                        )
                ],
                ephemeral: true
            });
        }

        /* =================================================
           TOPLU ROL SELECT
        ================================================= */

        if (
            interaction.isStringSelectMenu() &&
            (
                interaction.customId ===
                    "mass_role_add" ||
                interaction.customId ===
                    "mass_role_remove"
            )
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

            if (
                role.position >=
                guild.members.me.roles.highest
                    .position
            ) {
                return interaction.update({
                    content:
                        "❌ Botun rolü bu rolden aşağıda.",
                    components: []
                });
            }

            await interaction.deferUpdate();

            const members =
                await guild.members.fetch();

            let count = 0;

            for (
                const member of
                    members.values()
            ) {

                if (
                    member.user.bot
                ) {
                    continue;
                }

                if (
                    interaction.customId ===
                    "mass_role_add"
                ) {
                    if (
                        member.roles.cache.has(
                            role.id
                        )
                    ) {
                        continue;
                    }

                    await member.roles.add(
                        role
                    ).then(
                        () => count++
                    ).catch(
                        () => {}
                    );

                } else {

                    if (
                        !member.roles.cache.has(
                            role.id
                        )
                    ) {
                        continue;
                    }

                    await member.roles.remove(
                        role
                    ).then(
                        () => count++
                    ).catch(
                        () => {}
                    );
                }
            }

            return interaction.editReply({
                content:
                    `✅ **${role.name}** rolü ${count} üyede güncellendi.`,
                components: []
            });
        }

        /* =================================================
           KLAN OY
        ================================================= */

        if (
            interaction.isStringSelectMenu() &&
            interaction.customId ===
                "clan_vote"
        ) {

            if (!data.clanVote) {
                return interaction.reply({
                    content:
                        "❌ Aktif oylama yok.",
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
                        "❌ Zaten oy kullandın. Oyunu değiştiremezsin.",
                    ephemeral: true
                });
            }

            const index =
                Number(
                    interaction.values[0]
                        .replace(
                            "clan_",
                            ""
                        )
                );

            const clan =
                data.clanVote.clans[
                    index
                ];

            if (!clan) {
                return interaction.reply({
                    content:
                        "❌ Klan bulunamadı.",
                    ephemeral: true
                });
            }

            data.clanVote.votes.set(
                interaction.user.id,
                clan
            );

            return interaction.reply({
                content:
                    `✅ Oyun kaydedildi!\n⚔️ Seçtiğin klan: **${clan}**`,
                ephemeral: true
            });
        }
    }
);

/* =========================================================
   GİRİŞ-ÇIKIŞ
========================================================= */

client.on(
    "guildMemberAdd",
    async member => {

        const data =
            getGuildData(
                member.guild.id
            );

        if (
            data.autoRole
        ) {

            const role =
                member.guild.roles.cache.get(
                    data.autoRole
                );

            if (role) {
                await member.roles.add(
                    role
                ).catch(
                    () => {}
                );
            }
        }

        if (
            !data.welcomeChannel
        ) {
            return;
        }

        const channel =
            member.guild.channels.cache.get(
                data.welcomeChannel
            );

        if (!channel) {
            return;
        }

        const age =
            Date.now() -
            member.user.createdTimestamp;

        const month =
            30 *
            24 *
            60 *
            60 *
            1000;

        let reliability;

        if (
            age <
            2 * month
        ) {
            reliability =
                "🔴 Güvenilir değil";
        } else if (
            age <
            5 * month
        ) {
            reliability =
                "🟡 Stabil";
        } else if (
            age <
            12 * month
        ) {
            reliability =
                "🟢 Güvenilir";
        } else if (
            age >=
            24 * month
        ) {
            reliability =
                "💚 %100 Güvenilir";
        } else {
            reliability =
                "🟢 Güvenilir";
        }

        const welcome =
            new EmbedBuilder()
                .setTitle(
                    "👋 Sunucuya Hoş Geldin!"
                )
                .setDescription(
                    `**${member.user.username}** sunucuya katıldı! 🎉`
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
                        value:
                            `${member}`,
                        inline: true
                    },
                    {
                        name:
                            "📥 Giriş Tarihi",
                        value:
                            `<t:${Math.floor(
                                Date.now() / 1000
                            )}:F>`,
                        inline: true
                    },
                    {
                        name:
                            "📅 Hesap Tarihi",
                        value:
                            `<t:${Math.floor(
                                member.user.createdTimestamp / 1000
                            )}:F>`,
                        inline: false
                    },
                    {
                        name:
                            "🛡️ Güvenilirlik",
                        value:
                            reliability,
                        inline: false
                    }
                )
                .setColor(
                    0x57F287
                )
                .setFooter({
                    text:
                        `Üye #${member.guild.memberCount}`
                })
                .setTimestamp();

        await channel.send({
            embeds: [welcome]
        }).catch(
            () => {}
        );
    }
);

/* =========================================================
   ÇIKIŞ
========================================================= */

client.on(
    "guildMemberRemove",
    async member => {

        const data =
            getGuildData(
                member.guild.id
            );

        if (
            !data.welcomeChannel
        ) {
            return;
        }

        const channel =
            member.guild.channels.cache.get(
                data.welcomeChannel
            );

        if (!channel) {
            return;
        }

        const goodbye =
            new EmbedBuilder()
                .setTitle(
                    "👋 Görüşmek Üzere!"
                )
                .setDescription(
                    `**${member.user.tag}** sunucudan ayrıldı.`
                )
                .setThumbnail(
                    member.user.displayAvatarURL({
                        extension: "png",
                        size: 1024
                    })
                )
                .addFields({
                    name:
                        "👤 Ayrılan Üye",
                    value:
                        `${member.user.tag}`,
                    inline: true
                })
                .setColor(
                    0xED4245
                )
                .setTimestamp();

        await channel.send({
            embeds: [goodbye]
        }).catch(
            () => {}
        );
    }
);

/* =========================================================
   HATA YÖNETİMİ
========================================================= */

client.on(
    "error",
    error => {
        console.error(
            "Discord Client Error:",
            error
        );
    }
);

process.on(
    "unhandledRejection",
    error => {
        console.error(
            "Unhandled Rejection:",
            error
        );
    }
);

process.on(
    "uncaughtException",
    error => {
        console.error(
            "Uncaught Exception:",
            error
        );
    }
);

/* =========================================================
   RAILWAY TOKEN
========================================================= */

if (
    !process.env.DISCORD_TOKEN
) {
    console.error(
        "❌ DISCORD_TOKEN bulunamadı!"
    );
} else {
    client.login(
        process.env.DISCORD_TOKEN
    );
                    }
