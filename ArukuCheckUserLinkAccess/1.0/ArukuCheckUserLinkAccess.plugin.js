/**
 * @description Плагин отображает в профиле человеку разрешены ли ему ссылки, т.е находится ли его ID в списке на ARUKU MODERATOR -> разрешены-ссылки.
 * @name ArukuCheckUserLinkAccess
 * @version 1.0
 * @author винчик?
 * @invite aruku
 * @source https://github.com/KotyaraDev/betterdiscord-plugins
 * @api https://raw.githubusercontent.com/KotyaraDev/betterdiscord-plugins/master
 * @build stable
*/

"use strict";

module.exports = (_ => {
	return !window.BDFDB_Global || (!window.BDFDB_Global.loaded && !window.BDFDB_Global.started) ? class {
		constructor (meta) {for (let key in meta) this[key] = meta[key];}

		downloadLibrary () {
			BdApi.Net.fetch("https://mwittrien.github.io/BetterDiscordAddons/Library/0BDFDB.plugin.js").then(r => {
				if (!r || r.status != 200) throw new Error();
				else return r.text();
			}).then(b => {
				if (!b) throw new Error();
				else return require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0BDFDB.plugin.js"), b, _ => BdApi.showToast("Finished downloading BDFDB Library", {type: "success"}));
			}).catch(error => {
				BdApi.alert("Error", "Could not download BDFDB Library Plugin. Try again later or download it manually from GitHub: https://mwittrien.github.io/downloader/?library");
			});
		}
		
		load () {
			if (!window.BDFDB_Global || !Array.isArray(window.BDFDB_Global.pluginQueue)) window.BDFDB_Global = Object.assign({}, window.BDFDB_Global, {pluginQueue: []});
			if (!window.BDFDB_Global.downloadModal) {
				window.BDFDB_Global.downloadModal = true;
				BdApi.showConfirmationModal("Library Missing", `The Library Plugin needed for ${this.name} is missing. Please click "Download Now" to install it.`, {
					confirmText: "Download Now",
					cancelText: "Cancel",
					onCancel: _ => {delete window.BDFDB_Global.downloadModal;},
					onConfirm: _ => {
						delete window.BDFDB_Global.downloadModal;
						this.downloadLibrary();
					}
				});
			}
		}
		start () {this.load();}
		stop () {}
	} : (([Plugin, BDFDB]) => {
		const mainConfig = {
			api: { url: "https://raw.githubusercontent.com/KotyaraDev/betterdiscord-plugins/master", config: "/configuration.json", versions: "/versions/" },
			version: "1.0", build: "stable",
			name: "",
		}

		var _this;
		var loadedUsers, requestedUsers, queuedInstances;
		var currentPopout, currentProfile;
		
		class UserLinkAccess extends BdApi.React.Component {
            render() {
				if (this.props.user.bot || this.props.user.system) return false;
				
                const TARGET_GUILD_ID = "1180813745426018354"; // ARUKU MODERATOR (guild)
                const TARGET_CHANNEL_ID = "1234476596778242178"; // разрешены-ссылки (channel)
                const userId = this.props.user.id;
                let messageId = null;

                // Загрузка данных о пользователе
                this.loadUserData(userId, TARGET_CHANNEL_ID);
                
                if (loadedUsers[this.props.guildId][userId] === undefined) {
                    if (!queuedInstances[this.props.guildId][userId]) {
                        queuedInstances[this.props.guildId][userId] = [];
                    }
                    if (!queuedInstances[this.props.guildId][userId].includes(this)) {
                        queuedInstances[this.props.guildId][userId].push(this);
                    }
                    return null; // Ожидание загрузки данных
                }

                return this.renderAccessSection(userId, messageId);
            }

            loadUserData(userId, targetChannelId) {
                if (!loadedUsers[this.props.guildId]) loadedUsers[this.props.guildId] = {};
                if (!requestedUsers[this.props.guildId]) requestedUsers[this.props.guildId] = {};
                if (!queuedInstances[this.props.guildId]) queuedInstances[this.props.guildId] = {};

                if (loadedUsers[this.props.guildId][userId] === undefined && !requestedUsers[this.props.guildId][userId]) {
                    requestedUsers[this.props.guildId][userId] = true;
                    queuedInstances[this.props.guildId][userId] = queuedInstances[this.props.guildId][userId] || [];

                    BDFDB.LibraryModules.HTTPUtils.get({
                        url: BDFDB.DiscordConstants.Endpoints.MESSAGES(targetChannelId),
                        query: BDFDB.LibraryModules.APIEncodeUtils.stringify({ limit: 50 })
                    }).then(result => {
                        delete requestedUsers[this.props.guildId][userId];
                        if (result.body && Array.isArray(result.body)) {
                            let foundUserId = false;
                            result.body.forEach(message => {
                                message.embeds.forEach(embed => {
                                    if (embed.fields) {
                                        embed.fields.forEach(field => {
                                            const userMentionMatch = field.value.match(/<@!?(\d+)>/);
                                            if (userMentionMatch && userMentionMatch[1] === userId) {
                                                foundUserId = true; // Найден ID текущего пользователя
                                            }
                                        });
                                    }
                                });
                            });
                            loadedUsers[this.props.guildId][userId] = foundUserId; // Сообщение найдено
                            BDFDB.ReactUtils.forceUpdate(queuedInstances[this.props.guildId][userId]);
                            delete queuedInstances[this.props.guildId][userId];
                        }
                    }).catch(error => {
                        console.error('Ошибка API:', error);
                        delete requestedUsers[this.props.guildId][userId];
                    });
                }
            }

            renderAccessSection(userId, messageId) {
                const hasAccess = loadedUsers[this.props.guildId][userId]; // Определяем, есть ли доступ
                
                return BDFDB.ReactUtils.createElement("section", {
                    className: BDFDB.disCN.userprofilesection,
                    children: [
                        BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.Heading, {
                            className: BDFDB.disCN.userprofilesectionheading,
                            variant: "text-xs/semibold",
                            style: { color: "var(--header-secondary)" },
                            children: "Разрешены ссылки в профиле? | ARUKU"
                        }),
                        BDFDB.ReactUtils.createElement("div", {
                            className: BDFDB.disCN.membersince,
                            onClick: _ => BDFDB.LibraryModules.HistoryUtils.transitionTo(BDFDB.DiscordConstants.Routes.CHANNEL("1180813745426018354", "1234476596778242178", messageId)),
                            children: [
                                BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.TooltipContainer, {
									text: hasAccess ? 'Пользователь имеет разрешение на ссылки в профиле!' : 'Пользователь не имеет разрешения на ссылки в профиле!',
									children: this.renderAccessIcon(hasAccess)
								}),
                            ]
                        })
                    ]
                });
            }



            renderAccessIcon(hasAccess) {
				const iconColor = hasAccess ? '#00FF00' : '#FF0000'; // Зеленый или красный

                return BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.SvgIcon, {
                    className: BDFDB.disCN._lastmessagedateicon,
                    nativeClass: false,
					style: { color: iconColor },
                    name: hasAccess ? BDFDB.LibraryComponents.SvgIcon.Names.CHECKMARK : BDFDB.LibraryComponents.SvgIcon.Names.CLOSE // Используем "check" или "cross" в зависимости от доступа
                });
            }
        }
		
		return class ArukuCheckUserLinkAccess extends Plugin {
            onLoad() {
                // Инициализация плагина
                loadedUsers = {};
                requestedUsers = {};
                queuedInstances = {};
                this.patchPriority = 9;
				
				mainConfig['api']['url'] = this.api;
				mainConfig['version'] = this.version;
				mainConfig['build'] = this.build;
				mainConfig['name'] = this.name;


				// Загрузка кэша
				_this = this;
				loadedUsers = {};
				requestedUsers = {};
				queuedInstances = {};
				
				this.patchPriority = 9;
			
				this.modulePatches = {
					before: [
						"UserThemeContainer"
					],
					after: [
						"UserHeaderUsername",
						"UserProfileInfoSectionSimplified"
					]
				};
				
				this.css = `
					${BDFDB.dotCN._lastmessagedateicon} {
						width: 16px;
						height: 16px;
						color: var(--interactive-normal);
					}
				`;


				// Работа с API
				try {
					require('request').get(`${mainConfig['api']['url']}${mainConfig['api']['config']}`, (error, response, body) => {
						if(error) return BdApi.showToast(error, { type: "error" });
						if(response.statusCode == 200) {
							const apiData = JSON.parse(body.toString());
							const pluginData = apiData[mainConfig['name']];
			
							var [
								tempApiVersion, tempApiBuild, tempApiChanges,
								tempApiRequired, tempApiDisabled
							] = ['0.0', 'stable', '---', false, false];
			
			
							if(!pluginData || pluginData.length <= 0) return BdApi.showToast(`${mainConfig['name']}:\nНет новых обновлений.`, { type: "info" });
							else {
								for(let i = 0; i < pluginData.length; i++) {
									if(pluginData[i].version > mainConfig['version']) {
										tempApiVersion = pluginData[i].version;
										tempApiChanges = pluginData[i].changes;
										tempApiBuild = pluginData[i].build;
										tempApiRequired = pluginData[i].required;
										tempApiDisabled = pluginData[i].disabled;
			
										break;
									}
								}
			
								if(tempApiVersion == "0.0" || tempApiVersion == mainConfig['version'] || tempApiDisabled) return BdApi.showToast(`${mainConfig['name']}:\nНет новых обновлений.`, { type: "info" });
							}
							
							if (tempApiRequired) {
								try {
									require('request').get(`${mainConfig['api']['url']}${mainConfig['api']['versions']}${tempApiVersion}/SelectFormForAdminRank.plugin.js`, (error, response, body) => {
										if(error) return BdApi.showToast(error, { type: "error" });
										if(response.statusCode == 200) {
											require("fs").writeFileSync(require("path").join(BdApi.Plugins.folder, `${mainConfig['name']}.plugin.js`), body);
											return BdApi.showToast(`Обновление v${tempApiVersion} (${tempApiBuild}) загружено.`, { type: "success" });
										} else return BdApi.showToast(`Версия ${tempApiVersion} не найдена на API сервере!`, { type: "error" });
									});
								} catch (error) {
									return BdApi.showToast(`Ошибка при установке обновления!`, { type: "error" });
								}
							} else {
								BdApi.showConfirmationModal(
									`${mainConfig['name']} | Новое обновление!`, `Ваша версия: \`${mainConfig['version']}\` | Новая версия: \`${tempApiVersion}\` | Билд: \`${tempApiBuild}\`${tempApiBuild == 'stable' ? '\n\n' : `\n\n> ## ❗ Версия ${tempApiVersion} находится в разработке, возможны ошибки ❗\n\n`}\`\`\`yml\n${tempApiChanges}\`\`\``,
									{
										confirmText: "Установить",
										cancelText: "Отменить",
										onConfirm: () => {
											try {
												require('request').get(`${mainConfig['api']['url']}${mainConfig['api']['versions']}${tempApiVersion}/${mainConfig['name']}.plugin.js`, (error, response, body) => {
													if(error) return BdApi.showToast(error, { type: "error" });
													if(response.statusCode == 200) {
														require("fs").writeFileSync(require("path").join(BdApi.Plugins.folder, `${mainConfig['name']}.plugin.js`), body);
														return BdApi.showToast(`${mainConfig['name']}:\nОбновление v${tempApiVersion} (${tempApiBuild}) загружено.`, { type: "success" });
													} else return BdApi.showToast(`${mainConfig['name']}:\nВерсия ${tempApiVersion} не найдена на API сервере!`, { type: "error" });
												});
											} catch (error) {
												return BdApi.showToast(`${mainConfig['name']}:\nОшибка при установке обновления!`, { type: "error" });
											}
										},
									}
								);
							}
						} else return BdApi.showToast(`${mainConfig['name']}:\nAPI сервер недоступен!`, { type: "error" });
					});
				} catch (error) {
					return BdApi.showToast(`${mainConfig['name']}:\nНеизвестная ошибка при работе с обновлениям..`, { type: "error" });
				}
			}
			
			onStart () {BDFDB.PatchUtils.forceAllUpdates(this);}
			
			onStop () {BDFDB.PatchUtils.forceAllUpdates(this);}

			processUserThemeContainer (e) {
				// Обработка открываемых элементов на экране юзера
				let popout = {props: e.instance.props.value || e.instance.props};
				if (popout.props.layout == "POPOUT") currentPopout = popout;
				if (popout.props.layout == "BITE_SIZE_POPOUT") currentPopout = popout;
				if (popout.props.layout == "MODAL") currentProfile = popout;
				if (popout.props.layout == "SIMPLIFIED_MODAL") currentProfile = popout;
			}

			processUserHeaderUsername(e) {
                // Обработка заголовка пользователя
                if (!currentPopout || e.instance.props.profileType !== "BITE_SIZE") return;
                let user = e.instance.props.user || BDFDB.LibraryStores.UserStore.getUser(e.instance.props.userId);
                if (!user || user.bot || user.system) return;

				e.returnvalue = [e.returnvalue].flat(10);
				e.returnvalue.push(BDFDB.ReactUtils.createElement(UserLinkAccess, {
					user: user,
                    guildId: e.instance.props.guildId // Передаем ID гильдии
				}, true));
            }

            processUserProfileInfoSectionSimplified(e) {
                // Обработка профиля пользователя
                if (!currentProfile) return;
                let user = e.instance.props.user || BDFDB.LibraryStores.UserStore.getUser(e.instance.props.userId);
                if (!user || user.bot || user.system) return;

                let [children, index] = BDFDB.ReactUtils.findParent(e.returnvalue, { props: [["heading", BDFDB.LibraryModules.LanguageStore.Messages.USER_PROFILE_MEMBER_SINCE]] });
                if (index > -1) {
                    children.splice(index, 0, BDFDB.ReactUtils.createElement(UserLinkAccess, {
                        user: user,
                        guildId: e.instance.props.guildId // Передаем ID гильдии
                    }, true));
                }
            }
		};
	})(window.BDFDB_Global.PluginUtils.buildPlugin({}));
})();